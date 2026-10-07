# Phase 0 + Phase 1: Setup, Auth & Layouts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployable monorepo where an owner can register a mess, log in on a phone in English/Hindi/Marathi, and land on a role-specific shell with bottom navigation; a customer created by seed can log in too.

**Architecture:** `backend/` is a FastAPI app with async SQLAlchemy over Postgres, Alembic migrations, JWT access + rotating refresh tokens; `frontend/` is a Vite React PWA with MUI, React Router, TanStack Query and react-i18next. Postgres runs in Docker on port 5434 locally; CI uses a Postgres service container.

**Tech Stack:** Python 3.12, uv, FastAPI, SQLAlchemy 2 async + asyncpg, Alembic, Pydantic v2 + pydantic-settings, PyJWT, bcrypt, pytest + httpx; Node 24, Vite 6, React 18, TypeScript, MUI 6, React Router 6, TanStack Query 5, react-i18next, vite-plugin-pwa, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-07-mess-tracker-v1-plan.md`

## Global Constraints

- Every tenant table has `organization_id`; every query filters by the org from the JWT, never from the request body (spec §9).
- Timestamps stored UTC; "today" computed in `Asia/Kolkata` (spec D11).
- Phone is the login username, unique per organization (spec §6 `users`).
- Access token 15 min, refresh token 30 days, refresh stored hashed and revocable (spec §7).
- Languages: `en`, `hi`, `mr`; every key in `en.json` must exist in the other two (spec §11).
- Primary color `#10B981`, min touch target 48px, base font 16px, Devanagari-capable fonts (spec §8).
- Error body shape: `{"detail": "...", "code": "SOME_CODE"}` (spec §7).
- Owner registration protected by `OWNER_INVITE_CODE` env var (spec §7).

## Review Focus

1. Login with a phone containing spaces or `+91` prefix should still match the stored user → normalize phone to digits in Task 7 (test added there).
2. A revoked or expired refresh token must return 401 and never mint a new access token → Task 8 tests.
3. A customer token calling an owner-only route must get 403, not 500 → Task 9 test.
4. Frontend with an expired access token must refresh once and retry, then log out if refresh fails → Task 10 test.
5. Registering an owner with a phone that already exists in that org must return 409 `DUPLICATE_PHONE`, not a 500 from the unique index → Task 8 test.

---

### Task 1: Repository scaffold

**Files:**
- Create: `.gitignore`, `README.md`, `docker-compose.yml`, `.editorconfig`

- [ ] **Step 1: Init git and write files**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    container_name: mess-tracker-db
    environment:
      POSTGRES_USER: mess
      POSTGRES_PASSWORD: mess
      POSTGRES_DB: mess
    ports: ["5434:5432"]
    volumes: ["mess_pgdata:/var/lib/postgresql/data"]
volumes:
  mess_pgdata:
```

- [ ] **Step 2: Start DB, verify** `docker compose up -d db && docker compose exec db pg_isready` → `accepting connections`
- [ ] **Step 3: Commit** `chore: scaffold repo with postgres compose`

### Task 2: Backend skeleton with health route

**Files:**
- Create: `backend/pyproject.toml`, `backend/app/__init__.py`, `backend/app/main.py`, `backend/app/core/config.py`, `backend/tests/conftest.py`, `backend/tests/test_health.py`, `backend/.env.example`

**Produces:** `app.main.app` (FastAPI), `app.core.config.settings` with `database_url`, `jwt_secret`, `access_token_minutes=15`, `refresh_token_days=30`, `owner_invite_code`, `cors_origins`.

- [ ] **Step 1: Failing test**

```python
# backend/tests/test_health.py
import pytest
@pytest.mark.anyio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
```
- [ ] **Step 2:** `uv run pytest` → fails (no app)
- [ ] **Step 3:** Implement `config.py` (pydantic-settings, `env_file=".env"`), `main.py` with CORS + `/health`, conftest with `httpx.AsyncClient(transport=ASGITransport(app=app))`.
- [ ] **Step 4:** `uv run pytest` → PASS
- [ ] **Step 5: Commit** `feat(backend): fastapi skeleton with health route`

### Task 3: Database layer, models, Alembic

**Files:**
- Create: `backend/app/db/base.py`, `backend/app/db/session.py`, `backend/app/models/{__init__,organization,user,refresh_token}.py`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/0001_init.py`, `backend/tests/test_models.py`
- Modify: `backend/tests/conftest.py` (test DB fixture)

