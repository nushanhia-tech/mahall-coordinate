import { handle, json } from '@/lib/api';
import { sql } from '@/lib/db';
import { loadRaw, getContext, sanitize, stripHeavy } from '@/lib/state';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ?since=<version>: if nothing has changed since then, answer with a tiny "unchanged" reply.
export const GET = handle(async (req) => {
  const since = new URL(req.url).searchParams.get('since');
  const [{ v }] = await sql`select coalesce(max(id), 0)::text as v from app_events`;
  if (since && since === v) return json({ unchanged: true, version: v });

  const [raw, ctx] = await Promise.all([loadRaw(), getContext()]);
  const { user, chittyMember } = ctx;
  return json({
    version: v,
    state: stripHeavy(sanitize(raw, ctx)),
    user: user ? { ...user, password: undefined } : null,
    chittyMemberId: chittyMember?.id || '',
  });
});
