from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_staff
from app.core import config
from app.core.security import create_token, verify_password
from app.database.session import get_db
from app.models import Application, Job, Staff
from app.schemas.schemas import (AdminApplicationOut, ApplicationIn, ApplicationResult, JobIn, JobOut,
                                 LoginIn, StatsOut, TokenOut)
from app.services.matching import match_resume

router = APIRouter()


# ---------- auth ----------
@router.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    staff = db.scalar(select(Staff).where(func.lower(Staff.email) == body.email.lower()))
    # Same generic error for unknown email and wrong password.
    if not staff or not verify_password(body.password, staff.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return TokenOut(access_token=create_token(staff.id), expires_in=config.JWT_EXPIRE_MINUTES * 60)


# ---------- public jobs ----------
@router.get("/jobs", response_model=list[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.scalars(select(Job).where(Job.status == "open").order_by(Job.id)).all()


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job or job.status != "open":
        raise HTTPException(404, "Job not found")
    return job


# ---------- staff jobs ----------
@router.post("/jobs", response_model=JobOut, status_code=201)
def create_job(body: JobIn, db: Session = Depends(get_db), _: Staff = Depends(current_staff)):
    job = Job(**body.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put("/jobs/{job_id}", response_model=JobOut)
def update_job(job_id: int, body: JobIn, db: Session = Depends(get_db), _: Staff = Depends(current_staff)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    for k, v in body.model_dump().items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job


@router.get("/admin/jobs", response_model=list[JobOut])
def admin_list_jobs(db: Session = Depends(get_db), _: Staff = Depends(current_staff)):
    """All jobs including closed ones, for the dashboard."""
    return db.scalars(select(Job).order_by(Job.id)).all()


@router.get("/admin/stats", response_model=StatsOut)
def admin_stats(db: Session = Depends(get_db), _: Staff = Depends(current_staff)):
    return StatsOut(
        total_jobs=db.scalar(select(func.count(Job.id))) or 0,
        open_jobs=db.scalar(select(func.count(Job.id)).where(Job.status == "open")) or 0,
        total_applications=db.scalar(select(func.count(Application.id))) or 0,
    )


@router.get("/admin/applications", response_model=list[AdminApplicationOut])
def admin_applications(job_id: int = Query(gt=0), db: Session = Depends(get_db), _: Staff = Depends(current_staff)):
    if not db.get(Job, job_id):
        raise HTTPException(404, "Job not found")
    return db.scalars(
        select(Application).where(Application.job_id == job_id).order_by(Application.created_at.desc())
    ).all()


# ---------- applications ----------
@router.post("/applications", response_model=ApplicationResult, status_code=201)
def submit_application(body: ApplicationIn, db: Session = Depends(get_db)):
    job = db.get(Job, body.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != "open":
        raise HTTPException(409, "This job is no longer accepting applications")
    result = match_resume(body.resume_text, job.required_skills)
    app = Application(
        applicant_name=body.applicant_name,
        applicant_email=str(body.applicant_email).lower(),
        resume_text=body.resume_text,
        job_id=job.id,
        matched_skills=result.matched,
        missing_skills=result.missing,
        match_score=result.score,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return _result(app, job)


@router.get("/applications/{application_id}", response_model=ApplicationResult)
def get_application_result(application_id: str, db: Session = Depends(get_db)):
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(404, "Application not found")
    return _result(app, app.job)


def _result(app: Application, job: Job) -> ApplicationResult:
    return ApplicationResult(
        application_id=app.id, job_id=job.id, job_title=job.title,
        match_score=app.match_score, matched_skills=app.matched_skills, missing_skills=app.missing_skills,
    )
