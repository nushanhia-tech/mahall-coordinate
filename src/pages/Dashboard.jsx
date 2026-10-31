import { Home, Users, Building2, GraduationCap, TrendingUp, TrendingDown, Wallet, MapPin, Phone, Mail, Trophy, CalendarDays, ShoppingCart, Coins, Gavel, FileHeart, HomeIcon, MessageCircle, BookOpen, Briefcase, LifeBuoy, UserCircle2 } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useApp, useStats } from '../store/AppContext';
import { StatCard, SectionTitle } from '../components/ui';
import DonateSection from '../components/Donate';
import EventCalendar from '../components/EventCalendar';
import { inr, fmtDate } from '../utils/format';
import { monthlySeries } from '../utils/finance';
import { navigate } from '../router';

export const MapEmbed = ({ lat, lng, className = 'h-64' }) => {
  const d = 0.008;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
  return <iframe title="Masjid location" src={src} className={`w-full rounded-lg border ${className}`} loading="lazy" />;
};

const QuickCard = ({ icon: Icon, title, text, to, color }) => (
  <button onClick={() => navigate(to)} className="card text-left hover:shadow-md hover:border-brand-300 transition group">
    <div className={`w-10 h-10 rounded-lg grid place-items-center mb-3 ${color}`}><Icon size={20} /></div>
    <div className="font-bold text-slate-800 group-hover:text-brand-700">{title}</div>
    <div className="text-xs text-slate-500 mt-1">{text}</div>
  </button>
);

