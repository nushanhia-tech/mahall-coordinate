import { Sparkles, ArrowRight, Heart, Home, Users, Building2, GraduationCap, TrendingUp, TrendingDown, Wallet, MapPin, Phone, Mail, Trophy, CalendarDays, ShoppingCart, Coins, Gavel, FileHeart, HomeIcon, MessageCircle, BookOpen, Briefcase, LifeBuoy } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApp, useStats } from '../store/AppContext';
import { StatCard, SectionTitle, Empty } from '../components/ui';
import { openQuickFind } from '../components/QuickFind';
import DonateSection from '../components/Donate';
import EventCalendar from '../components/EventCalendar';
import { inr, fmtDate } from '../utils/format';
import { monthlySeries } from '../utils/finance';
import { featureOn } from '../utils/features';
import { navigate } from '../router';

export const MapEmbed = ({ lat, lng, className = 'h-64' }) => {
  const d = 0.008;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
  return <iframe title="Masjid location" src={src} className={`w-full rounded-lg border ${className}`} loading="lazy" />;
};

const QuickCard = ({ icon: Icon, title, text, to, tone = 'brand', delay = 0 }) => {
  const tones = { brand: 'from-brand-100 to-brand-50 text-brand-700', gold: 'from-gold-100 to-gold-50 text-gold-600', clay: 'from-clay-100 to-clay-50 text-clay-600', sky: 'from-sky-100 to-sky-50 text-sky-700', violet: 'from-violet-100 to-violet-50 text-violet-700', rose: 'from-rose-100 to-rose-50 text-rose-600' };
  return (
    <button onClick={() => navigate(to)} style={{ animationDelay: `${delay}ms` }} className="card card-hover text-left group animate-fade-up">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br grid place-items-center mb-4 ${tones[tone]}`}><Icon size={22} /></div>
      <div className="font-display text-lg font-semibold text-ink-900">{title}</div>
      <div className="text-sm text-ink-500 mt-1 leading-relaxed">{text}</div>
      <div className="mt-4 text-sm font-semibold text-brand-600 flex items-center gap-1 group-hover:gap-2 transition-all">Open <ArrowRight size={14} /></div>
    </button>
  );
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'A peaceful night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const CHART = { income: '#24805a', expense: '#df8462', balance: '#d18c22', grid: '#ece4d6', axis: '#7b8580' };

export default function Dashboard() {
  const { state, user } = useApp();
  const s = useStats();
  const series = monthlySeries(state.transactions, 6);
  const m = state.masjid;
  const on = (k) => featureOn(state.config, k);
  const today = new Date().toISOString().slice(0, 10);
  const nextEvent = [...state.events].filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <div>
      {/* Hero: warm greeting with soft glowing shapes */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        {m.photo && <><img src={m.photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" /><div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-900/85 to-brand-900/40" /></>}
        <div className="absolute inset-0 pattern-stars" />
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-brand-500/40 blur-3xl animate-float" />
        <div className="absolute -bottom-32 right-0 w-[30rem] h-[30rem] rounded-full bg-gold-400/25 blur-3xl animate-float" style={{ animationDelay: '-7s' }} />
        <div className="relative max-w-7xl mx-auto px-4 pt-14 pb-28 md:pt-20 md:pb-36 grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3 animate-fade-up">
            {m.logo && <img src={m.logo} alt="" className="w-16 h-16 rounded-3xl object-cover bg-white mb-5 shadow-lift ring-4 ring-white/10" />}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold text-gold-200 backdrop-blur">
              <Sparkles size={13} /> {greeting()}{user ? `, ${user.name.split(' ')[0]}` : ''} · Assalamu alaikum
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.05] mt-5">{m.name}</h1>
            <p className="mt-5 text-lg text-brand-100/90 max-w-xl leading-relaxed">{m.tagline ? `${m.tagline}. ` : ''}{m.about}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {on('homeDonate') && <a href="#donate" className="btn-gold"><Heart size={16} /> Give to the masjid</a>}
              {on('quickFind') && <button onClick={openQuickFind} className="btn bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur"><Sparkles size={16} className="text-gold-300" /> What are you looking for?</button>}
            </div>
          </div>
          <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="glass !bg-white/10 !border-white/15 rounded-4xl p-6 text-white">
              <div className="text-xs uppercase tracking-[.2em] text-gold-200 font-bold">Coming up</div>
              {nextEvent ? (
                <>
                  <div className="font-display text-2xl mt-2">{nextEvent.title}</div>
                  <div className="text-sm text-brand-100 mt-1">{fmtDate(nextEvent.date)}{nextEvent.time ? ` · ${nextEvent.time}` : ''}{nextEvent.venue ? ` · ${nextEvent.venue}` : ''}</div>
                  {nextEvent.description && <p className="text-sm text-brand-50/80 mt-3 leading-relaxed">{nextEvent.description}</p>}
                </>
              ) : <div className="text-sm text-brand-100 mt-2">No events planned yet. Check back soon.</div>}
              <div className="mt-5 pt-5 border-t border-white/15 grid grid-cols-2 gap-4">
                <div><div className="text-3xl font-extrabold tabular-nums">{s.homes}</div><div className="text-xs text-brand-100">families</div></div>
                <div><div className="text-3xl font-extrabold tabular-nums">{s.people}</div><div className="text-xs text-brand-100">people</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative space-y-20 pb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Home} label="Homes in our Mahall" value={s.homes} />
          <StatCard icon={Users} label="Community members" value={s.people} color="blue" />
          <StatCard icon={Building2} label="Institutions" value={s.institutions} color="amber" />
          <StatCard icon={GraduationCap} label="Students learning" value={s.students} color="purple" />
        </div>

        {on('homeFinance') && <section>
          <div className="eyebrow mb-2">Open books</div>
          <SectionTitle icon={Wallet} title="Where every rupee goes" subtitle="Our accounts are open to everyone. Every donation received and every rupee spent shows up here, live." />
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="space-y-4">
              <StatCard icon={TrendingUp} label="Received so far" value={inr(s.income)} />
              <StatCard icon={TrendingDown} label="Spent on the community" value={inr(s.expense)} color="red" />
              <StatCard icon={Wallet} label="Balance in hand" value={inr(s.balance)} color="amber" />
            </div>
            <div className="card lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-lg font-semibold">The last six months</div>
                <div className="flex gap-3 text-xs text-ink-500">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART.income }} />In</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART.expense }} />Out</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded" style={{ background: CHART.balance }} />Balance</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={series} barGap={4}>
                  <CartesianGrid strokeDasharray="4 6" stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="month" fontSize={12} stroke={CHART.axis} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} stroke={CHART.axis} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 16, border: '1px solid #ece4d6', boxShadow: '0 10px 30px -10px rgba(0,0,0,.15)' }} />
                  <Bar dataKey="income" name="Received" fill={CHART.income} radius={[8, 8, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expense" name="Spent" fill={CHART.expense} radius={[8, 8, 0, 0]} maxBarSize={28} />
                  <Line dataKey="balance" name="Balance" stroke={CHART.balance} strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>}

        {on('homeDonate') && <DonateSection />}

        {(on('rental') || on('chitty') || on('auction')) && <section>
          <div className="eyebrow mb-2">Here to help</div>
          <SectionTitle icon={ShoppingCart} title="Community services" subtitle="Borrow what you need, save together, and support the masjid – all from your phone." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {on('rental') && <QuickCard icon={ShoppingCart} title="Rental cart" text="Chairs, tents, sound system and more – by the hour, day, week or month." to="/services/rental" tone="sky" />}
            {on('chitty') && <QuickCard icon={Coins} title="Chitty money" text="Save a little every month with neighbours you trust. Pay by UPI." to="/services/chitty" tone="gold" delay={60} />}
            {on('auction') && <QuickCard icon={Gavel} title="Live auction (Lelam)" text="Bid on Nercha offerings and watch the bids come in live." to="/services/auction" tone="violet" delay={120} />}
          </div>
        </section>}

        {(on('nikkah') || on('homeApplication') || on('mediation')) && <section>
          <div className="eyebrow mb-2">Life moments</div>
          <SectionTitle icon={FileHeart} title="Apply online" subtitle="No queues, no paperwork lost. Apply from home and follow your request until it is done." />
          <div className="grid sm:grid-cols-3 gap-4">
            {on('nikkah') && <QuickCard icon={FileHeart} title="Nikkah" text="Apply for Nikkah registration and get your certificate." to="/apply/nikkah" tone="rose" />}
            {on('homeApplication') && <QuickCard icon={HomeIcon} title="A new home number" text="Moved into a new house? Register your family with the Mahall." to="/apply/home" tone="brand" delay={60} />}
            {on('mediation') && <QuickCard icon={MessageCircle} title="Ask or raise a concern" text="Send a problem or a question privately – to the Khateeb, the committee, or both." to="/mediation" tone="clay" delay={120} />}
          </div>
        </section>}

        {on('homeEvents') && <section>
          <SectionTitle icon={CalendarDays} title="What's happening" subtitle="Programmes, meetings and gatherings. Tap a day to see its events." />
          <EventCalendar events={state.events} />
        </section>}

        {on('homeAchievements') && <section>
          <SectionTitle icon={Trophy} title="Moments we're proud of" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...state.achievements].sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
              <div key={a.id} className="card card-hover relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gold-100" />
                <Trophy className="relative text-gold-500 mb-3" size={22} />
                <div className="relative font-display text-lg font-semibold text-ink-900">{a.title}</div>
                <div className="relative text-xs text-ink-400 mt-0.5">{fmtDate(a.date)}</div>
                <p className="relative text-sm text-ink-600 mt-3 leading-relaxed">{a.description}</p>
              </div>
            ))}
            {!state.achievements.length && <div className="card sm:col-span-3"><Empty>Our first milestone is on its way.</Empty></div>}
          </div>
        </section>}

        {on('homeInstitutions') && <section>
          <div className="flex items-end justify-between gap-3">
            <SectionTitle icon={BookOpen} title="Learning together" subtitle="Our madrasas, colleges and skill centres." />
            <button className="btn-outline btn-sm mb-4 shrink-0" onClick={() => navigate('/courses')}>All courses <ArrowRight size={13} /></button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.institutions.map((i) => (
              <div key={i.id} className="card card-hover p-0 overflow-hidden">
                {i.photo ? <img src={i.photo} alt="" className="h-40 w-full object-cover" /> : <div className="h-40 bg-gradient-to-br from-brand-100 via-sand-100 to-gold-100 grid place-items-center pattern-stars-dark"><Building2 className="text-brand-600" size={40} /></div>}
                <div className="p-5">
                  <div className="font-display text-lg font-semibold">{i.name}</div>
                  <div className="text-xs text-ink-500 mt-0.5">{i.type} · {i.students} students</div>
                  <p className="text-sm text-ink-600 mt-3 leading-relaxed">{i.description}</p>
                  <div className="mt-3 badge bg-brand-50 text-brand-700">{state.courses.filter((c) => c.institutionId === i.id).length} course(s)</div>
                </div>
              </div>
            ))}
            {!state.institutions.length && <div className="card sm:col-span-3"><Empty>Institutions will appear here once added.</Empty></div>}
          </div>
        </section>}

        {(on('homeOpportunities') || on('homeServices')) && <section className="grid lg:grid-cols-2 gap-8">
          {on('homeOpportunities') && <div>
            <div className="flex items-end justify-between gap-3"><SectionTitle icon={Briefcase} title="Opportunities" /><button className="btn-outline btn-sm mb-4" onClick={() => navigate('/opportunities')}>See all <ArrowRight size={13} /></button></div>
            <div className="space-y-3">
              {state.opportunities.slice(0, 4).map((o) => (
                <div key={o.id} className="card card-hover !py-4"><span className="badge bg-gold-100 text-gold-600 mr-2">{o.type}</span><span className="font-semibold text-ink-800">{o.title}</span><div className="text-xs text-ink-500 mt-1.5">Apply by {fmtDate(o.deadline)} · {o.contact}</div></div>
              ))}
              {!state.opportunities.length && <div className="card"><Empty>No openings right now.</Empty></div>}
            </div>
          </div>}
          {on('homeServices') && <div>
            <SectionTitle icon={LifeBuoy} title="Always here for you" />
            <div className="space-y-3">
              {state.services.map((sv) => (
                <div key={sv.id} className="card card-hover !py-4 flex justify-between items-center gap-3"><div><div className="font-semibold text-ink-800">{sv.title}</div><div className="text-xs text-ink-500 mt-0.5">{sv.description}</div></div><a href={`tel:${sv.contact}`} className="btn-outline btn-sm whitespace-nowrap"><Phone size={12} />{sv.contact}</a></div>
              ))}
              {!state.services.length && <div className="card"><Empty>Services will be listed here.</Empty></div>}
            </div>
          </div>}
        </section>}

        <section id="contacts">
          <SectionTitle icon={MapPin} title="Come and visit" subtitle="Our doors are open. Here is how to reach us and who to talk to." />
          <div className="grid lg:grid-cols-3 gap-4">
            {on('homeMap') && <div className="card lg:col-span-2 !p-3">
              <MapEmbed lat={m.lat} lng={m.lng} className="h-72 rounded-3xl border-0" />
              <div className="px-3 pt-4 pb-2 text-sm text-ink-600 flex flex-wrap gap-x-6 gap-y-2">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-600" />{m.address}</span>
                {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-1.5"><Phone size={14} className="text-brand-600" />{m.phone}</a>}
                {m.email && <a href={`mailto:${m.email}`} className="flex items-center gap-1.5"><Mail size={14} className="text-brand-600" />{m.email}</a>}
                <a className="text-brand-700 font-semibold" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`}>Get directions →</a>
              </div>
            </div>}
            <div className="space-y-4">
              {on('homeCommittee') && <div className="card">
                <div className="font-display text-lg font-semibold mb-3">Our committee</div>
                {state.committee.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-100 to-gold-100 text-brand-700 grid place-items-center text-sm font-bold">{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                    <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{c.name}</div><div className="text-xs text-ink-500">{c.role}</div></div>
                    <a href={`tel:${c.phone}`} className="text-xs font-semibold text-brand-700">{c.phone}</a>
                  </div>
                ))}
                {!state.committee.length && <div className="text-sm text-ink-400">Committee members will be listed here.</div>}
              </div>}
              {on('homeHelpdesk') && <div className="card bg-gradient-to-br from-clay-50 to-white">
                <div className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><Phone size={16} className="text-clay-500" />In an emergency</div>
                {state.helpdesk.map((h) => <div key={h.id} className="flex justify-between gap-2 py-1.5 text-sm"><span><b className="text-ink-800">{h.name}</b> <span className="text-xs text-ink-500">· {h.service}</span></span><a href={`tel:${h.phone}`} className="font-bold text-clay-600 whitespace-nowrap">{h.phone}</a></div>)}
                {!state.helpdesk.length && <div className="text-sm text-ink-400">Emergency numbers will be listed here.</div>}
              </div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
