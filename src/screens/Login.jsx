import { useState } from 'react';
import { LogIn, ShieldCheck, User, BookOpen, Building2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { navigate } from '../router';
import { portalPath } from '../components/Navbar';
import { useMasjidSlug } from '../router';

const demos = [
  { role: 'Admin', icon: ShieldCheck, username: 'admin', password: 'admin123' },
  { role: 'Individual', icon: User, username: 'member', password: 'member123' },
  { role: 'Khateeb', icon: BookOpen, username: 'khateeb', password: 'khateeb123' },
  { role: 'Institution', icon: Building2, username: 'madrasa', password: 'inst123' },
];

export default function Login() {
  const { login, toast } = useApp();
  const isDemo = useMasjidSlug() === 'juma-masjid';
  const [form, setForm] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const u = await login(form.username, form.password);
    if (!u) return setErr('Wrong username or password.');
    toast(`Welcome, ${u.name}`);
    const back = sessionStorage.getItem('mahall-after-login');
    sessionStorage.removeItem('mahall-after-login');
    navigate(back || portalPath(u));
  };

  return (
    <div className={`max-w-4xl mx-auto px-4 py-12 grid gap-6 ${isDemo ? 'md:grid-cols-2' : 'max-w-md'}`}>
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><LogIn className="text-brand-600" /> Portal Login</h1>
        <p className="text-sm text-slate-500">Admins, members, the Khateeb and institutions each get their own portal.</p>
        <div><span className="label">Username</span><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus /></div>
        <div><span className="label">Password</span><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="btn-primary w-full">Log in</button>
      </form>
      {isDemo && (
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-1">Demo accounts</h2>
        <p className="text-xs text-slate-500 mb-4">Click one to fill the form.</p>
        <div className="space-y-2">
          {demos.map((d) => (
            <button key={d.role} type="button" onClick={() => { setForm({ username: d.username, password: d.password }); setErr(''); }} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-brand-500 hover:bg-brand-50 text-left">
              <d.icon className="text-brand-600" size={20} />
              <div className="flex-1"><div className="font-semibold text-sm">{d.role}</div><div className="text-xs text-slate-500 font-mono">{d.username} / {d.password}</div></div>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4">Chitty members log in separately on the Chitty page (demo: C-001 / chitty123).</p>
      </div>
      )}
    </div>
  );
}
