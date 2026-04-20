<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Course Code

A React + Express course platform with role-based auth (student / staff / HOD), file uploads, lesson progress tracking, and threaded comments.

**Stack:** React 19 · Vite · Express · Postgres (Supabase) · Supabase Storage · JWT auth.

## Run locally

**Prerequisites:** Node.js 20+ and a free Supabase project.

```bash
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET, DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY
node scripts/init-supabase-schema.mjs   # creates tables in Supabase (one-time)
npm run dev
```

Visit http://localhost:3000.

## Scripts

| Script                                       | What it does                                                            |
|----------------------------------------------|-------------------------------------------------------------------------|
| `npm run dev`                                | Vite middleware + Express on `:3000`                                    |
| `npm run build`                              | Production build into `dist/`                                           |
| `npm start`                                  | Run the Express server in production mode (serves `dist/`)              |
| `npm run lint`                               | TypeScript type-check                                                   |
| `node scripts/init-supabase-schema.mjs`      | Create tables in Supabase Postgres (idempotent, safe to re-run)         |
| `node scripts/migrate-sqlite-to-postgres.mjs`| One-shot copy of an old `database.db` into Supabase                     |
| `node scripts/test-supabase.mjs`             | Sanity check: `SELECT version()`                                        |

## Environment variables

See `.env.example`. Required:

| Var                    | Required | Notes                                                                     |
|------------------------|----------|---------------------------------------------------------------------------|
| `JWT_SECRET`           | yes      | ≥32 chars random hex. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `SEED_PASSWORD`        | yes      | Password for predefined HOD/staff users on first DB init                  |
| `DATABASE_URL`         | yes      | Supabase Postgres pooler URI (Settings → Database → Connection string → Session pooler / port 5432) |
| `SUPABASE_URL`         | yes      | `https://<project-ref>.supabase.co`                                       |
| `SUPABASE_SERVICE_KEY` | yes      | Settings → API → `service_role` secret (NOT `anon`)                       |
| `SUPABASE_BUCKET`      | optional | Storage bucket name. Defaults to `uploads`. Created automatically on first run. |
| `CORS_ORIGINS`         | optional | Comma-separated allowed origins (e.g. `https://yourdomain.com`)           |
| `PORT`                 | optional | Defaults to 3000 (Render uses 10000)                                      |
| `HOD_EMAIL`, `STAFF1_EMAIL`, `STAFF2_EMAIL` | optional | Predefined admin emails                          |

## Supabase setup (free, no credit card)

1. Sign up at https://supabase.com (email only).
2. New project → pick the closest region → set a strong DB password.
3. Once provisioned, grab three values:
   - **Project URL** — Settings → API → "Project URL".
   - **service_role key** — Settings → API → "service_role" secret.
   - **DATABASE_URL** — top-right "Connect" → "Session pooler" → URI tab. Replace `[YOUR-PASSWORD]` with the DB password you set.
4. Drop them into `.env`, run `node scripts/init-supabase-schema.mjs`.

Free tier: 500 MB Postgres, 1 GB Storage, pauses after 1 week of inactivity (login to resume).

## Deploy

### Render (free tier — recommended)

1. Push the repo to GitHub.
2. Render dashboard → **New +** → **Blueprint** → connect your repo. Render reads `render.yaml`.
3. In **Environment** tab, set the `sync: false` vars: `SEED_PASSWORD`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CORS_ORIGINS`, optional admin emails.
4. Deploy. First request after 15 min idle takes ~30 s (free tier spin-up); data survives because it lives in Supabase.

### Any container host (Fly.io, Railway, Hetzner, Docker)

```bash
docker build -t course-code .
docker run -p 3000:3000 \
  -e JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))") \
  -e SEED_PASSWORD=changeme \
  -e DATABASE_URL='postgresql://postgres.xxx:PWD@aws-0-...pooler.supabase.com:5432/postgres' \
  -e SUPABASE_URL=https://xxx.supabase.co \
  -e SUPABASE_SERVICE_KEY=eyJ... \
  -e CORS_ORIGINS=https://yourdomain.com \
  course-code
```

## Security checklist before going live

- [ ] Strong `JWT_SECRET` set (≥32 random chars)
- [ ] `SEED_PASSWORD` changed from default; admin users have rotated it via "Change password"
- [ ] `CORS_ORIGINS` restricted to your real domain(s)
- [ ] `service_role` key never exposed to the frontend (only used server-side)
- [ ] HTTPS enforced (Render/Cloudflare handle this)
- [ ] Supabase RLS reviewed if you ever expose direct DB access from the client
