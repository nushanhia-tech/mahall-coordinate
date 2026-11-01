import { handle, json, body } from '@/lib/api';
import { sql } from '@/lib/db';
import { findBy } from '@/lib/repo';
import { ensureSeeded, verifyPassword } from '@/lib/state';
import { setChittySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  const { code = '', password = '' } = await body(req);
  await ensureSeeded();
  const [m] = await findBy(sql, 'chittyMembers', 'code', String(code).trim(), { ci: true });
  if (!m || !(await verifyPassword(password, m.password))) return json({ error: 'Wrong Chitty number or password' }, 401);
  await setChittySession(m.id);
  return json({ memberId: m.id });
});
