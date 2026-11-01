import { handle, json, body } from '@/lib/api';
import { getContext, replaceAll, loadRaw, COLLECTIONS, SETTINGS, HttpError } from '@/lib/state';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = handle(async (req) => {
  const ctx = await getContext(req);
  if (ctx.role !== 'admin') throw new HttpError(403, 'Admins only');
  const data = await body(req);
  if (!SETTINGS.every((k) => data[k] != null) || !COLLECTIONS.every((c) => Array.isArray(data[c]))) throw new HttpError(400, 'Not a valid backup file');
  // Backups don't contain password hashes: keep existing ones where the account still exists.
  const current = await loadRaw(ctx.masjid.id);
  for (const col of ['users', 'chittyMembers']) {
    data[col] = data[col].map((r) => ({ ...r, password: r.password || current[col].find((x) => x.id === r.id)?.password || 'changeme123' }));
  }
  // Never lock the admin out: make sure the person restoring keeps their login.
  if (!data.users.some((u) => u.id === ctx.user.id)) data.users.push(ctx.user);
  await replaceAll(data, ctx.masjid.id);
  return json({ ok: true });
});
