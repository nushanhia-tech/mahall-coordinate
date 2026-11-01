import { handle, json } from '@/lib/api';
import { sql } from '@/lib/db';
import { findBy } from '@/lib/repo';

export const dynamic = 'force-dynamic';

// "My bookings" / "My applications" lookups by phone number.
export const GET = handle(async (req) => {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  const phone = (searchParams.get('phone') || '').trim();
  if (phone.length < 10) return json({ rows: [] });
  const col = kind === 'rentals' ? 'rentals' : kind === 'courses' ? 'courseApplications' : null;
  if (!col) return json({ rows: [] });
  const rows = await findBy(sql, col, 'phone', phone);
  return json({ rows: rows.reverse().slice(0, 50) });
});
