from datetime import datetime
from sqlalchemy.orm import Session
from ..models import Donation, Notification

def process_expired_donations(db: Session) -> int:
    """
    Checks all posted donations that have passed their exp_datetime
    and sets their status to 'expired'. Notifies donor per SRS requirement.
    Returns count of updated items.
    """
    now = datetime.utcnow()
    expired_items = db.query(Donation).filter(
        Donation.status == "posted",
        Donation.exp_datetime <= now
    ).all()

    for donation in expired_items:
        donation.status = "expired"
        notif = Notification(
            user_id=donation.donor_id,
            title="Listing Expired",
            message=f"Your surplus listing '{donation.food_name}' has passed its safety expiration time and is now archived.",
            is_read=False
        )
        db.add(notif)

    if expired_items:
        db.commit()

    return len(expired_items)
