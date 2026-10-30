"""Create tables (idempotent): python -m app.database.init_db"""
from app import models  # noqa: F401  (registers tables)
from app.database.session import Base, engine

if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("Tables ready.")
