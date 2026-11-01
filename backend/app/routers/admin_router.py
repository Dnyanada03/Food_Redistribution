from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, VerificationRecord, Donation, Claim, Notification, Issue
from ..auth import require_roles
from ..services.notification_service import send_notification
from ..services.expiry_service import process_expired_donations

router = APIRouter(prefix="/api/admin", tags=["Admin"])

class VerifyUserSchema(BaseModel):
    is_verified: bool
    notes: Optional[str] = None

class ToggleUserStatusSchema(BaseModel):
    is_active: bool
    reason: Optional[str] = None

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    res = []
    for u in users:
        v_rec = db.query(VerificationRecord).filter(VerificationRecord.user_id == u.id).first()
        res.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "org_type": u.org_type,
            "phone": u.phone,
            "address": u.address,
            "pincode": u.pincode,
            "is_verified": u.is_verified,
            "is_active": u.is_active,
            "verification_notes": v_rec.notes if v_rec else None,
            "created_at": u.created_at
        })
    return res

@router.patch("/users/{user_id}/verify")
def verify_user(
    user_id: int,
    data: VerifyUserSchema,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = data.is_verified

    v_rec = db.query(VerificationRecord).filter(VerificationRecord.user_id == user.id).first()
    if not v_rec:
        v_rec = VerificationRecord(user_id=user.id)
        db.add(v_rec)

    v_rec.status = "approved" if data.is_verified else "rejected"
    v_rec.notes = data.notes or ("Account approved by Admin" if data.is_verified else "Account rejected by Admin")

    status_str = "Approved" if data.is_verified else "Rejected"
    send_notification(
        db,
        user_id=user.id,
        title=f"Account Verification {status_str}",
        message=f"Your account verification has been set to: {status_str}. " + (data.notes or "")
    )

    db.commit()
    return {"message": f"User verification status updated to {data.is_verified}"}

@router.patch("/users/{user_id}/status")
def toggle_user_active_status(
    user_id: int,
    data: ToggleUserStatusSchema,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    """Deactivate or reactivate a user account per SRS requirement."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own admin account")

    user.is_active = data.is_active
    db.commit()

    action_str = "Reactivated" if data.is_active else "Deactivated"
    send_notification(
        db,
        user_id=user.id,
        title=f"Account {action_str}",
        message=f"Your account has been {action_str.lower()} by system administration. Reason: {data.reason or 'Administrative review'}"
    )

    return {"message": f"User account has been {action_str.lower()}", "is_active": user.is_active}

@router.get("/donations")
def get_all_donations_admin(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    """Monitor all donations system-wide with optional status filtering."""
    process_expired_donations(db)

    query = db.query(Donation)
    if status_filter and status_filter != "all":
        query = query.filter(Donation.status == status_filter)

    donations = query.order_by(Donation.created_at.desc()).all()
    res = []
    for d in donations:
        claim_info = None
        if d.claim:
            claim_info = {
                "claim_id": d.claim.id,
                "ngo_name": d.claim.ngo.name if d.claim.ngo else "NGO",
                "volunteer_name": d.claim.volunteer.name if d.claim.volunteer else None,
                "status": d.claim.status
            }
        res.append({
            "id": d.id,
            "donor_id": d.donor_id,
            "donor_name": d.donor.name if d.donor else "Unknown",
            "donor_email": d.donor.email if d.donor else "",
            "food_name": d.food_name,
            "category": d.category,
            "quantity": d.quantity,
            "status": d.status,
            "pickup_address": d.pickup_address,
            "pickup_pincode": d.pickup_pincode,
            "mfd_datetime": d.mfd_datetime,
            "exp_datetime": d.exp_datetime,
            "photo_url": d.photo_url,
            "created_at": d.created_at,
            "claim": claim_info
        })
    return res

@router.delete("/donations/{donation_id}")
def delete_donation_admin(
    donation_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    """Admin feature: Remove inappropriate or expired listings per SRS."""
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    donor_id = donation.donor_id
    food_name = donation.food_name

    db.delete(donation)
    db.commit()

    send_notification(
        db,
        user_id=donor_id,
        title="Listing Removed by Admin",
        message=f"Your listing '{food_name}' was removed by system administration for safety or policy compliance."
    )

    return {"message": "Listing removed successfully"}

@router.get("/deliveries")
def get_all_deliveries_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    """Monitor all active and completed deliveries across the system."""
    claims = db.query(Claim).order_by(Claim.claimed_at.desc()).all()
    res = []
    for c in claims:
        d = c.donation
        res.append({
            "id": c.id,
            "donation_id": c.donation_id,
            "food_name": d.food_name if d else "Surplus Food",
            "category": d.category if d else "",
            "quantity": d.quantity if d else "",
            "donor_name": d.donor.name if d and d.donor else "Donor",
            "donor_address": d.pickup_address if d else "",
            "ngo_name": c.ngo.name if c.ngo else "NGO",
            "ngo_address": c.ngo.address if c.ngo else "",
            "volunteer_name": c.volunteer.name if c.volunteer else "Unassigned",
            "volunteer_phone": c.volunteer.phone if c.volunteer else None,
            "status": c.status,
            "claimed_at": c.claimed_at,
            "delivered_at": c.delivered_at,
            "delivery_notes": c.delivery_notes
        })
    return res

@router.get("/stats")
def get_system_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    process_expired_donations(db)

    total_users = db.query(User).count()
    verified_ngos = db.query(User).filter(User.role == "ngo", User.is_verified == True).count()
    active_volunteers = db.query(User).filter(User.role == "volunteer", User.is_active == True).count()
    active_donors = db.query(User).filter(User.role == "donor", User.is_active == True).count()

    total_donations = db.query(Donation).count()
    active_listings = db.query(Donation).filter(Donation.status == "posted").count()
    claimed_donations = db.query(Donation).filter(Donation.status.in_(["claimed", "picked_up", "completed"])).count()
    completed_deliveries = db.query(Donation).filter(Donation.status == "completed").count()
    expired_donations = db.query(Donation).filter(Donation.status == "expired").count()

    open_issues = db.query(Issue).filter(Issue.status.in_(["open", "under_review"])).count()

    return {
        "total_users": total_users,
        "active_donors": active_donors,
        "verified_ngos": verified_ngos,
        "active_volunteers": active_volunteers,
        "total_donations": total_donations,
        "active_listings": active_listings,
        "claimed_donations": claimed_donations,
        "completed_deliveries": completed_deliveries,
        "expired_donations": expired_donations,
        "open_issues": open_issues,
        "meals_saved_estimate": claimed_donations * 28, # Standard 28 meals average per donation
        "waste_reduced_kg_estimate": round(claimed_donations * 14.5, 1) # Estimated kg food diverted from landfill
    }
