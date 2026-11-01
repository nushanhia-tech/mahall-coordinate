import { handle, json } from '@/lib/api';
import { clearUserSession } from '@/lib/auth';

export const POST = handle(async () => { await clearUserSession(); return json({ ok: true }); });
