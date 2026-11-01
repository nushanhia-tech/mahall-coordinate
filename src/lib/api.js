import { NextResponse } from 'next/server';
import { HttpError } from './state';

// Turn common setup problems into plain-language messages (never includes secrets).
export function explain(e) {
  const url = process.env.DATABASE_URL || '';
  if (!url) return 'DATABASE_URL is not set in Vercel → Settings → Environment Variables (then Redeploy).';
  if (/\[|\]/.test(url)) return 'DATABASE_URL still has [ ] brackets around the password. Remove them, then Redeploy.';
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) return 'AUTH_SECRET is missing or shorter than 16 characters in Vercel settings.';
  const code = e?.code || '';
  const msg = String(e?.message || '');
  if (code === 'STEP_TIMEOUT') return `${msg}. The database did not answer in time – check that the Supabase project is not paused and that DATABASE_URL is the Transaction pooler address.`;
  if (code === 'NO_MASJIDS_TABLE' || (code === '42P01' && /masjids|platform_admins/.test(msg)) || (code === '42703' && /masjid_id/.test(msg))) return 'The multi-masjid update is not in the database yet. Run supabase/migrations/0002_multi_masjid.sql in Supabase → SQL Editor.';
  if (code === '42P01') return 'The database tables are missing. Run mahall-database.sql in Supabase → SQL Editor.';
  if (code === '28P01' || /password authentication failed/i.test(msg)) return 'The database password in DATABASE_URL is wrong.';
  if (/tenant or user not found/i.test(msg)) return 'Wrong user name in DATABASE_URL: for the pooler it must be postgres.<project-id> (copy it from Supabase → Connect → Transaction pooler).';
  if (/@db\.[a-z0-9]+\.supabase\.co/.test(url)) {
    return 'DATABASE_URL is the "Direct connection" address (db.….supabase.co), which Vercel cannot reach. Use the "Transaction pooler" address from Supabase → Connect (it ends in .pooler.supabase.com:6543/postgres), then Redeploy.';
  }
  if (['ENOTFOUND', 'ENETUNREACH', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'CONNECT_TIMEOUT'].includes(code)) {
    return `Cannot reach the database server (${code}). Check the server name in DATABASE_URL – copy it again from Supabase → Connect → Transaction pooler.`;
  }
  return `Server error (${code || e?.name || 'unknown'}): ${msg.slice(0, 160)}`;
}

// Wraps a route handler: turns thrown errors into JSON responses.
export const handle = (fn) => async (req) => {
  try {
    return await fn(req);
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: explain(e) }, { status: 500 });
  }
};
export const json = (data, status = 200) => NextResponse.json(data, { status });
export const body = async (req) => { try { return await req.json(); } catch { throw new HttpError(400, 'Invalid JSON'); } };
