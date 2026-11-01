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
  if (code === '42P01') return 'The database tables are missing. Run mahall-database.sql in Supabase → SQL Editor.';
  if (code === '28P01' || /password authentication failed/i.test(msg)) return 'The database password in DATABASE_URL is wrong.';
  if (/tenant or user not found/i.test(msg)) return 'Wrong user name in DATABASE_URL: for the pooler it must be postgres.<project-id> (copy it from Supabase → Connect → Transaction pooler).';
  if (['ENOTFOUND', 'ENETUNREACH', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'CONNECT_TIMEOUT'].includes(code) || /db\.[a-z0-9]+\.supabase\.co/.test(url)) {
    return 'Cannot connect to the database. Use the "Transaction pooler" address from Supabase → Connect (it ends in .pooler.supabase.com:6543/postgres).';
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
