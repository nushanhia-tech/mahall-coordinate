// The list of masjids on this site.
import { sql } from './db';

export const RESERVED_SLUGS = ['api', 'super', 'login', 'admin', 'm', '_next', 'static', 'favicon.ico', 'robots.txt'];
export const slugOk = (s) => /^[a-z0-9][a-z0-9-]{1,39}$/.test(s || '') && !RESERVED_SLUGS.includes(s);

const cache = new Map(); // slug -> { masjid, at }
const TTL = 30_000;

export async function getMasjidBySlug(slug) {
  if (!slug) return null;
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < TTL) return hit.masjid;
  const [row] = await sql`select id, slug, name, active from masjids where slug = ${slug}`;
  cache.set(slug, { masjid: row || null, at: Date.now() });
  return row || null;
}
export const forgetMasjid = (slug) => cache.delete(slug);

export async function listMasjids({ includeInactive = false } = {}) {
  return sql`
    select m.id, m.slug, m.name, m.active, m.created_at,
           coalesce(p.address, '') as address,
           (select count(*)::int from households h where h.masjid_id = m.id) as homes,
           (select count(*)::int from users u where u.masjid_id = m.id) as users
    from masjids m left join masjid_profile p on p.masjid_id = m.id
    where ${includeInactive} or m.active
    order by m.created_at`;
}
