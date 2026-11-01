from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Issue, Donation, Claim, Notification
from ..auth import get_current_user, require_roles
from ..services.notification_service import send_notification

router = APIRouter(prefix="/api/issues", tags=["Issues & Disputes"])

class CreateIssueSchema(BaseModel):
    subject: str
    description: str
    donation_id: Optional[int] = None
    claim_id: Optional[int] = None

class ResolveIssueSchema(BaseModel):
    status: str # 'resolved', 'dismissed', 'under_review'
    admin_notes: Optional[str] = None

@router.post("", status_code=status.HTTP_201_CREATED)
def report_issue(
    data: CreateIssueSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submits a dispute, safety issue, or delivery concern to system admins."""
    issue = Issue(
        reporter_id=current_user.id,
        donation_id=data.donation_id,
        claim_id=data.claim_id,
        subject=data.subject.strip(),
        description=data.description.strip(),
        status="open"
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    # Notify admins
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        send_notification(
            db,
            user_id=admin.id,
            title="New Issue Reported",
            message=f"Dispute/Issue reported by {current_user.name} ({current_user.role}): '{data.subject}'",
            send_external=False
        )

    # Confirm to reporter
    send_notification(
        db,
        user_id=current_user.id,
        title="Issue Report Received",
        message=f"Your ticket '{data.subject}' has been submitted. Admins will review it promptly.",
        send_external=False
    )

    return {
        "id": issue.id,
        "reporter_id": issue.reporter_id,
        "donation_id": issue.donation_id,
        "claim_id": issue.claim_id,
        "subject": issue.subject,
        "description": issue.description,
        "status": issue.status,
        "created_at": issue.created_at
    }

@router.get("/my")
def get_my_reported_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns issues submitted by the authenticated user."""
    issues = db.query(Issue).filter(Issue.reporter_id == current_user.id).order_by(Issue.created_at.desc()).all()
    res = []
    for iss in issues:
        res.append({
            "id": iss.id,
            "reporter_id": iss.reporter_id,
            "donation_id": iss.donation_id,
            "claim_id": iss.claim_id,
            "subject": iss.subject,
            "description": iss.description,
            "status": iss.status,
            "admin_notes": iss.admin_notes,
            "created_at": iss.created_at,
            "updated_at": iss.updated_at
        })
    return res

@router.get("/admin/all")
def get_all_issues_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    """Admin endpoint to view all system disputes and issues."""
    issues = db.query(Issue).order_by(Issue.created_at.desc()).all()
    res = []
    for iss in issues:
        res.append({
            "id": iss.id,
            "reporter_id": iss.reporter_id,
            "reporter_name": iss.reporter.name if iss.reporter else "User",
            "reporter_email": iss.reporter.email if iss.reporter else "",
            "reporter_role": iss.reporter.role if iss.reporter else "",
            "donation_id": iss.donation_id,
            "claim_id": iss.claim_id,
            "subject": iss.subject,
            "description": iss.description,
            "status": iss.status,
            "admin_notes": iss.admin_notes,
            "created_at": iss.created_at,
            "updated_at": iss.updated_at
        })
    return res

@router.patch("/{issue_id}/resolve")
def resolve_issue(
    issue_id: int,
    data: ResolveIssueSchema,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    """Admin endpoint to resolve, dismiss, or add investigation notes to an issue."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if data.status not in ["open", "under_review", "resolved", "dismissed"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    issue.status = data.status
    if data.admin_notes:
        issue.admin_notes = data.admin_notes
    issue.updated_at = datetime.utcnow()

    db.commit()

    # Notify reporter
    send_notification(
        db,
        user_id=issue.reporter_id,
        title=f"Ticket Status Update: {data.status.replace('_', ' ').title()}",
        message=f"Your ticket '{issue.subject}' has been updated to '{data.status}'. Notes: {data.admin_notes or 'None'}"
    )

    return {"message": "Issue updated successfully", "issue_id": issue.id}
