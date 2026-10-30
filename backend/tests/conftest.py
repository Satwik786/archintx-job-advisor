import os

os.environ["JWT_SECRET"] = "test-secret"
os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.core import config
from app.core.security import hash_password
from app.database.session import Base, get_db
from app.main import app
from app.models import Job, Staff

config.JWT_SECRET = "test-secret"


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    s = sessionmaker(bind=engine)()
    s.add(Job(title="Python Developer", track="Backend",
              required_skills=["Python", "FastAPI", "PostgreSQL", "Git", "REST API"]))
    s.add(Staff(email="staff@test.com", password_hash=hash_password("secret-pass")))
    s.commit()
    yield s
    s.close()


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def auth(client):
    r = client.post("/auth/login", json={"email": "staff@test.com", "password": "secret-pass"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