**Produces:** `Base`, `get_session()` dependency, `Organization`, `User(role: UserRole)`, `RefreshToken`; enums `UserRole('owner','customer')`, `Language('en','hi','mr')`, `BusinessType('mess')`.

- [ ] **Step 1: Failing test** — create org + owner user in a session, read back, assert unique `(organization_id, phone)` raises `IntegrityError`.
- [ ] **Step 2:** run → fails
- [ ] **Step 3:** Implement models per spec §6 (`organizations`, `users`, `refresh_tokens`) with `TimestampMixin`. Alembic async env; `uv run alembic revision --autogenerate -m init` then review.
- [ ] **Step 4:** conftest: create test DB `mess_test` once per session, run `Base.metadata.create_all`, per-test transaction rollback; `uv run pytest` → PASS
- [ ] **Step 5: Commit** `feat(backend): db session, core models, initial migration`

### Task 4: Frontend skeleton with theme, router, i18n

**Files:**
- Create: `frontend/` via `npm create vite@latest frontend -- --template react-ts`; `src/app/theme.ts`, `src/app/providers.tsx`, `src/app/router.tsx`, `src/i18n/index.ts`, `src/i18n/locales/{en,hi,mr}.json`, `src/features/auth/LanguageSelect.tsx`, `src/i18n/locales.test.ts`, `src/lib/storage.ts`
- Modify: `src/main.tsx`, `src/App.tsx`, `index.html` (Noto Sans + Noto Sans Devanagari, viewport)

**Produces:** `theme` (primary `#10B981`, fontSize 16, button minHeight 48), `i18n` instance with `storage.getLanguage()/setLanguage()` persisted to localStorage key `mt.lang`, route table.

- [ ] **Step 1: Failing test** `locales.test.ts`: flatten keys of en and assert `hi` and `mr` have identical key sets.
- [ ] **Step 2:** `npx vitest run` → fails (no locale files)
- [ ] **Step 3:** Create locales (keys: `app.name, nav.home, nav.members, nav.attendance, nav.payments, nav.more, nav.menu, nav.profile, auth.login, auth.phone, auth.password, auth.signIn, auth.invalid, auth.logout, lang.select, lang.en, lang.hi, lang.mr, common.loading, common.error, common.save, common.cancel, dashboard.welcome`), i18n init, theme, providers (QueryClient, ThemeProvider, CssBaseline), router with `/select-language`, `/login`, `/owner/*`, `/app/*`.
- [ ] **Step 4:** `npx vitest run` → PASS; `npm run build` succeeds
- [ ] **Step 5: Commit** `feat(frontend): vite skeleton with MUI theme, router, i18n`

### Task 5: PWA manifest

**Files:** `frontend/vite.config.ts` (vite-plugin-pwa), `frontend/public/icons/icon-192.png`, `icon-512.png`

- [ ] Configure `VitePWA({registerType:'autoUpdate', manifest:{name:'Mess Tracker', short_name:'Mess', theme_color:'#10B981', background_color:'#F9FAFB', display:'standalone', icons:[...]}})`; generate solid emerald PNG icons with a tiny Python/Pillow or ImageMagick step.
- [ ] `npm run build` → `dist/manifest.webmanifest` and `sw.js` exist.
- [ ] **Commit** `feat(frontend): PWA manifest and service worker`

### Task 6: CI and deploy configs

**Files:** `.github/workflows/ci.yml`, `backend/render.yaml`, `frontend/netlify.toml`

- [ ] CI: two jobs. backend: `services: postgres:16`, `uv sync`, `uv run ruff check`, `uv run pytest`. frontend: `npm ci`, `npm run lint`, `npx vitest run`, `npm run build`.
- [ ] `render.yaml`: web service, `uv sync && uv run alembic upgrade head` build, `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT` start, env vars listed.
- [ ] `netlify.toml`: base `frontend`, publish `dist`, SPA redirect `/* /index.html 200`.
- [ ] **Commit** `ci: github actions, render and netlify configs`

### Task 7: Security helpers

**Files:** `backend/app/core/security.py`, `backend/app/core/phone.py`, `backend/tests/test_security.py`

**Produces:** `hash_password(str)->str`, `verify_password(plain, hashed)->bool`, `create_access_token(user_id:int, org_id:int, role:str)->str`, `decode_access_token(str)->TokenPayload(sub:int, org:int, role:str, exp:int)`, `new_refresh_token()->tuple[str, str]` (raw, sha256 hash), `hash_token(str)->str`, `normalize_phone(str)->str` (digits only, strip leading 91 when 12 digits).

