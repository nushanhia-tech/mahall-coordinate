import { handle, json } from '@/lib/api';
import { loadRaw, getContext, sanitize } from '@/lib/state';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const [raw, ctx] = await Promise.all([loadRaw(), getContext()]);
  const { user, chittyMember } = ctx;
  return json({
    state: sanitize(raw, ctx),
    user: user ? { ...user, password: undefined } : null,
    chittyMemberId: chittyMember?.id || '',
  });
});
