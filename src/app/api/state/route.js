import { handle, json } from '@/lib/api';
import { sql } from '@/lib/db';
import { getContext, clientStateFor } from '@/lib/state';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ?since=<version>: if nothing has changed since then, answer with a tiny "unchanged" reply.
export const GET = handle(async (req) => {
  const ctx = await getContext(req);
  const since = new URL(req.url).searchParams.get('since');
  if (since) {
    const [{ v }] = await sql`select coalesce(max(id), 0)::text as v from app_events where masjid_id = ${ctx.masjid.id}`;
    if (since === v) return json({ unchanged: true, version: v });
  }
  return json(await clientStateFor(ctx));
});
