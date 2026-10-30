from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core import config


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(staff_id: int) -> str:
    if not config.JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not set")
    exp = datetime.now(timezone.utc) + timedelta(minutes=config.JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(staff_id), "exp": exp}, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_token(token: str) -> int | None:
    """Return staff id, or None if the token is invalid/expired."""
    try:
        data = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return int(data["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
