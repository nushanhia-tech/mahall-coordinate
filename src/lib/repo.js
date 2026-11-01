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
    if (value.length) await tx`insert into account_heads ${tx(value.map((name, position) => ({ name, position })))}`;
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

// ---------- fast paths ----------

// Read every table at once (all queries run in parallel), then stitch children onto parents.
export async function readAll(db) {
  const jobs = [];
  for (const [col, spec] of Object.entries(COLLECTION_SPEC)) {
    jobs.push(db.unsafe(`select "id", "extra", ${selectList(spec.fields)} from ${q(spec.table)} order by created_at, id`).then((rows) => ['parent', col, rows]));
    for (const [field, child] of Object.entries(spec.children || {})) {
      const hasId = child.fields.includes('id');
      jobs.push(db.unsafe(`select parent_id, ${selectList(child.fields.filter((f) => f !== 'id'), hasId ? ['"id"'] : [])} from ${q(child.table)} order by parent_id, position`)
        .then((rows) => ['child', col, rows, field, child]));
    }
  }
  const settingsJob = readSettings(db);
  const results = await Promise.all(jobs);
  const state = await settingsJob;

  const kids = {};
  for (const [kind, col, rows, field, child] of results) {
    if (kind !== 'child') continue;
    const map = new Map();
    for (const r of rows) {
      const item = rowFromDb(r, child.fields.filter((f) => f !== 'id'));
      if (!child.fields.includes('id')) delete item.id;
      if (!map.has(r.parent_id)) map.set(r.parent_id, []);
      map.get(r.parent_id).push(item);
    }
    (kids[col] ||= {})[field] = map;
  }
  for (const [kind, col, rows] of results) {
    if (kind !== 'parent') continue;
    const spec = COLLECTION_SPEC[col];
    state[col] = rows.map((r) => {
      const obj = rowFromDb(r, spec.fields);
      for (const field of Object.keys(spec.children || {})) obj[field] = kids[col]?.[field]?.get(r.id) || [];
      return obj;
    });
  }
  return state;
}

// Insert many rows of one collection with a single statement per table (used for demo data / restore).
export async function insertMany(tx, collection, objs) {
  if (!objs.length) return;
  const spec = COLLECTION_SPEC[collection];
  const bulk = async (table, cols, rows) => {
    for (let start = 0; start < rows.length; start += 200) {
      const chunk = rows.slice(start, start + 200);
      const params = [];
      const values = chunk.map((vals) => `(${vals.map((v) => { params.push(v !== null && typeof v === 'object' ? tx.json(v) : v); return `$${params.length}`; }).join(', ')})`);
      await tx.unsafe(`insert into ${q(table)} (${cols.map(q).join(', ')}) values ${values.join(', ')}`, params);
    }
  };
  const parentRows = objs.map((o) => {
    const d = rowToDb(o, spec.fields);
    for (const field of Object.keys(spec.children || {})) delete d.extra[field];
    return d;
  });
  const cols = ['id', ...Object.keys(parentRows[0])];
  await bulk(spec.table, cols, parentRows.map((d, i) => [objs[i].id, ...Object.values(d)]));
  for (const [field, child] of Object.entries(spec.children || {})) {
    const rows = [];
    let ccols = null;
    objs.forEach((o) => (o[field] || []).forEach((item, i) => {
      const d = rowToDb(item, child.fields, { withExtra: false });
      ccols ||= ['parent_id', 'position', ...Object.keys(d)];
      rows.push([o.id, i, ...Object.values(d)]);
    }));
    if (rows.length) await bulk(child.table, ccols, rows);
  }
}
