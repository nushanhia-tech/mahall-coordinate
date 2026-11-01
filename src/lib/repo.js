// Reads and writes one masjid's data in the Postgres tables described in schema.js.
// Every function takes the masjid id `m`; nothing ever reads or changes another masjid's rows.
import { COLLECTION_SPEC, SETTING_SPEC, parseField, selectList, rowToDb, rowFromDb } from './schema';

const q = (name) => `"${name}"`;
const param = (tx, v) => (v !== null && typeof v === 'object' ? tx.json(v) : v);

export class ForeignRowError extends Error {}

// Insert many rows into one table with as few statements as possible.
async function bulkInsert(tx, table, cols, rows) {
  for (let start = 0; start < rows.length; start += 200) {
    const chunk = rows.slice(start, start + 200);
    const params = [];
    const values = chunk.map((vals) => `(${vals.map((v) => { params.push(param(tx, v)); return `$${params.length}`; }).join(', ')})`);
    await tx.unsafe(`insert into ${q(table)} (${cols.map(q).join(', ')}) values ${values.join(', ')}`, params);
  }
}

async function readChildren(tx, spec, parentIds) {
  const out = {};
  for (const [field, child] of Object.entries(spec.children || {})) {
    out[field] = new Map();
    if (!parentIds.length) continue;
    const rows = await tx.unsafe(
      `select parent_id, ${selectList(child.fields.filter((f) => f !== 'id'), child.fields.includes('id') ? ['"id"'] : [])}
       from ${q(child.table)} where parent_id = any($1) order by parent_id, position`,
      [parentIds],
    );
    for (const r of rows) {
      if (!out[field].has(r.parent_id)) out[field].set(r.parent_id, []);
      const item = rowFromDb(r, child.fields.filter((f) => f !== 'id'));
      if (!child.fields.includes('id')) delete item.id;
      out[field].get(r.parent_id).push(item);
    }
  }
  return out;
}

async function readRows(tx, collection, m, where = '', params = []) {
  const spec = COLLECTION_SPEC[collection];
  const rows = await tx.unsafe(
    `select "id", "extra", ${selectList(spec.fields)} from ${q(spec.table)} where masjid_id = $1 ${where ? `and ${where}` : ''} order by created_at, id`,
    [m, ...params],
  );
  const kids = await readChildren(tx, spec, rows.map((r) => r.id));
  return rows.map((r) => {
    const obj = rowFromDb(r, spec.fields);
    for (const field of Object.keys(spec.children || {})) obj[field] = kids[field].get(r.id) || [];
    return obj;
  });
}

export async function readOne(tx, collection, id, m) {
  const [row] = await readRows(tx, collection, m, 'id = $2', [id]);
  return row || null;
}

// Find rows where a top-level field equals a value (optionally case-insensitive).
export async function findBy(tx, collection, field, value, m, { ci = false } = {}) {
  const spec = COLLECTION_SPEC[collection];
  const f = spec.fields.map(parseField).find((x) => x.path === field);
  if (!f) throw new Error(`Unknown field ${collection}.${field}`);
  const col = ci ? `lower(${q(f.column)})` : q(f.column);
  return readRows(tx, collection, m, `${col} = $2`, [ci ? String(value).toLowerCase() : value]);
}

async function writeChildren(tx, spec, objs) {
  for (const [field, child] of Object.entries(spec.children || {})) {
    const rows = [];
    let cols = null;
    for (const o of objs) {
      (o[field] || []).forEach((item, i) => {
        const d = rowToDb(item, child.fields, { withExtra: false });
        cols ||= ['parent_id', 'position', ...Object.keys(d)];
        rows.push([o.id, i, ...Object.values(d)]);
      });
    }
    if (rows.length) await bulkInsert(tx, child.table, cols, rows);
  }
}

// Insert or update one record. Refuses to touch a row that belongs to another masjid.
export async function upsertRow(tx, collection, obj, m) {
  const spec = COLLECTION_SPEC[collection];
  const data = rowToDb(obj, spec.fields);
  for (const field of Object.keys(spec.children || {})) delete data.extra[field];
  const cols = ['id', 'masjid_id', ...Object.keys(data)];
  const vals = [obj.id, m, ...Object.values(data)];
  const res = await tx.unsafe(
    `insert into ${q(spec.table)} as t (${cols.map(q).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
     on conflict (id) do update set ${cols.slice(2).map((c) => `${q(c)} = excluded.${q(c)}`).join(', ')}, updated_at = now()
     where t.masjid_id = excluded.masjid_id
     returning id`,
    vals.map((v) => param(tx, v)),
  );
  if (!res.length) throw new ForeignRowError(`Record ${obj.id} belongs to another masjid`);
  const childTables = Object.values(spec.children || {});
  for (const child of childTables) await tx.unsafe(`delete from ${q(child.table)} where parent_id = $1`, [obj.id]);
  if (childTables.length) await writeChildren(tx, spec, [obj]);
}

export async function deleteRow(tx, collection, id, m) {
  await tx.unsafe(`delete from ${q(COLLECTION_SPEC[collection].table)} where id = $1 and masjid_id = $2`, [id, m]);
}

