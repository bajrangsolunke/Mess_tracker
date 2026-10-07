# Mess Tracker

Mobile-first, multilingual (English / हिन्दी / मराठी) PWA for mess owners and their customers.

- **Spec:** `docs/superpowers/specs/2026-10-07-mess-tracker-v1-plan.md`
- **Plans:** `docs/superpowers/plans/`
- **Backend:** `backend/` — FastAPI, SQLAlchemy (async), Alembic, PostgreSQL
- **Frontend:** `frontend/` — React, TypeScript, Vite, MUI, TanStack Query, react-i18next, PWA

## Run locally

Prerequisites: Docker, [uv](https://docs.astral.sh/uv/), Node 24.

```bash
# 1. Database (Postgres 16 on port 5434)
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env            # edit JWT_SECRET / OWNER_INVITE_CODE if you like
uv sync
uv run alembic upgrade head
uv run python -m scripts.seed   # demo org + two users (see below)
uv run uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173, proxies /api → :8000
```

Demo logins (seeded):

| Role     | Phone      | Password  |
|----------|------------|-----------|
| Owner    | 9000000001 | owner123  |
| Customer | 9000000002 | cust123   |

Register a new mess: `POST /api/v1/auth/register-owner` with `invite_code` = `OWNER_INVITE_CODE` from `.env`.
API docs: http://localhost:8000/docs

## Tests

```bash
cd backend && uv run pytest          # needs the docker DB; creates mess_test automatically
cd frontend && npx vitest run
```

## Deploy (free tier)

- Frontend → Netlify (`frontend/netlify.toml`), set `VITE_API_URL=https://<render-app>.onrender.com/api/v1`
- Backend → Render (`backend/render.yaml`), set `DATABASE_URL`, `OWNER_INVITE_CODE`, `CORS_ORIGINS=["https://<site>.netlify.app"]`
- Database → Neon PostgreSQL (use the `postgresql+asyncpg://` URL)
- Add an external uptime pinger to `/health` every 10 minutes to limit Render cold starts.
