# ArchintX Job Apply & Skill-Gap Advisor

Full-stack internship capstone: candidates browse jobs, apply by pasting resume text, and instantly see a **server-computed match score**, the required skills **found** in their resume and the ones to **pick up**. Staff log in to create/edit jobs and review every application.

## Features
- Public jobs list (title, track, required skills) loaded from the API
- Apply form with validation, double-submit protection, and a job selector
- Result page: score ring, matched skills, "skills to pick up" (from the saved application)
- Staff login (JWT), protected dashboard: stats, create/edit jobs, applications per job with scores
- Resume text is rendered as escaped text only (React escaping, `<pre>`; never `dangerouslySetInnerHTML`)
- Loading, empty, error and success states; confirmation dialogs (logout, closing a job)

## Technology stack
| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, JavaScript, Tailwind CSS 3, React Router 6, lucide-react |
| Backend | Python, FastAPI, Pydantic v2, SQLAlchemy 2, PyJWT, bcrypt |
| Database | PostgreSQL (Supabase/Neon) in production, SQLite for tests/quick local runs |
| Tests | pytest (backend), Vitest + Testing Library (frontend) |
| Hosting | Vercel (frontend), Render (backend), Supabase or Neon (DB) |

**Why PostgreSQL?** Relational data (jobs -> applications), real foreign keys and constraints, a free hosted tier, and it is what production tools use.

## Project structure
```
backend/
  app/
    main.py            FastAPI app, CORS, startup checks
    api/               routes.py (endpoints), deps.py (auth dependency)
    core/              config.py (env vars), security.py (bcrypt + JWT)
    database/          session.py, init_db.py, seed.py
    models/            SQLAlchemy tables
    schemas/           Pydantic request/response models
    services/          matching.py  <- the skill-matching algorithm
  tests/               pytest suite
frontend/
  src/ components/ pages/ layouts/ services/ hooks/ utils/ __tests__/
docs/database-schema.md   ER diagram + SQL
render.yaml               Render blueprint
frontend/vercel.json      SPA rewrite for Vercel
```

## Prerequisites
Python 3.11+ (3.12 used), Node 18+ (22 used), Git, and a PostgreSQL database (optional locally).

## Local setup
```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then edit: set JWT_SECRET, SEED_STAFF_PASSWORD, DATABASE_URL (or delete it to use SQLite)
python -m app.database.seed # creates tables, 5 jobs, 1 staff account
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm run dev                 # http://localhost:5173
```
API docs (Swagger): http://localhost:8000/docs

## Environment variables
| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | SQLAlchemy URL. Empty -> `sqlite:///./dev.db`. `postgres://` is auto-converted. |
| `JWT_SECRET` | backend | **Required.** Long random string (`python -c "import secrets;print(secrets.token_urlsafe(48))"`). App refuses to start without it. |
| `JWT_EXPIRE_MINUTES` | backend | Token lifetime (default 60). |
| `CORS_ORIGINS` | backend | Comma-separated allowed frontend origins, e.g. `https://your-app.vercel.app` |
| `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` | backend | Evaluation staff account. If the password is empty a random one is generated and printed once. |
| `VITE_API_URL` | frontend | Backend base URL. Baked in at build time. In production builds there is **no localhost fallback**. |

Real `.env` files are git-ignored; only `.env.example` files (placeholders) are committed.

## Database configuration & schema
See [docs/database-schema.md](docs/database-schema.md) for the ER diagram and SQL.
Use a hosted connection string (Supabase: Project Settings -> Database -> Connection string (use the pooler/URI); Neon: Dashboard -> Connection string). Put it in `DATABASE_URL` as an environment variable only. Tables are created by `python -m app.database.init_db` (the seed script also does this). Schema init is idempotent (`create_all` skips existing tables).

## Seed data & staff account
`python -m app.database.seed` is safe to re-run: jobs are matched by title, the staff account is created only if its email is missing. Seeded jobs: QA Engineer, Python Developer, Data Analyst, AI Engineer, Full Stack Developer, each with its own skills.
The staff account is a **development/evaluation account you create**: set `SEED_STAFF_EMAIL` and `SEED_STAFF_PASSWORD` before seeding. To rotate it, delete the row (or use a different email) and re-seed. Never reuse a personal password.

## API endpoints
| Method & path | Access | Description |
|---|---|---|
| `GET /jobs` | public | Open jobs |
| `GET /jobs/{id}` | public | One open job (404 if closed/missing) |
| `POST /jobs` | staff | Create job `{title, track, required_skills[], status?}` |
| `PUT /jobs/{id}` | staff | Update job (404 if missing) |
| `POST /applications` | public | `{applicant_name, applicant_email, resume_text, job_id}` -> `{application_id, job_title, match_score, matched_skills, missing_skills}` |
| `GET /applications/{uuid}` | public | Saved result (no email/resume exposed) |
| `GET /admin/applications?job_id=` | staff | All applications for a job incl. resume text |
| `GET /admin/jobs`, `GET /admin/stats` | staff | Dashboard data (all jobs incl. closed, counts) |
| `POST /auth/login` | public | `{email, password}` -> `{access_token, token_type, expires_in}` |
| `GET /health` | public | Health check |

Errors are JSON `{"detail": ...}`: 401 unauthenticated/bad login, 404 not found, 409 job closed, 422 validation.

