import { handle, json } from '@/lib/api';
import { sql } from '@/lib/db';
import { findBy } from '@/lib/repo';
import { getMasjid, getConfig } from '@/lib/state';
import { featureOn } from '@/utils/features';

export const dynamic = 'force-dynamic';

// "My bookings" / "My applications" lookups by phone number.
export const GET = handle(async (req) => {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  const phone = (searchParams.get('phone') || '').trim();
  if (phone.length < 10) return json({ rows: [] });
  const col = { rentals: 'rentals', courses: 'courseApplications', donations: 'donations' }[kind];
  if (!col) return json({ rows: [] });
  const masjid = await getMasjid(req);
  const config = await getConfig(masjid.id);
  const gate = { rentals: 'rentMyBookings', courses: 'courseApply', donations: 'donationReceiptLookup' }[kind];
  if (!featureOn(config, gate)) return json({ rows: [] });
  let rows = (await findBy(sql, col, 'phone', phone, masjid.id)).reverse().slice(0, 50);
  if (kind === 'donations') {
    // what a donor needs for their receipt – never the screenshot
    const txIds = rows.map((d) => d.transactionId).filter(Boolean);
    const txs = txIds.length ? await sql`select id, doc_no from transactions where masjid_id = ${masjid.id} and id = any(${txIds})` : [];
    const channels = await sql`select id, name from donation_channels where masjid_id = ${masjid.id}`;
    rows = rows.map((d) => ({
      id: d.id, name: d.name, phone: d.phone, amount: d.amount, status: d.status, date: d.date, decidedAt: d.decidedAt, remark: d.remark,
      channel: channels.find((c) => c.id === d.channelId)?.name || '', receiptNo: txs.find((t) => t.id === d.transactionId)?.doc_no || '',
    }));
  }
  return json({ rows });
});
