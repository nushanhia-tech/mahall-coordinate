import { json, explain } from '@/lib/api';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Open /api/health in the browser to check the setup.
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) throw new Error('no url');
    const [{ n }] = await sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`;
    const [{ ok }] = await sql`select to_regclass('public.households') is not null as ok`;
    if (!ok) throw Object.assign(new Error('tables missing'), { code: '42P01' });
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) throw new Error('auth');
    return json({ ok: true, message: 'Everything is connected.', tables: n });
  } catch (e) {
    return json({ ok: false, problem: explain(e) }, 500);
  }
}
