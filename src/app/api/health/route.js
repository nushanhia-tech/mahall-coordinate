import dns from 'node:dns/promises';
import net from 'node:net';
import { json, explain } from '@/lib/api';
import { sql } from '@/lib/db';
import { loadRaw } from '@/lib/state';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const withTimeout = (promise, ms, what) => Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error(`${what} got no answer within ${ms / 1000}s`), { code: 'STEP_TIMEOUT' })), ms))]);

// Test the way to the database one step at a time, so we know exactly where it breaks.
async function networkSteps(host, port) {
  const steps = {};
  try {
    const t = Date.now();
    const addrs = await withTimeout(dns.lookup(host, { all: true }), 5000, 'Looking up the server name');
    steps.findServer = `ok (${addrs.map((a) => a.address).slice(0, 2).join(', ')}) ${Date.now() - t} ms`;
  } catch (e) { steps.findServer = `FAILED: ${e.code || ''} ${e.message}`; return steps; }
  try {
    const t = Date.now();
    await withTimeout(new Promise((res, rej) => { const s = net.connect({ host, port: Number(port) }, () => { s.destroy(); res(); }); s.on('error', rej); }), 6000, 'Opening a connection');
    steps.openConnection = `ok ${Date.now() - t} ms`;
  } catch (e) { steps.openConnection = `FAILED: ${e.code || ''} ${e.message}`; }
  return steps;
}

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
    if (info.databaseUrl.host) {
      info.steps = await networkSteps(info.databaseUrl.host, info.databaseUrl.port);
      const where = `${info.databaseUrl.host}:${info.databaseUrl.port}`;
      if (info.steps.findServer?.startsWith('FAILED')) {
        return json({ ok: false, problem: `The server name in DATABASE_URL (${info.databaseUrl.host}) does not exist. Copy the address again from Supabase → Connect → Transaction pooler.`, ...info }, 500);
      }
      if (!info.steps.openConnection?.startsWith('ok')) {
        return json({ ok: false, problem: `Could not open a connection to ${where}. Use the Transaction pooler address (port 6543) and check that the Supabase project is not paused.`, ...info }, 500);
      }
    }
    const t0 = Date.now();
    const [{ ok }] = await withTimeout(sql`select to_regclass('public.households') is not null as ok`, 12000, 'Logging in to the database');
    if (info.steps) info.steps.loginAndQuery = `ok ${Date.now() - t0} ms`;
    info.oneQueryMs = Date.now() - t0;
    if (!ok) throw Object.assign(new Error('tables missing'), { code: '42P01' });
    if (!info.authSecretSet) throw new Error('auth');
    const [{ n }] = await sql`select count(*)::int as n from households`;
    info.demoDataLoaded = n > 0;
    const t1 = Date.now();
    await withTimeout(loadRaw(), 20000, 'Loading all data');
    info.fullLoadMs = Date.now() - t1;
    return json({ ok: true, message: 'Everything is connected.', ...info });
  } catch (e) {
    if (info.steps && !info.steps.loginAndQuery && info.steps.openConnection?.startsWith('ok')) info.steps.loginAndQuery = `FAILED: ${e.code || ''} ${e.message}`.slice(0, 200);
    return json({ ok: false, problem: e.code === 'STEP_TIMEOUT' && /Logging in/.test(e.message) ? 'The database server accepted the connection but did not answer the login. Usually the user name in DATABASE_URL is wrong (it must be postgres.<project-id> for the pooler) or the Supabase project is paused.' : explain(e), errorCode: e?.code || e?.name || '', errorText: String(e?.message || '').replace(/postgres(ql)?:\/\/[^\s]+/g, '[url hidden]').slice(0, 200), ...info }, 500);
  }
}
