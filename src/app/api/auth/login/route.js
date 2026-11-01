import { handle, json, body } from '@/lib/api';
import { sql } from '@/lib/db';
import { findBy } from '@/lib/repo';
import { ensureSeeded, verifyPassword } from '@/lib/state';
import { setUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  const { username = '', password = '' } = await body(req);
  await ensureSeeded();
  const [u] = await findBy(sql, 'users', 'username', String(username).trim());
  if (!u || !(await verifyPassword(password, u.password))) return json({ error: 'Wrong username or password.' }, 401);
  await setUserSession(u.id);
  return json({ user: { ...u, password: undefined } });
});
