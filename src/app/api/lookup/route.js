import { handle, json } from '@/lib/api';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// "My bookings" / "My applications" lookups by phone number.
export const GET = handle(async (req) => {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  const phone = (searchParams.get('phone') || '').trim();
  if (phone.length < 10) return json({ rows: [] });
  const col = kind === 'rentals' ? 'rentals' : kind === 'courses' ? 'courseApplications' : null;
  if (!col) return json({ rows: [] });
  const rows = await sql`select data from records where collection = ${col} and data->>'phone' = ${phone} order by updated_at desc limit 50`;
  return json({ rows: rows.map((r) => r.data) });
});
