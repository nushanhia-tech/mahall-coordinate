import postgres from 'postgres';

// One shared connection pool per server instance (reused across hot reloads in dev).
const globalForDb = globalThis;
export const sql = globalForDb.__mahallSql ?? postgres(process.env.DATABASE_URL, {
  prepare: false, // required for Supabase's transaction pooler
  max: 10,
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '') ? false : 'require',
});
if (process.env.NODE_ENV !== 'production') globalForDb.__mahallSql = sql;
