# Kafaale Qaad — Pre-Pilot Operations Checklist

Goal: get **one working end-to-end deployment** live, observable, and recoverable,
then run a small supervised pilot (~40 people). Work top to bottom.

Stack: **Vercel** (frontend) · **Render/your host** (Express API) · **Supabase** (Postgres + Storage).

---

## 0. Before you deploy anything

- [ ] Buy hosting + the `.com` domain.
- [ ] Create a **Supabase** project → copy the **pooled** `DATABASE_URL` (port 6543, `?pgbouncer=true`) and the **direct** `DIRECT_URL` (port 5432).
- [ ] In Supabase → **Storage**, create a **private** bucket for media; copy `SUPABASE_URL` and the **service_role** key (`SUPABASE_SERVICE_KEY`).
- [ ] Generate a strong `JWT_SECRET` (e.g. `openssl rand -base64 48`).
- [ ] Have your `ANTHROPIC_API_KEY` ready (for AI sanitization + chat).

---

## 1. Deploy the backend (do this FIRST)

The frontend is useless until the API is live. Provider build/start commands are already set
(`render.yaml`, `backend/Dockerfile`): build = `npm ci && prisma generate && npm run build`,
start = `prisma db push && node dist/server.js`.

Set these env vars in the host dashboard:

| Var | Required | Notes |
|---|---|---|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | per host (Render uses 10000) |
| `DATABASE_URL` | ✅ | Supabase **pooled** URL |
| `DIRECT_URL` | ✅ | Supabase **direct** URL (for schema push/migrate) |
| `JWT_SECRET` | ✅ | long random; server now **refuses to boot** without it |
| `FRONTEND_URL` | ✅ | your Vercel/.com URL — drives CORS allowlist |
| `BASE_URL` | ✅ | the backend's own public URL |
| `SUPABASE_URL` | ✅ (prod) | else uploads fall back to disk and are **wiped on redeploy** |
| `SUPABASE_SERVICE_KEY` | ✅ (prod) | service_role key, NOT anon |
| `ANTHROPIC_API_KEY` | ✅ | AI features no-op/demo without it |
| `SENTRY_DSN` | recommended | turns on error monitoring (code already wired) |

- [ ] Deploy succeeds (watch the build log — `tsc` must pass; it does locally).
- [ ] `GET https://<api>/health` returns 200.
- [ ] First request creates tables (check Supabase → Table editor).
- [ ] Seed an initial **super_admin** (run the seed, or register then elevate in DB — remember `admin`/`super_admin` can no longer be self-registered).

---

## 2. Deploy the frontend (Vercel)

- [ ] Set `VITE_API_URL` = `https://<your-api>/api` (include `/api`).
- [ ] Redeploy (env vars only apply to **new** builds).
- [ ] Open the site → **no ⚠️ demo/offline banner** should appear (banner = backend not reachable).
- [ ] Browser console: no red errors; network tab shows calls hitting your API, not localhost or any old host.

---

## 3. End-to-end smoke test (manual, ~15 min)

Walk one case through the whole pipeline with real accounts:

- [ ] Reporter submits a case (with a photo).
- [ ] Field agent verifies + uploads delivery proof → confirm the image persists after a backend **redeploy** (proves Supabase storage, not disk).
- [ ] AI sanitization runs (case gets a public title/story, PII stripped).
- [ ] Office/admin approves → case appears publicly.
- [ ] Sponsor/donor completes a donation → status updates; try submitting the **same** idempotency key twice → second is rejected (double-spend guard).
- [ ] Log in as the **demo** accounts with the backend **stopped** → confirm the ⚠️ banner shows.

---

## 4. Monitoring & observability (mostly already built — activate it)

- [ ] **Errors:** set `SENTRY_DSN` on the backend (Sentry init is already in `server.ts`). Trigger a test error, confirm it lands in Sentry.
- [ ] **Uptime:** create an **UptimeRobot** (or Better Stack) monitor on `https://<api>/health`, 1–5 min interval, alert to your email/phone.
- [ ] **Frontend errors (optional):** add `@sentry/react` and init in `src/main.jsx` gated on a `VITE_SENTRY_DSN` — defer if short on time; the offline banner already covers the worst silent-failure case.
- [ ] **Logs:** confirm you can view live logs in the host dashboard (winston logs to stdout).

---

## 5. Light load test (match the pilot, not fantasy scale)

A 40-person pilot does **not** need 1000 concurrent. Validate ~50 concurrent, find the rough ceiling later.

Install [k6](https://k6.io) and run against a **staging** deploy (not prod with real data):

```js
// smoke.js — k6 run smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 50, duration: '2m' };
export default function () {
  check(http.get(`${__ENV.API}/health`), { 'health 200': r => r.status === 200 });
  check(http.get(`${__ENV.API}/cases`),  { 'cases ok':  r => r.status < 500 });
  sleep(1);
}
```
`API=https://<api>/api k6 run smoke.js`

- [ ] p95 response time stays reasonable (< ~800ms) and error rate ~0 at 50 VUs.
- [ ] Watch Supabase connection count — the **pooled** URL must be used (you set `DATABASE_URL` to the 6543 pooler).
- [ ] Note the breaking point only if you have time; record "max safe load" for later scaling.

---

## 6. Disaster-recovery drill (you have a runbook — test it once)

Follow `backend/DISASTER_RECOVERY.md` (RTO 4h / RPO 24h) and actually rehearse:

- [ ] Confirm Supabase **daily backups** are on (free tier = point-in-time limited; consider a paid tier or a scheduled `pg_dump` to storage).
- [ ] Do a **restore test**: spin a scratch DB, restore a backup, point a staging API at it, verify data loads.
- [ ] Write down: who gets alerted, who runs the restore, where credentials live.

---

## 7. Pilot guardrails (process, not just code)

- [ ] Brief admins: destructive actions (approve/confirm/delete) are **not yet undoable** — double-check before clicking. (Soft-delete/undo is a planned code follow-up.)
- [ ] Payments: until reconciliation is automated, have **one finance person** manually verify each EVC/Zaad/bank receipt against the donation record daily. Watch for: duplicate receipts, mismatched amounts, fake screenshots.
- [ ] Fraud: the field fraud-scoring service runs automatically — review any `high` `fraudRiskLevel` case before approval. Manually watch for repeated phone numbers / reused GPS / reused photos (automated duplicate detection is a planned follow-up).

---

## 8. Go / No-Go criteria for pilot

Launch the pilot only when ALL are true:
- [ ] Backend live, `/health` green, monitored by UptimeRobot.
- [ ] Frontend on the real domain, no demo banner, talking to the real API.
- [ ] Full smoke test passed (case → verify → AI → approve → donate).
- [ ] Uploads survive a redeploy (Supabase storage confirmed).
- [ ] Sentry receiving errors; you can read live logs.
- [ ] One DR restore rehearsed.
- [ ] A named person owns daily payment reconciliation + fraud review.

---

### Known code follow-ups (not blockers for a supervised pilot)
- Move localStorage-only content (stories, updates, partners, team, categories) to the DB so it's shared/persistent across visitors.
- Admin soft-delete + undo for destructive actions.
- Automated duplicate phone/GPS/victim detection.
- Authenticate the Socket.IO handshake; consider auth on the public AI chat endpoint.
- Move backend deps out of the **frontend** `package.json` (bundle hygiene).
