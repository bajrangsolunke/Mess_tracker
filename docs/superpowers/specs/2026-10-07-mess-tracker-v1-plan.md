# Mess Tracker — V1 Master Plan

**Date:** 2026-10-07
**Status:** Approved draft for implementation planning
**Supersedes:** two earlier chat drafts (feature plan + design plan). Conflicts between them are resolved here; see "Decisions".

---

## 1. Product summary

A mobile-first, multilingual PWA for small Indian mess owners and their customers.

| Role | Core jobs |
|------|-----------|
| Owner | Manage members, mark lunch/dinner attendance daily, record monthly fees, publish menu, post announcements, see monthly numbers |
| Customer | See own attendance and meal count, see today's menu, apply leave (skip meals), see bill and payment status, read announcements |

Target: 10–100 members per mess, one owner per mess, usable by non-technical users, every action within 2–3 taps.

---

## 2. Decisions (resolving the two drafts)

| # | Topic | Decision | Why |
|---|-------|----------|-----|
| D1 | Multi-business platform | **No** in V1. Every table carries `organization_id`; `organizations.business_type` column exists (`mess` only). No module switching UI. | Keeps V1 small; SaaS path stays open. |
| D2 | Multi-language | **Yes from day 1**: `react-i18next`, `en`, `hi`, `mr`. Only UI strings are translated; owner-entered text (menu, notes) is shown as typed. | Retrofitting i18n is costly; target users need it. |
| D3 | Offline attendance | **V1.1**, not V1. V1 ships PWA installability + cached shell only. | Needs conflict rules and a sync queue; not required for first owners. |
| D4 | Expense tracking | **V1.1**. | Not in MVP per both drafts' MVP lists. |
| D5 | Billing model | **Fixed monthly fee per member** (from plan, editable per bill). Meal count is informational. Per-meal billing and proration are V1.1. | Most common model; avoids a pricing engine. |
| D6 | Meals | Lunch and Dinner, modeled as `meal_type` enum so breakfast can be added without schema change. | Flexibility at zero cost. |
| D7 | Customer login | Owner creates member → system creates user with phone as username + temporary password. Owner can reset password. No self sign-up, no OTP in V1. | Simplest working auth for MVP. |
| D8 | Attendance rule | A member is **expected** for a meal on a date if: active, plan includes meal, date not a holiday, no approved leave for that meal. Owner marks `present`/`absent`. **Unmarked = absent** in reports. "Mark all present" marks all expected members present. | Removes ambiguity in counts. |
| D9 | Leave | Customer leave is auto-approved if submitted before `organizations.leave_cutoff_time` (default 22:00 IST) on the previous day; otherwise saved as `late` and owner can accept/reject. Leave hides the member from the expected list for that meal. | Matches the "10 PM rule" and wastage goal. |
| D10 | Month lock | Owner can **close a month**; closed months reject attendance/leave edits (HTTP 409). Bills for a closed month remain editable until paid. | Reporting integrity. |
| D11 | Timezone | All "today" logic uses `Asia/Kolkata`. Store timestamps in UTC, dates as `DATE`. | Avoids wrong-day attendance after 5:30 PM UTC. |
| D12 | Notifications | In-app only. `announcements` (org-wide) + `notifications` (per user: payment due, leave status). Push/WhatsApp/SMS are V2. | No external dependencies in V1. |
| D13 | Hosting | Netlify (frontend), Render free (backend), Neon free (Postgres). Verify current free tiers at deploy time. Add an external uptime pinger (e.g., cron-job.org every 10 min) to reduce Render cold starts. | Free, matches skills. |

---

## 3. Scope

### In V1
1. Auth (owner + customer), JWT access + refresh, password reset by owner
2. Organization setup (name, language, leave cutoff)
3. Mess plans (name, meals included, monthly fee)
4. Members (CRUD, deactivate, profile, room no, deposit, notes, search)
5. Attendance (today, past dates, lunch/dinner, bulk mark, month lock, history)
6. Leave / skip meal (customer submit, owner view, late-leave accept/reject)
7. Holidays (mess closed days)
8. Billing & payments (monthly bill per member, record payment cash/UPI/bank, pending list, history)
9. Menu (per date, per meal; copy-from-yesterday; weekly view)
10. Announcements + in-app notifications
11. Dashboards (owner, customer) and 4 reports
12. i18n (en/hi/mr), PWA install, responsive mobile-first UI

### V1.1 (after first real owners)
Offline attendance with sync, expenses & profit, per-meal billing/proration, dark mode, QR attendance

### V2
Online payments (Razorpay/UPI intent), WhatsApp/SMS/push, inventory, staff, multiple branches, business types, paid tiers

---

