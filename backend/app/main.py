from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core import config

if not config.JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable must be set (see backend/.env.example)")

app = FastAPI(title="ArchintX Job Apply & Skill-Gap Advisor")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
