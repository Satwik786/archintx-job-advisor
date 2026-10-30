# Submission checklist (deadline: 6 PM, Wed 18 Nov 2026)

- [ ] Supabase/Neon database created, connection string copied (never commit it)
- [ ] Backend deployed on Render; `/health` and `/jobs` return data
- [ ] Frontend deployed on Vercel with `VITE_API_URL` = Render URL
- [ ] Backend `CORS_ORIGINS` = exact Vercel URL; backend redeployed
- [ ] DevTools Network tab on the live site shows requests to the Render URL (not localhost)
- [ ] Applied with a real resume on the LIVE site: score is computed, not 100% / fixed
- [ ] Two different resumes give different scores
- [ ] Logged in as staff on the live site, created a job, edited it, saw applications
- [ ] `git status` shows no `.env` files; `git log -p | grep -i password` finds nothing real
- [ ] README links/placeholders filled with your live URLs
- [ ] Screenshots taken: jobs list, apply form, result with matched + missing skills
- [ ] Submit in the Google Drive folder: GitHub repo URL, frontend URL, backend API URL, staff test login (email + the password you set), screenshots
