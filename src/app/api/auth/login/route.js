import { handle, json, body } from '@/lib/api';
import { sql } from '@/lib/db';
import { ensureSeeded, verifyPassword } from '@/lib/state';
import { setUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  const { username = '', password = '' } = await body(req);
  await ensureSeeded();
  const [row] = await sql`select data from records where collection = 'users' and data->>'username' = ${String(username).trim()}`;
  if (!row || !(await verifyPassword(password, row.data.password))) return json({ error: 'Wrong username or password.' }, 401);
  await setUserSession(row.data.id);
  return json({ user: { ...row.data, password: undefined } });
});
