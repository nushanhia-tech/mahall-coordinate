import { sql } from './db';
import { getSuperSession } from './auth';
import { HttpError } from './state';

// Throws unless the request comes from a logged-in platform (super) admin.
export async function requireSuper() {
  const s = await getSuperSession();
  if (!s?.username) throw new HttpError(401, 'Please log in as super admin');
  const [row] = await sql`select username from platform_admins where username = ${s.username}`;
  if (!row) throw new HttpError(401, 'Please log in as super admin');
  return row.username;
}
