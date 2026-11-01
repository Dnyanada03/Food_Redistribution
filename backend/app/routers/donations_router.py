from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Donation, Claim, Notification
from ..auth import get_current_user, require_roles
from ..services.expiry_service import process_expired_donations
from ..services.notification_service import notify_new_donation_posted, notify_claim_event
from ..services.safety_service import safety_validator
from ..services.storage_service import storage_provider
from ..services.location_service import location_provider

router = APIRouter(prefix="/api/donations", tags=["Donations"])

class CreateDonationSchema(BaseModel):
    food_name: str
    category: str # 'prepared_meal', 'produce', 'bakery', 'canned', 'packaged', 'raw_ingredient'
    quantity: str
    contains_allergens: Optional[str] = None
    mfd_datetime: str # ISO format string
    exp_datetime: str # ISO format string
    pickup_address: str
    pickup_pincode: str
    pickup_window: str
    photo_url: Optional[str] = None

class UpdateDonationSchema(BaseModel):
    food_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[str] = None
    contains_allergens: Optional[str] = None
    mfd_datetime: Optional[str] = None
    exp_datetime: Optional[str] = None
    pickup_address: Optional[str] = None
    pickup_pincode: Optional[str] = None
    pickup_window: Optional[str] = None
    photo_url: Optional[str] = None

@router.post("", status_code=status.HTTP_201_CREATED)
def create_donation(
    data: CreateDonationSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["donor", "admin"]))
):
    try:
        mfd = datetime.fromisoformat(data.mfd_datetime.replace("Z", "+00:00"))
        exp = datetime.fromisoformat(data.exp_datetime.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format for MFD or EXP date")

    # Safety validation
    is_safe, error_msg = safety_validator.validate_safety_window(data.category, mfd, exp)
    if not is_safe:
        raise HTTPException(status_code=400, detail=error_msg)

    photo = data.photo_url
    if not photo or not photo.strip():
        photo = storage_provider.get_default_image_for_category(data.category)

    donation = Donation(
        donor_id=current_user.id,
        food_name=data.food_name.strip(),
        category=data.category,
        quantity=data.quantity.strip(),
        contains_allergens=data.contains_allergens.strip() if data.contains_allergens else None,
        mfd_datetime=mfd,
        exp_datetime=exp,
        pickup_address=data.pickup_address.strip(),
        pickup_pincode=data.pickup_pincode.strip(),
        pickup_window=data.pickup_window.strip(),
        photo_url=photo,
        status="posted"
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    # Notify verified NGOs
    notify_new_donation_posted(db, donation)

    return {
        "id": donation.id,
        "donor_id": donation.donor_id,
        "food_name": donation.food_name,
        "category": donation.category,
        "quantity": donation.quantity,
        "contains_allergens": donation.contains_allergens,
        "mfd_datetime": donation.mfd_datetime,
        "exp_datetime": donation.exp_datetime,
        "pickup_address": donation.pickup_address,
        "pickup_pincode": donation.pickup_pincode,
        "pickup_window": donation.pickup_window,
        "photo_url": donation.photo_url,
        "status": donation.status,
        "created_at": donation.created_at
    }

@router.put("/{donation_id}")
def update_donation(
    donation_id: int,
    data: UpdateDonationSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["donor", "admin"]))
):
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation listing not found")

    if current_user.role != "admin" and donation.donor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this donation")

    if donation.status != "posted":
        raise HTTPException(status_code=400, detail=f"Cannot edit donation with status '{donation.status}'")

    if data.food_name:
        donation.food_name = data.food_name.strip()
    if data.category:
        donation.category = data.category
    if data.quantity:
        donation.quantity = data.quantity.strip()
    if data.contains_allergens is not None:
        donation.contains_allergens = data.contains_allergens.strip() or None
    if data.pickup_address:
        donation.pickup_address = data.pickup_address.strip()
    if data.pickup_pincode:
        donation.pickup_pincode = data.pickup_pincode.strip()
    if data.pickup_window:
        donation.pickup_window = data.pickup_window.strip()
    if data.photo_url:
        donation.photo_url = data.photo_url.strip()

    if data.mfd_datetime or data.exp_datetime:
        mfd = datetime.fromisoformat(data.mfd_datetime.replace("Z", "+00:00")) if data.mfd_datetime else donation.mfd_datetime
        exp = datetime.fromisoformat(data.exp_datetime.replace("Z", "+00:00")) if data.exp_datetime else donation.exp_datetime

        is_safe, error_msg = safety_validator.validate_safety_window(donation.category, mfd, exp)
        if not is_safe:
            raise HTTPException(status_code=400, detail=error_msg)

        donation.mfd_datetime = mfd
        donation.exp_datetime = exp

    db.commit()
    db.refresh(donation)
    return {
        "id": donation.id,
        "donor_id": donation.donor_id,
        "food_name": donation.food_name,
        "category": donation.category,
        "quantity": donation.quantity,
        "contains_allergens": donation.contains_allergens,
        "mfd_datetime": donation.mfd_datetime,
        "exp_datetime": donation.exp_datetime,
        "pickup_address": donation.pickup_address,
        "pickup_pincode": donation.pickup_pincode,
        "pickup_window": donation.pickup_window,
        "photo_url": donation.photo_url,
        "status": donation.status,
        "created_at": donation.created_at
    }

