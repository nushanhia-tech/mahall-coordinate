import { handle, json } from '@/lib/api';
import { ensureSeeded } from '@/lib/state';
import { listMasjids } from '@/lib/masjids';

export const dynamic = 'force-dynamic';

// Public directory of masjids on this site.
export const GET = handle(async () => {
  await ensureSeeded();
  const rows = await listMasjids();
  return json({ masjids: rows.map((m) => ({ slug: m.slug, name: m.name, address: m.address, homes: m.homes, logo: m.logo })) });
});
