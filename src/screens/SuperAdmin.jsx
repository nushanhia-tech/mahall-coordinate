'use client';
import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Plus, ExternalLink, Pause, Play, Trash2, Pencil, LogOut, KeyRound } from 'lucide-react';

const call = async (url, method = 'GET', body) => {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), { status: res.status });
  return data;
};
const toSlug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function Dialog({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onMouseDown={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-3" onMouseDown={(e) => e.stopPropagation()}>
        <div className="font-bold text-slate-800">{title}</div>
        {children}
      </div>
    </div>
  );
}

// Site owner page: add masjids, give each one an admin, rename, pause or delete them.
export default function SuperAdmin() {
  const [me, setMe] = useState(undefined);
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState(null);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [pw, setPw] = useState(null);
  const [login, setLogin] = useState({ username: '', password: '' });

  const say = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg(null), 5000); };
  const load = useCallback(() => call('/api/super/masjids').then((d) => setList(d.masjids)).catch((e) => { if (e.status === 401) setMe(null); else say(e.message, true); }), []);
  useEffect(() => { call('/api/super/me').then((d) => setMe(d.username)).catch(() => setMe(null)); }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  const run = async (fn, ok) => { try { await fn(); if (ok) say(ok); await load(); return true; } catch (e) { say(e.message, true); return false; } };

  if (me === undefined) return <div className="p-10 text-slate-400">Loading…</div>;
  if (!me) {
    return (
      <div className="min-h-screen grid place-items-center p-4 bg-slate-50">
        <form className="card w-full max-w-sm space-y-3" onSubmit={async (e) => { e.preventDefault(); try { const d = await call('/api/super/login', 'POST', login); setMe(d.username); } catch (err) { say(err.message, true); } }}>
          <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="text-brand-600" />Site admin</h1>
          <p className="text-xs text-slate-500">For the owner of this website, to add and manage masjids. Masjid admins log in on their own masjid's page.</p>
          <input className="input" placeholder="Username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} required />
          <input className="input" type="password" placeholder="Password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} required />
          {msg && <div className={`text-sm ${msg.error ? 'text-red-600' : 'text-brand-700'}`}>{msg.text}</div>}
          <button className="btn-primary w-full">Log in</button>
          <a href="/" className="block text-center text-xs text-slate-500">← All masjids</a>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-800 text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold flex items-center gap-2"><ShieldCheck size={18} />Site admin · {me}</div>
          <div className="flex gap-2">
            <a href="/" className="btn bg-white/10 text-white btn-sm">All masjids</a>
            <button className="btn bg-white/10 text-white btn-sm" onClick={() => setPw({ current: '', next: '' })}><KeyRound size={13} />Password</button>
            <button className="btn bg-white/10 text-white btn-sm" onClick={async () => { await call('/api/super/logout', 'POST'); setMe(null); }}><LogOut size={13} />Log out</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <div className="flex justify-between items-end">
          <div><h1 className="text-2xl font-bold text-slate-800">Masjids on this site</h1><p className="text-sm text-slate-500">Each masjid has its own address, admins and data.</p></div>
          <button className="btn-primary" onClick={() => setForm({ name: '', slug: '', adminName: '', adminUsername: 'admin', adminPassword: '', slugTouched: false })}><Plus size={16} />Add masjid</button>
        </div>
        {msg && <div className={`card py-3 text-sm ${msg.error ? 'text-red-600' : 'text-brand-700'}`}>{msg.text}</div>}
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Masjid</th><th>Web address</th><th>Homes</th><th>Users</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td className="font-semibold">{m.name}{m.address && <div className="text-xs text-slate-500 font-normal">{m.address}</div>}</td>
                  <td><a className="text-brand-700 font-mono text-xs flex items-center gap-1" href={`/${m.slug}`} target="_blank" rel="noreferrer">/{m.slug}<ExternalLink size={11} /></a></td>
                  <td>{m.homes}</td>
                  <td>{m.users}</td>
                  <td>{m.active ? <span className="badge bg-green-100 text-green-800">Active</span> : <span className="badge bg-amber-100 text-amber-800">Paused</span>}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn-outline btn-sm mr-1" onClick={() => setEdit({ id: m.id, name: m.name, slug: m.slug })}><Pencil size={12} />Edit</button>
                    <button className="btn-outline btn-sm mr-1" onClick={() => run(() => call('/api/super/masjids', 'PATCH', { id: m.id, active: !m.active }), m.active ? `${m.name} paused – its website is now closed` : `${m.name} is open again`)}>{m.active ? <><Pause size={12} />Pause</> : <><Play size={12} />Resume</>}</button>
                    <button className="btn-danger btn-sm" onClick={() => setDel({ ...m, confirm: '' })}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <div className="p-6 text-sm text-slate-400">No masjids yet.</div>}
        </div>
        <p className="text-xs text-slate-400">Pausing closes a masjid's website without deleting anything. Deleting removes the masjid and all of its data for ever.</p>
      </main>

      {form && (
        <Dialog title="Add a masjid" onClose={() => setForm(null)}>
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => call('/api/super/masjids', 'POST', form), `${form.name} added. Its admin can now log in at /${form.slug}/login`)) setForm(null); }}>
            <label className="block"><span className="label">Masjid name *</span><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slugTouched ? form.slug : toSlug(e.target.value) })} /></label>
            <label className="block"><span className="label">Web address *</span>
              <div className="flex items-center gap-1 text-sm"><span className="text-slate-400">yoursite/</span><input className="input" required value={form.slug} onChange={(e) => setForm({ ...form, slug: toSlug(e.target.value), slugTouched: true })} /></div>
              <span className="text-[11px] text-slate-400">Small letters, numbers and dashes, e.g. salafi-masjid-tirur</span></label>
            <div className="border-t pt-3 text-xs font-semibold text-slate-600">First admin of this masjid</div>
            <label className="block"><span className="label">Admin's name</span><input className="input" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className="label">Username *</span><input className="input" required value={form.adminUsername} onChange={(e) => setForm({ ...form, adminUsername: e.target.value })} /></label>
              <label className="block"><span className="label">Password * (6+)</span><input className="input" required minLength={6} value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} /></label>
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary">Add masjid</button></div>
          </form>
        </Dialog>
      )}
      {edit && (
        <Dialog title="Edit masjid" onClose={() => setEdit(null)}>
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => call('/api/super/masjids', 'PATCH', edit), 'Saved')) setEdit(null); }}>
            <label className="block"><span className="label">Name</span><input className="input" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label className="block"><span className="label">Web address</span><input className="input" required value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: toSlug(e.target.value) })} /><span className="text-[11px] text-amber-700">Changing the address breaks old links and bookmarks.</span></label>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        </Dialog>
      )}
      {del && (
        <Dialog title={`Delete ${del.name}?`} onClose={() => setDel(null)}>
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => call('/api/super/masjids', 'DELETE', { id: del.id, confirm: del.confirm }), `${del.name} deleted`)) setDel(null); }}>
            <p className="text-sm text-slate-600">This permanently deletes the masjid and <b>all of its data</b>: {del.homes} homes, {del.users} users, all finance, donations and services. It cannot be undone.</p>
            <label className="block"><span className="label">Type <b className="font-mono">{del.slug}</b> to confirm</span><input className="input" value={del.confirm} onChange={(e) => setDel({ ...del, confirm: e.target.value })} /></label>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setDel(null)}>Cancel</button><button className="btn-danger" disabled={del.confirm !== del.slug}>Delete for ever</button></div>
          </form>
        </Dialog>
      )}
      {pw && (
        <Dialog title="Change site admin password" onClose={() => setPw(null)}>
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await call('/api/super/password', 'POST', pw); say('Password changed'); setPw(null); } catch (err) { say(err.message, true); } }}>
            <input className="input" type="password" placeholder="Current password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            <input className="input" type="password" placeholder="New password (8+ characters)" minLength={8} required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            {msg?.error && <div className="text-sm text-red-600">{msg.text}</div>}
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setPw(null)}>Cancel</button><button className="btn-primary">Change</button></div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
