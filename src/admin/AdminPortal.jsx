import { useState } from 'react';
import { LayoutDashboard, Home, Wallet, HeartHandshake, CalendarDays, Users, MapPin, ShoppingCart, Coins, Gavel, MessageCircle, FileHeart, HomeIcon, GraduationCap, Settings } from 'lucide-react';
import { useApp, useStats } from '../store/AppContext';
import { navigate } from '../router';
import { StatCard } from '../components/ui';
import { inr, fmtDateTime } from '../utils/format';
import { saveFile } from '../utils/download';
import Households from './Households';
import Accounts from './Accounts';
import Donations from './Donations';
import EventsAdmin from './EventsAdmin';
import UsersAdmin from './UsersAdmin';
import LocationAdmin from './LocationAdmin';
import CommunityAdmin from './CommunityAdmin';
import { RentalAdmin } from '../services/Rental';
import { ChittyAdmin } from '../services/Chitty';
import { AuctionAdmin } from '../services/Auction';
import { MediationAdmin } from '../modules/Mediation';
import { NikkahAdmin } from '../modules/Nikkah';
import { HomeAppsAdmin } from '../modules/HomeApply';

function Overview() {
  const { state } = useApp();
  const s = useStats();
  const pend = {
    donations: state.donations.filter((d) => d.status === 'pending').length,
    chitty: state.chittyPayments.filter((p) => p.status === 'pending').length,
    nikkah: state.nikkahApps.filter((p) => p.status === 'pending').length,
    homes: state.homeApps.filter((p) => p.status === 'pending').length,
    chats: state.chats.reduce((a, c) => a + c.messages.filter((m) => m.from === 'member' && !m.read).length, 0),
    rentals: state.rentals.filter((r) => r.status === 'active' && new Date(r.due) < new Date()).length,
    courses: state.courseApplications.filter((p) => p.status === 'pending').length,
  };
  const tasks = [
    ['donations', 'Donations awaiting verification', pend.donations],
    ['chitty', 'Chitty payments to confirm', pend.chitty],
    ['nikkah', 'Nikkah applications', pend.nikkah],
    ['homeapps', 'New home applications', pend.homes],
    ['mediation', 'Unread mediation messages', pend.chats],
    ['rental', 'Overdue rentals', pend.rentals],
    ['community', 'Course applications', pend.courses],
  ];
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Home} label="Homes" value={s.homes} />
        <StatCard icon={Users} label="People" value={s.people} color="blue" />
        <StatCard icon={GraduationCap} label="Students" value={s.students} color="purple" />
        <StatCard icon={Wallet} label="Balance" value={inr(s.balance)} color="amber" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-display text-xl font-semibold mb-3">Needs your attention</h3>
          {tasks.map(([tab, label, n]) => (
            <button key={tab} onClick={() => navigate('/admin/' + tab)} className="w-full flex justify-between items-center py-2.5 px-3 rounded-2xl hover:bg-sand-100 text-sm transition">
              <span>{label}</span><span className={`badge ${n ? 'bg-clay-500 text-white' : 'bg-sand-200 text-ink-400'}`}>{n || '✓'}</span>
            </button>
          ))}
        </div>
        <div className="card">
          <h3 className="font-display text-xl font-semibold mb-3">Recent activity in the accounts</h3>
          {recent.map((t) => (
            <div key={t.id} className="flex justify-between py-1.5 text-sm border-b last:border-0">
              <span><span className="text-xs text-slate-400 mr-2">{t.date}</span>{t.description}</span>
              <span className={t.type === 'income' ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>{t.type === 'income' ? '+' : '−'}{inr(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { eraseAll, importBackup, toast, state, ask, masjidInfo } = useApp();
  const [busy, setBusy] = useState(false);
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    saveFile(`${masjidInfo?.slug || 'mahall'}-backup-${new Date().toISOString().slice(0, 10)}.json`, blob);
  };
  const importData = (file) => {
    const r = new FileReader();
    r.onload = async () => { try { await importBackup(JSON.parse(r.result)); toast('Backup restored'); } catch (e) { toast(e.message || 'Invalid backup file', 'error'); } };
    r.readAsText(file);
  };
  const erase = async () => {
    const typed = await ask({
      title: 'Erase ALL data?',
      message: 'This permanently deletes every household, transaction, donation, rental, chitty record, auction, chat, application, event, course and user (except you). Your masjid details, payment (UPI/bank) details and account heads are kept. Download a backup first if you may need it. Type ERASE to confirm.',
      input: true, required: true, placeholder: 'ERASE', danger: true, okLabel: 'Erase everything',
    });
    if (typed === null) return;
    if (typed !== 'ERASE') return toast('Nothing was deleted – you must type ERASE in capital letters.', 'error');
    setBusy(true);
    try { await eraseAll(); toast('All data erased'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card space-y-4">
        <h3 className="h2">Backup</h3>
        <p className="text-sm text-slate-500">Download a copy of all records of this masjid. Backups do not include passwords or uploaded receipts/screenshots.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={exportData}>Download backup (JSON)</button>
          <label className="btn-outline cursor-pointer">Restore backup<input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files[0] && importData(e.target.files[0])} /></label>
        </div>
      </div>
      <div className="card space-y-3 border-red-200">
        <h3 className="h2 text-red-700">Erase all data</h3>
        <p className="text-sm text-slate-600">Start fresh: removes <b>all records</b> of this masjid (households, finance, donations, services, applications, chats, events, courses and all other users). Kept: the masjid details, payment details, account heads and your own admin login.</p>
        <button className="btn-danger" disabled={busy} onClick={erase}>{busy ? 'Erasing…' : 'Erase all data'}</button>
      </div>
    </div>
  );
}

export const ADMIN_TABS = [
  ['overview', 'Overview', LayoutDashboard, Overview],
  ['households', 'Households', Home, Households],
  ['accounts', 'Accounts & Reports', Wallet, Accounts],
  ['donations', 'Donations', HeartHandshake, Donations],
  ['events', 'Events & Achievements', CalendarDays, EventsAdmin],
  ['users', 'Manage Portals', Users, UsersAdmin],
  ['location', 'Location & committee', MapPin, LocationAdmin],
  ['rental', 'Rental Cart', ShoppingCart, RentalAdmin],
  ['chitty', 'Chitty Money', Coins, ChittyAdmin],
  ['auction', 'Live Auction', Gavel, AuctionAdmin],
  ['mediation', 'Mediation Chat', MessageCircle, MediationAdmin],
  ['nikkah', 'Nikkah Applications', FileHeart, NikkahAdmin],
  ['homeapps', 'New Home Applications', HomeIcon, HomeAppsAdmin],
  ['community', 'Courses & Opportunities', GraduationCap, CommunityAdmin],
  ['settings', 'Data & Settings', Settings, SettingsTab],
];

// Sidebar groups and a short, friendly line that explains each page.
const GROUPS = [
  ['Today', ['overview']],
  ['People', ['households', 'users', 'homeapps', 'nikkah', 'mediation']],
  ['Money', ['accounts', 'donations', 'chitty']],
  ['Services', ['rental', 'auction']],
  ['Community', ['events', 'community', 'location']],
  ['System', ['settings']],
];
const INTRO = {
  overview: 'A calm look at what needs you today.',
  households: 'Every family of the Mahall in one place. Adding a home updates the counts everyone sees.',
  accounts: 'Record income and expenses, attach bills, and print clear reports for the committee.',
  donations: 'Check payment proofs and approve them – approved gifts go straight into the accounts.',
  events: 'Plan programmes. If you move an event, people see that it was rescheduled.',
  users: 'Who can log in, and what they can do.',
  location: 'Your address, map, committee and emergency contacts.',
  rental: 'Track what is out, take items back and print bills. Late fees are worked out for you.',
  chitty: 'Confirm instalments, record cash and see who still needs to pay this month.',
  auction: 'Add items, watch bids live, end auctions and share results.',
  mediation: 'Private conversations with members. Reply with care.',
  nikkah: 'Review Nikkah applications and print certificates.',
  homeapps: 'Approve new families – a household record is created for you.',
  community: 'Institutions, courses, opportunities and services.',
  settings: 'Backups, restore, and starting fresh.',
};

export default function AdminPortal({ tab }) {
  const { state, user } = useApp();
  const current = ADMIN_TABS.find((t) => t[0] === tab) || ADMIN_TABS[0];
  const Comp = current[3];
  const byId = Object.fromEntries(ADMIN_TABS.map((t) => [t[0], t]));
  const badges = {
    donations: state.donations.filter((d) => d.status === 'pending').length,
    chitty: state.chittyPayments.filter((p) => p.status === 'pending').length,
    nikkah: state.nikkahApps.filter((p) => p.status === 'pending').length,
    homeapps: state.homeApps.filter((p) => p.status === 'pending').length,
    mediation: state.chats.reduce((a, c) => a + c.messages.filter((m) => m.from === 'member' && !m.read).length, 0),
    community: state.courseApplications.filter((p) => p.status === 'pending').length,
  };
  const Item = ({ id }) => {
    const [, label, Icon] = byId[id];
    const on = current[0] === id;
    return (
      <button onClick={() => navigate("/admin/" + id)} className={`group lg:w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm whitespace-nowrap text-left transition ${on ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-sand-100 hover:text-ink-900'}`}>
        <span className={`w-8 h-8 rounded-xl grid place-items-center shrink-0 ${on ? 'bg-white/15' : 'bg-sand-100 text-ink-500 group-hover:bg-white'}`}><Icon size={15} /></span>
        <span className="flex-1 font-medium">{label}</span>
        {badges[id] ? <span className={`badge ${on ? 'bg-white text-brand-700' : 'bg-clay-500 text-white'}`}>{badges[id]}</span> : null}
      </button>
    );
  };
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 lg:py-8 flex flex-col lg:flex-row gap-6">
      <aside className="lg:w-72 shrink-0 print:hidden">
        <div className="card !p-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto scrollbar-none">
          <div className="flex items-center gap-3 px-2 pt-1 pb-3 mb-1 border-b border-sand-200">
            <span className="w-10 h-10 rounded-full bg-gold-400 text-ink-900 grid place-items-center text-sm font-extrabold">{user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
            <div className="min-w-0"><div className="text-sm font-bold truncate">{user.name}</div><div className="text-[11px] text-ink-400">Masjid admin</div></div>
          </div>
          <nav className="flex lg:flex-col gap-0.5 overflow-x-auto scrollbar-none">
            {GROUPS.map(([g, ids]) => (
              <div key={g} className="contents lg:block lg:pt-2">
                <div className="hidden lg:block px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[.18em] text-ink-400">{g}</div>
                {ids.map((id) => <Item key={id} id={id} />)}
              </div>
            ))}
          </nav>
        </div>
      </aside>
      <section className="flex-1 min-w-0">
        <div className="mb-6 animate-fade-up">
          <div className="eyebrow">Admin</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink-900 mt-1">{current[1]}</h1>
          {INTRO[current[0]] && <p className="text-ink-500 mt-2 max-w-2xl">{INTRO[current[0]]}</p>}
        </div>
        <Comp />
        <p className="text-[11px] text-ink-400 mt-8">Last refreshed {fmtDateTime(new Date())}</p>
      </section>
    </div>
  );
}
