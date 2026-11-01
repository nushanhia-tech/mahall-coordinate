import { json, explain } from '@/lib/api';
import { sql } from '@/lib/db';
import { loadRaw } from '@/lib/state';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// What the server is actually using to connect (password hidden).
function describeUrl() {
  const raw = process.env.DATABASE_URL || '';
  if (!raw) return { set: false };
  try {
    const u = new URL(raw);
    return {
      set: true,
      user: decodeURIComponent(u.username),
      host: u.hostname,
      port: u.port || '5432',
      database: u.pathname.slice(1),
      passwordLength: decodeURIComponent(u.password).length,
      passwordHasBrackets: /^\[.*\]$/.test(decodeURIComponent(u.password)),
      looksLikePooler: /pooler\.supabase\.com$/.test(u.hostname),
    };
  } catch {
    return { set: true, invalid: 'DATABASE_URL is not a valid address – check for spaces, quotes or missing parts.' };
  }
}

// Open /api/health in the browser to check the setup.
export async function GET() {
  const info = {
    databaseUrl: describeUrl(),
    authSecretSet: !!process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16,
    deployment: process.env.VERCEL_URL || 'local',
    serverRegion: process.env.VERCEL_REGION || 'local',
    builtFrom: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'local',
  };
  try {
    if (!process.env.DATABASE_URL) throw new Error('no url');
    const t0 = Date.now();
    const [{ ok }] = await sql`select to_regclass('public.households') is not null as ok`;
    info.oneQueryMs = Date.now() - t0;
    if (!ok) throw Object.assign(new Error('tables missing'), { code: '42P01' });
    if (!info.authSecretSet) throw new Error('auth');
    const [{ n }] = await sql`select count(*)::int as n from households`;
    info.demoDataLoaded = n > 0;
    const t1 = Date.now();
    await loadRaw();
    info.fullLoadMs = Date.now() - t1;
    return json({ ok: true, message: 'Everything is connected.', ...info });
  } catch (e) {
    return json({ ok: false, problem: explain(e), errorCode: e?.code || e?.name || '', errorText: String(e?.message || '').replace(/postgres(ql)?:\/\/[^\s]+/g, '[url hidden]').slice(0, 200), ...info }, 500);
  }
}
