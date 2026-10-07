# स्वाद — Mess & Tiffin Tracker

Mobile-first, multilingual (English / हिन्दी / मराठी) PWA for a mess owner and their members. Built for **लातूरकर यांचे स्वाद भोजनालय & नाश्ता हाऊस**; multi-tenant by design (every table carries `organization_id`).

- **Spec:** `docs/superpowers/specs/2026-10-07-mess-tracker-v1-plan.md`
- **Design:** `docs/design/brand-guide.md`, `docs/design/design-review-2026-10-07.md`, screenshots in `docs/design/screens/`
- **Backend:** `backend/` — FastAPI, SQLAlchemy 2 (async), Alembic, PostgreSQL
- **Frontend:** `frontend/` — React 19, TypeScript, Vite, MUI, TanStack Query, react-i18next, PWA

## Features (V1 complete)

| Area | Owner | Member (customer) |
|------|-------|-------------------|
| Auth | Register mess (invite code), login, change password | Login with phone + temporary password, forced password change on first login |
| Plans & members | Mess plans (meals + fee), members with room, deposit, notes; **tiffin members** with company and delivery address; search, filters, deactivate, reset password, WhatsApp share of login | Profile, language |
| Attendance | Daily lunch/dinner sheet, one-tap present/absent, mark all, date strip, search, mess/tiffin filter, holidays, month close/lock, per-member history | Monthly calendar with lunch/dinner dots, meals taken |
| Leaves | List by date, approve/reject late requests (notifies member) | Skip meals in advance; cutoff rule (default 22:00 the night before), cancel future leaves |
| Billing | Prepare monthly bills from fees, record cash/UPI/bank payments, partial payments, edit bill, pending list, collection progress, payment reminders | Current bill status, payment history |
| Menu | Day editor with dish chips and suggestions, copy yesterday | Today's and weekly menu |
| Announcements | Publish to all members (in-app notifications) | Read; notification bell with unread badge |
| Dashboard & reports | Live today-at-a-glance, pending payments, chef's next-action hint; meals per day, collection by method, 6-month trend, per-member attendance | Plan, meals this month, bill, menu, upcoming leaves, announcements |

Business rules live in the spec's Decisions table (D1–D13). Key ones: unmarked = absent, approved leave removes the member from the expected list, closed months reject edits (`MONTH_CLOSED`), all "today" logic is Asia/Kolkata.

## Run locally

Prerequisites: Docker, [uv](https://docs.astral.sh/uv/), Node 24.

```bash
# 1. Database (Postgres 16 on port 5434)
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env            # set JWT_SECRET / OWNER_INVITE_CODE
uv sync
uv run alembic upgrade head
uv run python -m scripts.seed   # demo mess with members, attendance, bills, menu
uv run uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173, proxies /api → :8000
```

Demo logins (seeded):

| Role | Phone | Password |
|------|-------|----------|
| Owner | 9000000001 | owner123 |
| Member | 9000000002 | cust123 |
| Tiffin member | 9000000021 | cust123 |

API docs: http://localhost:8000/docs

## Tests

```bash
cd backend && uv run pytest          # 100+ tests; needs the docker DB, creates mess_test automatically
cd frontend && npx vitest run        # component, hook and i18n tests
cd frontend && npm run build         # type-check + production build
```

## Deploy (free tier)

- **Frontend → Netlify** (`frontend/netlify.toml`). Set `VITE_API_URL=https://<render-app>.onrender.com/api/v1`.
- **Backend → Render** (`backend/render.yaml`). Set `ENV=production`, `DATABASE_URL` (a `postgres://` URL is rewritten to asyncpg automatically), `JWT_SECRET` (32+ chars), `OWNER_INVITE_CODE` (8+ chars), `CORS_ORIGINS=["https://<site>.netlify.app"]`. The app refuses to start in production with default secrets.
- **Database → Neon PostgreSQL.**
- Add an external uptime pinger to `/health` every 10 minutes to limit Render cold starts.

## Project layout

```
backend/app/{core,db,models,schemas,services,api/v1}   # routers are thin; business rules live in services/
backend/alembic/versions                                # migrations (alembic check is run in CI)
frontend/src/{api,app,components/brand,features,i18n,lib}
docs/{superpowers,design}
```
