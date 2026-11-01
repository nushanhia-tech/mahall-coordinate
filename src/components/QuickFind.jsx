'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles, CornerDownLeft, Home, ShoppingCart, Coins, Gavel, FileHeart, HomeIcon, MessageCircle, BookOpen, Briefcase, HeartHandshake, LayoutDashboard, Users, Wallet, CalendarDays, MapPin, Settings, GraduationCap, Phone, LogIn } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { navigate } from '../router';
import { portalPath } from './Navbar';
import { fmtDate } from '../utils/format';
import { featureOn } from '../utils/features';

export const openQuickFind = () => window.dispatchEvent(new Event('open-quick-find'));

const PAGES = [
  ['Home', '/', Home, 'dashboard start welcome'],
  ['Donate', '/#donate', HeartHandshake, 'give zakat sadaqa upi qr bank relief nercha receipt', 'homeDonate'],
  ['Rental cart', '/services/rental', ShoppingCart, 'hire chairs tent sound booking advance', 'rental'],
  ['Chitty money', '/services/chitty', Coins, 'kuri savings monthly instalment', 'chitty'],
  ['Live auction (Lelam)', '/services/auction', Gavel, 'bid lelam nercha', 'auction'],
  ['Nikkah application', '/apply/nikkah', FileHeart, 'marriage wedding certificate waliyy witness', 'nikkah'],
  ['New home number', '/apply/home', HomeIcon, 'register house family gps', 'homeApplication'],
  ['Enquiry & mediation', '/mediation', MessageCircle, 'complaint doubt query problem dispute talk committee khateeb message', 'mediation'],
  ['Courses & institutions', '/courses', BookOpen, 'madrasa class study admission'],
  ['Opportunities', '/opportunities', Briefcase, 'job scholarship service', 'opportunitiesPage'],
  ['My monthly Vari', '/portal', Coins, 'subscription monthly dues home payment', 'vari'],
];
const ADMIN = [
  ['overview', 'Admin overview', LayoutDashboard, 'dashboard tasks'],
  ['households', 'Households', Users, 'homes families members register'],
  ['accounts', 'Accounts & reports', Wallet, 'income expense ledger pdf balance'],
  ['donations', 'Donation requests', HeartHandshake, 'approve verify'],
  ['events', 'Events & achievements', CalendarDays, 'programme calendar'],
  ['users', 'Manage portals', Users, 'users passwords logins'],
  ['location', 'Location & committee', MapPin, 'address map helpdesk'],
  ['rental', 'Rental cart (admin)', ShoppingCart, 'returns penalty bill'],
  ['chitty', 'Chitty (admin)', Coins, 'payments confirm'],
  ['auction', 'Auction (admin)', Gavel, 'bids end'],
  ['mediation', 'Mediation inbox', MessageCircle, 'chat reply'],
  ['nikkah', 'Nikkah applications', FileHeart, 'approve'],
  ['homeapps', 'New home applications', HomeIcon, 'approve'],
  ['community', 'Courses & opportunities (admin)', GraduationCap, 'institutions'],
  ['vari', 'Monthly Vari', Coins, 'subscription home monthly dues cash collection'],
  ['reports', 'Institution reports', BookOpen, 'financial statement audit madrasa'],
  ['features', 'Features & visibility', Settings, 'switch toggle hide show on off rules'],
  ['settings', 'Data & settings', Settings, 'backup erase restore'],
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Peaceful night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function QuickFind() {
  const { state, user } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); setOpen(true); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-quick-find', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-quick-find', onOpen); };
  }, []);
  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  // Things that need attention, phrased like a helpful assistant.
  const suggestions = useMemo(() => {
    const out = [];
    if (isAdmin) {
      const n = (arr, f) => arr.filter(f).length;
      const items = [
        [n(state.donations, (d) => d.status === 'pending'), 'donation{s} waiting for your approval', '/admin/donations', HeartHandshake],
        [n(state.chittyPayments, (p) => p.status === 'pending'), 'chitty payment{s} to confirm', '/admin/chitty', Coins],
        [n(state.nikkahApps, (a) => a.status === 'pending'), 'Nikkah application{s} to review', '/admin/nikkah', FileHeart],
        [n(state.homeApps, (a) => a.status === 'pending'), 'new home request{s} to review', '/admin/homeapps', HomeIcon],
        [state.chats.reduce((a, c) => a + c.messages.filter((m) => m.from === 'member' && !m.read).length, 0), 'unread mediation message{s}', '/admin/mediation', MessageCircle],
        [n(state.rentals, (r) => r.status === 'active' && new Date(r.due) < new Date()), 'overdue rental{s} to collect', '/admin/rental', ShoppingCart],
        [n(state.variPayments, (p) => p.status === 'pending'), 'Vari payment{s} to confirm', '/admin/vari', Coins],
        [n(state.institutionReports, (r) => r.status === 'submitted'), 'institution report{s} to review', '/admin/reports', BookOpen],
      ];
      for (const [count, text, to, icon] of items) if (count) out.push({ label: `${count} ${text.replace('{s}', count === 1 ? '' : 's')}`, to, icon, hint: 'Needs attention' });
      if (!out.length) out.push({ label: 'All caught up – nothing is waiting for you', to: '/admin', icon: Sparkles, hint: 'Overview' });
    }
    const today = new Date().toISOString().slice(0, 10);
    const next = [...state.events].filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (next) out.push({ label: `Next event: ${next.title}`, sub: `${fmtDate(next.date)}${next.venue ? ` · ${next.venue}` : ''}`, to: '/', icon: CalendarDays, hint: 'Upcoming' });
    if (!user) out.push({ label: 'Log in to your portal', to: '/login', icon: LogIn, hint: 'Members' });
    else out.push({ label: 'Open my portal', to: portalPath(user), icon: LayoutDashboard, hint: 'You' });
    return out;
  }, [state, user, isAdmin]);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return suggestions;
    const match = (text) => words.every((w) => text.toLowerCase().includes(w));
    const out = [];
    for (const [label, to, icon, kw, key] of PAGES) if ((!key || featureOn(state.config, key)) && match(`${label} ${kw}`)) out.push({ label, to, icon, hint: 'Page' });
    if (isAdmin) for (const [id, label, icon, kw] of ADMIN) if (match(`${label} ${kw} admin`)) out.push({ label, to: `/admin/${id}`, icon, hint: 'Admin' });
    if (isAdmin) for (const h of state.households) if (match(`${h.homeNo} ${h.headName} ${h.phone} ${h.ward} ${h.address}`)) out.push({ label: `${h.homeNo} · ${h.headName}`, sub: `${h.members} members · ${h.ward || ''} ${h.phone ? `· ${h.phone}` : ''}`, to: '/admin/households', icon: Home, hint: 'Household' });
    for (const e of state.events) if (match(`${e.title} ${e.venue} event`)) out.push({ label: e.title, sub: `${fmtDate(e.date)} · ${e.venue || ''}`, to: '/', icon: CalendarDays, hint: 'Event' });
    for (const c of state.courses) if (match(`${c.title} course`)) out.push({ label: c.title, sub: c.duration, to: '/courses', icon: BookOpen, hint: 'Course' });
    for (const o of state.opportunities) if (match(`${o.title} ${o.type}`)) out.push({ label: o.title, sub: o.type, to: '/opportunities', icon: Briefcase, hint: 'Opportunity' });
    for (const c of [...state.committee, ...state.helpdesk]) if (match(`${c.name} ${c.role || c.service || ''} contact phone`)) out.push({ label: `${c.name} – ${c.phone}`, sub: c.role || c.service, to: '/#contacts', icon: Phone, hint: 'Contact' });
    return out.slice(0, 12);
  }, [q, suggestions, state, isAdmin]);

  const go = (r) => {
    setOpen(false);
    const [path, hash] = r.to.split('#');
    navigate(path || '/');
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 80);
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && results[sel]) go(results[sel]);
    else if (e.key === 'Escape') setOpen(false);
  };

  if (!open || !featureOn(state.config, 'quickFind')) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-ink-900/30 backdrop-blur-sm flex items-start justify-center p-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-xl rounded-4xl bg-white shadow-lift ring-glow overflow-hidden animate-fade-up" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-sand-200">
          <Sparkles size={18} className="text-gold-500 shrink-0" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKeyDown}
            placeholder="Find a page, household, event or person…" className="flex-1 bg-transparent outline-none ring-0 text-[15px] placeholder:text-ink-400" />
          <kbd className="hidden sm:block text-[10px] font-semibold text-ink-400 border border-sand-300 rounded-md px-1.5 py-0.5">Esc</kbd>
        </div>
        {!q && (
          <div className="px-5 pt-4 pb-1 text-sm text-ink-600">
            <span className="font-display text-lg text-ink-900">{greeting()}{user ? `, ${user.name.split(' ')[0]}` : ''}.</span>{' '}
            {isAdmin ? 'Here is what needs you today:' : 'How can I help you?'}
          </div>
        )}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {results.map((r, i) => {
            const Icon = r.icon || Search;
            return (
              <button key={`${r.label}-${i}`} onMouseEnter={() => setSel(i)} onClick={() => go(r)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition ${i === sel ? 'bg-brand-50' : ''}`}>
                <span className={`w-9 h-9 shrink-0 rounded-xl grid place-items-center ${i === sel ? 'bg-brand-600 text-white' : 'bg-sand-100 text-ink-500'}`}><Icon size={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-ink-800 truncate">{r.label}</span>
                  {r.sub && <span className="block text-xs text-ink-400 truncate">{r.sub}</span>}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{r.hint}</span>
                {i === sel && <CornerDownLeft size={14} className="text-brand-600" />}
              </button>
            );
          })}
          {!results.length && <div className="px-4 py-8 text-center text-sm text-ink-400">Nothing found for “{q}”. Try another word.</div>}
        </div>
        <div className="px-5 py-2.5 border-t border-sand-200 text-[11px] text-ink-400 flex gap-4"><span>↑↓ move</span><span>Enter open</span><span className="ml-auto">Ctrl + K anywhere</span></div>
      </div>
    </div>
  );
}
