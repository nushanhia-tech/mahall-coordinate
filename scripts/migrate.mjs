// Applies every SQL file in supabase/migrations to DATABASE_URL (safe to re-run).
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first (see .env.example)'); process.exit(1); }
const sql = postgres(url, { prepare: false, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require' });
const dir = path.resolve('supabase/migrations');
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  console.log('Applying', f);
  await sql.unsafe(fs.readFileSync(path.join(dir, f), 'utf8'));
}
await sql.end();
console.log('Done. Demo data is added automatically the first time the app starts.');
