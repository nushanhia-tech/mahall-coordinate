import bcrypt from 'bcryptjs';
import { sql } from './db';
import { getUserSession, getChittySession } from './auth';
import { seed, seedChittyPayments } from '../store/seed';
import { UNIT_MS } from '../utils/format';
import { COLLECTIONS, SETTINGS } from './schema';
import { readAll, readOne, writeSetting, upsertRow, deleteRow, wipeAll, insertMany } from './repo';

export { COLLECTIONS, SETTINGS };
const SECRET_COLLECTIONS = ['users', 'chittyMembers']; // have a hashed `password` field

export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const isHash = (p) => typeof p === 'string' && /^\$2[aby]\$/.test(p);
const hashIfNeeded = async (p) => (isHash(p) ? p : bcrypt.hash(String(p), 10));

// ---------- seeding ----------

// Writes a whole state into empty tables: one bulk insert per table.
async function writeAll(tx, state) {
  // Hash passwords first (the same demo password is hashed once).
  const cache = new Map();
  const hash = async (p) => { if (isHash(p)) return p; if (!cache.has(p)) cache.set(p, await bcrypt.hash(String(p), 10)); return cache.get(p); };
  for (const col of SECRET_COLLECTIONS) {
    state[col] = await Promise.all((state[col] || []).map(async (r) => ({ ...r, password: await hash(r.password || 'changeme123') })));
  }
  for (const key of SETTINGS) await writeSetting(tx, key, state[key]);
  for (const col of COLLECTIONS) await insertMany(tx, col, state[col] || []);
}

export const demoState = () => { const s = seed(); s.chittyPayments = seedChittyPayments(s); return s; };

