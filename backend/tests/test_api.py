from sqlalchemy import select

from app.models import Staff

RESUME = "I have built applications using Python, FastAPI, and Git. I have experience creating REST APIs."


def apply(client, **kw):
    body = {"applicant_name": "Asha Rao", "applicant_email": "asha@example.com", "resume_text": RESUME, "job_id": 1}
    body.update(kw)
    return client.post("/applications", json=body)


def test_list_jobs(client):
    r = client.get("/jobs")
    assert r.status_code == 200 and r.json()[0]["required_skills"][0] == "Python"


def test_create_job_requires_auth(client):
    payload = {"title": "QA Engineer", "track": "QA", "required_skills": ["Selenium"]}
    assert client.post("/jobs", json=payload).status_code == 401
    assert client.post("/jobs", json=payload, headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_create_and_edit_job(client, auth):
    r = client.post("/jobs", json={"title": "QA Engineer", "track": "QA", "required_skills": ["Selenium", "selenium", "JIRA"]}, headers=auth)
    assert r.status_code == 201 and r.json()["required_skills"] == ["Selenium", "JIRA"]
    jid = r.json()["id"]
    r = client.put(f"/jobs/{jid}", json={"title": "QA Lead", "track": "QA", "required_skills": ["Postman"], "status": "closed"}, headers=auth)
    assert r.status_code == 200 and r.json()["title"] == "QA Lead"
    assert all(j["id"] != jid for j in client.get("/jobs").json())  # closed hidden publicly
    assert client.put("/jobs/999", json={"title": "Xx", "track": "Yy", "required_skills": ["a"]}, headers=auth).status_code == 404
    assert client.put(f"/jobs/{jid}", json={"title": "Xx", "track": "Yy", "required_skills": []}, headers=auth).status_code == 422


def test_submit_application_scores_correctly(client):
    r = apply(client)
    assert r.status_code == 201
    d = r.json()
    assert d["match_score"] == 80 and d["missing_skills"] == ["PostgreSQL"]
    assert d["matched_skills"] == ["Python", "FastAPI", "Git", "REST API"]
    assert "applicant_email" not in d and "resume_text" not in d


def test_different_resume_different_score(client):
    assert apply(client, resume_text="I only know some Python and a lot about cooking.").json()["match_score"] == 20


def test_validation_and_missing_job(client):
    assert apply(client, job_id=999).status_code == 404
    assert apply(client, applicant_email="nope").status_code == 422
    assert apply(client, resume_text="short").status_code == 422


def test_closed_job_rejects_applications(client, auth):
    client.put("/jobs/1", json={"title": "Python Developer", "track": "Backend", "required_skills": ["Python"], "status": "closed"}, headers=auth)
    assert apply(client).status_code == 409


def test_get_saved_result(client):
    aid = apply(client).json()["application_id"]
    r = client.get(f"/applications/{aid}")
    assert r.status_code == 200 and r.json()["match_score"] == 80 and r.json()["job_title"] == "Python Developer"
    assert client.get("/applications/does-not-exist").status_code == 404


def test_login_rejects_bad_credentials(client):
    a = client.post("/auth/login", json={"email": "staff@test.com", "password": "wrong"})
    b = client.post("/auth/login", json={"email": "ghost@test.com", "password": "secret-pass"})
    assert a.status_code == b.status_code == 401 and a.json() == b.json()


def test_password_is_hashed(client, db):
    s = db.scalar(select(Staff))
    assert s.password_hash != "secret-pass" and s.password_hash.startswith("$2")
    r = client.post("/auth/login", json={"email": "staff@test.com", "password": "secret-pass"})
    assert "password" not in r.text and "$2" not in r.text


def test_admin_applications_protected_and_correct(client, auth):
    apply(client)
    assert client.get("/admin/applications?job_id=1").status_code == 401
    r = client.get("/admin/applications?job_id=1", headers=auth)
    assert r.status_code == 200 and len(r.json()) == 1
    row = r.json()[0]
    assert row["applicant_email"] == "asha@example.com" and row["match_score"] == 80 and row["resume_text"] == RESUME


def test_admin_applications_edge_cases(client, auth):
    assert client.get("/admin/applications?job_id=1", headers=auth).json() == []
    assert client.get("/admin/applications?job_id=999", headers=auth).status_code == 404
    assert client.get("/admin/applications?job_id=abc", headers=auth).status_code == 422
    assert client.get("/admin/applications", headers=auth).status_code == 422


def test_admin_stats_and_jobs_protected(client, auth):
    assert client.get("/admin/stats").status_code == 401 and client.get("/admin/jobs").status_code == 401
    apply(client)
    assert client.get("/admin/stats", headers=auth).json() == {"total_jobs": 1, "open_jobs": 1, "total_applications": 1}