## 4. Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18, TypeScript, Vite, Material UI v6, React Router v6, TanStack Query v5, React Hook Form + Zod, react-i18next, vite-plugin-pwa, Day.js (tz) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.x (async), Alembic, Pydantic v2, python-jose (JWT), passlib[bcrypt], uvicorn |
| DB | PostgreSQL 16 (Neon) |
| Testing | pytest + httpx + pytest-asyncio (backend), Vitest + React Testing Library (frontend), Playwright smoke (3 flows) |
| Tooling | ruff, mypy, ESLint, Prettier, pre-commit, GitHub Actions |
| Hosting | Netlify, Render, Neon |

---

## 5. Repository layout

```
mess-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, routers
│   │   ├── core/                   # config.py, security.py (JWT, hashing), deps.py (current_user, current_org), time.py (IST helpers)
│   │   ├── db/                     # session.py, base.py
│   │   ├── models/                 # one file per table
│   │   ├── schemas/                # Pydantic request/response, one file per resource
│   │   ├── services/               # business rules (attendance.py, billing.py, leave.py, reports.py)
│   │   └── api/v1/                 # routers: auth.py, members.py, attendance.py, leaves.py, bills.py, payments.py, menus.py, announcements.py, notifications.py, holidays.py, plans.py, reports.py, dashboard.py
│   ├── alembic/
│   ├── tests/                      # mirrors app/; conftest.py with test DB + factories
│   ├── pyproject.toml
│   └── render.yaml
├── frontend/
│   ├── src/
│   │   ├── app/                    # router.tsx, providers.tsx, theme.ts
│   │   ├── api/                    # client.ts (fetch + auth refresh), one hooks file per resource (useMembers.ts …)
│   │   ├── features/               # auth/, dashboard/, members/, attendance/, leaves/, payments/, menu/, announcements/, reports/, profile/
│   │   ├── components/             # shared: StatusChip, SearchBar, StatCard, BottomNav, DateStrip, EmptyState
│   │   ├── i18n/                   # index.ts, locales/en.json, hi.json, mr.json
│   │   └── lib/                    # date.ts (IST), money.ts (₹ format), storage.ts
│   ├── public/                     # manifest, icons
│   ├── vite.config.ts
│   └── netlify.toml
└── docs/
```

---

## 6. Data model

All tables: `id BIGSERIAL PK`, `created_at`, `updated_at` (UTC timestamptz). Every tenant table has `organization_id FK` and indexes start with it.

```
organizations
  name, business_type ENUM('mess') DEFAULT 'mess', default_language ENUM('en','hi','mr'),
  leave_cutoff_time TIME DEFAULT '22:00', timezone TEXT DEFAULT 'Asia/Kolkata'

users
  organization_id, phone (unique per org), name, email NULL, password_hash,
  role ENUM('owner','customer'), language ENUM('en','hi','mr'), is_active BOOL,
  must_change_password BOOL
  UNIQUE(organization_id, phone)

refresh_tokens
  user_id, token_hash, expires_at, revoked_at NULL

mess_plans
  organization_id, name, includes_lunch BOOL, includes_dinner BOOL, monthly_fee NUMERIC(10,2), is_active BOOL

members
  organization_id, user_id NULL UNIQUE, name, phone, room_no NULL, plan_id FK mess_plans,
  monthly_fee NUMERIC(10,2)           -- copied from plan at join, editable
  joining_date DATE, status ENUM('active','inactive'), deposit NUMERIC(10,2) DEFAULT 0,
  emergency_contact NULL, notes NULL, inactive_from DATE NULL
  INDEX(organization_id, status), INDEX(organization_id, phone)

holidays
  organization_id, date, meal_type ENUM('lunch','dinner','all'), reason
  UNIQUE(organization_id, date, meal_type)

attendance
  organization_id, member_id, date, meal_type ENUM('lunch','dinner'),
  status ENUM('present','absent'), marked_by FK users
  UNIQUE(member_id, date, meal_type)
  INDEX(organization_id, date, meal_type)

leaves
  organization_id, member_id, date, meal_type ENUM('lunch','dinner'),
  reason NULL, status ENUM('approved','late','rejected'), decided_by NULL, decided_at NULL
  UNIQUE(member_id, date, meal_type)

month_closures
  organization_id, month DATE (first day), closed_at, closed_by
  UNIQUE(organization_id, month)

bills
  organization_id, member_id, month DATE (first day), amount NUMERIC(10,2),
  status ENUM('unpaid','partial','paid') -- derived & cached on each payment write
  UNIQUE(member_id, month)

payments
  organization_id, bill_id, amount NUMERIC(10,2), method ENUM('cash','upi','bank'),
  paid_on DATE, note NULL, recorded_by FK users

menus
  organization_id, date, meal_type ENUM('lunch','dinner'), items TEXT  -- newline separated, shown as typed
  UNIQUE(organization_id, date, meal_type)

announcements
  organization_id, title, body, created_by, published_at

notifications
  organization_id, user_id, type ENUM('payment_due','leave_decided','announcement','general'),
  title, body, read_at NULL, ref_type NULL, ref_id NULL
  INDEX(user_id, read_at)
```

