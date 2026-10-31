import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { seed, seedChittyPayments } from './seed';
import { uid } from '../utils/format';

const KEY = 'mahall-state-v1';
const SESSION_KEY = 'mahall-session';
const Ctx = createContext(null);

const freshState = () => {
  const s = seed();
  s.chittyPayments = seedChittyPayments(s);
  return s;
};

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw) };
  } catch { /* fall through to seed */ }
  return freshState();
};

export function AppProvider({ children }) {
  const [state, setState] = useState(load);
  const [userId, setUserId] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const skipSave = useRef(false);

  const toast = useCallback((msg, type = 'success') => {
    const id = uid('t');
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // Persist and broadcast to other tabs.
  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return; }
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      toast('Storage is full – try smaller images', 'error');
    }
  }, [state, toast]);

  // Pick up changes from other tabs (live auction bids, chat, etc.).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY && e.newValue) {
        skipSave.current = true;
        setState(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // In-page replacement for confirm()/prompt(). Resolves to true/false, or the typed text (null if cancelled).
  const ask = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, value: opts.defaultValue || '', resolve })), []);
  const closeDialog = (result) => { dialog?.resolve(result); setDialog(null); };

  const update = useCallback((fn) => setState((s) => { const n = structuredClone(s); fn(n); return n; }), []);
  const add = useCallback((col, item) => { const id = item.id || uid(col.slice(0, 3)); update((s) => { s[col].push({ ...item, id }); }); return id; }, [update]);
  const patch = useCallback((col, id, changes) => update((s) => { const i = s[col].findIndex((x) => x.id === id); if (i >= 0) s[col][i] = { ...s[col][i], ...(typeof changes === 'function' ? changes(s[col][i]) : changes) }; }), [update]);
  const remove = useCallback((col, id) => update((s) => { s[col] = s[col].filter((x) => x.id !== id); }), [update]);

  const user = state.users.find((u) => u.id === userId) || null;
  const login = (username, password) => {
    const u = state.users.find((x) => x.username === username.trim() && x.password === password);
    if (!u) return null;
    sessionStorage.setItem(SESSION_KEY, u.id);
    setUserId(u.id);
    return u;
  };
  const logout = () => { sessionStorage.removeItem(SESSION_KEY); setUserId(''); };
  const resetDemo = () => { const s = freshState(); setState(s); };

  return (
    <Ctx.Provider value={{ state, update, add, patch, remove, user, login, logout, toast, resetDemo, ask }}>
      {children}
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
