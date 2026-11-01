import { handle, json } from '@/lib/api';
import { getContext, replaceAll, demoState, HttpError } from '@/lib/state';

export const POST = handle(async () => {
  const ctx = await getContext();
  if (ctx.role !== 'admin') throw new HttpError(403, 'Admins only');
  const s = demoState();
  // Keep the current admin's login working after a reset.
  if (!s.users.some((u) => u.id === ctx.user.id)) s.users.push(ctx.user);
  await replaceAll(s);
  return json({ ok: true });
});