export default function Dashboard() {
  const { state } = useApp();
  const s = useStats();
  const series = monthlySeries(state.transactions, 6);
  const m = state.masjid;

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-14">
          <p className="text-gold-400 font-semibold text-sm uppercase tracking-widest">Smart Community & Masjid ERP</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">{m.name}</h1>
          <p className="mt-3 text-brand-50 max-w-2xl">{m.tagline}. {m.about}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#donate" className="btn bg-gold-400 text-brand-900 hover:bg-gold-500">Donate now</a>
            <button onClick={() => navigate('/login')} className="btn bg-white/10 hover:bg-white/20 text-white border border-white/30">Member login</button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 -mt-8 space-y-14 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Home} label="Registered Homes" value={s.homes} />
          <StatCard icon={Users} label="Community Members" value={s.people} color="blue" />
          <StatCard icon={Building2} label="Institutions" value={s.institutions} color="amber" />
          <StatCard icon={GraduationCap} label="Students" value={s.students} color="purple" />
        </div>

        <section>
          <SectionTitle icon={Wallet} title="Financial Transparency" subtitle="Every rupee received and spent, updated live from the Mahall ledger." />
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="space-y-4">
              <StatCard icon={TrendingUp} label="Total Income" value={inr(s.income)} />
              <StatCard icon={TrendingDown} label="Total Expense" value={inr(s.expense)} color="red" />
              <StatCard icon={Wallet} label="Current Balance" value={inr(s.balance)} color="blue" />
            </div>
            <div className="card lg:col-span-2">
              <div className="font-semibold mb-2 text-slate-700">Last 6 months</div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[4, 4, 0, 0]} />
                  <Line dataKey="balance" name="Running balance" stroke="#1d4ed8" strokeWidth={2} dot />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <DonateSection />

        <section>
          <SectionTitle icon={ShoppingCart} title="Community Services" subtitle="Book, save and bid — all online." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickCard icon={ShoppingCart} title="Rental Cart" text="Chairs, tents, sound system and more by the hour, day, week or month." to="/services/rental" color="bg-blue-100 text-blue-700" />
            <QuickCard icon={Coins} title="Chitty Money" text="Monthly savings chitty with UPI payment and instalment tracking." to="/services/chitty" color="bg-amber-100 text-amber-700" />
            <QuickCard icon={Gavel} title="Live Auction (Lelam)" text="Bid on Nercha offerings in real time." to="/services/auction" color="bg-purple-100 text-purple-700" />
          </div>
        </section>

        <section>
          <SectionTitle icon={FileHeart} title="Applications" subtitle="Apply online and track your status." />
          <div className="grid sm:grid-cols-3 gap-4">
            <QuickCard icon={FileHeart} title="Nikkah Application" text="Apply for Nikkah registration and certificate." to="/apply/nikkah" color="bg-pink-100 text-pink-700" />
            <QuickCard icon={HomeIcon} title="New Home Number" text="Register a new household with the Mahall." to="/apply/home" color="bg-brand-100 text-brand-700" />
            <QuickCard icon={MessageCircle} title="Mediation Chat" text="Talk privately to the committee about disputes or concerns." to="/mediation" color="bg-sky-100 text-sky-700" />
          </div>
        </section>

        <section>
          <SectionTitle icon={CalendarDays} title="Event Calendar" />
          <EventCalendar events={state.events} />
        </section>

        <section>
          <SectionTitle icon={Trophy} title="Achievements" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...state.achievements].sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
              <div key={a.id} className="card border-t-4 border-t-gold-400">
                <Trophy className="text-gold-500 mb-2" size={20} />
                <div className="font-bold text-slate-800">{a.title}</div>
                <div className="text-xs text-slate-400">{fmtDate(a.date)}</div>
                <p className="text-sm text-slate-600 mt-2">{a.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-4">
            <SectionTitle icon={BookOpen} title="Courses & Institutions" />
            <button className="btn-outline btn-sm" onClick={() => navigate('/courses')}>View all</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.institutions.map((i) => (
              <div key={i.id} className="card p-0 overflow-hidden">
                {i.photo ? <img src={i.photo} alt="" className="h-32 w-full object-cover" /> : <div className="h-32 bg-gradient-to-br from-brand-100 to-brand-50 grid place-items-center"><Building2 className="text-brand-600" size={36} /></div>}
                <div className="p-4">
                  <div className="font-bold">{i.name}</div>
                  <div className="text-xs text-slate-500">{i.type} · {i.students} students</div>
                  <p className="text-sm text-slate-600 mt-2">{i.description}</p>
                  <div className="text-xs text-brand-700 mt-2">{state.courses.filter((c) => c.institutionId === i.id).length} course(s)</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-end justify-between mb-4"><SectionTitle icon={Briefcase} title="Opportunities" /><button className="btn-outline btn-sm" onClick={() => navigate('/opportunities')}>View all</button></div>
            <div className="space-y-3">
              {state.opportunities.slice(0, 4).map((o) => (
                <div key={o.id} className="card py-3"><span className="badge bg-brand-100 text-brand-800 mr-2">{o.type}</span><span className="font-semibold">{o.title}</span><div className="text-xs text-slate-500 mt-1">Last date {fmtDate(o.deadline)} · {o.contact}</div></div>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle icon={LifeBuoy} title="Mahall Services" />
            <div className="space-y-3">
              {state.services.map((sv) => (
                <div key={sv.id} className="card py-3 flex justify-between gap-3"><div><div className="font-semibold">{sv.title}</div><div className="text-xs text-slate-500">{sv.description}</div></div><a href={`tel:${sv.contact}`} className="text-sm text-brand-700 font-mono whitespace-nowrap">{sv.contact}</a></div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionTitle icon={MapPin} title="Masjid Location & Committee" />
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="card lg:col-span-2">
              <MapEmbed lat={m.lat} lng={m.lng} />
              <div className="mt-3 text-sm text-slate-600 flex flex-wrap gap-x-6 gap-y-1">
                <span className="flex items-center gap-1"><MapPin size={14} />{m.address}</span>
                <a href={`tel:${m.phone}`} className="flex items-center gap-1"><Phone size={14} />{m.phone}</a>
                <a href={`mailto:${m.email}`} className="flex items-center gap-1"><Mail size={14} />{m.email}</a>
                <a className="text-brand-700 font-medium" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`}>Get directions →</a>
              </div>
            </div>
            <div className="space-y-4">
              <div className="card">
                <div className="font-semibold mb-2">Committee Members</div>
                {state.committee.map((c) => <div key={c.id} className="flex items-center gap-3 py-1.5"><UserCircle2 className="text-brand-600" size={28} /><div className="flex-1"><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-slate-500">{c.role}</div></div><a href={`tel:${c.phone}`} className="text-xs font-mono text-brand-700">{c.phone}</a></div>)}
              </div>
              <div className="card">
                <div className="font-semibold mb-2 flex items-center gap-2"><Phone size={16} className="text-red-600" />Help Desk</div>
                {state.helpdesk.map((h) => <div key={h.id} className="flex justify-between py-1 text-sm"><span><b>{h.name}</b> <span className="text-xs text-slate-500">· {h.service}</span></span><a href={`tel:${h.phone}`} className="font-mono text-red-700">{h.phone}</a></div>)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
