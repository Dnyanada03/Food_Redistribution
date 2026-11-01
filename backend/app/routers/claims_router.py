from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Donation, Claim, Notification
from ..auth import get_current_user, require_roles
from ..services.notification_service import notify_claim_event, send_notification
from ..services.location_service import location_provider

router = APIRouter(prefix="/api/claims", tags=["Claims & Deliveries"])

class UpdateClaimStatusSchema(BaseModel):
    status: str # 'in_transit', 'delivered', 'cancelled'
    delivery_notes: Optional[str] = None

@router.get("/my")
def get_my_ngo_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ngo", "admin"]))
):
    """Returns all food claims created by the authenticated NGO with delivery & volunteer details."""
    claims = db.query(Claim).filter(Claim.ngo_id == current_user.id).order_by(Claim.claimed_at.desc()).all()
    res = []
    for c in claims:
        d = c.donation
        res.append({
            "id": c.id,
            "donation_id": c.donation_id,
            "status": c.status,
            "delivery_notes": c.delivery_notes,
            "claimed_at": c.claimed_at,
            "delivered_at": c.delivered_at,
            "donation": {
                "id": d.id,
                "food_name": d.food_name,
                "category": d.category,
                "quantity": d.quantity,
                "contains_allergens": d.contains_allergens,
                "pickup_address": d.pickup_address,
                "pickup_pincode": d.pickup_pincode,
                "pickup_window": d.pickup_window,
                "photo_url": d.photo_url,
                "status": d.status,
                "exp_datetime": d.exp_datetime,
                "donor_name": d.donor.name if d.donor else "Donor",
                "donor_phone": d.donor.phone if d.donor else "",
                "donor_address": d.donor.address if d.donor else ""
            },
            "volunteer": {
                "id": c.volunteer.id,
                "name": c.volunteer.name,
                "phone": c.volunteer.phone
            } if c.volunteer else None
        })
    return res

@router.get("/tasks")
def get_available_volunteer_tasks(
    pincode: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["volunteer", "admin"]))
):
    """
    Returns available delivery tasks for volunteers:
    Claims where status is 'claimed' and no volunteer has accepted yet.
    """
    claims = db.query(Claim).filter(
        Claim.status == "claimed",
        Claim.volunteer_id == None
    ).order_by(Claim.claimed_at.desc()).all()

    res = []
    volunteer_pincode = current_user.pincode or pincode

    for c in claims:
        d = c.donation
        ngo = c.ngo
        donor = d.donor if d else None

        pickup_dist = None
        delivery_dist = None
        if volunteer_pincode and d:
            pickup_dist = location_provider.calculate_distance(volunteer_pincode, d.pickup_pincode)
        if d and ngo:
            delivery_dist = location_provider.calculate_distance(d.pickup_pincode, ngo.pincode)

        res.append({
            "id": c.id,
            "donation_id": c.donation_id,
            "status": c.status,
            "claimed_at": c.claimed_at,
            "food_name": d.food_name if d else "Surplus Food",
            "category": d.category if d else "",
            "quantity": d.quantity if d else "",
            "pickup_address": d.pickup_address if d else "",
            "pickup_pincode": d.pickup_pincode if d else "",
            "pickup_window": d.pickup_window if d else "",
            "photo_url": d.photo_url if d else None,
            "exp_datetime": d.exp_datetime if d else None,
            "donor_name": donor.name if donor else "Donor Organization",
            "donor_phone": donor.phone if donor else "",
            "recipient_ngo_name": ngo.name if ngo else "Recipient Shelter",
            "recipient_address": ngo.address if ngo else "",
            "recipient_pincode": ngo.pincode if ngo else "",
            "recipient_phone": ngo.phone if ngo else "",
            "pickup_distance_km": pickup_dist,
            "route_distance_km": delivery_dist
        })
    return res

@router.post("/{claim_id}/accept-task")
def accept_delivery_task(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["volunteer", "admin"]))
):
    """Assigns the authenticated volunteer to transport the claimed surplus food."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim task not found")

    if claim.volunteer_id is not None:
        raise HTTPException(status_code=400, detail="This task has already been accepted by another volunteer")

    if claim.status not in ["claimed"]:
        raise HTTPException(status_code=400, detail=f"Cannot accept task in status '{claim.status}'")

    claim.volunteer_id = current_user.id
    db.commit()
    db.refresh(claim)

    notify_claim_event(db, claim, "assigned_volunteer")

    return {"message": "Delivery task accepted successfully", "claim_id": claim.id}

@router.post("/{claim_id}/status")
def update_claim_delivery_status(
    claim_id: int,
    data: UpdateClaimStatusSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["volunteer", "ngo", "admin"]))
):
    """
    Updates the logistics status:
    - 'in_transit': food picked up from donor (donation.status -> 'picked_up')
    - 'delivered': food arrived at recipient NGO (donation.status -> 'completed')
    - 'cancelled': delivery cancelled before completion
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim task not found")

    # Authorization check
    if current_user.role == "volunteer" and claim.volunteer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the assigned volunteer for this task")
    if current_user.role == "ngo" and claim.ngo_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this claim")

    new_status = data.status
    if new_status not in ["in_transit", "delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid delivery status update")

    claim.status = new_status
    if data.delivery_notes:
        claim.delivery_notes = data.delivery_notes

    donation = claim.donation
    if new_status == "in_transit":
        if donation:
            donation.status = "picked_up"
        notify_claim_event(db, claim, "in_transit")

    elif new_status == "delivered":
        claim.delivered_at = datetime.utcnow()
        if donation:
            donation.status = "completed"
        notify_claim_event(db, claim, "delivered")

    elif new_status == "cancelled":
        if donation:
            donation.status = "posted" # Release back to available pool
        claim.volunteer_id = None

    db.commit()
    return {"message": f"Delivery status updated to '{new_status}'", "claim_id": claim.id}

@router.get("/volunteer/my")
def get_my_volunteer_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["volunteer", "admin"]))
):
    """Returns all tasks assigned to the authenticated volunteer (active and completed)."""
    claims = db.query(Claim).filter(Claim.volunteer_id == current_user.id).order_by(Claim.claimed_at.desc()).all()
    res = []
    for c in claims:
        d = c.donation
        ngo = c.ngo
        donor = d.donor if d else None
        res.append({
            "id": c.id,
            "donation_id": c.donation_id,
            "status": c.status,
            "delivery_notes": c.delivery_notes,
            "claimed_at": c.claimed_at,
            "delivered_at": c.delivered_at,
            "food_name": d.food_name if d else "Surplus Food",
            "category": d.category if d else "",
            "quantity": d.quantity if d else "",
            "pickup_address": d.pickup_address if d else "",
            "pickup_pincode": d.pickup_pincode if d else "",
            "pickup_window": d.pickup_window if d else "",
            "photo_url": d.photo_url if d else None,
            "donor_name": donor.name if donor else "Donor Organization",
            "donor_phone": donor.phone if donor else "",
            "donor_address": donor.address if donor else "",
            "recipient_ngo_name": ngo.name if ngo else "Recipient Shelter",
            "recipient_phone": ngo.phone if ngo else "",
            "recipient_address": ngo.address if ngo else "",
            "recipient_pincode": ngo.pincode if ngo else ""
        })
    return res