**Derived values (never stored):**
- Expected list for (date, meal) = active members whose plan includes meal AND no holiday AND no approved leave.
- Meals served = count(attendance where status='present').
- Member monthly meal count = count(present) for member in month.
- Bill status: `paid` if sum(payments) ≥ amount, `partial` if 0 < sum < amount, else `unpaid`.
- Dashboard "pending" = sum(amount − paid) over bills in month.

---

## 7. API (REST, `/api/v1`, JSON, JWT bearer)

Owner-only unless marked **C** (customer) or **B** (both).

| Method | Path | Notes |
|--------|------|-------|
| POST | /auth/login | **B** phone + password → access (15 min) + refresh (30 d) |
| POST | /auth/refresh | **B** |
| POST | /auth/logout | **B** revoke refresh |
| GET | /auth/me | **B** user + member (if customer) + org |
| PATCH | /auth/me | **B** name, language, password change |
| POST | /auth/register-owner | create org + owner (open in V1, protect with invite code env var) |
| GET/PATCH | /organization | settings |
| GET/POST | /plans ; PATCH /plans/{id} | |
| GET | /members?search=&status=&plan_id= | search on name, phone, room_no |
| POST | /members | creates user + member; returns temp password once |
| GET/PATCH | /members/{id} | |
| POST | /members/{id}/deactivate , /activate | |
| POST | /members/{id}/reset-password | returns new temp password |
| GET | /attendance?date=&meal_type= | expected list with current status + leave flag + counts |
| PUT | /attendance | body: date, meal_type, items[{member_id,status}] — bulk upsert; 409 if month closed |
| GET | /attendance/history?member_id=&month= | **B** (customer: own only) |
| GET | /attendance/summary?month= | per-member present counts |
| POST | /months/{YYYY-MM}/close ; DELETE to reopen | |
| GET | /leaves?date=&status= | owner |
| GET/POST | /me/leaves | **C** list own, create (body: date, meal_types[], reason) |
| DELETE | /me/leaves/{id} | **C** only if date in future |
| POST | /leaves/{id}/approve , /reject | for `late` leaves |
| GET/POST/DELETE | /holidays | |
| GET | /bills?month=&status= | pending list |
| POST | /bills/generate?month= | creates bills for all active members without one (amount = member.monthly_fee) |
| PATCH | /bills/{id} | amount |
| POST | /bills/{id}/payments | record payment |
| GET | /me/bills | **C** with payments |
| GET | /menus?from=&to= | **B** |
| PUT | /menus | body: date, meal_type, items |
| GET/POST | /announcements | GET is **B** |
| GET | /notifications ; POST /notifications/{id}/read ; POST /notifications/read-all | **B** |
| POST | /notifications/payment-reminders?month= | creates `payment_due` notification for every unpaid/partial bill |
| GET | /dashboard/owner?date= | active members, lunch/dinner expected & present, collected, pending, today's menu |
| GET | /dashboard/me | **C** plan, meal count this month, bill status, today's menu, upcoming leaves |
| GET | /reports/attendance?month= | per member per meal present counts |
| GET | /reports/payments?month= | billed, collected, pending, by method |
| GET | /reports/meals?month= | per day lunch/dinner served |
| GET | /reports/member/{id}?month= | one member's calendar |

Errors: `{ "detail": "...", "code": "MONTH_CLOSED" }`. Codes: `MONTH_CLOSED`, `LEAVE_PAST_CUTOFF`, `DUPLICATE_PHONE`, `INACTIVE_MEMBER`.

---

## 8. Screens

### Owner (bottom nav: Home · Members · Attendance · Payments · More)
1. Login
2. Home dashboard — stat cards (Members, Lunch, Dinner, Pending ₹), today's menu, quick actions (Attendance, Add Member, Payment, Menu)
3. Members list — search bar, status filter, member cards with chips (Paid/Pending, Active)
4. Member form (add/edit) — name, phone, room, plan, fee, joining date, deposit, notes; shows temp password once after create
5. Member profile — details, this month's meals, bill status, actions (deactivate, reset password)
6. Attendance — date strip, Lunch/Dinner tabs, counts, "Mark all present", searchable member list with one-tap Present/Absent toggles, leave badge, locked banner when month closed
7. Leaves — list by date, late-leave approve/reject
8. Payments — month picker, totals, pending list, tap → record payment sheet (amount, method, date)
9. Menu — week view, tap day/meal → edit, "copy from previous day"
10. More — Announcements (list/create), Holidays, Plans, Reports, Close month, Settings (org name, language, cutoff), Profile/Logout
11. Reports — 4 simple report screens with bar/percentage visuals

