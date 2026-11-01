import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { uid } from '../utils/format';

const Ctx = createContext(null);
const SETTINGS = ['masjid', 'accountHeads', 'chitty'];

// Work out which records changed between two versions of the state.
function diff(prev, next) {
  const out = { collections: {}, settings: {} };
  for (const key of Object.keys(next)) {
    if (SETTINGS.includes(key)) {
      if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) out.settings[key] = next[key];
      continue;
    }
    if (!Array.isArray(next[key])) continue;
    const before = new Map((prev[key] || []).map((r) => [r.id, JSON.stringify(r)]));
    const upserts = next[key].filter((r) => before.get(r.id) !== JSON.stringify(r));
    const ids = new Set(next[key].map((r) => r.id));
    const deletes = [...before.keys()].filter((id) => !ids.has(id));
    if (upserts.length || deletes.length) out.collections[key] = { upserts, deletes };
  }
  return Object.keys(out.collections).length || Object.keys(out.settings).length ? out : null;
}

const api = async (url, opts = {}) => {
  // Give up after 30 seconds so the page shows an error instead of loading forever.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  let res;
  try {
    res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal: ctrl.signal });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'The server took too long to answer. Open /api/health to see why.' : 'No connection to the server.');
  } finally { clearTimeout(timer); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};

export function AppProvider({ children }) {
  const [state, setState] = useState(null);
  const [user, setUser] = useState(null);
  const [chittyMemberId, setChittyMemberId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const stateRef = useRef(null);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);
  const refetchTimer = useRef(null);

  const toast = useCallback((msg, type = 'success') => {
    const id = uid('t');
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await api('/api/state');
      if (pending.current > 0) return; // a save is in flight; the next ping will refresh again
      stateRef.current = d.state;
      setState(d.state); setUser(d.user); setChittyMemberId(d.chittyMemberId);
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(refresh, 250);
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);

  // Live updates: Supabase Realtime pings when anything changes; plain polling as a fallback.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let channel = null, client = null, live = false, last = Date.now();
    if (url && key) {
      client = createClient(url, key);
      channel = client.channel('app-events')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_events' }, scheduleRefresh)
        .subscribe((status) => { live = status === 'SUBSCRIBED'; });
    }
    // While the live connection is up, check rarely; otherwise every 4 seconds.
    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - last < (live ? 30000 : 4000)) return;
      last = Date.now();
      refresh();
    }, 1000);
    return () => { clearInterval(poll); if (channel) client.removeChannel(channel); };
  }, [refresh, scheduleRefresh]);

  // Change state locally right away, then save the difference to the server.
  const update = useCallback((fn) => {
    const prev = stateRef.current;
    const next = structuredClone(prev);
    fn(next);
    stateRef.current = next;
    setState(next);
    const changes = diff(prev, next);
    if (!changes) return;
    pending.current += 1;
    queue.current = queue.current
      .then(() => api('/api/sync', { method: 'POST', body: JSON.stringify(changes) }))
      .catch((e) => toast(`Not saved: ${e.message}`, 'error'))
      .finally(() => { pending.current -= 1; if (pending.current === 0) scheduleRefresh(); });
  }, [toast, scheduleRefresh]);

  const add = useCallback((col, item) => { const id = item.id || uid(col.slice(0, 3)); update((s) => { s[col].push({ ...item, id }); }); return id; }, [update]);
  const patch = useCallback((col, id, changes) => update((s) => { const i = s[col].findIndex((x) => x.id === id); if (i >= 0) s[col][i] = { ...s[col][i], ...(typeof changes === 'function' ? changes(s[col][i]) : changes) }; }), [update]);
  const remove = useCallback((col, id) => update((s) => { s[col] = s[col].filter((x) => x.id !== id); }), [update]);

  const login = async (username, password) => {
    try { const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); await refresh(); return d.user; }
    catch { return null; }
  };
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }); setUser(null); await refresh(); };
  const chittyLogin = async (code, password) => {
    try { await api('/api/chitty/login', { method: 'POST', body: JSON.stringify({ code, password }) }); await refresh(); return true; }
    catch { return false; }
  };
  const chittyLogout = async () => { await api('/api/chitty/logout', { method: 'POST' }); setChittyMemberId(''); await refresh(); };
  const resetDemo = async () => { await api('/api/admin/reset', { method: 'POST' }); await refresh(); };
  const importBackup = async (data) => { await api('/api/admin/import', { method: 'POST', body: JSON.stringify(data) }); await refresh(); };

  // In-page replacement for confirm()/prompt(). Resolves to true/false, or the typed text (null if cancelled).
  const ask = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, value: opts.defaultValue || '', resolve })), []);
  const closeDialog = (result) => { dialog?.resolve(result); setDialog(null); };

  return (
    <Ctx.Provider value={{ state, update, add, patch, remove, user, login, logout, toast, resetDemo, importBackup, ask, api, refresh, chittyMemberId, chittyLogin, chittyLogout }}>
      {state ? children : (
        <div className="min-h-screen grid place-items-center text-slate-500 text-sm">
          {loadError ? <div className="text-center"><div className="text-red-600 font-semibold">Could not reach the server</div><div>{loadError}</div><button className="btn-primary mt-3" onClick={refresh}>Try again</button></div> : 'Loading…'}
        </div>
      )}
      {dialog && (
        <div className="fixed inset-0 z-[90] bg-black/40 grid place-items-center p-4" onMouseDown={() => closeDialog(dialog.input ? null : false)}>
          <form className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); closeDialog(dialog.input ? dialog.value.trim() : true); }}>
            <div className="font-bold text-slate-800">{dialog.title || 'Please confirm'}</div>
            {dialog.message && <p className="text-sm text-slate-600">{dialog.message}</p>}
            {dialog.input && <input autoFocus className="input" placeholder={dialog.placeholder || ''} required={dialog.required} value={dialog.value} onChange={(e) => setDialog({ ...dialog, value: e.target.value })} />}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => closeDialog(dialog.input ? null : false)}>Cancel</button>
              <button autoFocus={!dialog.input} className={dialog.danger ? 'btn-danger' : 'btn-primary'}>{dialog.okLabel || 'OK'}</button>
            </div>
          </form>
        </div>
      )}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 print:hidden">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white ${t.type === 'error' ? 'bg-red-600' : t.type === 'info' ? 'bg-slate-800' : 'bg-brand-700'}`}>{t.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);

// Derived numbers used on the dashboard and in reports.
export const useStats = () => {
  const { state } = useApp();
  const homes = state.households.length;
  const people = state.households.reduce((a, h) => a + Number(h.members || 0), 0);
  const institutions = state.institutions.length;
  const students = state.institutions.reduce((a, i) => a + Number(i.students || 0), 0);
  const income = state.transactions.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
  const expense = state.transactions.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);
  return { homes, people, institutions, students, income, expense, balance: income - expense };
};
