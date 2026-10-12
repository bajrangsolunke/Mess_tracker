# Deploying स्वाद (free tier)

Database **Neon** → API **Render** → App **Netlify**. About 20 minutes, no card needed.

## 1. Database — Neon
1. Sign up at https://neon.tech → **Create project** → name `swad-mess`, region **AWS Asia Pacific (Singapore)**.
2. **Connect** → copy the connection string (starts with `postgresql://…neon.tech/neondb?sslmode=require…`). Keep it secret.

## 2. API — Render
1. Sign up at https://render.com with GitHub → **New → Blueprint** → pick this repo. Render reads `render.yaml`.
2. When asked for values:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon string from step 1 (paste as is) |
   | `OWNER_INVITE_CODE` | a secret of 8+ characters, e.g. `swad-latur-2026` — needed once to register the mess |
   | `CORS_ORIGINS` | `["https://<your-netlify-site>.netlify.app"]` — fill after step 3, then **Manual Deploy** |
   `JWT_SECRET` and `ENV=production` are set automatically.
3. Wait for **Live**. Open `https://<service>.onrender.com/health` → `{"status":"ok"}`. Tables are created on first start.

## 3. App — Netlify
1. Sign up at https://netlify.com with GitHub → **Add new site → Import from Git** → pick this repo. Build settings come from `netlify.toml`.
2. **Site configuration → Environment variables** → add `VITE_API_URL` = `https://<service>.onrender.com/api/v1`.
3. **Deploys → Trigger deploy**. Optionally rename the site (e.g. `swad-mess.netlify.app`).
4. Put that URL into Render's `CORS_ORIGINS` (step 2) and redeploy the API.

## 4. First use
1. Open the Netlify URL → choose language → **नवीन मेस? इथे नोंदवा** → enter mess name, your phone, a password and the setup code from step 2.
2. **दर**: confirm 1 वेळ / 2 वेळा prices, meal end times and the tiffin price list.
3. **सदस्य जोडा** for each member; send their login on WhatsApp from the app.
4. On phones: Chrome → ⋮ → **Add to Home screen** (iPhone: Safari → Share → **Add to Home Screen**).

## 5. Keep it fast and safe

### Keep the API awake
Render's free API sleeps after ~15 idle minutes; the next visitor then waits 30-60 s.
The GitHub workflow `.github/workflows/keep-awake.yml` pings `/health` every 10 minutes from
05:30 to 00:30 IST. Nothing to set up. Check it under GitHub → **Actions → Keep API awake**.
GitHub pauses scheduled workflows after 60 days without repo activity: push anything, or
run it by hand from the Actions tab. A paid Render plan removes the sleep entirely.

### Nightly backups (one-time setup, 2 minutes)
`.github/workflows/backup.yml` dumps the database every night at 02:00 IST, encrypts it
(AES-256, the repo is public) and keeps 30 days of copies under **Actions → Database backup**.
1. GitHub → repo **Settings → Secrets and variables → Actions → New repository secret**:
   - `BACKUP_DATABASE_URL`: the Neon connection string (the same value as Render's `DATABASE_URL`)
   - `BACKUP_PASSPHRASE`: a long passphrase. **Write it down somewhere safe**: without it a backup cannot be opened.
2. **Actions → Database backup → Run workflow** once, and check it turns green.

**Restore** (only if data is lost):
```bash
gpg -d swad-backup-YYYY-MM-DD.dump.gpg > swad.dump        # asks for the passphrase
docker run --rm -v "$PWD:/b" postgres:17 \
  pg_restore --clean --if-exists --no-owner --no-privileges -d "<neon connection string>" /b/swad.dump
```

### Error alerts (optional, free)
Create a free account at https://sentry.io → two projects (**FastAPI** and **React**) → copy
each project's DSN, then set:
- Render → Environment: `SENTRY_DSN` = the FastAPI project's DSN
- Netlify → Environment variables: `VITE_SENTRY_DSN` = the React project's DSN, then **Trigger deploy**

Sentry then emails you when something breaks. No personal data is sent: request bodies,
user details and member link secrets are stripped. Leave both empty to keep it off.

### Built in
- Wrong passwords: 5 per phone (or 20 per internet address) lock login for 15 minutes; the
  same applies to the setup code and the "current password" when changing a password.
- Security headers for the app are in `netlify.toml`; the API adds its own.
- Do **not** run `scripts.seed` in production: it adds demo data.

## Updating
Push to `main` → Render and Netlify rebuild automatically (each Netlify deploy uses 15 of 300 monthly free credits).
