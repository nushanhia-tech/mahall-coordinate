import { useState } from 'react';
import { Menu, X, LogOut, ChevronDown, Moon, Sparkles } from 'lucide-react';
import { openQuickFind } from './QuickFind';
import { featureOn } from '../utils/features';
import { useApp } from '../store/AppContext';
import { navigate } from '../router';

export const portalPath = (u) => (!u ? '/login' : u.role === 'admin' ? '/admin' : u.role === 'khateeb' ? '/khateeb' : u.role === 'institution' ? '/institution' : '/portal');

const ALL_GROUPS = [
  { label: 'Services', items: [['Rental Cart', '/services/rental', 'rental'], ['Chitty Money', '/services/chitty', 'chitty'], ['Live Auction (Lelam)', '/services/auction', 'auction']] },
  { label: 'Apply', items: [['Nikkah Application', '/apply/nikkah', 'nikkah'], ['New Home Number', '/apply/home', 'homeApplication'], ['Enquiry & Mediation', '/mediation', 'mediation']] },
];

// A small crescent-and-dome mark used as the logo.
export const Logo = ({ size = 40, src = '' }) => (src
  ? <img src={src} alt="Masjid logo" className="rounded-2xl object-cover bg-white shadow-soft shrink-0 ring-1 ring-sand-200" style={{ width: size, height: size }} />
  : <span className="relative grid place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-gold-300 shadow-glow shrink-0" style={{ width: size, height: size }}>
    <Moon size={size * 0.48} fill="currentColor" strokeWidth={1.5} />
    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gold-400 ring-2 ring-sand-100" />
  </span>
);

export default function Navbar({ path }) {
  const { state, user, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState('');
  const go = (p) => { navigate(p); setOpen(false); setDrop(''); };
  const link = (label, p) => (
    <button key={p} onClick={() => go(p)} className={`px-3.5 py-2 rounded-full text-sm font-semibold transition ${path === p ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900 hover:bg-white'}`}>{label}</button>
  );
  const on = (k) => featureOn(state.config, k);
  const groups = ALL_GROUPS.map((g) => ({ ...g, items: g.items.filter(([, , k]) => on(k)) })).filter((g) => g.items.length);
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-40 print:hidden">
      <div className="bg-sand-100/80 backdrop-blur-xl border-b border-sand-200/80">
        <div className="max-w-7xl mx-auto px-4 h-[68px] flex items-center justify-between gap-3">
          <button onClick={() => go('/')} className="flex items-center gap-3 min-w-0">
            <Logo src={state.masjid.logo} />
            <div className="text-left leading-tight min-w-0">
              <div className="font-display font-semibold text-[17px] text-ink-900 truncate">{state.masjid.name}</div>
              <div className="text-[10px] uppercase tracking-[.2em] text-ink-400 font-semibold">Mahall community</div>
            </div>
          </button>
          <nav className="hidden lg:flex items-center gap-1">
            {link('Home', '/')}
            {groups.map((g) => (
              <div key={g.label} className="relative" onMouseLeave={() => setDrop('')}>
                <button onMouseEnter={() => setDrop(g.label)} onClick={() => setDrop(drop === g.label ? '' : g.label)} className="px-3.5 py-2 rounded-full text-sm font-semibold text-ink-600 hover:text-ink-900 hover:bg-white flex items-center gap-1">{g.label} <ChevronDown size={14} className={`transition ${drop === g.label ? 'rotate-180' : ''}`} /></button>
                {drop === g.label && (
                  <div className="absolute right-0 pt-2 w-60">
                    <div className="bg-white rounded-3xl shadow-lift border border-sand-200 p-2 animate-fade-up">
                      {g.items.map(([l, p]) => <button key={p} onClick={() => go(p)} className="block w-full text-left px-4 py-2.5 rounded-2xl text-sm font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-700">{l}</button>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {link('Courses', '/courses')}
            {on('opportunitiesPage') && link('Opportunities', '/opportunities')}
          </nav>
          <div className="flex items-center gap-2">
            {on('quickFind') && <button onClick={openQuickFind} className="hidden md:flex items-center gap-2 h-10 pl-3 pr-2 rounded-full bg-white border border-sand-300 text-ink-400 text-sm hover:border-brand-300 hover:text-ink-600 transition" title="Quick find (Ctrl + K)">
              <Sparkles size={15} className="text-gold-500" /><span className="hidden xl:inline">Ask or find…</span>
              <kbd className="text-[10px] font-semibold border border-sand-300 rounded-md px-1.5 py-0.5">Ctrl K</kbd>
            </button>}
            {on('quickFind') && <button onClick={openQuickFind} className="md:hidden w-10 h-10 grid place-items-center rounded-full bg-white border border-sand-300 text-gold-500" aria-label="Quick find"><Sparkles size={17} /></button>}
            {user ? (
              <>
                <button onClick={() => go(portalPath(user))} className="hidden sm:flex items-center gap-2 h-10 pl-1 pr-4 rounded-full bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800 transition">
                  <span className="w-8 h-8 rounded-full bg-gold-400 text-ink-900 grid place-items-center text-xs font-extrabold">{initials}</span>My portal
                </button>
                <button onClick={async () => { await logout(); go('/'); }} className="hidden sm:grid w-10 h-10 place-items-center rounded-full text-ink-500 hover:bg-white hover:text-clay-600" title="Log out"><LogOut size={17} /></button>
              </>
            ) : (
              <button onClick={() => go('/login')} className="hidden sm:inline-flex btn-primary">Log in</button>
            )}
            <button className="lg:hidden w-10 h-10 grid place-items-center rounded-full bg-white border border-sand-300 text-ink-700" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X size={18} /> : <Menu size={18} />}</button>
          </div>
        </div>
      </div>
      {open && (
        <div className="lg:hidden absolute inset-x-3 top-[76px] bg-white rounded-4xl shadow-lift border border-sand-200 p-3 space-y-1 animate-fade-up">
          {[['Home', '/'], ...groups.flatMap((g) => g.items), ['Courses', '/courses'], ...(on('opportunitiesPage') ? [['Opportunities', '/opportunities']] : [])].map(([l, p]) => (
            <button key={p} onClick={() => go(p)} className={`block w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold ${path === p ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-sand-100'}`}>{l}</button>
          ))}
          <div className="pt-2 grid grid-cols-2 gap-2">
            {user ? (
              <>
                <button onClick={() => go(portalPath(user))} className="btn-primary">My portal</button>
                <button onClick={async () => { await logout(); go('/'); }} className="btn-outline">Log out</button>
              </>
            ) : <button onClick={() => go('/login')} className="btn-primary col-span-2">Log in</button>}
          </div>
        </div>
      )}
    </header>
  );
}
