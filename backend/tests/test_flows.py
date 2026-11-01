import os
import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import User, Donation, Claim, VerificationRecord
from app.auth import hash_password

client = TestClient(app)

def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_user_registration_and_login():
    # Register a new NGO
    reg_payload = {
        "name": "Community Table Org",
        "email": "table@test.com",
        "password": "password123",
        "role": "ngo",
        "org_type": "charitable_org",
        "phone": "+1-555-9988",
        "address": "909 Unity Way",
        "pincode": "10001"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["user"]["is_verified"] is False # NGO starts unverified
    token = reg_data["access_token"]

    # Login
    login_res = client.post("/api/auth/login", json={"email": "table@test.com", "password": "password123"})
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_business_rule_unverified_ngo_cannot_claim():
    # Login as unverified NGO
    login_res = client.post("/api/auth/login", json={"email": "unverified_ngo@test.com", "password": "password123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Try to claim donation #1
    claim_res = client.post(
        "/api/donations/1/claim",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert claim_res.status_code == 403
    assert "verification required" in claim_res.json()["detail"].lower()

def test_donor_post_and_food_safety_validation():
    # Login as Donor
    login_res = client.post("/api/auth/login", json={"email": "donor@test.com", "password": "password123"})
    token = login_res.json()["access_token"]

    now = datetime.utcnow()
    # Test invalid: expiry in the past
    bad_payload = {
        "food_name": "Test Old Food",
        "category": "prepared_meal",
        "quantity": "10 meals",
        "mfd_datetime": (now - timedelta(hours=10)).isoformat(),
        "exp_datetime": (now - timedelta(hours=1)).isoformat(),
        "pickup_address": "Test street",
        "pickup_pincode": "10001",
        "pickup_window": "Now"
    }
    res_bad = client.post("/api/donations", json=bad_payload, headers={"Authorization": f"Bearer {token}"})
    assert res_bad.status_code == 400

    # Test valid donation
    good_payload = {
        "food_name": "Fresh Warm Stew",
        "category": "prepared_meal",
        "quantity": "20 containers",
        "contains_allergens": "celery",
        "mfd_datetime": (now - timedelta(hours=1)).isoformat(),
        "exp_datetime": (now + timedelta(hours=6)).isoformat(),
        "pickup_address": "452 Harvest Ave",
        "pickup_pincode": "10001",
        "pickup_window": "Tonight 7 PM - 9 PM"
    }
    res_good = client.post("/api/donations", json=good_payload, headers={"Authorization": f"Bearer {token}"})
    assert res_good.status_code == 201
    assert res_good.json()["food_name"] == "Fresh Warm Stew"

def test_full_redistribution_lifecycle():
    # 1. Login Admin and verify pending NGO
    admin_res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "password123"})
    admin_token = admin_res.json()["access_token"]

    # Verify ngo@test.com (already verified in seed, check verification status)
    user_res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert user_res.status_code == 200

    # 2. Login Verified NGO
    ngo_res = client.post("/api/auth/login", json={"email": "ngo@test.com", "password": "password123"})
    ngo_token = ngo_res.json()["access_token"]

    # Claim donation #2 (Whole wheat bread)
    claim_res = client.post("/api/donations/2/claim", headers={"Authorization": f"Bearer {ngo_token}"})
    assert claim_res.status_code == 200
    claim_id = claim_res.json()["claim_id"]

    # Business rule: Cannot claim twice
    claim_again = client.post("/api/donations/2/claim", headers={"Authorization": f"Bearer {ngo_token}"})
    assert claim_again.status_code == 400

    # 3. Volunteer views available tasks
    vol_res = client.post("/api/auth/login", json={"email": "volunteer@test.com", "password": "password123"})
    vol_token = vol_res.json()["access_token"]

    tasks_res = client.get("/api/claims/tasks", headers={"Authorization": f"Bearer {vol_token}"})
    assert tasks_res.status_code == 200
    tasks = tasks_res.json()
    assert any(t["id"] == claim_id for t in tasks)

    # Volunteer accepts task
    accept_res = client.post(f"/api/claims/{claim_id}/accept-task", headers={"Authorization": f"Bearer {vol_token}"})
    assert accept_res.status_code == 200

    # Volunteer marks in transit
    transit_res = client.post(
        f"/api/claims/{claim_id}/status",
        json={"status": "in_transit", "delivery_notes": "Picked up from donor kitchen"},
        headers={"Authorization": f"Bearer {vol_token}"}
    )
    assert transit_res.status_code == 200

    # Volunteer marks delivered
    deliv_res = client.post(
        f"/api/claims/{claim_id}/status",
        json={"status": "delivered", "delivery_notes": "Handed to recipient shelter"},
        headers={"Authorization": f"Bearer {vol_token}"}
    )
    assert deliv_res.status_code == 200

def test_password_recovery_flow():
    # Request reset code
    req_res = client.post("/api/auth/forgot-password", json={"email": "donor@test.com"})
    assert req_res.status_code == 200
    token = req_res.json()["demo_reset_token"]

    # Reset password with token
    reset_res = client.post("/api/auth/reset-password", json={
        "email": "donor@test.com",
        "reset_token": token,
        "new_password": "password123" # restore original
    })
    assert reset_res.status_code == 200

def test_disputes_and_issues_lifecycle():
    # User reports issue
    user_res = client.post("/api/auth/login", json={"email": "ngo@test.com", "password": "password123"})
    token = user_res.json()["access_token"]

    iss_res = client.post(
        "/api/issues",
        json={"subject": "Late volunteer arrival", "description": "Delivery was 20 minutes delayed."},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert iss_res.status_code == 201
    issue_id = iss_res.json()["id"]

    # Admin resolves issue
    admin_res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "password123"})
    admin_token = admin_res.json()["access_token"]

    resolve_res = client.patch(
        f"/api/issues/{issue_id}/resolve",
        json={"status": "resolved", "admin_notes": "Volunteer encountered heavy traffic, resolved amicably."},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resolve_res.status_code == 200

if __name__ == "__main__":
    print("[*] Running FRS comprehensive automated tests...")
    test_api_root()
    test_user_registration_and_login()
    test_business_rule_unverified_ngo_cannot_claim()
    test_donor_post_and_food_safety_validation()
    test_full_redistribution_lifecycle()
    test_password_recovery_flow()
    test_disputes_and_issues_lifecycle()
    print("[SUCCESS] All 7 test suites passed with 100% compliance!")
