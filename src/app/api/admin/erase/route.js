import { handle, json, body } from '@/lib/api';
import { getContext, eraseMasjidData, HttpError } from '@/lib/state';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// "Erase all data": removes every record of this masjid. Keeps the masjid's details,
// payment (UPI/bank) details, account heads and the admin who pressed the button.
export const POST = handle(async (req) => {
  const ctx = await getContext(req);
  if (ctx.role !== 'admin') throw new HttpError(403, 'Admins only');
  const { confirm } = await body(req);
  if (confirm !== 'ERASE') throw new HttpError(400, 'Type ERASE to confirm');
  await eraseMasjidData(ctx.masjid.id, ctx.user.id);
  return json({ ok: true });
});
