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
          <h3 className="font-bold mb-3">Needs your attention</h3>
          {tasks.map(([tab, label, n]) => (
            <button key={tab} onClick={() => navigate('/admin/' + tab)} className="w-full flex justify-between items-center py-2 px-2 rounded hover:bg-slate-50 text-sm">
              <span>{label}</span><span className={`badge ${n ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{n}</span>
            </button>
          ))}
        </div>
        <div className="card">
          <h3 className="font-bold mb-3">Recent transactions</h3>
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
  const { resetDemo, importBackup, toast, state, ask } = useApp();
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    saveFile(`mahall-backup-${new Date().toISOString().slice(0, 10)}.json`, blob);
  };
  const importData = (file) => {
    const r = new FileReader();
    r.onload = async () => { try { await importBackup(JSON.parse(r.result)); toast('Backup restored'); } catch (e) { toast(e.message || 'Invalid backup file', 'error'); } };
    r.readAsText(file);
  };
  return (
    <div className="card max-w-xl space-y-4">
      <h3 className="h2">Data & Settings</h3>
      <p className="text-sm text-slate-500">All data is stored in the Supabase database. Backups exclude passwords; restored accounts keep their current password.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={exportData}>Download backup (JSON)</button>
        <label className="btn-outline cursor-pointer">Restore backup<input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files[0] && importData(e.target.files[0])} /></label>
        <button className="btn-danger" onClick={async () => { if (await ask({ title: 'Reset demo data?', message: 'All current data will be replaced with the demo data. This cannot be undone.', danger: true, okLabel: 'Reset' })) { await resetDemo(); toast('Demo data restored'); } }}>Reset demo data</button>
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
  ['location', 'Location & Committee', MapPin, LocationAdmin],
  ['rental', 'Rental Cart', ShoppingCart, RentalAdmin],
  ['chitty', 'Chitty Money', Coins, ChittyAdmin],
  ['auction', 'Live Auction', Gavel, AuctionAdmin],
  ['mediation', 'Mediation Chat', MessageCircle, MediationAdmin],
  ['nikkah', 'Nikkah Applications', FileHeart, NikkahAdmin],
  ['homeapps', 'New Home Applications', HomeIcon, HomeAppsAdmin],
  ['community', 'Courses & Opportunities', GraduationCap, CommunityAdmin],
  ['settings', 'Data & Settings', Settings, SettingsTab],
];

export default function AdminPortal({ tab }) {
  const { state } = useApp();
  const current = ADMIN_TABS.find((t) => t[0] === tab) || ADMIN_TABS[0];
  const Comp = current[3];
  const badges = {
    donations: state.donations.filter((d) => d.status === 'pending').length,
    chitty: state.chittyPayments.filter((p) => p.status === 'pending').length,
    nikkah: state.nikkahApps.filter((p) => p.status === 'pending').length,
    homeapps: state.homeApps.filter((p) => p.status === 'pending').length,
    mediation: state.chats.reduce((a, c) => a + c.messages.filter((m) => m.from === 'member' && !m.read).length, 0),
    community: state.courseApplications.filter((p) => p.status === 'pending').length,
  };
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
      <aside className="lg:w-64 shrink-0 print:hidden">
        <div className="card p-2 lg:sticky lg:top-20">
          <div className="px-3 py-2 text-xs font-bold uppercase text-slate-400">Admin Portal</div>
          <nav className="flex lg:flex-col gap-0.5 overflow-x-auto">
            {ADMIN_TABS.map(([id, label, Icon]) => (
              <button key={id} onClick={() => navigate('/admin/' + id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap text-left ${current[0] === id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon size={16} className="shrink-0" /> <span className="flex-1">{label}</span>
                {badges[id] ? <span className={`badge ${current[0] === id ? 'bg-white text-brand-700' : 'bg-red-500 text-white'}`}>{badges[id]}</span> : null}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <section className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">{current[1]}</h1>
        <Comp />
        <p className="text-[11px] text-slate-400 mt-6">Last refreshed {fmtDateTime(new Date())}</p>
      </section>
    </div>
  );
}