## Authentication design
- Staff accounts exist only in the DB (no signup route). Passwords are hashed with **bcrypt**; hashes are never returned or logged.
- Login returns a signed **JWT** (HS256, 60 min). Wrong email and wrong password give the *same* generic 401.
- Every staff endpoint uses the `current_staff` dependency: it verifies signature + expiry and that the staff row still exists.
- **Token storage trade-off:** the frontend and API are on different domains (Vercel/Render), so an HttpOnly cookie would need `SameSite=None` plus CSRF protection. I chose a bearer token in `sessionStorage` (cleared when the tab closes, not in `localStorage`). The cost: JavaScript can read it, so an XSS bug would expose it. Mitigations: all user text is escaped, no third-party scripts, short expiry. An expired token (401) logs the user out and redirects to login with a message.

## Skill-matching algorithm
Code: `backend/app/services/matching.py`.

`Match Score = round(matched required skills / total required skills x 100)`

Steps:
1. **Normalise skills:** trim, collapse whitespace, drop empty/non-string entries, de-duplicate case-insensitively (first spelling is kept as the display name).
2. **Normalise resume:** collapse all whitespace (tabs/newlines) to single spaces.
3. **Match each skill** with a case-insensitive regex that requires: no letter/digit/`+`/`#` immediately before, and none immediately after (a trailing plural `s`/`es` is allowed). Spaces inside a skill match any whitespace run.
   - "Java" does **not** match "JavaScript"; "C" does not match "C++"; "Python" does not match "pythonic".
   - "REST API" matches "REST APIs"; "Node.js", "C#", "CI/CD" work because characters are regex-escaped.
4. Each skill is counted **once** however often it is mentioned.
5. **Score** uses integer half-up rounding (e.g. 2/3 -> 67). Empty/invalid skill list -> 0. 100 only when every skill matched.

Example - job `[Python, FastAPI, PostgreSQL, Git, REST API]`, resume "I have built applications using Python, FastAPI, and Git. I have experience creating REST APIs." -> matched Python, FastAPI, Git, REST API; missing PostgreSQL; **80%**.

**Limitations:** exact keyword matching only. No synonyms ("Postgres" != "PostgreSQL", "JS" != "JavaScript"), no skill-level/years, no context (a skill mentioned as "I do not know Docker" still matches), no typo tolerance, all skills weigh equally. Staff can list common spellings as separate skills if needed.

## Testing
```bash
cd backend && pytest -q          # 21 tests: matching, auth, jobs, applications, protected routes, hashing
cd frontend && npm test          # 23 tests: jobs/empty/error, form validation, submit + result, login, protected routes,
                                 #           job create/edit/close, applications list, XSS-escaping, expired session
cd frontend && npm run build     # production build check
```
Frontend tests render the real components and real `api.js` and stub only `fetch`. They verify UI behaviour, not the backend; the backend's behaviour is covered by the pytest suite and by the manual end-to-end run below.

## Deployment
Order: **database -> backend -> frontend -> update CORS**.
1. **Database:** create a free Supabase or Neon project; copy the Postgres connection string.
2. **Backend (Render):** New -> Blueprint -> select this repo (uses `render.yaml`), or create a Web Service manually with root dir `backend`, build `pip install -r requirements.txt && python -m app.database.seed`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set env vars `DATABASE_URL`, `JWT_SECRET`, `SEED_STAFF_EMAIL`, `SEED_STAFF_PASSWORD`, `CORS_ORIGINS` (temporarily `http://localhost:5173`). Note the URL, e.g. `https://archintx-api.onrender.com`; check `/health` and `/jobs`. (Free Render services sleep when idle, so the first request can take ~50 s: open `/health` before submitting.)
3. **Frontend (Vercel):** Import the repo, set **Root Directory = `frontend`**, framework Vite, add env var `VITE_API_URL=https://<your-render-url>` (no trailing slash), deploy.
4. **CORS:** set the backend `CORS_ORIGINS` to your exact Vercel URL (no trailing slash; comma-separate extra origins) and redeploy the backend.
5. **Verify** the deployed site calls the deployed API: open DevTools -> Network on the live site and confirm requests go to the Render URL, never `localhost`.

## Known limitations
- Exact-keyword matching only (see above); resume text only, no PDF upload.
- No rate limiting / CAPTCHA on the public apply endpoint; no email verification.
- No password reset or staff management UI (staff are seeded).
- Jobs cannot be deleted (closed instead); applications cannot be deleted.
- Bearer token in `sessionStorage` (trade-off explained above).
- Schema is created with `create_all`, not Alembic; schema changes need manual migration.
- Render free tier cold starts.

## Screenshots to capture
Save in `docs/screenshots/` and upload to the submission folder:
1. Jobs list (`/`)
2. Apply form (`/apply/2`) filled in
3. Result page showing **both** matched and missing skills
4. (Bonus) Staff dashboard with an application listing

Sample resume for a mixed result on "Full Stack Developer": `Built web apps with React, JavaScript and Node.js. Version control with Git. Designed REST APIs.` -> 5 of 7, missing PostgreSQL and Tailwind CSS (71%).

## How an evaluator can test
1. Open the live site, pick a job, apply with a real resume; the score and skill lists come from the backend. Try two different resumes: the scores differ.
2. Go to `/admin/login`, sign in with the provided staff login, create a job, edit it, apply to it from another tab, then open its applications.
3. Visit `<API>/admin/applications?job_id=1` without a token: expect 401. `<API>/docs` lists every endpoint.
