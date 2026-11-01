// How each part of the app's data maps onto Postgres tables.
//
// Field spec: 'field' (text) or 'field:type'. Types: text, int, num (numeric money/decimals),
// bool, date (YYYY-MM-DD), ts (timestamp), fk (text id that may be empty → stored as NULL).
// Dotted fields ('bank.holder') are nested objects in the app and flat columns in the table.
// `children` are arrays stored in their own table, linked by parent_id and kept in order.
// Any field not listed here is kept in the row's `extra` jsonb column, so nothing is lost.

export const COLLECTION_SPEC = {
  households: {
    table: 'households',
    fields: ['homeNo', 'headName', 'members:int', 'phone', 'ward', 'address', 'lat:num', 'lng:num'],
    children: { family: { table: 'household_members', fields: ['name', 'age:int', 'relation', 'gender'] } },
  },
  institutions: { table: 'institutions', fields: ['name', 'type', 'students:int', 'contact', 'photo', 'description'] },
  courses: { table: 'courses', fields: ['title', 'institutionId:fk', 'duration', 'fee:num', 'seats:int', 'description'] },
  courseApplications: { table: 'course_applications', fields: ['courseId:fk', 'userId', 'name', 'phone', 'age:int', 'qualification', 'status', 'remark', 'date:ts'] },
  opportunities: { table: 'opportunities', fields: ['type', 'title', 'description', 'eligibility', 'deadline:date', 'contact'] },
  services: { table: 'services', fields: ['title', 'description', 'contact'] },
  transactions: { table: 'transactions', fields: ['date:date', 'type', 'head', 'amount:num', 'description', 'receipt', 'ref'] },
  donationChannels: { table: 'donation_channels', fields: ['name', 'accountHead', 'upi', 'qr', 'qrImage', 'bank.holder', 'bank.bank', 'bank.accNo', 'bank.ifsc'] },
  donations: { table: 'donations', fields: ['channelId:fk', 'name', 'phone', 'amount:num', 'note', 'screenshot', 'status', 'remark', 'date:ts', 'decidedAt:ts', 'transactionId', 'accountHead'] },
  events: { table: 'events', fields: ['title', 'date:date', 'time', 'venue', 'description', 'rescheduledFrom:date'] },
  achievements: { table: 'achievements', fields: ['title', 'date:date', 'description'] },
  committee: { table: 'committee_members', fields: ['name', 'role', 'phone'] },
  helpdesk: { table: 'helpdesk_contacts', fields: ['name', 'service', 'phone'] },
  users: { table: 'users', fields: ['username', 'password', 'role', 'name', 'householdId:fk', 'institutionId:fk'] },
  rentalItems: { table: 'rental_items', fields: ['name', 'description', 'image', 'stock:int', 'rates.hour:num', 'rates.day:num', 'rates.week:num', 'rates.month:num'] },
  rentals: {
    table: 'rentals',
    fields: ['name', 'phone', 'unit', 'duration:int', 'start:ts', 'due:ts', 'status', 'baseAmount:num', 'returnedAt:ts', 'remark', 'penalty:num', 'penaltyDetail', 'total:num'],
    children: { items: { table: 'rental_lines', fields: ['itemId:fk', 'qty:int'] } },
  },
  chittyMembers: { table: 'chitty_members', fields: ['code', 'name', 'phone', 'password'] },
  chittyPayments: { table: 'chitty_payments', fields: ['memberId:fk', 'month:int', 'amount:num', 'method', 'screenshot', 'utr', 'status', 'remark', 'date:ts', 'decidedAt:ts'] },
  auctionItems: {
    table: 'auction_items',
    fields: ['name', 'description', 'image', 'minBid:num', 'increment:num', 'endsAt:ts', 'endedAt:ts', 'status', 'posted:bool'],
    children: { bids: { table: 'auction_bids', fields: ['id', 'bidder', 'phone', 'amount:num', 'time:ts'] } },
  },
  chats: {
    table: 'chats',
    fields: ['userId:fk', 'subject', 'householdInfo', 'closed:bool', 'createdAt:ts'],
    children: { messages: { table: 'chat_messages', fields: ['id', 'from', 'text', 'time:ts', 'read:bool'] } },
  },
  nikkahApps: {
    table: 'nikkah_applications',
    fields: [
      'userId:fk',
      ...['groom', 'bride'].flatMap((p) => [`${p}.name`, `${p}.father`, `${p}.dob:date`, `${p}.phone`, `${p}.address`, `${p}.mahall`, `${p}.occupation`]),
      'date:date', 'venue', 'mahr', 'wali', 'witness1', 'witness2', 'notes', 'status', 'remark', 'createdAt:ts', 'decidedAt:ts', 'decidedBy',
    ],
  },
  homeApps: {
    table: 'home_applications',
    fields: ['userId:fk', 'applicant', 'phone', 'currentAddress', 'newAddress', 'ward', 'lat', 'lng', 'reason', 'status', 'remark', 'homeNo', 'householdId:fk', 'createdAt:ts', 'decidedAt:ts'],
    children: { family: { table: 'home_application_members', fields: ['name', 'age:int', 'relation', 'gender'] } },
  },
};

