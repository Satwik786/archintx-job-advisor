from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database.session import get_db
from app.models import Staff

bearer = HTTPBearer(auto_error=False)


def current_staff(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> Staff:
    unauthorized = HTTPException(401, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    if creds is None:
        raise unauthorized
    staff_id = decode_token(creds.credentials)
    staff = db.get(Staff, staff_id) if staff_id else None
    if staff is None:
        raise unauthorized
    return staff
