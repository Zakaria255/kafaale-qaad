# 🌍 Kafaale Qaad — Humanitarian Aid Platform

> Connecting verified emergency cases in Somalia with global sponsors through a transparent, privacy-first aid distribution system.

## 🚀 Live Stack

| Layer | Tech | Status |
|---|---|---|
| Frontend | React 18 + Vite + React Router | ✅ |
| Backend | Express 5 + TypeScript + Prisma | ✅ |
| Database | PostgreSQL (Docker dev · Supabase prod) | ✅ |
| AI | Claude Haiku (assistant) + Sonnet (sanitization) | ✅ |
| Real-time | Socket.io | ✅ |
| Auth | JWT + bcrypt (6 roles) | ✅ |

## 🗺️ Routes

| Path | Description |
|---|---|
| `/` | Home — hero, stats, workflow |
| `/cases` | All verified cases (real API) |
| `/donate` | Sponsor a case |
| `/login` | Sign in / Register (6 roles) |
| `/dashboard` | Full dashboard (role-based) |
| `/about`, `/how-it-works`, `/contact` | Public pages |

## 🏃 Run Locally

Prereqs: Node 20+, and Docker (for the local Postgres — matches production).

```bash
# 0. Start a local Postgres (from repo root)
docker compose up -d

# 1. Backend (Terminal 1)
cd backend
cp .env.example .env          # then fill in JWT_SECRET (+ ANTHROPIC_API_KEY for AI)
npm install
npx prisma db push            # create tables in the local DB
npm run dev                   # → http://localhost:4000

# 2. Frontend (Terminal 2, repo root)
cp .env.example .env.local    # optional — defaults to localhost:4000 in dev
npm install
npm run dev                   # → http://localhost:5173
```

> No Docker? Use a free Supabase project instead and put its connection URLs in `backend/.env`.
> See [PILOT_CHECKLIST.md](PILOT_CHECKLIST.md) for the full production deploy + ops runbook.

### Demo Accounts (password: `Kafaale123!`)
| Email | Role |
|---|---|
| superadmin@kafaale.org | Super Admin |
| admin@kafaale.org | Admin |
| agent@kafaale.org | Field Agent |
| donor@kafaale.org | Donor |
| reporter@kafaale.org | Reporter |

## 🤖 AI Features

- **AI Assistant** — Floating chat widget on every page (Claude Haiku)
- **AI Sanitization** — Auto-generates privacy-safe public case versions (Claude Sonnet)

Add `ANTHROPIC_API_KEY=sk-ant-...` to `backend/.env` to enable AI features.

## 🚀 Deploy

Host-agnostic. Full step-by-step (env vars, monitoring, DR, go/no-go) is in
**[PILOT_CHECKLIST.md](PILOT_CHECKLIST.md)**. In short:

- **Backend** → any Node host (Render `render.yaml` / Docker `backend/Dockerfile`). Root dir `backend`.
  Required env: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `FRONTEND_URL`, `BASE_URL`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY` (`SENTRY_DSN` recommended).
  The server **refuses to boot** without `DATABASE_URL`/`JWT_SECRET`.
- **Frontend** → Vercel. Set `VITE_API_URL=https://<your-api>/api` and redeploy.

## 📋 Case Pipeline (11 steps)
```
Reporter Submission → Office Review → Team Assignment → Field Investigation
→ AI Sanitization → Admin Approval → Donor Sponsorship → Delivery → Proof Upload → Completed
```