- [ ] **Step 1: Failing tests**: hash/verify roundtrip; wrong password false; token roundtrip; expired token raises `TokenError`; `normalize_phone("+91 98765 43210") == "9876543210"`.
- [ ] **Step 2:** fail → **Step 3:** implement with `bcrypt` and `PyJWT` → **Step 4:** PASS → **Step 5: Commit** `feat(backend): password hashing, jwt, phone normalization`

### Task 8: Auth API

**Files:** `backend/app/schemas/auth.py`, `backend/app/services/auth.py`, `backend/app/api/v1/auth.py`, `backend/app/api/v1/__init__.py`, `backend/app/core/errors.py`, `backend/tests/test_auth_api.py`
- Modify: `backend/app/main.py` (include router, error handler)

**Produces:** routes `POST /api/v1/auth/register-owner`, `/login`, `/refresh`, `/logout`, `GET/PATCH /api/v1/auth/me`. `ApiError(status, code, detail)` exception + handler producing `{"detail","code"}`.

- [ ] **Step 1: Failing tests**: register owner (201, returns tokens, org created); register with wrong invite → 403 `INVALID_INVITE`; duplicate phone → 409 `DUPLICATE_PHONE`; login ok; login bad password → 401 `INVALID_CREDENTIALS`; login with `+91 ` prefixed phone works; refresh rotates (old refresh → 401 `INVALID_REFRESH`); logout revokes; `GET /me` returns user+org; `PATCH /me` changes language and password.
- [ ] **Step 2:** fail → **Step 3:** implement service + router → **Step 4:** PASS → **Step 5: Commit** `feat(backend): auth endpoints with refresh rotation`

### Task 9: Auth dependencies and role guards

**Files:** `backend/app/core/deps.py`, `backend/tests/test_deps.py`

**Produces:** `CurrentUser = Annotated[User, Depends(get_current_user)]`, `require_owner`, `require_customer` dependencies; 401 `NOT_AUTHENTICATED`, 403 `FORBIDDEN`.

- [ ] Tests via a temporary test-only router mounted in the test: no token → 401; customer on owner route → 403; owner → 200. Implement. Commit `feat(backend): current-user and role dependencies`.

### Task 10: Frontend API client and auth state

**Files:** `frontend/src/api/client.ts`, `frontend/src/features/auth/authStore.ts`, `frontend/src/api/useAuth.ts`, `frontend/src/api/client.test.ts`

**Produces:** `api<T>(path, init)` that attaches bearer, on 401 calls `/auth/refresh` once with stored refresh token and retries, on second failure clears tokens and dispatches `auth:logout`; `authStore` (zustand-free: `useSyncExternalStore` over localStorage keys `mt.access`, `mt.refresh`, `mt.user`); hooks `useLogin()`, `useMe()`, `useLogout()`.

- [ ] Test with mocked `fetch`: 401 → refresh → retry success; 401 → refresh 401 → tokens cleared. Implement. Commit `feat(frontend): api client with token refresh and auth store`.

### Task 11: Login page, language select, route guards, role shells

**Files:** `frontend/src/features/auth/{LoginPage,LanguageSelectPage,RequireRole}.tsx`, `frontend/src/components/BottomNav.tsx`, `frontend/src/features/shell/{OwnerShell,CustomerShell}.tsx`, `frontend/src/features/dashboard/{OwnerHome,CustomerHome}.tsx` (placeholder greeting), `frontend/src/features/auth/LoginPage.test.tsx`
- Modify: `src/app/router.tsx`

- [ ] Test: LoginPage renders translated labels, submits phone+password, on success navigates to `/owner` or `/app` by role; RequireRole redirects unauthenticated to `/login`. Implement MUI forms with 48px buttons; BottomNav uses `BottomNavigation` with 5 items per role. First visit (no `mt.lang`) → `/select-language`. Commit `feat(frontend): login, language select, role shells with bottom nav`.

### Task 12: Seed script and README

**Files:** `backend/scripts/seed.py`, `README.md` (run instructions), `backend/tests/test_seed.py`

- [ ] Seed creates org "Demo Mess", owner `9000000001/owner123`, customer `9000000002/cust123` idempotently. Test runs seed twice and asserts counts unchanged. README: docker, `uv sync`, `alembic upgrade head`, `uv run python -m scripts.seed`, `uvicorn`, `npm run dev`. Commit `feat: seed script and README`.

### Task 13: Verification

- [ ] `uv run pytest` all green; `npx vitest run` green; `npm run build` ok; start both servers, log in as owner and customer with curl and in browser at 360px width; confirm language switch changes nav labels.
