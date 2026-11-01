from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) # 'donor', 'ngo', 'volunteer', 'admin'
    org_type = Column(String(100), nullable=True) # e.g. 'restaurant', 'hotel', 'charitable_org'
    phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=False)
    pincode = Column(String(20), nullable=False, index=True)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    reset_token = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    donations = relationship("Donation", back_populates="donor", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="ngo", foreign_keys="[Claim.ngo_id]")
    volunteer_claims = relationship("Claim", back_populates="volunteer", foreign_keys="[Claim.volunteer_id]")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="reporter", cascade="all, delete-orphan")


class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False, default="pending") # 'pending', 'approved', 'rejected'
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    food_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False) # 'prepared_meal', 'produce', 'bakery', 'canned', 'packaged', 'raw_ingredient'
    quantity = Column(String(100), nullable=False)
    contains_allergens = Column(Text, nullable=True)
    mfd_datetime = Column(DateTime, nullable=False)
    exp_datetime = Column(DateTime, nullable=False, index=True)
    pickup_address = Column(Text, nullable=False)
    pickup_pincode = Column(String(20), nullable=False, index=True)
    pickup_window = Column(String(255), nullable=False)
    photo_url = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="posted", index=True) # 'posted', 'claimed', 'picked_up', 'completed', 'expired'
    created_at = Column(DateTime, default=datetime.utcnow)

    donor = relationship("User", back_populates="donations")
    claim = relationship("Claim", back_populates="donation", uselist=False, cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="donation")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id", ondelete="CASCADE"), unique=True, nullable=False)
    ngo_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    volunteer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), nullable=False, default="claimed") # 'claimed', 'in_transit', 'delivered', 'cancelled'
    delivery_notes = Column(Text, nullable=True)
    claimed_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)

    donation = relationship("Donation", back_populates="claim")
    ngo = relationship("User", foreign_keys=[ngo_id], back_populates="claims")
    volunteer = relationship("User", foreign_keys=[volunteer_id], back_populates="volunteer_claims")
    issues = relationship("Issue", back_populates="claim")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    donation_id = Column(Integer, ForeignKey("donations.id", ondelete="SET NULL"), nullable=True)
    claim_id = Column(Integer, ForeignKey("claims.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="open") # 'open', 'under_review', 'resolved', 'dismissed'
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reporter = relationship("User", back_populates="issues")
    donation = relationship("Donation", back_populates="issues")
    claim = relationship("Claim", back_populates="issues")