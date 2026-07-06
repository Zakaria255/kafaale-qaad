# 🚀 Kafaale Qaad — Full Production Deployment Guide

> One backend serves **both the web app and the mobile app**.
> Stack: **Supabase (PostgreSQL)** + **Railway (API)** + **Vercel (Web)**

---

## Architecture Overview

```
Mobile App (React Native / Expo)
        │
        ▼
Web App (React + Vite)  ──►  Railway API (Node + Express)  ──►  Supabase PostgreSQL
                                      │
                                      ▼
                              Supabase Storage (photos/media)
```

---

## STEP 1 — Supabase Database (ALREADY PROVISIONED ✅)

The Supabase project is already created and the full schema (all 29 tables) is
deployed and verified. You normally **do not need to redo this** — it's here for
reference / disaster recovery.

- **Project**: `kafaale-qaad` · ref `cassihxdqqpkrzpsaesl` · region `eu-west-1` · Postgres 17
- **Project URL** (`SUPABASE_URL`): `https://cassihxdqqpkrzpsaesl.supabase.co`
- **Schema**: managed by **Prisma** (`backend/prisma/schema.prisma`), deployed as
  the single baseline migration `backend/prisma/migrations/0_init/`. Already recorded
  as applied on the remote DB, so `prisma migrate deploy` is a safe no-op.
- **Row-Level Security**: enabled on all 29 tables (locks the public anon endpoint).
- **App database role**: the app connects as a dedicated least-privilege role
  **`kafaale_app`** (NOT the master `postgres` role), which has table privileges +
  `app_all` RLS policies on every table. A live Prisma round-trip is verified working.

### Connection strings (the app role)

Prisma needs BOTH on Supabase — pooled for the app, direct/session for migrations:

```
DATABASE_URL="postgresql://kafaale_app.cassihxdqqpkrzpsaesl:<PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://kafaale_app.cassihxdqqpkrzpsaesl:<PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
```

The `<PASSWORD>` for `kafaale_app` lives in `backend/.env` (gitignored). Copy those
same two lines into your host's environment variables for production.

> To rotate it later: `ALTER ROLE kafaale_app WITH PASSWORD '<new>';` (run from the
> Supabase SQL editor), then update `backend/.env` + your host env vars.

---

## STEP 2 — Create Supabase Storage Bucket (only if using file uploads)

File uploads are optional — the backend falls back to local disk when Supabase
Storage isn't configured. To enable it:

1. In Supabase sidebar → **Storage** → **New Bucket**
   - Name: `kafaale-media`
   - Make it **Private** (field agents upload, not public random access)
2. Get the **`service_role`** key from **Project Settings → API**
3. Set in your env: `SUPABASE_SERVICE_KEY=<service_role key>` and
   `SUPABASE_STORAGE_BUCKET=kafaale-media`

---

## STEP 3 — Backend is already on PostgreSQL ✅

`backend/prisma/schema.prisma` is already `provider = "postgresql"` with `directUrl`
wired. Nothing to change. To (re)seed the database with default users:

```bash
cd backend
npx prisma db seed     # creates super_admin, test users, etc.
```

To sanity-check the connection at any time:

```bash
cd backend
npx prisma migrate status     # should say "Database schema is up to date!"
```

---

## STEP 4 — Generate Strong JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output — use it as `JWT_SECRET` in Railway.

---

## STEP 5 — Deploy to Railway

1. Go to **https://railway.app** → New Project → **Deploy from GitHub repo**
   - Connect your GitHub and select the `kafaale-web` repo
   - Set the **Root Directory** to `backend`

2. Railway auto-detects the `Dockerfile` and builds it

3. In Railway → your service → **Variables**, add ALL these:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | `kafaale_app` transaction-pooler URL (port 6543, `?pgbouncer=true`) — see Step 1 |
   | `DIRECT_URL` | `kafaale_app` session-pooler URL (port 5432) — see Step 1 |
   | `JWT_SECRET` | the 128-char hex string from Step 4 |
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `ANTHROPIC_API_KEY` | your Claude API key |
   | `BASE_URL` | `https://YOUR-APP.up.railway.app` (fill after first deploy) |
   | `FRONTEND_URL` | `https://kafaale.vercel.app` (or your Vercel URL) |
   | `SUPABASE_URL` | `https://YOUR-REF.supabase.co` |
   | `SUPABASE_SERVICE_KEY` | your Supabase `service_role` key |
   | `SUPABASE_STORAGE_BUCKET` | `kafaale-media` |

4. Click **Deploy** — Railway will:
   - Build the Docker image
   - Run `npx prisma migrate deploy` (applies the migration to Supabase)
   - Start `node dist/server.js`

5. Once deployed, copy the Railway URL (e.g. `https://kafaale-api.up.railway.app`)
   - Update `BASE_URL` variable to that URL

---

## STEP 6 — Deploy Frontend to Vercel

```bash
# In the root kafaale-web/ folder:
npm run build

# Install Vercel CLI if needed:
npm i -g vercel

# Deploy:
vercel --prod
```

When Vercel asks:
- **Framework**: Vite
- **Root**: `./` (root of the repo)
- **Build command**: `npm run build`
- **Output directory**: `dist`

In Vercel → your project → **Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://kafaale-api.up.railway.app/api` |

Redeploy after adding the variable.

---

## STEP 7 — Mobile App (When Ready)

The mobile app uses the **same Railway API** — no DB changes needed.

In the React Native / Expo app, just set:
```js
const API_URL = 'https://kafaale-api.up.railway.app/api';
```

The JWT auth system already works for any client (web or mobile). All existing endpoints are ready.

---

## Default Login Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| super_admin | superadmin@kafaale.org | Kafaale123! |
| admin | admin@kafaale.org | Kafaale123! |
| field_agent | agent@kafaale.org | Kafaale123! |
| donor | donor@kafaale.org | Kafaale123! |
| reporter | reporter@kafaale.org | Kafaale123! |

> ⚠️ **Change all passwords immediately after first production deploy.**

---

## Cost Summary (Monthly)

| Service | Free Tier | What You Get |
|---------|-----------|--------------|
| Supabase | $0 | 500 MB DB, 1 GB storage, 2 GB bandwidth |
| Railway | $5/mo | 500 hours/mo (24/7 for ~21 days), scales up |
| Vercel | $0 | Unlimited static deploys |
| Claude API | Pay-per-use | ~$0.003 per case AI sanitization |

**Total: ~$0–5/month for early stage**

---

## Local Development

Local dev now uses the **same Supabase database** (schema is `provider = "postgresql"`,
so SQLite is no longer used). `backend/.env` already holds the `kafaale_app`
connection strings.

```bash
# Backend + frontend:
cd backend && npm run dev
cd .. && npm run dev
```

> Heads up: local dev writes to the shared Supabase DB. For an isolated local DB,
> create a separate Supabase project (or a local Postgres) and point `backend/.env` at it.

---

## If Something Goes Wrong on Railway

```bash
# Check logs in Railway dashboard → Deployments → View Logs

# Or redeploy manually:
railway up   # if Railway CLI installed
```