export const COLLECTIONS = Object.keys(COLLECTION_SPEC);
export const SETTINGS = ['masjid', 'accountHeads', 'chitty'];

// Single-row settings tables.
export const SETTING_SPEC = {
  masjid: { table: 'masjid_profile', fields: ['name', 'tagline', 'address', 'lat:num', 'lng:num', 'phone', 'email', 'about'] },
  chitty: { table: 'chitty_settings', fields: ['name', 'monthlyAmount:num', 'months:int', 'startMonth', 'upi'] },
};

const snake = (s) => s.replace(/\./g, '_').replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
export const parseField = (f) => {
  const [path, type = 'text'] = f.split(':');
  return { path, type, column: snake(path) };
};

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const set = (obj, path, v) => {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => { o = o[k] ??= {}; });
  o[keys.at(-1)] = v;
};

// App value → column value
const toDb = (v, type) => {
  if (v === undefined || v === null || v === '') return type === 'bool' ? false : null;
  switch (type) {
    case 'int': return Number.isFinite(Number(v)) ? Math.round(Number(v)) : null;
    case 'num': return Number.isFinite(Number(v)) ? String(v) : null;
    case 'bool': return !!v;
    case 'date': return String(v).slice(0, 10);
    case 'ts': return new Date(v).toISOString();
    default: return String(v);
  }
};
// Column value → app value
const fromDb = (v, type) => {
  if (v === null || v === undefined) return type === 'bool' ? false : type === 'int' || type === 'num' ? null : '';
  switch (type) {
    case 'int': case 'num': return Number(v);
    case 'ts': return new Date(v).toISOString();
    default: return v;
  }
};

// The SELECT list for a spec: dates come back as plain 'YYYY-MM-DD' text.
export const selectList = (fields, extraCols = []) =>
  [...extraCols, ...fields.map(parseField).map(({ column, type }) => (type === 'date' ? `to_char("${column}", 'YYYY-MM-DD') as "${column}"` : `"${column}"`))].join(', ');

export function rowToDb(obj, fields, { withExtra = true } = {}) {
  const out = {};
  const known = new Set(['id']);
  for (const f of fields.map(parseField)) {
    out[f.column] = toDb(get(obj, f.path), f.type);
    known.add(f.path.split('.')[0]);
  }
  if (withExtra) {
    const extra = {};
    for (const [k, v] of Object.entries(obj)) if (!known.has(k)) extra[k] = v;
    out.extra = extra;
  }
  return out;
}

export function rowFromDb(row, fields) {
  const obj = {};
  if (row.id !== undefined) obj.id = row.id;
  for (const f of fields.map(parseField)) set(obj, f.path, fromDb(row[f.column], f.type));
  return row.extra ? { ...row.extra, ...obj } : obj;
}
