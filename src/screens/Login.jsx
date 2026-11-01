import { useState } from 'react';
import { ShieldCheck, User, BookOpen, Building2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { navigate, useMasjidSlug } from '../router';
import { portalPath, Logo } from '../components/Navbar';

const demos = [
  { role: 'Admin', icon: ShieldCheck, username: 'admin', password: 'admin123' },
  { role: 'Member', icon: User, username: 'member', password: 'member123' },
  { role: 'Khateeb', icon: BookOpen, username: 'khateeb', password: 'khateeb123' },
  { role: 'Institution', icon: Building2, username: 'madrasa', password: 'inst123' },
];

export default function Login() {
  const { login, toast, state } = useApp();
  const isDemo = useMasjidSlug() === 'juma-masjid';
  const [form, setForm] = useState({ username: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const u = await login(form.username, form.password);
    setBusy(false);
    if (!u) return setErr("That username and password don't match. Please try again.");
    toast(`Welcome back, ${u.name.split(' ')[0]}`);
    const back = sessionStorage.getItem('mahall-after-login');
    sessionStorage.removeItem('mahall-after-login');
    navigate(back || portalPath(u));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
      <div className="grid md:grid-cols-2 rounded-4xl overflow-hidden shadow-lift border border-sand-200 bg-white animate-fade-up">
        <div className="relative bg-brand-900 text-white p-8 md:p-10 overflow-hidden">
          <div className="absolute inset-0 pattern-stars" />
          <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-brand-500/40 blur-3xl" />
          <div className="absolute -top-20 right-0 w-64 h-64 rounded-full bg-gold-400/25 blur-3xl" />
          <div className="relative flex flex-col h-full">
            <Logo size={52} />
            <h1 className="font-display text-3xl md:text-4xl font-semibold mt-8 leading-tight">Welcome home.</h1>
            <p className="text-brand-100 mt-3 leading-relaxed">Log in to {state.masjid.name} to see your family's details, apply for services and stay close to your community.</p>
            <div className="mt-auto pt-10 text-sm text-brand-200 italic font-display">“Hold firmly to the rope of Allah all together.”</div>
          </div>
        </div>
        <div className="p-8 md:p-10">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <div className="eyebrow">Your portal</div>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mt-1">Log in</h2>
              <p className="text-sm text-ink-500 mt-1">Admins, members, the Khateeb and institutions all log in here.</p>
            </div>
            <div><span className="label">Username</span><input className="input" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus /></div>
            <div>
              <span className="label">Password</span>
              <div className="relative">
                <input className="input pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-700" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            {err && <div className="text-sm text-clay-600 bg-clay-50 rounded-2xl px-4 py-2.5">{err}</div>}
            <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Checking…' : <>Log in <ArrowRight size={16} /></>}</button>
            <p className="text-xs text-ink-400 text-center">Forgot your password? Ask your masjid admin to reset it.</p>
          </form>
          {isDemo && (
            <div className="mt-8 pt-6 border-t border-sand-200">
              <div className="text-xs font-bold text-ink-500 mb-3">Try a demo account</div>
              <div className="grid grid-cols-2 gap-2">
                {demos.map((d) => (
                  <button key={d.role} type="button" onClick={() => { setForm({ username: d.username, password: d.password }); setErr(''); }} className="flex items-center gap-2.5 p-3 rounded-2xl border border-sand-200 hover:border-brand-300 hover:bg-brand-50 text-left transition">
                    <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0"><d.icon size={15} /></span>
                    <span className="min-w-0"><span className="block text-sm font-semibold">{d.role}</span><span className="block text-[11px] text-ink-400 font-mono truncate">{d.username}</span></span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink-400 mt-3">Chitty members log in on the Chitty page (C-001 / chitty123).</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
