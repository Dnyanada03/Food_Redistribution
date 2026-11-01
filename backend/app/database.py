import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load .env file if available
try:
    from dotenv import load_dotenv
    for env_path in [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent / ".env"
    ]:
        if env_path.exists():
            load_dotenv(dotenv_path=env_path)
            break
except ImportError:
    pass

DB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
default_sqlite_url = f"sqlite:///{os.path.join(DB_DIR, 'frs_database.db')}"

raw_url = os.getenv("DATABASE_URL")

if not raw_url and os.getenv("DB_PASSWORD"):
    db_user = os.getenv("DB_USER", "postgres")
    db_pass = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "frs_db")
    raw_url = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

DATABASE_URL = raw_url if raw_url else default_sqlite_url

# Handle legacy "postgres://" prefix
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def create_configured_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(
            url,
            connect_args={"check_same_thread": False}
        )
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

# Verify PostgreSQL connection; fallback to SQLite if credentials fail
if not DATABASE_URL.startswith("sqlite"):
    try:
        candidate_engine = create_configured_engine(DATABASE_URL)
        # Test connection with a fast ping
        with candidate_engine.connect() as conn:
            pass
        engine = candidate_engine
        print(f"[+] Connected to PostgreSQL database ({DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'local'}).")
    except Exception as err:
        print(f"[!] PostgreSQL connection failed: {err}")
        print(f"[*] Falling back to SQLite ({default_sqlite_url}). Update .env with your real PostgreSQL password to use PostgreSQL.")
        DATABASE_URL = default_sqlite_url
        engine = create_configured_engine(DATABASE_URL)
else:
    engine = create_configured_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
