import { handle, json, body } from '@/lib/api';
import { sql } from '@/lib/db';
import { createMasjidWithData, HttpError } from '@/lib/state';
import { listMasjids, slugOk, forgetMasjid } from '@/lib/masjids';
import { requireSuper } from '@/lib/superAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const clean = (s) => String(s || '').trim();

// List every masjid, including paused ones.
export const GET = handle(async () => {
  await requireSuper();
  return json({ masjids: await listMasjids({ includeInactive: true }) });
});

// Add a masjid with its first admin login.
export const POST = handle(async (req) => {
  await requireSuper();
  const b = await body(req);
  const slug = clean(b.slug).toLowerCase(), name = clean(b.name);
  if (!name) throw new HttpError(400, 'Enter the masjid name.');
  if (!slugOk(slug)) throw new HttpError(400, 'The web address may only use small letters, numbers and dashes (2–40 characters).');
  if (!clean(b.adminUsername) || String(b.adminPassword || '').length < 6) throw new HttpError(400, 'Enter an admin username and a password of at least 6 characters.');
  const [taken] = await sql`select 1 from masjids where slug = ${slug}`;
  if (taken) throw new HttpError(400, 'That web address is already used by another masjid.');
  await createMasjidWithData({ slug, name, adminName: clean(b.adminName), adminUsername: clean(b.adminUsername), adminPassword: String(b.adminPassword) });
  forgetMasjid(slug);
  return json({ ok: true, slug });
});

// Rename, change address, or pause / resume a masjid.
export const PATCH = handle(async (req) => {
  await requireSuper();
  const b = await body(req);
  const [m] = await sql`select id, slug, name, active from masjids where id = ${b.id}`;
  if (!m) throw new HttpError(404, 'Masjid not found');
  const slug = b.slug !== undefined ? clean(b.slug).toLowerCase() : m.slug;
  const name = b.name !== undefined ? clean(b.name) : m.name;
  const active = b.active !== undefined ? !!b.active : m.active;
  if (!name) throw new HttpError(400, 'Enter the masjid name.');
  if (!slugOk(slug)) throw new HttpError(400, 'The web address may only use small letters, numbers and dashes (2–40 characters).');
  if (slug !== m.slug) {
    const [taken] = await sql`select 1 from masjids where slug = ${slug}`;
    if (taken) throw new HttpError(400, 'That web address is already used by another masjid.');
  }
  await sql.begin(async (tx) => {
    await tx`update masjids set slug = ${slug}, name = ${name}, active = ${active}, updated_at = now() where id = ${m.id}`;
    await tx`update masjid_profile set name = ${name}, updated_at = now() where masjid_id = ${m.id}`;
  });
  forgetMasjid(m.slug); forgetMasjid(slug);
  return json({ ok: true });
});

// Delete a masjid and ALL its data. The caller must type the masjid's web address to confirm.
export const DELETE = handle(async (req) => {
  await requireSuper();
  const b = await body(req);
  const [m] = await sql`select id, slug from masjids where id = ${b.id}`;
  if (!m) throw new HttpError(404, 'Masjid not found');
  if (b.confirm !== m.slug) throw new HttpError(400, `Type ${m.slug} to confirm.`);
  // Child rows (bids, messages…) are removed with their parents; parents with the masjid.
  await sql`delete from masjids where id = ${m.id}`;
  forgetMasjid(m.slug);
  return json({ ok: true });
});
