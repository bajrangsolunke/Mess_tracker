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
- Render's free API sleeps after 15 minutes idle (first open then takes ~1 minute). Create a free job at https://cron-job.org calling `https://<service>.onrender.com/health` every 10 minutes.
- Neon free keeps only 6 hours of restore history. Back up weekly: `pg_dump "<neon string>" > swad-YYYY-MM-DD.sql`.
- Do **not** run `scripts.seed` in production — it adds demo data.

## Updating
Push to `main` → Render and Netlify rebuild automatically (each Netlify deploy uses 15 of 300 monthly free credits).
