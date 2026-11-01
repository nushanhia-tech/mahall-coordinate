import { handle, json, body } from '@/lib/api';
import { sql } from '@/lib/db';
import { HttpError } from '@/lib/state';
import { uid } from '@/utils/format';

export const dynamic = 'force-dynamic';

// Bids go through their own route so two people bidding at once can't overwrite each other.
export const POST = handle(async (req) => {
  const { itemId, bidder = '', phone = '', amount } = await body(req);
  if (!String(bidder).trim() || !String(phone).trim()) throw new HttpError(400, 'Name and phone are required');
  const amt = Number(amount);
  await sql.begin(async (tx) => {
    const [row] = await tx`select data from records where collection = 'auctionItems' and id = ${itemId} for update`;
    if (!row) throw new HttpError(404, 'Auction not found');
    const a = row.data;
    if (a.status !== 'live' || new Date(a.endsAt) <= new Date()) throw new HttpError(400, 'This auction has ended');
    const top = a.bids.reduce((m, b) => Math.max(m, b.amount), 0);
    const need = a.bids.length ? top + Number(a.increment) : Number(a.minBid);
    if (!(amt >= need)) throw new HttpError(400, `Minimum bid is ₹${need}`);
    a.bids.push({ id: uid('bid'), bidder: String(bidder).trim(), phone: String(phone).trim(), amount: amt, time: new Date().toISOString() });
    await tx`update records set data = ${tx.json(a)}, updated_at = now() where collection = 'auctionItems' and id = ${itemId}`;
    await tx`insert into app_events (collections) values (${['auctionItems']})`;
  });
  return json({ ok: true });
});
