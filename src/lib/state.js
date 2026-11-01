import bcrypt from 'bcryptjs';
import { sql } from './db';
import { getUserSession, getChittySession } from './auth';
import { seed, seedChittyPayments } from '../store/seed';
import { UNIT_MS } from '../utils/format';
import { COLLECTIONS, SETTINGS } from './schema';
import { readAll, readOne, writeSetting, upsertRow, deleteRow, wipeMasjid, insertMany, ForeignRowError } from './repo';
import { getMasjidBySlug, forgetMasjid } from './masjids';
import { uid } from '../utils/format';
import { featureOn, defaultConfig, variRateFor } from '../utils/features';

export { COLLECTIONS, SETTINGS };
const SECRET_COLLECTIONS = ['users', 'chittyMembers']; // have a hashed `password` field

export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const isHash = (p) => typeof p === 'string' && /^\$2[aby]\$/.test(p);
const hashIfNeeded = async (p) => (isHash(p) ? p : bcrypt.hash(String(p), 10));

// ---------- seeding ----------

// Writes a whole state for masjid m into empty tables: one bulk insert per table.
async function writeAll(tx, state, m) {
  // Hash passwords first (the same demo password is hashed once).
  const cache = new Map();
  const hash = async (p) => { if (isHash(p)) return p; if (!cache.has(p)) cache.set(p, await bcrypt.hash(String(p), 10)); return cache.get(p); };
  for (const col of SECRET_COLLECTIONS) {
    state[col] = await Promise.all((state[col] || []).map(async (r) => ({ ...r, password: await hash(r.password || 'changeme123') })));
  }
  // ledger entries without a receipt / voucher number get one, in date order
  const numberer = makeDocNumberer({ transactions: state.transactions || [] });
  state.transactions = [...(state.transactions || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((t) => (t.docNo ? t : { ...t, docNo: numberer(t.type, t.date) }));
  for (const key of SETTINGS) await writeSetting(tx, key, state[key] || (key === 'config' ? defaultConfig() : state[key]), m);
  for (const col of COLLECTIONS) await insertMany(tx, col, state[col] || [], m);
}

export const demoState = () => { const s = seed(); s.chittyPayments = seedChittyPayments(s); s.config = defaultConfig(); for (const c of COLLECTIONS) s[c] ||= []; return s; };

// A brand-new, empty site gets one masjid with demo data so there is something to look at.
let seeded = false;
export async function ensureSeeded() {
  if (seeded) return;
  const [{ n }] = await sql`select count(*)::int as n from masjids`;
  if (n === 0) {
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(4242)`;
      const [{ n: again }] = await tx`select count(*)::int as n from masjids`;
      if (again > 0) return;
      const demo = demoState();
      await tx`insert into masjids (id, slug, name) values ('m_default', 'juma-masjid', ${demo.masjid.name})`;
      await writeAll(tx, demo, 'm_default');
    });
  }
  seeded = true;
}

// Replace all of one masjid's data (restore a backup).
export async function replaceAll(state, m) {
  try {
    await sql.begin(async (tx) => {
      await wipeMasjid(tx, m);
      await writeAll(tx, state, m);
      await tx`insert into app_events (masjid_id, collections) values (${m}, ${['*']})`;
    });
  } catch (e) {
    if (e.code === '23505') throw new HttpError(400, 'This backup contains records that already exist in another masjid on this site, so it cannot be restored here.');
    throw e;
  }
}

// Remove all records of a masjid but keep the masjid itself, its settings and the admin who asked.
export async function eraseMasjidData(m, keepUserId) {
  await sql.begin(async (tx) => {
    await wipeMasjid(tx, m, { keepSettings: true, keepUserId });
    await tx`insert into app_events (masjid_id, collections) values (${m}, ${['*']})`;
  });
}

// Starting data for a newly created masjid: its name, default account heads, empty payment details and one admin.
export function newMasjidState({ name, adminName, adminUsername, adminPassword }) {
  const blankBank = { holder: '', bank: '', accNo: '', ifsc: '' };
  const channel = (id, n, head) => ({ id: uid('ch'), name: n, accountHead: head, upi: '', qr: '', qrImage: '', bank: blankBank, key: id });
  const s = { masjid: { name, tagline: '', address: '', lat: 10.8505, lng: 76.2711, phone: '', email: '', about: '' },
    accountHeads: ['General Fund', 'Relief Fund', 'Nercha Fund', 'Madrasa Fund', 'Maintenance'],
    chitty: { name: `${name} Chitty`, monthlyAmount: 1000, months: 12, startMonth: new Date().toISOString().slice(0, 7), upi: '' },
    config: defaultConfig() };
  for (const c of COLLECTIONS) s[c] = [];
  s.donationChannels = [channel('masjid', 'Masjid Fund', 'General Fund'), channel('relief', 'Relief Fund', 'Relief Fund'), channel('nercha', 'Nercha', 'Nercha Fund')];
  s.users = [{ id: uid('u'), username: adminUsername, password: adminPassword, role: 'admin', name: adminName || 'Masjid Admin', householdId: '', institutionId: '' }];
  return s;
}

export async function createMasjidWithData({ slug, name, adminName, adminUsername, adminPassword }) {
  const id = uid('m');
  await sql.begin(async (tx) => {
    await tx`insert into masjids (id, slug, name) values (${id}, ${slug}, ${name})`;
    await writeAll(tx, newMasjidState({ name, adminName, adminUsername, adminPassword }), id);
  });
  return id;
}

// ---------- reading ----------

export async function loadRaw(m) {
  return readAll(sql, m);
}

// Which masjid is this request for? The browser sends its address name (slug) in the x-masjid header.
export async function masjidForSlug(slug) {
  await ensureSeeded();
  const masjid = await getMasjidBySlug(slug || '');
  if (!masjid || !masjid.active) throw new HttpError(404, 'Masjid not found');
  return masjid;
}
export const getMasjid = (req) => masjidForSlug(req.headers.get('x-masjid') || new URL(req.url).searchParams.get('masjid'));

// Who is asking, inside this masjid. A login from another masjid counts as a visitor here.
export const getContext = async (req) => contextForMasjid(await getMasjid(req));
export const contextForSlug = async (slug) => contextForMasjid(await masjidForSlug(slug));

async function contextForMasjid(masjid) {
  const [us, cs] = await Promise.all([getUserSession(), getChittySession()]);
  const [user, chittyMember] = await Promise.all([
    us?.userId ? readOne(sql, 'users', us.userId, masjid.id) : null,
    cs?.memberId ? readOne(sql, 'chittyMembers', cs.memberId, masjid.id) : null,
  ]);
  return { masjid, user, chittyMember, role: user?.role || 'public' };
}

// Big uploaded files that are only needed when someone opens them.
export const HEAVY_FIELDS = {
  transactions: ['receipt'], donations: ['screenshot'], chittyPayments: ['screenshot'],
  nikkahApps: ['feeReceipt'], variPayments: ['screenshot'], institutionReports: ['file'],
};
export const STORED = '__stored__'; // placeholder sent instead of the file itself

export function stripHeavy(state) {
  for (const [col, fields] of Object.entries(HEAVY_FIELDS)) {
    state[col] = (state[col] || []).map((r) => { const o = { ...r }; for (const f of fields) if (o[f]) o[f] = STORED; return o; });
  }
  return state;
}

// May this viewer open this stored file?
export function canSeeFile(ctx, col, row) {
  const { role, user, chittyMember } = ctx;
  if (role === 'admin') return true;
  if (col === 'chittyPayments') return !!chittyMember && row.memberId === chittyMember.id;
  if (col === 'nikkahApps') return role === 'khateeb' || (!!user && row.userId === user.id);
  if (col === 'variPayments') return !!user?.householdId && row.householdId === user.householdId;
  if (col === 'institutionReports') return role === 'institution' && row.institutionId === user.institutionId;
  return false;
}

const strip = (row, keys) => { const o = { ...row }; keys.forEach((k) => delete o[k]); return o; };
const on = (db, key) => featureOn(db.config, key);
// Which feature switch hides donation channel number i (first three channels).
export const CHANNEL_KEYS = ['donateMasjid', 'donateRelief', 'donateNercha'];
const chatVisibleTo = (chat, role) => {
  const r = chat.recipients || 'committee';
  if (role === 'admin') return r !== 'khateeb';
  if (role === 'khateeb') return r === 'khateeb' || r === 'all';
  return false;
};

// Remove anything this viewer should not see.
export function sanitize(state, ctx) {
  const s = structuredClone(state);
  const { user, role, chittyMember } = ctx;
  s.users = s.users.map((u) => strip(u, ['password']));
  s.chittyMembers = s.chittyMembers.map((m) => strip(m, ['password']));
  if (role === 'admin') {
    s.chats = s.chats.filter((c) => chatVisibleTo(c, 'admin'));
    return s;
  }

  const myHome = user && s.households.find((h) => h.id === user.householdId);
  const myCourses = role === 'institution' ? s.courses.filter((c) => c.institutionId === user.institutionId).map((c) => c.id) : [];

  // households: everyone sees counts; only your own home in full
  s.households = s.households.map((h) => (h.id === myHome?.id ? h : { id: h.id, homeNo: h.homeNo, members: h.members, ward: h.ward }));
  s.users = user ? s.users.filter((u) => u.id === user.id) : [];
  s.chats = user ? s.chats.filter((c) => c.userId === user.id || chatVisibleTo(c, role)) : [];
  s.nikkahApps = role === 'khateeb' ? s.nikkahApps : user ? s.nikkahApps.filter((a) => a.userId === user.id) : [];
  s.homeApps = role === 'khateeb' ? s.homeApps : user ? s.homeApps.filter((a) => a.userId === user.id) : [];
  s.donations = myHome ? s.donations.filter((d) => d.phone === myHome.phone) : [];
  s.rentals = s.rentals.map((r) => ({ id: r.id, items: r.items, status: r.status, due: r.due, unit: r.unit }));
  s.courseApplications = s.courseApplications.map((a) => (myCourses.includes(a.courseId) ? a : { id: a.id, courseId: a.courseId, status: a.status }));
  s.chittyMembers = chittyMember ? s.chittyMembers.filter((m) => m.id === chittyMember.id) : [];
  s.chittyPayments = chittyMember ? s.chittyPayments.filter((p) => p.memberId === chittyMember.id) : [];
  s.variPayments = myHome ? s.variPayments.filter((p) => p.householdId === myHome.id) : [];
  s.institutionReports = role === 'institution' ? s.institutionReports.filter((r) => r.institutionId === user.institutionId) : [];
  const showNames = featureOn(s.config, 'auctionBidderNames');
  s.auctionItems = s.auctionItems.map((a) => {
    const names = [...new Set(a.bids.map((b) => b.bidder))];
    return { ...a, bids: a.bids.map((b) => ({ ...strip(b, ['phone']), bidder: showNames ? b.bidder : `Bidder ${names.indexOf(b.bidder) + 1}` })) };
  });
  // switched-off donation channels disappear for visitors
  s.donationChannels = s.donationChannels.filter((c, i) => !CHANNEL_KEYS[i] || featureOn(s.config, CHANNEL_KEYS[i]));
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
    case 'donations': {
      const idx = db.donationChannels.findIndex((c) => c.id === after?.channelId);
      return insert && on(db, 'homeDonate') && (!CHANNEL_KEYS[idx] || on(db, CHANNEL_KEYS[idx]))
        && after.status === 'pending' && !after.transactionId && Number(after.amount) > 0;
    }
    case 'rentals': {
      const unitKey = { hour: 'rentHour', day: 'rentDay', week: 'rentWeek', month: 'rentMonth' }[after?.unit];
      return insert && on(db, 'rental') && !!unitKey && on(db, unitKey) && after.status === 'active' && !after.penalty && !after.returnedAt && !after.advancePaid;
    }
    case 'courseApplications':
      if (insert) return on(db, 'courseApply') && after.status === 'pending';
      if (role === 'institution' && before && after) {
        const course = db.courses.find((c) => c.id === before.courseId);
        return course?.institutionId === user.institutionId && after.courseId === before.courseId;
      }
      return false;
    case 'chats': {
      if (!user || !after) return false;
      if (insert) {
        const okKind = after.kind === 'complaint' || (after.kind === 'query' && on(db, 'mediationQuery'));
        const okTo = after.recipients === 'committee' || (['khateeb', 'all'].includes(after.recipients) && on(db, 'mediationKhateeb'));
        return on(db, 'mediation') && mine(after) && okKind && okTo;
      }
      if (mine(before) && mine(after)) return before.recipients === after.recipients;
      // the Khateeb can reply to conversations addressed to the Khateeb
      return role === 'khateeb' && chatVisibleTo(before, 'khateeb') && after.userId === before.userId && after.recipients === before.recipients;
    }
    case 'nikkahApps':
      if (insert) return on(db, 'nikkah') && !!user && mine(after) && after.status === 'pending' && after.feeStatus !== 'verified';
      return role === 'khateeb' && !!before && !!after;
    case 'homeApps':
      if (!insert || !on(db, 'homeApplication') || !user || !mine(after) || after.status !== 'pending') return false;
      return !on(db, 'homeGpsRequired') || (after.lat !== '' && after.lng !== '' && !!after.gpsCapturedAt);
    case 'chittyPayments':
      return insert && on(db, 'chitty') && on(db, 'chittyUpi') && !!chittyMember && after.memberId === chittyMember.id && after.status === 'pending'
        && after.method === 'upi' && Number(after.amount) === Number(db.chitty?.monthlyAmount);
    case 'variPayments':
      return insert && on(db, 'vari') && !!user?.householdId && after.householdId === user.householdId && after.status === 'pending'
        && ((after.method === 'upi' && on(db, 'variUpi')) || (after.method === 'cash' && on(db, 'variCash')));
    case 'institutionReports':
      if (role !== 'institution' || !on(db, 'institutionReports')) return false;
      if (insert) return after.institutionId === user.institutionId && after.status === 'submitted';
      // an institution may withdraw its own report until the committee has reviewed it
      return !after && before.institutionId === user.institutionId && before.status === 'submitted';
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

// Next receipt (income) or voucher (expense) number for the year, e.g. R-2026-0012.
function makeDocNumberer(db) {
  const used = new Set(db.transactions.map((t) => t.docNo).filter(Boolean));
  const next = {};
  return (type, date) => {
    const prefix = `${type === 'income' ? 'R' : 'V'}-${String(date || new Date().toISOString()).slice(0, 4)}-`;
    if (next[prefix] === undefined) {
      next[prefix] = Math.max(0, ...[...used].filter((d) => d.startsWith(prefix)).map((d) => parseInt(d.slice(prefix.length), 10) || 0)) + 1;
    }
    let candidate;
    do { candidate = prefix + String(next[prefix]++).padStart(4, '0'); } while (used.has(candidate));
    used.add(candidate);
    return candidate;
  };
}

// Server-side fix-ups so amounts can't be tampered with from the browser.
function normalise(col, row, db, before, ctx, nextDocNo) {
  if (col === 'rentals' && row.status === 'active') {
    const item = (id) => db.rentalItems.find((x) => x.id === id);
    const base = row.items.reduce((a, i) => a + Number(item(i.itemId)?.rates?.[row.unit] || 0) * Number(i.qty), 0) * Number(row.duration);
    row.baseAmount = base;
    row.due = new Date(new Date(row.start).getTime() + Number(row.duration) * UNIT_MS[row.unit]).toISOString();
    if (!before) row.advanceAmount = on(db, 'rentAdvance') ? row.items.reduce((a, i) => a + Number(item(i.itemId)?.advance || 0) * Number(i.qty), 0) : 0;
  }
  if (col === 'transactions') {
    row.docNo = String(row.docNo || '').trim() || before?.docNo || nextDocNo(row.type, row.date);
  }
  if (col === 'variPayments' && ctx.role !== 'admin') {
    row.amount = variRateFor(db.households.find((h) => h.id === row.householdId), db.config);
  }
  if (col === 'nikkahApps' && !before && ctx.role !== 'admin') {
    row.feeAmount = on(db, 'nikkahFee') ? Number(db.config?.nikkahFee || 0) : 0;
    row.feeStatus = row.feeAmount > 0 ? (row.feeReceipt ? 'submitted' : 'unpaid') : '';
  }
  return row;
}

// changes: { collections: { [name]: { upserts: [row], deletes: [id] } }, settings: { [key]: value } }
export async function applyChanges(ctx, changes) {
  const m = ctx.masjid.id;
  const db = await loadRaw(m);
  const touched = new Set();
  const ops = [];
  const nextDocNo = makeDocNumberer(db);

  for (const [key, value] of Object.entries(changes.settings || {})) {
    if (!SETTINGS.includes(key)) throw new HttpError(400, `Unknown setting ${key}`);
    if (ctx.role !== 'admin') throw new HttpError(403, 'Only admins can change settings');
    ops.push((tx) => writeSetting(tx, key, value, m));
    touched.add(key);
  }

  for (const [col, { upserts = [], deletes = [] }] of Object.entries(changes.collections || {})) {
    if (!COLLECTIONS.includes(col)) throw new HttpError(400, `Unknown collection ${col}`);
    for (const id of deletes) {
      const before = db[col].find((r) => r.id === id);
      if (!before) continue;
      if (!allowed(ctx, col, before, null, db)) throw new HttpError(403, `Not allowed to delete from ${col}`);
      ops.push((tx) => deleteRow(tx, col, id, m));
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
            || (col === 'transactions' && row.ref ? [...db.donations, ...db.variPayments].find((d) => d.id === row.ref)?.screenshot || db.nikkahApps.find((a) => a.id === row.ref)?.feeReceipt : '')
            || '';
        }
      }
      if (SECRET_COLLECTIONS.includes(col)) {
        if (row.password) row.password = await hashIfNeeded(row.password);
        else if (before?.password) row.password = before.password;
        else throw new HttpError(400, 'A password is required');
      }
      if (!allowed(ctx, col, before, row, db)) throw new HttpError(403, `Not allowed to change ${col}`);
      row = normalise(col, row, db, before, ctx, nextDocNo);
      ops.push((tx) => upsertRow(tx, col, row, m));
      touched.add(col);
    }
  }

  if (!ops.length) return;
  try {
    await sql.begin(async (tx) => {
      for (const op of ops) await op(tx);
      // keep the directory's name in step with the masjid's own details
      if (changes.settings?.masjid?.name) await tx`update masjids set name = ${String(changes.settings.masjid.name).trim()}, updated_at = now() where id = ${m}`;
      await tx`insert into app_events (masjid_id, collections) values (${m}, ${[...touched]})`;
    });
    if (changes.settings?.masjid?.name) forgetMasjid(ctx.masjid.slug);
  } catch (e) {
    if (e instanceof ForeignRowError) throw new HttpError(403, 'Not allowed to change that record');
    if (e.code === '23505') throw new HttpError(400, /doc_no/.test(e.constraint_name || e.message) ? 'That receipt / voucher number is already used.' : 'That name or number is already used in this masjid.');
    throw e;
  }
}

// Just the settings document (feature switches etc.) of one masjid.
export async function getConfig(m) {
  const [row] = await sql`select extra from masjid_config where masjid_id = ${m}`;
  return row?.extra || defaultConfig();
}

export async function pingChange(m, collections) {
  await sql`insert into app_events (masjid_id, collections) values (${m}, ${collections})`;
}

export async function verifyPassword(plain, hash) {
  return isHash(hash) ? bcrypt.compare(String(plain), hash) : false;
}

// Everything one masjid's page needs, filtered for the person asking.
export async function clientStateFor(ctx) {
  const m = ctx.masjid.id;
  const [[{ v }], raw] = await Promise.all([
    sql`select coalesce(max(id), 0)::text as v from app_events where masjid_id = ${m}`,
    loadRaw(m),
  ]);
  const { user, chittyMember } = ctx;
  return {
    version: v,
    masjid: { slug: ctx.masjid.slug, name: ctx.masjid.name },
    state: stripHeavy(sanitize(raw, ctx)),
    user: user ? { ...user, password: undefined } : null,
    chittyMemberId: chittyMember?.id || '',
  };
}
