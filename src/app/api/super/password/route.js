import bcrypt from 'bcryptjs';
import { handle, json, body } from '@/lib/api';
import { sql } from '@/lib/db';
import { verifyPassword, HttpError } from '@/lib/state';
import { requireSuper } from '@/lib/superAdmin';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  const username = await requireSuper();
  const { current = '', next = '' } = await body(req);
  if (String(next).length < 8) throw new HttpError(400, 'The new password must have at least 8 characters.');
  const [row] = await sql`select password from platform_admins where username = ${username}`;
  if (!(await verifyPassword(current, row.password))) throw new HttpError(400, 'The current password is wrong.');
  await sql`update platform_admins set password = ${await bcrypt.hash(String(next), 10)} where username = ${username}`;
  return json({ ok: true });
});
