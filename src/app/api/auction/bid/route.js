import { handle, json, body } from '@/lib/api';
import { sql } from '@/lib/db';
import { HttpError, getMasjid } from '@/lib/state';
import { readOne } from '@/lib/repo';
import { uid } from '@/utils/format';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Bids go through their own route so two people bidding at once can't overwrite each other.
export const POST = handle(async (req) => {
  const { itemId, bidder = '', phone = '', amount } = await body(req);
  if (!String(bidder).trim() || !String(phone).trim()) throw new HttpError(400, 'Name and phone are required');
  const amt = Number(amount);
  const masjid = await getMasjid(req);
  await sql.begin(async (tx) => {
    // Lock the auction row so simultaneous bids are handled one at a time.
    const [locked] = await tx`select id from auction_items where id = ${String(itemId)} and masjid_id = ${masjid.id} for update`;
    if (!locked) throw new HttpError(404, 'Auction not found');
    const a = await readOne(tx, 'auctionItems', locked.id, masjid.id);
    if (a.status !== 'live' || new Date(a.endsAt) <= new Date()) throw new HttpError(400, 'This auction has ended');
    const top = a.bids.reduce((m, b) => Math.max(m, b.amount), 0);
    const need = a.bids.length ? top + Number(a.increment) : Number(a.minBid);
    if (!(amt >= need)) throw new HttpError(400, `Minimum bid is ₹${need}`);
    await tx`insert into auction_bids (parent_id, position, id, bidder, phone, amount, time)
             values (${a.id}, ${a.bids.length}, ${uid('bid')}, ${String(bidder).trim()}, ${String(phone).trim()}, ${amt}, now())`;
    await tx`update auction_items set updated_at = now() where id = ${a.id}`;
    await tx`insert into app_events (masjid_id, collections) values (${masjid.id}, ${['auctionItems']})`;
  });
  return json({ ok: true });
});
