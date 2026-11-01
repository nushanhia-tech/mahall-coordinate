// Reads and writes the app's data in the Postgres tables described in schema.js.
import { COLLECTION_SPEC, SETTING_SPEC, parseField, selectList, rowToDb, rowFromDb } from './schema';

const q = (name) => `"${name}"`;

async function readChildren(tx, spec, parentIds) {
  const out = {};
  for (const [field, child] of Object.entries(spec.children || {})) {
    out[field] = new Map();
    if (!parentIds.length) continue;
    const rows = await tx.unsafe(
      `select parent_id, ${selectList(child.fields.filter((f) => parseField(f).path !== 'id'), child.fields.some((f) => f === 'id') ? ['"id"'] : [])}
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

async function readRows(tx, collection, where = '', params = []) {
  const spec = COLLECTION_SPEC[collection];
  const rows = await tx.unsafe(`select "id", "extra", ${selectList(spec.fields)} from ${q(spec.table)} ${where} order by created_at, id`, params);
  const kids = await readChildren(tx, spec, rows.map((r) => r.id));
  return rows.map((r) => {
    const obj = rowFromDb(r, spec.fields);
    for (const field of Object.keys(spec.children || {})) obj[field] = kids[field].get(r.id) || [];
    return obj;
  });
}

export const readCollection = (tx, collection) => readRows(tx, collection);

export async function readOne(tx, collection, id) {
  const [row] = await readRows(tx, collection, 'where id = $1', [id]);
  return row || null;
}

// Find rows where a top-level field equals a value (optionally case-insensitive).
export async function findBy(tx, collection, field, value, { ci = false } = {}) {
  const spec = COLLECTION_SPEC[collection];
  const f = spec.fields.map(parseField).find((x) => x.path === field);
  if (!f) throw new Error(`Unknown field ${collection}.${field}`);
  const col = ci ? `lower(${q(f.column)})` : q(f.column);
  return readRows(tx, collection, `where ${col} = $1`, [ci ? String(value).toLowerCase() : value]);
}

export async function upsertRow(tx, collection, obj) {
  const spec = COLLECTION_SPEC[collection];
  const data = rowToDb(obj, spec.fields);
  for (const field of Object.keys(spec.children || {})) delete data.extra[field];
  const cols = ['id', ...Object.keys(data)];
  const vals = [obj.id, ...Object.values(data)];
  await tx.unsafe(
    `insert into ${q(spec.table)} (${cols.map(q).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
     on conflict (id) do update set ${cols.slice(1).map((c) => `${q(c)} = excluded.${q(c)}`).join(', ')}, updated_at = now()`,
    vals.map((v) => (v !== null && typeof v === 'object' ? tx.json(v) : v)),
  );
  for (const [field, child] of Object.entries(spec.children || {})) {
    await tx.unsafe(`delete from ${q(child.table)} where parent_id = $1`, [obj.id]);
    const items = obj[field] || [];
    for (let i = 0; i < items.length; i++) {
      const d = rowToDb(items[i], child.fields, { withExtra: false });
      const ccols = ['parent_id', 'position', ...Object.keys(d)];
      await tx.unsafe(
        `insert into ${q(child.table)} (${ccols.map(q).join(', ')}) values (${ccols.map((_, j) => `$${j + 1}`).join(', ')})`,
        [obj.id, i, ...Object.values(d)],
      );
    }
  }
}

export async function deleteRow(tx, collection, id) {
  await tx.unsafe(`delete from ${q(COLLECTION_SPEC[collection].table)} where id = $1`, [id]);
}

// ---------- settings ----------

export async function readSettings(tx) {
  const out = { masjid: null, chitty: null, accountHeads: [] };
  for (const [key, spec] of Object.entries(SETTING_SPEC)) {
    const [r] = await tx.unsafe(`select "extra", ${selectList(spec.fields)} from ${q(spec.table)} where id = 'main'`);
    if (r) { out[key] = rowFromDb(r, spec.fields); delete out[key].id; }
  }
  out.accountHeads = (await tx`select name from account_heads order by position, name`).map((r) => r.name);
  return out;
}

export async function writeSetting(tx, key, value) {
  if (key === 'accountHeads') {
    await tx`delete from account_heads`;
    for (let i = 0; i < value.length; i++) await tx`insert into account_heads (name, position) values (${value[i]}, ${i})`;
    return;
  }
  const spec = SETTING_SPEC[key];
  const data = rowToDb(value, spec.fields);
  const cols = ['id', ...Object.keys(data)];
  await tx.unsafe(
    `insert into ${q(spec.table)} (${cols.map(q).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
     on conflict (id) do update set ${cols.slice(1).map((c) => `${q(c)} = excluded.${q(c)}`).join(', ')}, updated_at = now()`,
    ['main', ...Object.values(data).map((v) => (v !== null && typeof v === 'object' ? tx.json(v) : v))],
  );
}

// Delete everything (children go with their parents).
export async function wipeAll(tx) {
  const tables = [...Object.values(COLLECTION_SPEC).map((s) => s.table), ...Object.values(SETTING_SPEC).map((s) => s.table), 'account_heads'];
  await tx.unsafe(`truncate ${tables.map(q).join(', ')} cascade`);
}
