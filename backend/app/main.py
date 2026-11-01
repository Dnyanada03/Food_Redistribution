import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, DATABASE_URL
from .routers import auth_router, donations_router, admin_router, notifications_router, claims_router, issues_router

# Attempt table creation with clear diagnostic logs
try:
    Base.metadata.create_all(bind=engine)
    db_type = "PostgreSQL" if not DATABASE_URL.startswith("sqlite") else "SQLite"
    print(f"[+] Connected successfully to {db_type} database.")
except Exception as e:
    print(f"[!] Database connection failed: {e}", file=sys.stderr)
    print(f"[!] Current DATABASE_URL: {DATABASE_URL}", file=sys.stderr)
    raise e

app = FastAPI(
    title="Food Redistribution System (FRS) API",
    description="Backend API for surplus food redistribution connecting donors, verified NGOs, volunteers, and admins.",
    version="1.0.0"
)

# Enable CORS for frontend web client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows localhost dev client
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router.router)
app.include_router(donations_router.router)
app.include_router(claims_router.router)
app.include_router(admin_router.router)
app.include_router(notifications_router.router)
app.include_router(issues_router.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Food Redistribution System (FRS)",
        "database": "PostgreSQL" if not DATABASE_URL.startswith("sqlite") else "SQLite",
        "version": "1.0.0",
        "docs": "/docs"
    }