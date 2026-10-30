from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.services.matching import normalize_skills


class JobIn(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    track: str = Field(min_length=2, max_length=80)
    required_skills: list[str] = Field(min_length=1, max_length=50)
    status: Literal["open", "closed"] = "open"

    @field_validator("title", "track")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("must be at least 2 characters")
        return v

    @field_validator("required_skills")
    @classmethod
    def _skills(cls, v: list[str]) -> list[str]:
        cleaned = normalize_skills(v)
        if not cleaned:
            raise ValueError("at least one non-empty skill is required")
        if any(len(s) > 60 for s in cleaned):
            raise ValueError("each skill must be at most 60 characters")
        return cleaned


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    track: str
    required_skills: list[str]
    status: str
    created_at: datetime
    updated_at: datetime


class ApplicationIn(BaseModel):
    applicant_name: str = Field(min_length=2, max_length=120)
    applicant_email: EmailStr
    resume_text: str = Field(min_length=20, max_length=20000)
    job_id: int

    @field_validator("applicant_name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("name is too short")
        return v


class ApplicationResult(BaseModel):
    """Public view: no email, no resume."""
    application_id: str
    job_id: int
    job_title: str
    match_score: int
    matched_skills: list[str]
    missing_skills: list[str]


class AdminApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    applicant_name: str
    applicant_email: str
    resume_text: str
    job_id: int
    match_score: int
    matched_skills: list[str]
    missing_skills: list[str]
    created_at: datetime


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class StatsOut(BaseModel):
    total_jobs: int
    open_jobs: int
    total_applications: int
