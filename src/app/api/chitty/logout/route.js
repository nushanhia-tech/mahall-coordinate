import { handle, json } from '@/lib/api';
import { clearChittySession } from '@/lib/auth';

export const POST = handle(async () => { await clearChittySession(); return json({ ok: true }); });