let seeded = false;
export async function ensureSeeded() {
  if (seeded) return;
  const [{ n }] = await sql`select count(*)::int as n from masjid_profile`;
  if (n === 0) {
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(4242)`;
      const [{ n: again }] = await tx`select count(*)::int as n from masjid_profile`;
      if (again === 0) await writeAll(tx, demoState());
    });
  }
  seeded = true;
}

export async function replaceAll(state) {
  await sql.begin(async (tx) => {
    await wipeAll(tx);
    await writeAll(tx, state);
    await tx`insert into app_events (collections) values (${['*']})`;
  });
}

// ---------- reading ----------

export async function loadRaw() {
  await ensureSeeded();
  return readAll(sql);
}

export async function getContext() {
  const [us, cs] = await Promise.all([getUserSession(), getChittySession()]);
  let user = null, chittyMember = null;
  if (us?.userId) {
    user = await readOne(sql, 'users', us.userId);
  }
  if (cs?.memberId) {
    chittyMember = await readOne(sql, 'chittyMembers', cs.memberId);
  }
  return { user, chittyMember, role: user?.role || 'public' };
}

// Big uploaded images that are only needed when someone opens them.
export const HEAVY_FIELDS = { transactions: ['receipt'], donations: ['screenshot'], chittyPayments: ['screenshot'] };
export const STORED = '__stored__'; // placeholder sent instead of the image itself

export function stripHeavy(state) {
  for (const [col, fields] of Object.entries(HEAVY_FIELDS)) {
    state[col] = (state[col] || []).map((r) => { const o = { ...r }; for (const f of fields) if (o[f]) o[f] = STORED; return o; });
  }
  return state;
}

// May this viewer open this stored image?
export function canSeeFile(ctx, col, row) {
  if (ctx.role === 'admin') return true;
  if (col === 'chittyPayments') return !!ctx.chittyMember && row.memberId === ctx.chittyMember.id;
  return false;
}

const strip = (row, keys) => { const o = { ...row }; keys.forEach((k) => delete o[k]); return o; };

// Remove anything this viewer should not see.
export function sanitize(state, ctx) {
  const s = structuredClone(state);
  const { user, role, chittyMember } = ctx;
  s.users = s.users.map((u) => strip(u, ['password']));
  s.chittyMembers = s.chittyMembers.map((m) => strip(m, ['password']));
  if (role === 'admin') return s;

  const myHome = user && s.households.find((h) => h.id === user.householdId);
  const myCourses = role === 'institution' ? s.courses.filter((c) => c.institutionId === user.institutionId).map((c) => c.id) : [];

  s.users = user ? s.users.filter((u) => u.id === user.id) : [];
  s.chats = user ? s.chats.filter((c) => c.userId === user.id) : [];
  s.nikkahApps = role === 'khateeb' ? s.nikkahApps : user ? s.nikkahApps.filter((a) => a.userId === user.id) : [];
  s.homeApps = user ? s.homeApps.filter((a) => a.userId === user.id) : [];
  s.donations = myHome ? s.donations.filter((d) => d.phone === myHome.phone) : [];
  s.rentals = s.rentals.map((r) => ({ id: r.id, items: r.items, status: r.status, due: r.due, unit: r.unit }));
  s.courseApplications = s.courseApplications.map((a) => (myCourses.includes(a.courseId) ? a : { id: a.id, courseId: a.courseId, status: a.status }));
  s.chittyMembers = chittyMember ? s.chittyMembers.filter((m) => m.id === chittyMember.id) : [];
  s.chittyPayments = chittyMember ? s.chittyPayments.filter((p) => p.memberId === chittyMember.id) : [];
  s.auctionItems = s.auctionItems.map((a) => ({ ...a, bids: a.bids.map((b) => strip(b, ['phone'])) }));
  return s;
}

// ---------- writing ----------

// May this viewer turn `before` into `after`? (before = null: insert, after = null: delete)
function allowed(ctx, col, before, after, db) {
  const { role, user, chittyMember } = ctx;
  if (role === 'admin') return true;
  const insert = !before && after;
  const mine = (r) => r && user && r.userId === user.id;

  switch (col) {
    case 'donations':
      return insert && after.status === 'pending' && !after.transactionId && Number(after.amount) > 0;
    case 'rentals':
      return insert && after.status === 'active' && !after.penalty && !after.returnedAt;
    case 'courseApplications':
      if (insert) return after.status === 'pending';
      if (role === 'institution' && before && after) {
        const course = db.courses.find((c) => c.id === before.courseId);
        return course?.institutionId === user.institutionId && after.courseId === before.courseId;
      }
      return false;
    case 'chats':
      return !!user && !!after && mine(after) && (insert || mine(before));
    case 'nikkahApps':
      if (insert) return !!user && mine(after) && after.status === 'pending';
      return role === 'khateeb' && !!before && !!after;
    case 'homeApps':
      return insert && !!user && mine(after) && after.status === 'pending';
    case 'chittyPayments':
      return insert && !!chittyMember && after.memberId === chittyMember.id && after.status === 'pending'
        && after.method === 'upi' && Number(after.amount) === Number(db.chitty?.monthlyAmount);
    case 'events':
    case 'achievements':
      return role === 'khateeb';
    case 'institutions':
      return role === 'institution' && !!before && !!after && before.id === user.institutionId;
    case 'courses':
      return role === 'institution' && (!before || before.institutionId === user.institutionId) && (!after || after.institutionId === user.institutionId);
    default:
      return false;
  }
}

// Server-side fix-ups so totals can't be tampered with from the browser.
function normalise(col, row, db) {
  if (col === 'rentals' && row.status === 'active') {
    const base = row.items.reduce((a, i) => a + Number(db.rentalItems.find((x) => x.id === i.itemId)?.rates?.[row.unit] || 0) * Number(i.qty), 0) * Number(row.duration);
    row.baseAmount = base;
    row.due = new Date(new Date(row.start).getTime() + Number(row.duration) * UNIT_MS[row.unit]).toISOString();
  }
  return row;
}

// changes: { collections: { [name]: { upserts: [row], deletes: [id] } }, settings: { [key]: value } }
export async function applyChanges(ctx, changes) {
  const db = await loadRaw();
  const touched = new Set();
  const ops = [];

  for (const [key, value] of Object.entries(changes.settings || {})) {
    if (!SETTINGS.includes(key)) throw new HttpError(400, `Unknown setting ${key}`);
    if (ctx.role !== 'admin') throw new HttpError(403, 'Only admins can change settings');
    ops.push((tx) => writeSetting(tx, key, value));
    touched.add(key);
  }

  for (const [col, { upserts = [], deletes = [] }] of Object.entries(changes.collections || {})) {
    if (!COLLECTIONS.includes(col)) throw new HttpError(400, `Unknown collection ${col}`);
    for (const id of deletes) {
      const before = db[col].find((r) => r.id === id);
      if (!before) continue;
      if (!allowed(ctx, col, before, null, db)) throw new HttpError(403, `Not allowed to delete from ${col}`);
      ops.push((tx) => deleteRow(tx, col, id));
      touched.add(col);
    }
    for (const incoming of upserts) {
      if (!incoming?.id || typeof incoming.id !== 'string') throw new HttpError(400, 'Every record needs an id');
      const before = db[col].find((r) => r.id === incoming.id) || null;
      let row = { ...incoming };
      for (const f of HEAVY_FIELDS[col] || []) {
        if (row[f] === STORED) {
          row[f] = before?.[f]
            // a ledger entry created from a donation keeps the donation's screenshot as its receipt
            || (col === 'transactions' && row.ref ? db.donations.find((d) => d.id === row.ref)?.screenshot : '')
            || '';
        }
      }
      if (SECRET_COLLECTIONS.includes(col)) {
        if (row.password) row.password = await hashIfNeeded(row.password);
        else if (before?.password) row.password = before.password;
        else throw new HttpError(400, 'A password is required');
      }
      if (!allowed(ctx, col, before, row, db)) throw new HttpError(403, `Not allowed to change ${col}`);
      row = normalise(col, row, db);
      ops.push((tx) => upsertRow(tx, col, row));
      touched.add(col);
    }
  }

  if (!ops.length) return;
  await sql.begin(async (tx) => {
    for (const op of ops) await op(tx);
    await tx`insert into app_events (collections) values (${[...touched]})`;
  });
}

export async function pingChange(collections) {
  await sql`insert into app_events (collections) values (${collections})`;
}

export async function verifyPassword(plain, hash) {
  return isHash(hash) ? bcrypt.compare(String(plain), hash) : false;
}
