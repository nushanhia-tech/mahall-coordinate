'use client';
import { useEffect, useState } from 'react';

// Shown while the app's data is loading, or instead of it when loading failed.
// Runs the server's health check and shows the result, so a screenshot is enough to diagnose setup problems.
export default function StartupStatus({ error, onRetry }) {
  const [seconds, setSeconds] = useState(0);
  const [health, setHealth] = useState(null);
  const slow = seconds >= 8;

  useEffect(() => { const t = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!error && !slow) return;
    let cancelled = false;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    fetch('/api/health', { cache: 'no-store', signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setHealth(d); })
      .catch((e) => { if (!cancelled) setHealth({ ok: false, problem: e.name === 'AbortError' ? 'The health check itself got no answer within 45 seconds (the server cannot reach the database at all).' : 'The health check could not be loaded.' }); })
      .finally(() => clearTimeout(t));
    return () => { cancelled = true; ctrl.abort(); };
  }, [error, slow]);

  const db = health?.databaseUrl || {};
  const rows = health && [
    ['Problem', health.ok ? 'None – the database answered. Click "Try again".' : health.problem],
    ['Error code', health.errorCode],
    ['Error text', health.errorText],
    ['Database user', db.user],
    ['Database host', db.host],
    ['Database port', db.port],
    ['Is pooler address', db.looksLikePooler === undefined ? '' : db.looksLikePooler ? 'yes ✅' : 'NO ❌'],
    ['Password has [ ]', db.passwordHasBrackets === undefined ? '' : db.passwordHasBrackets ? 'YES ❌' : 'no ✅'],
    ['Login secret set', health.authSecretSet === undefined ? '' : health.authSecretSet ? 'yes ✅' : 'NO ❌'],
    ['Demo data loaded', health.demoDataLoaded === undefined ? '' : health.demoDataLoaded ? 'yes ✅' : 'NO ❌'],
    ['One query took', health.oneQueryMs != null ? `${health.oneQueryMs} ms` : ''],
    ['Server region', health.serverRegion],
    ['Code version', health.builtFrom],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');

  return (
    <div className="min-h-screen grid place-items-center p-4 text-sm text-slate-600">
      <div className="w-full max-w-xl text-center space-y-3">
        {error ? <div className="text-red-600 font-semibold text-base">Could not load the data</div> : <div className="text-base">Loading… {seconds}s</div>}
        {error && <div>{error}</div>}
        {!error && slow && !health && <div>This is taking long – checking the server…</div>}
        {rows && (
          <table className="w-full text-left bg-white border rounded-lg overflow-hidden">
            <tbody>{rows.map(([k, v]) => <tr key={k} className="border-t first:border-0"><td className="px-3 py-1.5 font-semibold text-slate-700 w-40 align-top">{k}</td><td className="px-3 py-1.5 break-all">{String(v)}</td></tr>)}</tbody>
          </table>
        )}
        {rows && <div className="text-xs text-slate-400">Send a screenshot of this box to get help. It contains no passwords.</div>}
        {(error || health) && <button className="btn-primary" onClick={onRetry}>Try again</button>}
      </div>
    </div>
  );
}
