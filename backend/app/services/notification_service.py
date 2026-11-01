import logging
from abc import ABC, abstractmethod
from typing import Optional, List
from sqlalchemy.orm import Session
from ..models import Notification, User, Donation, Claim

logger = logging.getLogger("frs.notifications")
logger.setLevel(logging.INFO)

class BaseNotificationProvider(ABC):
    """Abstract interface for external notification delivery (SMS, Email, Push)."""
    @abstractmethod
    def send_email(self, to_email: str, subject: str, body: str) -> bool:
        pass

    @abstractmethod
    def send_sms(self, to_phone: str, message: str) -> bool:
        pass

class MockEmailSMSProvider(BaseNotificationProvider):
    """
    Mock implementation for development & demonstration.
    Logs email and SMS dispatches cleanly so any production provider (SendGrid, Twilio, AWS SES)
    can be swapped in by replacing this provider class.
    """
    def send_email(self, to_email: str, subject: str, body: str) -> bool:
        logger.info(f"[EMAIL DISPATCH] To: {to_email} | Subject: '{subject}' | Content: {body[:80]}...")
        return True

    def send_sms(self, to_phone: str, message: str) -> bool:
        logger.info(f"[SMS DISPATCH] To: {to_phone} | Message: '{message}'")
        return True

# Default provider instance
notification_provider: BaseNotificationProvider = MockEmailSMSProvider()

def send_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    send_external: bool = True
) -> Notification:
    """
    Persists an in-app notification in the database, and optionally dispatches
    external Email / SMS alerts via the notification provider interface.
    """
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    if send_external:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            if user.email:
                notification_provider.send_email(user.email, f"FRS Alert: {title}", message)
            if user.phone:
                notification_provider.send_sms(user.phone, f"FRS: {title} - {message}")

    return notif

def notify_new_donation_posted(db: Session, donation: Donation):
    """
    Notifies verified NGOs in the system that a new donation matching category/pincode is available.
    """
    ngos = db.query(User).filter(User.role == "ngo", User.is_verified == True, User.is_active == True).all()
    for ngo in ngos:
        send_notification(
            db,
            user_id=ngo.id,
            title="Fresh Surplus Available",
            message=f"New surplus food '{donation.food_name}' ({donation.quantity}) posted in pincode {donation.pickup_pincode}. Claim now before expiry!",
            send_external=False
        )

def notify_claim_event(db: Session, claim: Claim, event: str):
    """
    Dispatches notifications based on claims lifecycle events:
    'claimed', 'assigned_volunteer', 'in_transit', 'delivered', 'cancelled'.
    """
    donation = claim.donation
    ngo = claim.ngo
    volunteer = claim.volunteer
    donor = donation.donor if donation else None

    if event == "claimed":
        if donor:
            send_notification(
                db,
                user_id=donor.id,
                title="Donation Claimed!",
                message=f"Your donation '{donation.food_name}' was claimed by {ngo.name}. Preparing for pickup.",
            )
        send_notification(
            db,
            user_id=ngo.id,
            title="Donation Claim Confirmed",
            message=f"You successfully claimed '{donation.food_name}'. A volunteer will be dispatched for pickup.",
        )

    elif event == "assigned_volunteer":
        if volunteer and donor:
            send_notification(
                db,
                user_id=donor.id,
                title="Volunteer Assigned",
                message=f"Volunteer {volunteer.name} ({volunteer.phone}) has accepted pickup for '{donation.food_name}'.",
            )
        if volunteer:
            send_notification(
                db,
                user_id=ngo.id,
                title="Volunteer En Route for Pickup",
                message=f"Volunteer {volunteer.name} ({volunteer.phone}) accepted delivery of '{donation.food_name}' to your shelter.",
            )
            send_notification(
                db,
                user_id=volunteer.id,
                title="Task Confirmed",
                message=f"You accepted delivery of '{donation.food_name}' from {donor.name} to {ngo.name}.",
            )

    elif event == "in_transit":
        send_notification(
            db,
            user_id=ngo.id,
            title="Food Picked Up — In Transit",
            message=f"'{donation.food_name}' was picked up from donor and is on the way to your shelter location.",
        )

    elif event == "delivered":
        if donor:
            send_notification(
                db,
                user_id=donor.id,
                title="Delivery Completed!",
                message=f"Your donation '{donation.food_name}' has been safely delivered to {ngo.name}. Thank you for saving meals!",
            )
        send_notification(
            db,
            user_id=ngo.id,
            title="Delivery Received",
            message=f"'{donation.food_name}' has been marked as safely delivered to your organization.",
        )
        if volunteer:
            send_notification(
                db,
                user_id=volunteer.id,
                title="Delivery Complete Confirmed",
                message=f"Great work! Delivery for '{donation.food_name}' is confirmed complete.",
            )
