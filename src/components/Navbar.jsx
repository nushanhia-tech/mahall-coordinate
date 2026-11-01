import { useState } from 'react';
import { Menu, X, LogOut, LayoutDashboard, ChevronDown, Moon } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { navigate } from '../router';

export const portalPath = (u) => (!u ? '/login' : u.role === 'admin' ? '/admin' : u.role === 'khateeb' ? '/khateeb' : u.role === 'institution' ? '/institution' : '/portal');

const groups = [
  { label: 'Services', items: [['Rental Cart', '/services/rental'], ['Chitty Money', '/services/chitty'], ['Live Auction (Lelam)', '/services/auction']] },
  { label: 'Apply', items: [['Nikkah Application', '/apply/nikkah'], ['New Home Number', '/apply/home'], ['Mediation Chat', '/mediation']] },
];

export default function Navbar({ path }) {
  const { state, user, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState('');
  const go = (p) => { navigate(p); setOpen(false); setDrop(''); };
  const link = (label, p) => (
    <button key={p} onClick={() => go(p)} className={`px-3 py-2 rounded-lg text-sm font-medium ${path === p ? 'bg-white/15 text-white' : 'text-brand-50 hover:bg-white/10'}`}>{label}</button>
  );

  return (
    <header className="bg-brand-800 text-white sticky top-0 z-40 shadow print:hidden">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => go('/')} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gold-400 text-brand-900 grid place-items-center"><Moon size={18} fill="currentColor" /></div>
          <div className="text-left leading-tight">
            <div className="font-bold">{state.masjid.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-brand-100">Mahall Coordinating System</div>
          </div>
        </button>
        <nav className="hidden lg:flex items-center gap-1">
          {link('Home', '/')}
          {groups.map((g) => (
            <div key={g.label} className="relative" onMouseLeave={() => setDrop('')}>
              <button onMouseEnter={() => setDrop(g.label)} onClick={() => setDrop(drop === g.label ? '' : g.label)} className="px-3 py-2 rounded-lg text-sm font-medium text-brand-50 hover:bg-white/10 flex items-center gap-1">{g.label} <ChevronDown size={14} /></button>
              {drop === g.label && (
                <div className="absolute right-0 pt-1 w-56">
                  <div className="bg-white text-slate-700 rounded-lg shadow-lg py-1">
                    {g.items.map(([l, p]) => <button key={p} onClick={() => go(p)} className="block w-full text-left px-4 py-2 text-sm hover:bg-brand-50">{l}</button>)}
                  </div>
                </div>
              )}
            </div>
          ))}
          {link('Courses', '/courses')}
          {link('Opportunities', '/opportunities')}
          {user ? (
            <>
              <button onClick={() => go(portalPath(user))} className="ml-2 btn bg-gold-400 text-brand-900 hover:bg-gold-500"><LayoutDashboard size={16} /> My Portal</button>
              <button onClick={async () => { await logout(); go('/'); }} className="p-2 rounded-lg hover:bg-white/10" title="Log out"><LogOut size={18} /></button>
            </>
          ) : (
            <button onClick={() => go('/login')} className="ml-2 btn bg-gold-400 text-brand-900 hover:bg-gold-500">Login</button>
          )}
        </nav>
        <button className="lg:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="lg:hidden bg-brand-900 px-4 pb-4 space-y-1">
          {[['Home', '/'], ...groups.flatMap((g) => g.items), ['Courses', '/courses'], ['Opportunities', '/opportunities']].map(([l, p]) => (
            <button key={p} onClick={() => go(p)} className="block w-full text-left px-3 py-2 rounded hover:bg-white/10 text-sm">{l}</button>
          ))}
          {user ? (
            <>
              <button onClick={() => go(portalPath(user))} className="block w-full text-left px-3 py-2 rounded bg-gold-400 text-brand-900 text-sm font-semibold">My Portal</button>
              <button onClick={async () => { await logout(); go('/'); }} className="block w-full text-left px-3 py-2 text-sm">Log out</button>
            </>
          ) : <button onClick={() => go('/login')} className="block w-full text-left px-3 py-2 rounded bg-gold-400 text-brand-900 text-sm font-semibold">Login</button>}
        </div>
      )}
    </header>
  );
}
