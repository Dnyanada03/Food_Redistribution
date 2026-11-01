# Food Redistribution System (FRS)

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite_%2F_PostgreSQL-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Tests](https://img.shields.io/badge/Tests-7_Suites_Passing-2B4C36)](https://pytest.org/)
[![Design](https://img.shields.io/badge/Design_System-DESIGN.md_Compliant-E2A33B)](DESIGN.md)

A mission-driven web application connecting restaurants, hotels, bakeries, and households with surplus food to verified NGOs, shelters, and community volunteers — preventing food waste, enforcing strict safety windows, and getting meals quickly to people who need them.

---

## 📋 Table of Contents

- [Overview & Mission](#-overview--mission)
- [System Roles & RBAC Matrix](#-system-roles--rbac-matrix)
- [Key Functional Modules](#-key-functional-modules)
- [Swappable Services Architecture](#-swappable-services-architecture)
- [Visual Design System](#-visual-design-system)
- [Relational Database Schema](#-relational-database-schema)
- [REST API Reference](#-rest-api-reference)
- [Pre-Seeded Demo Test Accounts](#-pre-seeded-demo-test-accounts)
- [Local Setup & Execution Guide](#-local-setup--execution-guide)
- [Automated Integration Testing](#-automated-integration-testing)
- [Project Directory Structure](#-project-directory-structure)

---

## 🌍 Overview & Mission

Food wastage and hunger occur concurrently in every urban center. The **Food Redistribution System (FRS)** bridges this disconnect through an accountable, auditable, and transparent digital platform:

1. **Donors:** An ultra-fast interface to post prepared meals, produce, or bakery surplus with safety timestamps (MFD & EXP), allergen declarations, and pickup windows.
2. **Verified NGOs:** Real-time discovery feed of available surplus food nearby, filterable by food category and postal code distance, with instant reservation.
3. **Volunteers:** Clear queue of dispatch tasks with donor pickup and shelter drop-off directions to safely move food before expiration.
4. **Administrators:** Complete operational governance, organization verifications, delivery monitoring, and dispute resolution.

---

## 👥 System Roles & RBAC Matrix

FRS enforces server-side Role-Based Access Control (RBAC) across four distinct roles:

| Role | Role Accent | Hex Token | Primary Responsibilities |
|---|---|---|---|
| **Donor** | Basil | `#2B4C36` | Posts surplus listings, edits active listings, cancels donations, tracks NGO claims and courier transit status. |
| **NGO / Recipient** | Marigold | `#E2A33B` | Explores surplus listings, views allergen/safety details, claims food (verified NGOs only), and tracks real-time courier transport. |
| **Volunteer Courier** | Sage | `#8AA285` | Browses available pickup tasks, accepts delivery assignments, updates transit status (`In Transit` $\rightarrow$ `Delivered`), and logs route notes. |
| **Administrator** | Bark | `#26241E` | Audits organization verification queue, deactivates accounts, removes expired/inappropriate listings, resolves disputes, and monitors impact metrics. |

---

## 📦 Key Functional Modules

### 1. Authentication & Password Recovery
- Registration and JWT token issuance for all 4 roles.
- Role-based automatic dashboard redirect upon login.
- 1-click credential pre-fill buttons for demo testing.
- **Password Recovery Flow:** Dedicated `forgot-password` and `reset-password` endpoints generating secure 8-character recovery codes with email dispatch simulation.

### 2. Donor Portal (`DonorDashboard.jsx` & `donations_router.py`)
- **Surplus Food Publishing:** Food title, category, quantity/servings, allergen notes, preparation date (MFD), expiry limit (EXP), pickup window, address, and food photograph.
- **Active Listing Management:** Donors can update active (unclaimed) listings or cancel them.
- **Logistics & Claim Tracking:** Donors can see in real-time which verified NGO claimed their food, the assigned volunteer courier, and delivery completion confirmation.
- **Dispute Reporting:** Modal to flag problems or schedule conflicts to administrators.

### 3. NGO Recipient Discovery & Claims (`NgoDashboard.jsx` & `claims_router.py`)
- **Real-Time Surplus Feed:** Filterable by category (`Prepared Meal`, `Produce`, `Bakery`, `Canned`, `Raw Ingredient`) and postal code distance.
- **Donation Detail & Safety Modal:** Live countdown timers with Clay urgency indicators for food expiring in $<2\text{ hours}$, allergen declarations, donor contacts, and OpenStreetMap GPS locality coordinates.
- **Business Rule Enforcement:** Only verified NGOs can claim; single-claim rule enforced server-side.
- **Activity & Received History:** Live courier status tracking (`Claimed` $\rightarrow$ `In Transit` $\rightarrow$ `Delivered`) and history log.

### 4. Volunteer Dispatch Center (`VolunteerDashboard.jsx` & `claims_router.py`)
- **Available Delivery Queue:** Displays ready pickup tasks with donor origin, recipient shelter destination, quantity, and approximate distance in kilometers.
- **Task Acceptance:** Single-click task reservation assigns the volunteer courier.
- **Route Tracking & Status Progression:** Volunteer updates task from `In Transit` to `Delivered` with logistics notes.
- **Delivery History:** Personal log of completed food rescue missions.

### 5. Administrator Governance & Audit Console (`AdminDashboard.jsx` & `admin_router.py`)
- **User Verifications Queue:** Review and approve/reject NGO and commercial Donor accounts with verification notes.
- **Account Status Management:** Deactivate or reactivate accounts with mandatory administrative audit reasons.
- **Listings Oversight:** View all system donations, filter by status (`posted`, `claimed`, `picked_up`, `completed`, `expired`), and delete inappropriate or unsafe listings with donor alerts.
- **Logistics & Deliveries Monitor:** Real-time visibility into all transit routes and courier dispatches.
- **Dispute & Issue Tickets:** Review dispute tickets submitted by users, resolve or dismiss them with notes, and automatically notify the reporter.
- **Impact & Redistribution Reports:** Audit metrics for total meals saved, kg food diverted from landfills, and estimated greenhouse gas offsets.

### 6. Notifications System (`notifications_router.py` & `Navbar.jsx`)
- In-app notification bell in the navigation header with live unread badge counter.
- Automated triggers on:
  - New surplus food posted (notifies verified NGOs nearby).
  - Food claimed (notifies donor and NGO).
  - Volunteer assigned to task (notifies donor, NGO, and volunteer).
  - Courier in transit (notifies NGO).
  - Delivery completed (notifies donor, NGO, and volunteer).
  - Listing expired (notifies donor).
  - Account verification / deactivation status updated.
- One-click "Mark as read" and "Mark all as read".

---

## 🔌 Swappable Services Architecture

To satisfy enterprise extensibility and address SRS open items, external integrations are built behind clean abstract interfaces:

1. **Notification Service (`notification_service.py`)**:
   - `BaseNotificationProvider`: Abstract interface for SMS and Email delivery.
   - `MockEmailSMSProvider`: Developer implementation logging dispatches cleanly; seamlessly replaceable by Twilio, SendGrid, or AWS SES.
2. **Location Service (`location_service.py`)**:
   - `BaseLocationProvider`: Abstract interface for geolocation and route estimation.
   - `MockLocationProvider`: Calculates distance in kilometers between postal codes and produces GPS coordinates; swappable with Google Maps or Mapbox.
3. **Storage Service (`storage_service.py`)**:
   - `BaseStorageProvider`: Abstract interface for food photo assets.
   - `MockStorageProvider`: Supplies curated Unsplash category photography and asset paths; swappable with AWS S3, Cloudinary, or Azure Blob Storage.
4. **Food Safety Validator (`safety_service.py`)**:
   - `BaseFoodSafetyValidator`: Enforces jurisdiction-specific food safety windows (e.g., prepared meals $\le 48\text{h}$ shelf life) and flags high-risk allergens (peanuts, shellfish, gluten, dairy).
5. **Automated Expiry Service (`expiry_service.py`)**:
   - Automatically transitions past-due donations to `expired` status and notifies donors.

---

## 🎨 Visual Design System

The application strictly adheres to the visual principles defined in [DESIGN.md](DESIGN.md):

### Color Tokens
- `--color-basil` (`#2B4C36`): Primary — navigation bar, primary buttons, donor accents.
- `--color-marigold` (`#E2A33B`): Accent — highlights, NGO accents, key action CTAs.
- `--color-clay` (`#B2472A`): Alert & Urgency — expiry warnings ($<2\text{ hours}$ left), destructive actions.
- `--color-oat` (`#F4EEDD`): Background — canvas page background, card surfaces.
- `--color-bark` (`#26241E`): Typography — body copy, headings, and neutral admin elements.
- `--color-sage` (`#8AA285`): Positive / Success — completed deliveries, verified status badges.

### Typography
- **Headings:** `Fraunces` (warm, organic editorial serif).
- **Body & UI:** `Inter` (high-legibility sans-serif for mobile devices and data tables).

### Motion & Micro-interactions
- **Claim Settle Animation:** When an NGO claims a donation, the card performs a brief fill-and-settle animation in `--color-sage` before transferring to the activity queue.
- **Accessibility:** Fully respects `prefers-reduced-motion: reduce`. Visible focus rings in marigold for full keyboard navigability.

---

## 🗄️ Relational Database Schema

Implemented in [database/schema.sql](database/schema.sql) and mapped via SQLAlchemy in [models.py](backend/app/models.py):

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('donor', 'ngo', 'volunteer', 'admin')),
    org_type VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    reset_token VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_id INTEGER NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity VARCHAR(100) NOT NULL,
    contains_allergens TEXT DEFAULT NULL,
    mfd_datetime DATETIME NOT NULL,
    exp_datetime DATETIME NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_pincode VARCHAR(20) NOT NULL,
    pickup_window VARCHAR(255) NOT NULL,
    photo_url TEXT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'claimed', 'picked_up', 'completed', 'expired')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donation_id INTEGER UNIQUE NOT NULL,
    ngo_id INTEGER NOT NULL,
    volunteer_id INTEGER DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'in_transit', 'delivered', 'cancelled')),
    delivery_notes TEXT DEFAULT NULL,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivered_at DATETIME DEFAULT NULL,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (volunteer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL,
    donation_id INTEGER DEFAULT NULL,
    claim_id INTEGER DEFAULT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
    admin_notes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE SET NULL,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE SET NULL
);
```

---

## 📡 REST API Reference

### Auth Endpoints (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user across all 4 roles | Public |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT bearer token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Authenticated |
| `POST` | `/api/auth/forgot-password` | Request password reset code | Public |
| `POST` | `/api/auth/reset-password` | Set new password with reset code | Public |

### Donations Endpoints (`/api/donations`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/donations` | Browse surplus listings with category & pincode filters | Public / NGO |
| `POST` | `/api/donations` | Post a new surplus food listing | Donor, Admin |
| `GET` | `/api/donations/my` | Retrieve authenticated donor's listings & claims | Donor, Admin |
| `GET` | `/api/donations/{id}` | Full listing detail, allergen flags, and GPS coords | Public / NGO |
| `PUT` | `/api/donations/{id}` | Edit an active unclaimed donation listing | Donor (Owner), Admin |
| `DELETE` | `/api/donations/{id}` | Cancel/delete a donation listing | Donor (Owner), Admin |
| `POST` | `/api/donations/{id}/claim` | Claim an active donation listing | Verified NGO |

### Claims & Volunteer Logistics (`/api/claims`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/claims/my` | NGO claims and courier tracking history | NGO, Admin |
| `GET` | `/api/claims/tasks` | Queue of pickup tasks available for couriers | Volunteer, Admin |
| `POST` | `/api/claims/{id}/accept-task` | Volunteer courier accepts delivery assignment | Volunteer, Admin |
| `POST` | `/api/claims/{id}/status` | Update status (`in_transit`, `delivered`) | Volunteer, NGO, Admin |
| `GET` | `/api/claims/volunteer/my` | Active tasks & completed deliveries for courier | Volunteer, Admin |

### Administration Endpoints (`/api/admin`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/users` | List user directory with verification records | Admin |
| `PATCH` | `/api/admin/users/{id}/verify` | Approve or reject organization verification | Admin |
| `PATCH` | `/api/admin/users/{id}/status` | Deactivate or reactivate user account | Admin |
| `GET` | `/api/admin/donations` | Audit all system donations by status | Admin |
| `DELETE` | `/api/admin/donations/{id}` | Remove inappropriate or unsafe listing | Admin |
| `GET` | `/api/admin/deliveries` | Real-time overview of all courier routes | Admin |
| `GET` | `/api/admin/stats` | System impact metrics and redistribution analytics | Admin |

### Issues & Disputes (`/api/issues`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/issues` | Report a dispute or food safety ticket | Authenticated |
| `GET` | `/api/issues/my` | User's submitted tickets and resolutions | Authenticated |
| `GET` | `/api/issues/admin/all` | Admin queue of all reported tickets | Admin |
| `PATCH` | `/api/issues/{id}/resolve` | Resolve or dismiss issue with audit notes | Admin |

### Notifications (`/api/notifications`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/notifications` | User's notification inbox | Authenticated |
| `PATCH` | `/api/notifications/{id}/read` | Mark individual notification as read | Authenticated |
| `POST` | `/api/notifications/read-all` | Mark all notifications as read | Authenticated |

---

## 🔑 Pre-Seeded Demo Test Accounts

The included `backend/seed.py` populates standard accounts with rich scenario data:

| Role | Email | Password | Pre-seeded Scenario |
|---|---|---|---|
| **System Admin** | `admin@test.com` | `password123` | Master console, pending verification queue, issue audit. |
| **Verified Donor** | `donor@test.com` | `password123` | Green Choice Bistro: 1 active listing (urgent $<2\text{h}$ expiry), 1 in transit, 1 completed. |
| **Donor 2** | `donor2@test.com` | `password123` | Grand Horizon Hotel Banquets: Catering trays & platters. |
| **Verified NGO** | `ngo@test.com` | `password123` | Hope Shelter Foundation: Active claimed meals, courier tracking. |
| **Pending NGO** | `unverified_ngo@test.com` | `password123` | City Food Aid Guild: Test verification lock (cannot claim until approved). |
| **Volunteer Courier** | `volunteer@test.com` | `password123` | Alex Rivera: Active in-transit assignment and available task queue. |
| **Volunteer 2** | `volunteer2@test.com` | `password123` | Maria Santos: Ready courier dispatch. |

---

## 🛠️ Local Setup & Execution Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**

### 1. Backend Setup & Run (FastAPI)
```bash
# From workspace root
pip install -r backend/requirements.txt

# Seed the database with comprehensive lifecycle data
python -m backend.seed

# Start the backend API server
python -m uvicorn backend.app.main:app --port 8000
```
- Interactive Swagger UI: `http://localhost:8000/docs`
- API Health Status: `http://localhost:8000/`

### 2. Frontend Setup & Run (React + Vite)
```bash
# In a separate terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development client
npm run dev
```
- Open `http://localhost:3000` in your web browser.

---

## 🧪 Automated Integration Testing

FRS includes 7 automated integration test suites validating all business rules, RBAC guards, and lifecycles:

```bash
# Run test suite from workspace root
python -m backend.tests.test_flows
```

### Verified Test Cases:
1. `test_api_root`: API health and online status.
2. `test_user_registration_and_login`: Registration across roles and JWT token verification.
3. `test_business_rule_unverified_ngo_cannot_claim`: Proves unverified NGOs cannot bypass claim locks via direct API calls.
4. `test_donor_post_and_food_safety_validation`: Rejects past-due dates, validates safe consumption windows.
5. `test_full_redistribution_lifecycle`: Full cycle: Post $\rightarrow$ Claim $\rightarrow$ Single-claim lock $\rightarrow$ Volunteer accept $\rightarrow$ In transit $\rightarrow$ Delivered.
6. `test_password_recovery_flow`: Recovery code generation and password reset verification.
7. `test_disputes_and_issues_lifecycle`: Dispute ticket filing, admin resolution, and notification dispatch.

---

## 📁 Project Directory Structure

```
Food_Redistribution/
├── README.md                            # Comprehensive setup & architecture docs
├── DESIGN.md                            # Visual system: tokens, typography, layout
├── ANTIGRAVITY_PROMPT.md                # Agent specification brief
├── database/
│   └── schema.sql                       # Relational SQL schema with foreign keys
├── backend/
│   ├── requirements.txt                 # Python dependencies
│   ├── seed.py                          # Database seed script with full lifecycle records
│   ├── tests/
│   │   └── test_flows.py                # 7 automated test suites
│   └── app/
│       ├── main.py                      # FastAPI app entry & CORS
│       ├── database.py                  # SQLAlchemy engine & session
│       ├── models.py                    # ORM models (User, Donation, Claim, Issue, etc.)
│       ├── auth.py                      # JWT & bcrypt security
│       ├── services/
│       │   ├── notification_service.py  # In-app + SMS/Email notification provider interface
│       │   ├── location_service.py      # Geolocation & distance provider interface
│       │   ├── storage_service.py       # Food image storage provider interface
│       │   ├── safety_service.py        # Food safety & allergen validator interface
│       │   └── expiry_service.py        # Automated expiry processor
│       └── routers/
│           ├── auth_router.py           # Register, login, forgot/reset password
│           ├── donations_router.py      # Post, edit, browse, claim surplus food
│           ├── claims_router.py         # Volunteer dispatch, delivery lifecycle
│           ├── admin_router.py          # Verifications, listings audit, user status
│           ├── issues_router.py         # Dispute & safety issue tickets
│           └── notifications_router.py  # User notifications inbox & mark-read
└── frontend/
    ├── package.json                     # Dependencies & scripts
    ├── vite.config.js                   # Vite config with API proxy
    ├── index.html                       # HTML shell with Fraunces & Inter fonts
    └── src/
        ├── main.jsx                     # React entry point
        ├── index.css                    # DESIGN.md design system tokens & animations
        ├── App.jsx                      # Main app shell & role routing
        ├── context/
        │   └── AuthContext.jsx          # User session & auth state
        ├── components/
        │   ├── Navbar.jsx               # Role badges, nav tabs, notification bell
        │   ├── DonationCard.jsx         # Card with countdown urgency alerts & claim animation
        │   ├── DonationDetailModal.jsx  # Full details, allergens, and GPS map view
        │   ├── EditDonationModal.jsx    # Donor active listing editor
        │   └── ReportIssueModal.jsx     # Platform dispute reporting modal
        └── pages/
            ├── AuthPage.jsx             # Login, register, and password recovery
            ├── DonorDashboard.jsx       # Donor listings and claim tracking
            ├── NgoDashboard.jsx         # Surplus discovery and delivery tracking
            ├── VolunteerDashboard.jsx   # Volunteer pickup queue and route tracking
            └── AdminDashboard.jsx       # Admin verifications, listings, monitor, and reports
```

---

## 📜 License & Compliance

Built for community surplus food rescue and redistribution logistics. Adheres to standard food safety regulations and non-commercial redistribution protocols.
