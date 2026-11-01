import { handle, json } from '@/lib/api';
import { sql } from '@/lib/db';
import { readOne } from '@/lib/repo';
import { getContext, canSeeFile, HEAVY_FIELDS, HttpError } from '@/lib/state';

export const dynamic = 'force-dynamic';

// Returns one stored image (receipt / payment screenshot) when someone opens it.
export const GET = handle(async (req) => {
  const p = new URL(req.url).searchParams;
  const col = p.get('col'), id = p.get('id'), field = p.get('field');
  if (!HEAVY_FIELDS[col]?.includes(field)) throw new HttpError(400, 'Unknown file');
  const ctx = await getContext(req);
  const row = await readOne(sql, col, id, ctx.masjid.id);
  if (!row) throw new HttpError(404, 'Not found');
  if (!canSeeFile(ctx, col, row)) throw new HttpError(403, 'Not allowed');
  return json({ data: row[field] || '' });
});
