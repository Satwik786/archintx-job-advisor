import os
from dotenv import load_dotenv

load_dotenv()


def _db_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    # Some hosts hand out postgres:// which SQLAlchemy 2 no longer accepts.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


DATABASE_URL = _db_url()
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
