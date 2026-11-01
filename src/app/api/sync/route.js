import { handle, json, body } from '@/lib/api';
import { applyChanges, getContext } from '@/lib/state';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = handle(async (req) => {
  const [changes, ctx] = await Promise.all([body(req), getContext(req)]);
  await applyChanges(ctx, changes);
  return json({ ok: true });
});
