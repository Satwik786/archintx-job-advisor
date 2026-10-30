"""Idempotent seed: python -m app.database.seed
Jobs are matched by title; the staff account is created only if missing.
If SEED_STAFF_PASSWORD is unset, a random dev password is generated and printed ONCE."""
import os
import secrets

from sqlalchemy import select

from app import models  # noqa: F401
from app.core.security import hash_password
from app.database.session import Base, SessionLocal, engine
from app.models import Job, Staff

JOBS = [
    ("QA Engineer", "QA", ["Selenium", "Test Cases", "Manual Testing", "Postman", "JIRA", "SQL", "API Testing"]),
    ("Python Developer", "Backend", ["Python", "FastAPI", "PostgreSQL", "Git", "REST API", "SQLAlchemy"]),
    ("Data Analyst", "Data Analytics", ["SQL", "Excel", "Power BI", "Python", "Pandas", "Data Visualization"]),
    ("AI Engineer", "AI/ML", ["Python", "Machine Learning", "TensorFlow", "PyTorch", "NLP", "scikit-learn", "Deep Learning"]),
    ("Full Stack Developer", "Full Stack", ["React", "JavaScript", "Node.js", "REST API", "PostgreSQL", "Git", "Tailwind CSS"]),
]


def main():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for title, track, skills in JOBS:
            if not db.scalar(select(Job).where(Job.title == title)):
                db.add(Job(title=title, track=track, required_skills=skills, status="open"))
        email = os.getenv("SEED_STAFF_EMAIL", "staff@example.com").lower()
        if not db.scalar(select(Staff).where(Staff.email == email)):
            given = os.getenv("SEED_STAFF_PASSWORD")
            pw = given or secrets.token_urlsafe(12)
            db.add(Staff(email=email, password_hash=hash_password(pw)))
            print(f"Created staff {email} (password: {'<from SEED_STAFF_PASSWORD>' if given else pw})")
        else:
            print("Staff already exists; unchanged.")
        db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    main()
