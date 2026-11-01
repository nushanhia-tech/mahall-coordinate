import { handle, json, body } from '@/lib/api';
import { sql } from '@/lib/db';
import { ensureSeeded, verifyPassword } from '@/lib/state';
import { setChittySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  const { code = '', password = '' } = await body(req);
  await ensureSeeded();
  const [row] = await sql`select data from records where collection = 'chittyMembers' and lower(data->>'code') = ${String(code).trim().toLowerCase()}`;
  if (!row || !(await verifyPassword(password, row.data.password))) return json({ error: 'Wrong Chitty number or password' }, 401);
  await setChittySession(row.data.id);
  return json({ memberId: row.data.id });
});
