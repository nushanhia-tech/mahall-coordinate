import { handle, json, body } from '@/lib/api';
import { getContext, replaceAll, loadRaw, COLLECTIONS, SETTINGS, HttpError } from '@/lib/state';

export const POST = handle(async (req) => {
  const ctx = await getContext();
  if (ctx.role !== 'admin') throw new HttpError(403, 'Admins only');
  const data = await body(req);
  if (!SETTINGS.every((k) => data[k] != null) || !COLLECTIONS.every((c) => Array.isArray(data[c]))) throw new HttpError(400, 'Not a valid backup file');
  // Backups don't contain password hashes: keep existing ones where the account still exists.
  const current = await loadRaw();
  for (const col of ['users', 'chittyMembers']) {
    data[col] = data[col].map((r) => ({ ...r, password: r.password || current[col].find((x) => x.id === r.id)?.password || 'changeme123' }));
  }
  await replaceAll(data);
  return json({ ok: true });
});
