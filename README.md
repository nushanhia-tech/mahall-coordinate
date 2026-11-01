# Mahall Coordinating System

Smart Community & Masjid ERP.

**Stack:** Next.js 15 (App Router, React 19) · Supabase (Postgres + Realtime) · Tailwind · Recharts · jsPDF · deployed on Vercel.

## How it fits together
- **Frontend** – the React screens in `src/` run in the browser. Real URLs like `/admin/accounts`, `/services/auction`.
- **API** – Next.js route handlers in `src/app/api/*` run on Vercel. They talk to Supabase Postgres over `DATABASE_URL`.
- **Database** – Supabase Postgres (`supabase/migrations/0001_init.sql`):
  - `records` – one row per item (household, transaction, donation, rental, bid…), grouped by `collection`, fields in `data` (jsonb)
  - `settings` – masjid details, account heads, chitty settings
  - `app_events` – a "something changed" ping; browsers subscribe via Supabase Realtime and refresh (live auction, chat)
- **Security** – row-level security is on and browsers never get database access. All reads and writes go through the API, which:
  - hashes passwords (bcrypt) and signs login cookies (httpOnly JWT)
  - only shows each person their own private data (chats, applications, chitty payments…)
  - checks every change against the user's role (`src/lib/state.js → allowed()`)
- Demo data is inserted automatically the first time the app starts on an empty database.

## Run locally
```bash
npm install
cp .env.example .env.local      # fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate              # creates the tables
npm run dev                     # http://localhost:3000
```
Any Postgres works locally; the Supabase values are only needed for instant live updates (without them the app checks for changes every few seconds).

## Deploy (Supabase + Vercel)
See [DEPLOY.md](DEPLOY.md).

## Demo logins
| Portal | Username | Password |
|---|---|---|
| Admin | admin | admin123 |
| Individual | member | member123 |
| Khateeb | khateeb | khateeb123 |
| Institution | madrasa | inst123 |
| Chitty member (Chitty page) | C-001 | chitty123 |

**Change these passwords before real use:** Admin → Manage Portals and Admin → Chitty Money → Members.

## Code map
- `src/app` – Next.js layout, the catch-all page, and API routes
- `src/lib` – server code: database connection, auth cookies, data access + permission rules
- `src/store` – client data store (`AppContext.jsx`) and demo data (`seed.js`)
- `src/screens` – dashboard, login, role portals
- `src/admin`, `src/services`, `src/modules`, `src/components` – feature screens and shared UI
- `src/utils` – formatting, penalty maths, finance, PDF engine