@router.get("/my")
def get_my_donations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["donor", "admin"]))
):
    process_expired_donations(db)
    donations = db.query(Donation).filter(Donation.donor_id == current_user.id).order_by(Donation.created_at.desc()).all()

    res = []
    for d in donations:
        item = {
            "id": d.id,
            "donor_id": d.donor_id,
            "food_name": d.food_name,
            "category": d.category,
            "quantity": d.quantity,
            "contains_allergens": d.contains_allergens,
            "mfd_datetime": d.mfd_datetime,
            "exp_datetime": d.exp_datetime,
            "pickup_address": d.pickup_address,
            "pickup_pincode": d.pickup_pincode,
            "pickup_window": d.pickup_window,
            "photo_url": d.photo_url,
            "status": d.status,
            "created_at": d.created_at,
            "claim": None
        }
        if d.claim:
            item["claim"] = {
                "id": d.claim.id,
                "ngo_id": d.claim.ngo_id,
                "ngo_name": d.claim.ngo.name if d.claim.ngo else "NGO",
                "ngo_phone": d.claim.ngo.phone if d.claim.ngo else "",
                "ngo_address": d.claim.ngo.address if d.claim.ngo else "",
                "volunteer_id": d.claim.volunteer_id,
                "volunteer_name": d.claim.volunteer.name if d.claim.volunteer else None,
                "volunteer_phone": d.claim.volunteer.phone if d.claim.volunteer else None,
                "status": d.claim.status,
                "claimed_at": d.claim.claimed_at,
                "delivered_at": d.claim.delivered_at
            }
        res.append(item)

    return res

@router.get("")
def browse_donations(
    category: Optional[str] = Query(None),
    pincode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user_pincode: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    process_expired_donations(db)

    query = db.query(Donation).filter(Donation.status == "posted")

    if category and category != "all":
        query = query.filter(Donation.category == category)
    if pincode:
        query = query.filter(Donation.pickup_pincode.like(f"%{pincode}%"))
    if search:
        query = query.filter(Donation.food_name.ilike(f"%{search}%"))

    donations = query.order_by(Donation.exp_datetime.asc()).all()

    res = []
    for d in donations:
        dist_km = None
        if user_pincode:
            dist_km = location_provider.calculate_distance(user_pincode, d.pickup_pincode)

        item = {
            "id": d.id,
            "donor_id": d.donor_id,
            "donor_name": d.donor.name if d.donor else "Donor",
            "donor_phone": d.donor.phone if d.donor else "",
            "food_name": d.food_name,
            "category": d.category,
            "quantity": d.quantity,
            "contains_allergens": d.contains_allergens,
            "allergen_flags": safety_validator.get_allergen_warnings(d.contains_allergens),
            "mfd_datetime": d.mfd_datetime,
            "exp_datetime": d.exp_datetime,
            "pickup_address": d.pickup_address,
            "pickup_pincode": d.pickup_pincode,
            "pickup_window": d.pickup_window,
            "photo_url": d.photo_url,
            "status": d.status,
            "created_at": d.created_at,
            "distance_km": dist_km
        }
        res.append(item)

    return res

@router.get("/{donation_id}")
def get_donation_detail(donation_id: int, db: Session = Depends(get_db)):
    process_expired_donations(db)
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation listing not found")

    coords = location_provider.get_coordinates(donation.pickup_address, donation.pickup_pincode)
    map_url = location_provider.get_map_view_url(donation.pickup_address, donation.pickup_pincode)

    claim_data = None
    if donation.claim:
        claim_data = {
            "id": donation.claim.id,
            "status": donation.claim.status,
            "ngo_name": donation.claim.ngo.name if donation.claim.ngo else "NGO",
            "ngo_phone": donation.claim.ngo.phone if donation.claim.ngo else "",
            "volunteer_name": donation.claim.volunteer.name if donation.claim.volunteer else None,
            "volunteer_phone": donation.claim.volunteer.phone if donation.claim.volunteer else None,
            "claimed_at": donation.claim.claimed_at,
            "delivered_at": donation.claim.delivered_at
        }

    return {
        "id": donation.id,
        "donor_id": donation.donor_id,
        "donor_name": donation.donor.name if donation.donor else "Donor",
        "donor_phone": donation.donor.phone if donation.donor else "",
        "donor_address": donation.donor.address if donation.donor else "",
        "food_name": donation.food_name,
        "category": donation.category,
        "quantity": donation.quantity,
        "contains_allergens": donation.contains_allergens,
        "allergen_flags": safety_validator.get_allergen_warnings(donation.contains_allergens),
        "mfd_datetime": donation.mfd_datetime,
        "exp_datetime": donation.exp_datetime,
        "pickup_address": donation.pickup_address,
        "pickup_pincode": donation.pickup_pincode,
        "pickup_window": donation.pickup_window,
        "photo_url": donation.photo_url,
        "status": donation.status,
        "created_at": donation.created_at,
        "coordinates": coords,
        "map_embed_url": map_url,
        "claim": claim_data
    }

@router.post("/{donation_id}/claim")
def claim_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ngo", "admin"]))
):
    process_expired_donations(db)

    # Server-side business rule: Only verified NGOs can claim
    if current_user.role == "ngo" and not current_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Account verification required. Your NGO account is pending admin verification."
        )

    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation listing not found")

    if donation.status != "posted":
        raise HTTPException(
            status_code=400,
            detail=f"Donation cannot be claimed because its status is '{donation.status}'"
        )

    if donation.exp_datetime <= datetime.utcnow():
        donation.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="This donation listing has expired")

    # Update donation status
    donation.status = "claimed"

    # Create claim record
    claim = Claim(
        donation_id=donation.id,
        ngo_id=current_user.id,
        status="claimed",
        claimed_at=datetime.utcnow()
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    # Dispatch notifications
    notify_claim_event(db, claim, "claimed")

    return {"message": "Donation claimed successfully", "donation_id": donation.id, "claim_id": claim.id}

@router.delete("/{donation_id}")
def cancel_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["donor", "admin"]))
):
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    if current_user.role != "admin" and donation.donor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this donation")

    db.delete(donation)
    db.commit()
    return {"message": "Donation cancelled successfully"}
