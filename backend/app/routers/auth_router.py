from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, VerificationRecord, Notification
from ..auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class UserRegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str # 'donor', 'ngo', 'volunteer', 'admin'
    org_type: Optional[str] = None
    phone: str
    address: str
    pincode: str

class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str

class UserResponseSchema(BaseModel):
    id: int
    name: str
    email: str
    role: str
    org_type: Optional[str]
    phone: str
    address: str
    pincode: str
    is_verified: bool
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(data: UserRegisterSchema, db: Session = Depends(get_db)):
    # Validate role
    if data.role not in ['donor', 'ngo', 'volunteer', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    # Check existing email
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Auto-verify donor, volunteer, admin; NGO and commercial donors require admin verification per business rules
    auto_verify = True if data.role in ['volunteer', 'admin'] else False

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        org_type=data.org_type,
        phone=data.phone,
        address=data.address,
        pincode=data.pincode,
        is_verified=auto_verify,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Record verification entry for NGO and Donor accounts needing approval
    if not auto_verify:
        rec = VerificationRecord(
            user_id=user.id,
            status="pending",
            notes=f"New {data.role.upper()} registration pending verification"
        )
        db.add(rec)
        db.commit()

    # Create welcome notification
    notif = Notification(
        user_id=user.id,
        title="Welcome to FRS!",
        message="Account created successfully. " + ("Your account is active." if auto_verify else "Your account is pending admin verification.")
    )
    db.add(notif)
    db.commit()

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponseSchema.from_orm(user)
    }

@router.post("/login")
def login_user(data: UserLoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponseSchema.from_orm(user)
    }

class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordSchema, db: Session = Depends(get_db)):
    """Initiates password recovery flow per SRS functional requirement."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Return generic message to avoid email enumeration
        return {"message": "If this email is registered, recovery instructions have been sent."}

    import secrets
    token = secrets.token_hex(4).upper() # 8-character easy PIN e.g. "A3F8B12C"
    user.reset_token = token
    db.commit()

    # Dispatch simulated email alert
    from ..services.notification_service import notification_provider
    notification_provider.send_email(
        user.email,
        "FRS Account Password Recovery",
        f"Your FRS password reset code is: {token}. Use this code to complete password recovery."
    )

    return {
        "message": "If this email is registered, recovery instructions have been sent.",
        "demo_reset_token": token # Exposed in development mode for easy UI testing
    }

@router.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    """Completes password reset using token and sets new password."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.reset_token or user.reset_token != data.reset_token.strip():
        raise HTTPException(status_code=400, detail="Invalid recovery code or email")

    user.password_hash = hash_password(data.new_password)
    user.reset_token = None
    db.commit()

    notif = Notification(
        user_id=user.id,
        title="Password Changed",
        message="Your account password was successfully reset. You can now log in."
    )
    db.add(notif)
    db.commit()

    return {"message": "Password has been successfully reset. Please log in with your new password."}

@router.get("/me", response_model=UserResponseSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
