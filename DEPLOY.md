# Deploying to Supabase + Vercel

## 1. Supabase (database)
1. Create a project at https://supabase.com (choose the Mumbai region for India).
2. **SQL Editor → New query**: paste the contents of `supabase/migrations/0001_init.sql` and run it.
   (Or locally: put the connection string in `.env.local` and run `npm run db:migrate`.)
3. Check **Table Editor**: you should see 31 tables (households, transactions, donations, rentals, …).
4. Collect these values:
   - **Project Settings → Database → Connection string → Transaction pooler** (port 6543) → `DATABASE_URL`
     (replace `[YOUR-PASSWORD]` with your database password)
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://qxtxuzlijzivddclmlpg.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key (Project Settings → API). It is public by design: row-level security blocks it from reading any data.

## 2. GitHub (versioning)
```bash
git remote add origin https://github.com/<you>/mahall-coordinating-system.git
git push -u origin main
```

## 3. Vercel (hosting)
1. https://vercel.com/new → import the GitHub repository. The framework is detected as Next.js.
2. **Environment Variables** – add:
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Supabase transaction-pooler string |
   | `AUTH_SECRET` | output of `openssl rand -base64 32` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
3. **Deploy.** Open the site once; the demo data is created on the first visit.
4. Log in as `admin` / `admin123` and **change every demo password**, or delete the demo accounts.

Every `git push` to `main` now redeploys automatically; pushes to other branches get preview URLs.

## Notes
- `vercel.json` pins the functions to Mumbai (`bom1`). Change it if your Supabase project is elsewhere: keep the two close together.
- Uploaded images (receipts, screenshots, photos) are compressed and stored inside the database rows. If uploads grow large, move them to Supabase Storage.
