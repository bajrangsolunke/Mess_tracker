# SDD ledger — plan: docs/superpowers/plans/2026-10-07-phase0-1-setup-auth.md
Pre-flight: Task7→8 (security fns), Task8→9 (ApiError), Task3→8 (models), Task10→11 (authStore) — consistent names; no conflicts.
Ruling: work on main — fresh repo with no history to protect; cost if wrong: none.
Task 1: complete (commit 789ca50, tests: docker pg_isready → accepting connections)
Task 2: complete (commit 3e6143e, tests: uv run pytest → 1 passed)
Task 3: complete (commit 9fdbad4, tests: uv run pytest → 3 passed; alembic upgrade head applied)
Task 4: Ruling: use installed majors (React 19, MUI 9, Router 7, Vite 8, Zod 4) instead of plan's React 18/MUI 6/Vite 6 — current scaffold defaults; cost if wrong: API differences in MUI/Router, caught by build+tests.
Task 4: complete (commit 6d3dd3e, tests: npx vitest run → 3 passed; npm run build ok)
Task 5: complete (commit 5b1914a, tests: npm run build → manifest.webmanifest + sw.js emitted)
Task 6: complete (commit 2afa214, tests: config files only; ruff format --check passes locally)
Task 7: complete (commit 16dabc8, tests: uv run pytest → 14 passed in 1.47s)
Task 8: Ruling: users.phone made globally unique (migration 31b700f0af71) in addition to (org, phone) — login has no mess selector, so a phone must resolve to one user; cost if wrong: one person cannot be a customer of two messes with one phone (acceptable for V1).
Task 8: Ruling: get_current_user/require_owner/require_customer implemented here because /auth/me needs them — Task 9 keeps its tests; cost if wrong: none.
Task 8: complete (commit a87d0d1, tests: uv run pytest → 27 passed)
Task 9: complete (commit 37b62ac, tests: uv run pytest tests/test_deps.py → 8 passed; full suite 35)
Task 10: complete (commit 6b25dad, tests: npx vitest run → 8 passed)
Task 11: complete (commit 90f8597, tests: npx vitest run → 16 passed; tsc + build ok)
Task 12: complete (commit f09a9f5, tests: uv run pytest → 37 passed; seed ran against dev DB)
Task 13: complete (commit acf93b2, tests: backend 37 passed, frontend 16 passed, build ok; manual: owner+customer login via curl, Vite proxy, and Chromium at 360px in Marathi; logout works; favicon 404 fixed)
Task 13: note: login form pre-filled after logout = Chromium saved-password autofill in the Playwright profile (persists across reload), not app state.
Final review: sonnet subagent, 22 findings (2 Critical, 10 Important, 10 Minor). Re-graded: finding 7 (multi-tab storage sync) and 12 (must_change_password flow / boot revalidation) deferred to Phase 2 as minors.
Final: fixed 422→500 on validation (F1) — test_bad_phone_on_login_is_422 RED→GREEN
Final: fixed refresh rotation race (F2) — test_concurrent_refresh_only_one_wins RED→GREEN
Final: fixed bcrypt 72-byte 500 (F3) — test_long_multibyte_password_is_422_not_500 RED→GREEN
Final: fixed phone normalization (F4) — test_normalize_phone_rejects_invalid/strips_0091 RED→GREEN
Final: fixed refresh unavailable logs out (F5) — client.test "keeps the session when refresh fails…" RED→GREEN
Final: fixed logout after access expiry (F6) — test_logout_without_access_token_revokes_refresh RED→GREEN
Final: fixed insecure prod defaults + compare_digest (F8) — test_production_rejects_default_secrets RED→GREEN
Final: fixed render.yaml + postgres:// rewrite (F9) — test_database_url_rewritten_for_asyncpg RED→GREEN; render.yaml not executable locally
Final: fixed login timing oracle (F10) — test_inactive_user_login_401 (behaviour); timing itself not asserted
Final: fixed language not applied after login (F11) — LoginPage.test "applies the user's saved language" RED→GREEN
Final: suite backend 52/52, frontend 20/20, tsc, lint, build green. Commit cc15611.
Final: Ruling: F7 multi-tab refresh sync deferred — phone PWA is single-tab in practice; cost if wrong: a desktop user with two tabs gets logged out once.
Final: Ruling: F12 must_change_password + /auth/me revalidation on boot deferred to Phase 2 (member creation introduces temp passwords) — cost if wrong: deactivated user sees cached shell until first API call fails.
Final: Ruling: reviewer disagreed with global phone uniqueness — kept; spec-level, revisit if a pilot owner hits it.
Final: minor (deferred): F13 client phone normalization lacks leading-0 strip; raw English server messages shown for non-credential errors
Final: minor (deferred): F14 jwt.decode should require exp/sub/org/role claims
Final: minor (deferred): F15 revoke_refresh not scoped to user; password change does not revoke sessions; no token pruning
Final: minor (deferred): F16 rollback before raising 409 in register race; race path untested
Final: minor (deferred): F17 uq_users_org_phone redundant; migrations could be squashed
Final: minor (deferred): F18 CI: no coverage; ruff format covers alembic/versions
Final: minor (deferred): F19 CORS allow_credentials=True unnecessary; docs not gated in prod
Final: minor (deferred): F20 locale test does not check {{placeholders}} parity
Final: minor (deferred): F21 empty VITE_API_URL on Netlify yields generic error; non-JSON 200 not handled
Final: minor (deferred): F22 remaining test gaps: expired refresh, revoked replay, 204 handling
