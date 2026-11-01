import { handle, json } from '@/lib/api';
import { getSuperSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const s = await getSuperSession();
  return json({ username: s?.username || null });
});
