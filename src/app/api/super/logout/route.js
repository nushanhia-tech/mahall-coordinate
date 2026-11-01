import { handle, json } from '@/lib/api';
import { clearSuperSession } from '@/lib/auth';

export const POST = handle(async () => { await clearSuperSession(); return json({ ok: true }); });
