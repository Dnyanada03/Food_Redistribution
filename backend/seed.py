import os
import sys
from datetime import datetime, timedelta

# Ensure parent directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.models import User, VerificationRecord, Donation, Claim, Notification, Issue
from app.auth import hash_password

def seed_database():
    if not engine.url.drivername.startswith("sqlite"):
        # For PostgreSQL, cleanly reset public schema (resets identity counters & tables)
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        Base.metadata.create_all(bind=engine)
    else:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        print("[+] Seeding FRS comprehensive database...")

        # 1. Admin User
        admin = User(
            name="System Admin",
            email="admin@test.com",
            password_hash=hash_password("password123"),
            role="admin",
            org_type="central_admin",
            phone="+1-800-555-0100",
            address="100 Civic Center Plaza, Suite 400",
            pincode="10001",
            is_verified=True,
            is_active=True
        )

        # 2. Donor 1 (Verified Restaurant)
        donor = User(
            name="Green Choice Bistro",
            email="donor@test.com",
            password_hash=hash_password("password123"),
            role="donor",
            org_type="restaurant",
            phone="+1-555-0192",
            address="452 Harvest Avenue, Downtown",
            pincode="10001",
            is_verified=True,
            is_active=True
        )

        # 3. Donor 2 (Hotel Banquets)
        donor2 = User(
            name="Grand Horizon Hotel Banquets",
            email="donor2@test.com",
            password_hash=hash_password("password123"),
            role="donor",
            org_type="hotel",
            phone="+1-555-0195",
            address="880 Skyline Boulevard, Westside",
            pincode="10002",
            is_verified=True,
            is_active=True
        )

        # 4. NGO User (Verified Charitable Org)
        ngo_verified = User(
            name="Hope Shelter Foundation",
            email="ngo@test.com",
            password_hash=hash_password("password123"),
            role="ngo",
            org_type="charitable_org",
            phone="+1-555-0144",
            address="12 Community Road, Sector 4",
            pincode="10001",
            is_verified=True,
            is_active=True
        )

        # 5. NGO User (Pending Verification)
        ngo_pending = User(
            name="City Food Aid Guild",
            email="unverified_ngo@test.com",
            password_hash=hash_password("password123"),
            role="ngo",
            org_type="charitable_org",
            phone="+1-555-0188",
            address="89 Metro Blvd, North District",
            pincode="10002",
            is_verified=False,
            is_active=True
        )

        # 6. Volunteer 1 (Alex Rivera)
        volunteer = User(
            name="Alex Rivera",
            email="volunteer@test.com",
            password_hash=hash_password("password123"),
            role="volunteer",
            org_type="individual_volunteer",
            phone="+1-555-0177",
            address="23 Oak Street, Apt 3B",
            pincode="10001",
            is_verified=True,
            is_active=True
        )

        # 7. Volunteer 2 (Maria Santos)
        volunteer2 = User(
            name="Maria Santos",
            email="volunteer2@test.com",
            password_hash=hash_password("password123"),
            role="volunteer",
            org_type="individual_volunteer",
            phone="+1-555-0179",
            address="150 Pine Lane",
            pincode="10002",
            is_verified=True,
            is_active=True
        )

        db.add_all([admin, donor, donor2, ngo_verified, ngo_pending, volunteer, volunteer2])
        db.commit()

        # Verification Records
        v_rec_pending = VerificationRecord(
            user_id=ngo_pending.id,
            status="pending",
            notes="Requires validation of 501(c)(3) tax exemption document."
        )
        v_rec_donor = VerificationRecord(
            user_id=donor.id,
            status="approved",
            notes="Commercial kitchen safety permit verified."
        )
        db.add_all([v_rec_pending, v_rec_donor])

        now = datetime.utcnow()

        # 1. Posted: Vegetable Curry (< 2h expiry -> Clay alert)
        d1 = Donation(
            donor_id=donor.id,
            food_name="Fresh Vegetable Curry & Steamed Rice",
            category="prepared_meal",
            quantity="40 boxed meals (approx. 20 kg)",
            contains_allergens="Contains soy, tree nuts",
            mfd_datetime=now - timedelta(hours=2),
            exp_datetime=now + timedelta(hours=1, minutes=30), # Urgent < 2h
            pickup_address="452 Harvest Avenue, Kitchen Back Entrance",
            pickup_pincode="10001",
            pickup_window="Today 6:00 PM - 8:30 PM",
            photo_url="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
            status="posted"
        )

        # 2. Posted: Whole Wheat Bread & Pastries (14h expiry)
        d2 = Donation(
            donor_id=donor.id,
            food_name="Assorted Fresh Whole Wheat Bread & Croissants",
            category="bakery",
            quantity="25 kg surplus bakery",
            contains_allergens="Contains gluten, wheat, dairy",
            mfd_datetime=now - timedelta(hours=4),
            exp_datetime=now + timedelta(hours=14),
            pickup_address="452 Harvest Avenue, Front Bakery Counter",
            pickup_pincode="10001",
            pickup_window="Today 7:00 PM - 9:00 PM",
            photo_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
            status="posted"
        )

        # 3. Posted: Organic Farm Produce (2 days expiry)
        d3 = Donation(
            donor_id=donor2.id,
            food_name="Organic Farm Produce (Apples, Carrots, Tomatoes)",
            category="produce",
            quantity="15 crates (approx. 60 kg)",
            contains_allergens="None",
            mfd_datetime=now - timedelta(hours=6),
            exp_datetime=now + timedelta(days=2),
            pickup_address="880 Skyline Boulevard, Loading Dock B",
            pickup_pincode="10002",
            pickup_window="Tomorrow 9:00 AM - 12:00 PM",
            photo_url="https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80",
            status="posted"
        )

        # 4. Claimed (Available task for volunteers to accept!)
        d4 = Donation(
            donor_id=donor2.id,
            food_name="Deluxe Catered Sandwich & Wrap Platters",
            category="prepared_meal",
            quantity="50 packed platters (approx. 80 servings)",
            contains_allergens="Contains gluten, dairy, egg",
            mfd_datetime=now - timedelta(hours=3),
            exp_datetime=now + timedelta(hours=5),
            pickup_address="880 Skyline Boulevard, Banquet Service Door",
            pickup_pincode="10002",
            pickup_window="Today 7:30 PM - 9:00 PM",
            photo_url="https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80",
            status="claimed"
        )

        # 5. In Transit (Picked up by Volunteer Alex Rivera)
        d5 = Donation(
            donor_id=donor.id,
            food_name="Hearty Lentil Soup & Dinner Rolls",
            category="prepared_meal",
            quantity="35 insulated containers",
            contains_allergens="Contains celery, gluten",
            mfd_datetime=now - timedelta(hours=5),
            exp_datetime=now + timedelta(hours=3),
            pickup_address="452 Harvest Avenue, Kitchen Back Entrance",
            pickup_pincode="10001",
            pickup_window="Today 5:00 PM - 6:30 PM",
            photo_url="https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80",
            status="picked_up"
        )

        # 6. Completed / Delivered
        d6 = Donation(
            donor_id=donor.id,
            food_name="Fresh Cut Seasonal Fruit Salad Bowls",
            category="produce",
            quantity="30 large bowls (approx. 15 kg)",
            contains_allergens="None",
            mfd_datetime=now - timedelta(days=1),
            exp_datetime=now + timedelta(hours=12),
            pickup_address="452 Harvest Avenue, Kitchen Back Entrance",
            pickup_pincode="10001",
            pickup_window="Yesterday 3:00 PM - 5:00 PM",
            photo_url="https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=600&auto=format&fit=crop&q=80",
            status="completed"
        )

        # 7. Expired (Historical record)
        d7 = Donation(
            donor_id=donor.id,
            food_name="Buffet Steam Tray Pasta Primavera",
            category="prepared_meal",
            quantity="20 kg buffet surplus",
            contains_allergens="Contains dairy, gluten",
            mfd_datetime=now - timedelta(days=2),
            exp_datetime=now - timedelta(hours=4), # Passed
            pickup_address="452 Harvest Avenue",
            pickup_pincode="10001",
            pickup_window="Yesterday 1:00 PM",
            photo_url="https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80",
            status="expired"
        )

        db.add_all([d1, d2, d3, d4, d5, d6, d7])
        db.commit()

        # Claims for d4, d5, d6
        # Claim 1: d4 is claimed by NGO, no volunteer assigned yet -> Task available in volunteer queue!
        c1 = Claim(
            donation_id=d4.id,
            ngo_id=ngo_verified.id,
            volunteer_id=None,
            status="claimed",
            delivery_notes="Please use the side service ramp when collecting boxes.",
            claimed_at=now - timedelta(minutes=45)
        )

        # Claim 2: d5 is picked up / in transit with volunteer Alex Rivera
        c2 = Claim(
            donation_id=d5.id,
            ngo_id=ngo_verified.id,
            volunteer_id=volunteer.id,
            status="in_transit",
            delivery_notes="Food picked up safely at 5:15 PM, driving carefully via 5th Ave.",
            claimed_at=now - timedelta(hours=2)
        )

        # Claim 3: d6 is completed / delivered
        c3 = Claim(
            donation_id=d6.id,
            ngo_id=ngo_verified.id,
            volunteer_id=volunteer.id,
            status="delivered",
            delivery_notes="Delivered directly to Hope Shelter kitchen staff. Received by Maria.",
            claimed_at=now - timedelta(days=1, hours=2),
            delivered_at=now - timedelta(days=1)
        )

        db.add_all([c1, c2, c3])
        db.commit()

        # Seed Issues / Disputes
        iss1 = Issue(
            reporter_id=ngo_verified.id,
            donation_id=d4.id,
            claim_id=c1.id,
            subject="Special Temperature Control Required",
            description="The sandwich platters contain mayonnaise and dairy. Requesting a volunteer with an insulated cold bag.",
            status="open",
            admin_notes=None
        )
        iss2 = Issue(
            reporter_id=donor.id,
            donation_id=d6.id,
            claim_id=c3.id,
            subject="Pickup Window Rescheduled Successfully",
            description="Donor requested 30 min window delay due to catering rush. Volunteer accommodated smoothly.",
            status="resolved",
            admin_notes="Resolved - Both parties confirmed delivery completed on time."
        )
        db.add_all([iss1, iss2])

        # Seed Notifications
        n1 = Notification(
            user_id=ngo_verified.id,
            title="Fresh Surplus Available",
            message="Green Choice Bistro posted 40 vegetable curry meals near pincode 10001.",
            is_read=False
        )
        n2 = Notification(
            user_id=ngo_verified.id,
            title="Volunteer In Transit",
            message=f"Alex Rivera ({volunteer.phone}) has picked up '{d5.food_name}' and is en route to your shelter.",
            is_read=False
        )
        n3 = Notification(
            user_id=donor.id,
            title="Donation Picked Up",
            message=f"Volunteer Alex Rivera picked up '{d5.food_name}' from your kitchen.",
            is_read=True
        )
        n4 = Notification(
            user_id=volunteer.id,
            title="New Delivery Task Available",
            message=f"Hope Shelter Foundation needs delivery for '{d4.food_name}' from Grand Horizon Hotel.",
            is_read=False
        )
        n5 = Notification(
            user_id=admin.id,
            title="Pending Account Verification",
            message="City Food Aid Guild is waiting for NGO verification approval.",
            is_read=False
        )
        n6 = Notification(
            user_id=admin.id,
            title="New Issue Reported",
            message="Hope Shelter Foundation reported a note regarding temperature control on donation #4.",
            is_read=False
        )

        db.add_all([n1, n2, n3, n4, n5, n6])
        db.commit()

        print("[SUCCESS] Database successfully seeded with full lifecycle data!")
        print("\n[*] Ready Demo Accounts:")
        print("  - Admin:          admin@test.com / password123")
        print("  - Donor:          donor@test.com / password123")
        print("  - Donor 2:        donor2@test.com / password123")
        print("  - Verified NGO:   ngo@test.com / password123")
        print("  - Pending NGO:    unverified_ngo@test.com / password123")
        print("  - Volunteer:      volunteer@test.com / password123")
        print("  - Volunteer 2:    volunteer2@test.com / password123")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