// Insert many new rows of one collection (used for demo data and restoring a backup).
export async function insertMany(tx, collection, objs, m) {
  if (!objs.length) return;
  const spec = COLLECTION_SPEC[collection];
  const parentRows = objs.map((o) => {
    const d = rowToDb(o, spec.fields);
    for (const field of Object.keys(spec.children || {})) delete d.extra[field];
    return d;
  });
  const cols = ['id', 'masjid_id', ...Object.keys(parentRows[0])];
  await bulkInsert(tx, spec.table, cols, parentRows.map((d, i) => [objs[i].id, m, ...Object.values(d)]));
  await writeChildren(tx, spec, objs);
}

// ---------- settings ----------

export async function writeSetting(tx, key, value, m) {
  if (key === 'accountHeads') {
    await tx`delete from account_heads where masjid_id = ${m}`;
    if (value.length) await tx`insert into account_heads ${tx(value.map((name, position) => ({ masjid_id: m, name, position })))}`;
    return;
  }
  const spec = SETTING_SPEC[key];
  const data = rowToDb(value || {}, spec.fields);
  const cols = ['masjid_id', ...Object.keys(data)];
  await tx.unsafe(
    `insert into ${q(spec.table)} (${cols.map(q).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
     on conflict (masjid_id) do update set ${cols.slice(1).map((c) => `${q(c)} = excluded.${q(c)}`).join(', ')}, updated_at = now()`,
    [m, ...Object.values(data).map((v) => param(tx, v))],
  );
}

// Delete one masjid's records. keepSettings keeps the masjid details, account heads and donation (payment) details.
export async function wipeMasjid(tx, m, { keepSettings = false, keepUserId = null } = {}) {
  const keep = keepSettings ? ['donation_channels'] : [];
  for (const spec of Object.values(COLLECTION_SPEC)) {
    if (keep.includes(spec.table)) continue;
    if (spec.table === 'users' && keepUserId) await tx`delete from users where masjid_id = ${m} and id <> ${keepUserId}`;
    else await tx.unsafe(`delete from ${q(spec.table)} where masjid_id = $1`, [m]);
  }
  if (!keepSettings) {
    for (const spec of Object.values(SETTING_SPEC)) await tx.unsafe(`delete from ${q(spec.table)} where masjid_id = $1`, [m]);
    await tx`delete from account_heads where masjid_id = ${m}`;
  }
}

// ---------- fast path: everything in one query ----------

// The database builds one JSON document with all of a masjid's data: one round trip, and it
// avoids sending many queries through the Supabase pooler at once.
let readAllSql = null;
function buildReadAllSql() {
  const parts = [];
  for (const [key, spec] of Object.entries(SETTING_SPEC)) {
    parts.push(`'s:${key}', (select row_to_json(t) from (select ${selectList(spec.fields, ['"extra"'])} from ${q(spec.table)} where masjid_id = $1) t)`);
  }
  parts.push(`'s:accountHeads', (select coalesce(json_agg(name order by position, name), '[]'::json) from account_heads where masjid_id = $1)`);
  for (const [col, spec] of Object.entries(COLLECTION_SPEC)) {
    const extraCols = ['"id"', '"extra"', ...(spec.fields.map(parseField).some((f) => f.column === 'created_at') ? [] : ['"created_at"'])];
    parts.push(`'c:${col}', (select coalesce(json_agg(t order by t.created_at, t.id), '[]'::json) from (select ${selectList(spec.fields, extraCols)} from ${q(spec.table)} where masjid_id = $1) t)`);
    for (const [field, child] of Object.entries(spec.children || {})) {
      const hasId = child.fields.includes('id');
      parts.push(`'k:${col}:${field}', (select coalesce(json_agg(t order by t.parent_id, t.position), '[]'::json) from (select ${selectList(child.fields.filter((f) => f !== 'id'), ['"parent_id"', '"position"', ...(hasId ? ['"id"'] : [])])} from ${q(child.table)} where parent_id in (select id from ${q(spec.table)} where masjid_id = $1)) t)`);
    }
  }
  return `select json_build_object(${parts.join(',\n')}) as data`;
}

export async function readAll(db, m) {
  readAllSql ||= buildReadAllSql();
  const [{ data }] = await db.unsafe(readAllSql, [m]);
  const doc = typeof data === 'string' ? JSON.parse(data) : data;

  const state = { masjid: null, chitty: null, accountHeads: doc['s:accountHeads'] || [] };
  for (const [key, spec] of Object.entries(SETTING_SPEC)) {
    const r = doc[`s:${key}`];
    if (r) { state[key] = rowFromDb(r, spec.fields); delete state[key].id; }
  }
  for (const [col, spec] of Object.entries(COLLECTION_SPEC)) {
    const kids = {};
    for (const [field, child] of Object.entries(spec.children || {})) {
      const map = new Map();
      for (const r of doc[`k:${col}:${field}`] || []) {
        const item = rowFromDb(r, child.fields.filter((f) => f !== 'id'));
        if (!child.fields.includes('id')) delete item.id;
        if (!map.has(r.parent_id)) map.set(r.parent_id, []);
        map.get(r.parent_id).push(item);
      }
      kids[field] = map;
    }
    state[col] = (doc[`c:${col}`] || []).map((r) => {
      const obj = rowFromDb(r, spec.fields);
      for (const field of Object.keys(spec.children || {})) obj[field] = kids[field].get(r.id) || [];
      return obj;
    });
  }
  return state;
}
