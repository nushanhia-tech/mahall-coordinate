import { handle, json, body } from '@/lib/api';
import { sql } from '@/lib/db';
import { verifyPassword, ensureSeeded } from '@/lib/state';
import { setSuperSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  await ensureSeeded();
  const { username = '', password = '' } = await body(req);
  const [row] = await sql`select username, password from platform_admins where username = ${String(username).trim()}`;
  if (!row || !(await verifyPassword(password, row.password))) return json({ error: 'Wrong username or password.' }, 401);
  await setSuperSession(row.username);
  return json({ username: row.username });
});