### Customer (bottom nav: Home · Attendance · Menu · Payments · Profile)
1. Login (and forced password change on first login)
2. Home — plan, meals this month, bill status chip, today's menu, "Skip Meal" CTA, upcoming leaves, announcements preview
3. Attendance calendar — month grid, tap day → lunch/dinner status
4. Menu — today + week
5. Payments — current bill, history
6. Leave form — date, lunch/dinner checkboxes, reason; shows cutoff warning when late
7. Notifications
8. Profile — name, language, change password

### Design system
- Primary `#10B981` (emerald); success green, pending orange (`#F59E0B`), absent/danger red (`#EF4444`); background `#F9FAFB`
- Min touch target 48px, base font 16px, titles 20–24px
- Status chips, not raw text; cards, not tables, on mobile
- Fonts must render Devanagari: Noto Sans + Noto Sans Devanagari

---

## 9. Non-functional requirements

- **Security:** bcrypt hashes; JWT secrets from env; CORS restricted to Netlify origin; rate limit `/auth/login` (10/min/IP); every query filtered by `organization_id` from the token, never from the request body; customers can only read their own member data.
- **Timezone:** backend `now_ist()` helper; frontend uses Day.js with `Asia/Kolkata`; API dates are `YYYY-MM-DD`.
- **Money:** `NUMERIC(10,2)`; frontend formats with `en-IN` locale (₹1,20,000).
- **Performance:** attendance screen for 100 members loads one request; indexes listed in §6.
- **Data:** Alembic migrations only; daily Neon backup verified at deploy; seed script for demo org.
- **Accessibility:** labels on all inputs, contrast ≥ 4.5:1, works at 360px width.
- **Observability:** structured logs; Sentry free tier optional.

---

## 10. Development roadmap (solo developer, ~6 weeks)

Each phase ends with: tests green in CI, deployed to free hosting, demoed on a phone.

| Phase | Week | Deliverable | Done when |
|-------|------|-------------|-----------|
| 0 Setup | 1 | Repo, backend skeleton + health route, Alembic, frontend skeleton with MUI theme, i18n (3 locale files, language picker), PWA manifest, CI (lint + tests), deploy pipelines | Both apps live on free hosting; language switch works |
| 1 Auth & org | 1 | Owner register, login/refresh/logout, `/auth/me`, role guards, owner/customer layouts with bottom nav | Owner and seeded customer can log in on phone |
| 2 Members & plans | 2 | Plans CRUD, members CRUD/search/deactivate, temp password + forced change, member profile | Owner adds 10 members in under 5 min |
| 3 Attendance & holidays | 2–3 | Expected-list service, bulk mark, date navigation, counts, holidays, month close/lock, customer calendar | Attendance for 50 members marked in under 1 min; lock enforced |
| 4 Leave | 3 | Customer leave form with cutoff rule, owner leave list, late approve/reject, attendance integration, notifications on decision | Leave removes member from expected list |
| 5 Billing & payments | 4 | Generate bills, record payments, status derivation, pending list, customer bill view, payment reminders | Dashboard pending ₹ equals sum of unpaid bills |
| 6 Menu & announcements | 4–5 | Menu editor + weekly view, copy previous day, announcements, notification center | Customer sees today's menu on home |
| 7 Dashboards & reports | 5 | Owner + customer dashboards, 4 reports | Numbers reconcile with raw tables in tests |
| 8 Hardening | 6 | Playwright smoke (login → attendance → payment), 360px QA, hi/mr copy review by a native speaker, seed demo data, README, pilot with 1–2 owners | Pilot owner completes a full day unassisted |

---

## 11. Testing strategy

- **Backend unit:** services (`expected_members`, `bill_status`, `leave_cutoff`) with fixed IST clock injected.
- **Backend API:** pytest + httpx against a test Postgres (docker or Neon branch); each router covered for owner, customer, and cross-tenant denial.
- **Frontend:** Vitest for hooks/components (StatusChip, attendance toggle, leave form validation); i18n key-completeness test (every key in `en.json` exists in `hi.json` and `mr.json`).
- **E2E:** 3 Playwright flows on mobile viewport.
- **Definition of done per task:** failing test → implementation → passing test → commit.

---

## 12. Open items to confirm with pilot owners (do not block build)

1. Fixed monthly fee only, or do some messes sell per-meal coupons? (affects V1.1 priority)
2. Is breakfast needed? (enum already allows it)
3. Should customers see each other's names anywhere? (V1: no)
4. Preferred default language per region

---

## 13. Next step

Generate the Phase 0 + Phase 1 implementation plan (`docs/superpowers/plans/`) with TDD tasks from this spec, then execute phase by phase.
