import { useState } from 'react';
import { Home, Users, ShoppingCart, Coins, Gavel, FileHeart, HomeIcon, MessageCircle, BookOpen, CalendarDays, GraduationCap, Building2, HeartHandshake } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { featureOn } from '../utils/features';
import { MyVari } from '../modules/Vari';
import { InstitutionReports } from '../modules/InstitutionReports';
import { MediationAdmin } from '../modules/Mediation';
import { HomeAppsAdmin } from '../modules/HomeApply';
import { navigate } from '../router';
import { StatCard, StatusBadge, Tabs, CrudManager, Field, ImageInput, Empty } from '../components/ui';
import EventCalendar from '../components/EventCalendar';
import EventsAdmin from '../admin/EventsAdmin';
import { NikkahAdmin } from '../modules/Nikkah';
import { CourseApplications, courseFields } from '../admin/CommunityAdmin';
import { fmtDate, fmtDateTime, inr } from '../utils/format';

const Tile = ({ icon: Icon, label, to, badge }) => (
  <button onClick={() => navigate(to)} className="card card-hover flex flex-col items-center gap-3 !py-6 relative group">
    <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-gold-50 text-brand-700 grid place-items-center group-hover:scale-105 transition"><Icon size={22} /></span>
    <span className="text-sm font-semibold text-center text-ink-800">{label}</span>
    {badge ? <span className="absolute top-3 right-3 badge bg-clay-500 text-white">{badge}</span> : null}
  </button>
);

const timeGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

const Header = ({ user, subtitle }) => (
  <div className="mb-8 animate-fade-up">
    <div className="eyebrow">{timeGreeting()} · Assalamu alaikum</div>
    <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink-900 mt-1">Welcome, {user.name.split(' ')[0]}</h1>
    <p className="text-ink-500 mt-2">{subtitle}</p>
  </div>
);

export function IndividualPortal() {
  const { state, user } = useApp();
  const on = (k) => featureOn(state.config, k);
  const hh = state.households.find((h) => h.id === user.householdId);
  const unread = state.chats.filter((c) => c.userId === user.id).reduce((a, c) => a + c.messages.filter((m) => m.from === 'admin' && !m.read).length, 0);
  const nikkah = state.nikkahApps.filter((a) => a.userId === user.id);
  const homes = state.homeApps.filter((a) => a.userId === user.id);
  const myDonations = hh ? state.donations.filter((d) => d.phone === hh.phone) : [];
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Header user={user} subtitle="Your family, your applications and everything the Mahall offers – in one place." />
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="card md:col-span-2">
          <h3 className="font-bold flex items-center gap-2 mb-2"><Home size={18} className="text-brand-600" />My household</h3>
          {hh ? (
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div><span className="text-slate-500">Home number:</span> <b>{hh.homeNo}</b></div>
              <div><span className="text-slate-500">Head of family:</span> {hh.headName}</div>
              <div><span className="text-slate-500">Members:</span> {hh.members}</div>
              <div><span className="text-slate-500">Ward:</span> {hh.ward}</div>
              <div className="sm:col-span-2"><span className="text-slate-500">Address:</span> {hh.address}</div>
            </div>
          ) : <p className="text-sm text-slate-500">Your account is not linked to a household yet. <button className="text-brand-700 underline" onClick={() => navigate('/apply/home')}>Apply for a home number</button>.</p>}
        </div>
        <StatCard icon={Users} label="Community members" value={state.households.reduce((a, h) => a + Number(h.members), 0)} color="blue" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          ['rental', ShoppingCart, 'Rental cart', '/services/rental'],
          ['chitty', Coins, 'Chitty money', '/services/chitty'],
          ['auction', Gavel, 'Live auction', '/services/auction'],
          ['mediation', MessageCircle, 'Enquiry & mediation', '/mediation', unread],
          ['nikkah', FileHeart, 'Nikkah application', '/apply/nikkah'],
          ['homeApplication', HomeIcon, 'New home number', '/apply/home'],
          ['courseApply', BookOpen, 'Courses', '/courses'],
          ['homeDonate', HeartHandshake, 'Donate', '/'],
        ].filter(([k]) => on(k)).map(([k, icon, label, to, badge]) => <Tile key={k} icon={icon} label={label} to={to} badge={badge} />)}
      </div>
      <div className="mb-6"><MyVari /></div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-bold mb-2">My applications</h3>
          {[...nikkah.map((a) => ({ id: a.id, t: `Nikkah – ${a.groom.name} & ${a.bride.name}`, s: a.status, d: a.createdAt, to: '/apply/nikkah' })), ...homes.map((a) => ({ id: a.id, t: `New home – ${a.applicant}${a.homeNo ? ` (${a.homeNo})` : ''}`, s: a.status, d: a.createdAt, to: '/apply/home' }))].map((x) => (
            <button key={x.id} onClick={() => navigate(x.to)} className="w-full flex justify-between items-center py-2 border-b last:border-0 text-sm text-left"><span>{x.t}<div className="text-xs text-slate-400">{fmtDateTime(x.d)}</div></span><StatusBadge status={x.s} /></button>
          ))}
          {!nikkah.length && !homes.length && <Empty>No applications.</Empty>}
        </div>
        {on('memberDonations') && <div className="card">
          <h3 className="font-bold mb-2">My donations</h3>
          {myDonations.map((d) => <div key={d.id} className="flex justify-between py-2 border-b last:border-0 text-sm"><span>{state.donationChannels.find((c) => c.id === d.channelId)?.name} · {inr(d.amount)}<div className="text-xs text-slate-400">{fmtDate(d.date)}</div></span><StatusBadge status={d.status} /></div>)}
          {!myDonations.length && <Empty>Donations from your household phone number appear here.</Empty>}
        </div>}
      </div>
      <h3 className="font-bold mb-3 flex items-center gap-2"><CalendarDays size={18} className="text-brand-600" />Events</h3>
      <EventCalendar events={state.events} />
    </div>
  );
}

export function KhateebPortal() {
  const { state, user } = useApp();
  const [tab, setTab] = useState('nikkah');
  const pending = state.nikkahApps.filter((a) => a.status === 'pending').length;
  const homePending = state.homeApps.filter((a) => a.status === 'pending').length;
  const unreadMsgs = state.chats.filter((c) => c.userId !== user.id).reduce((a, c) => a + c.messages.filter((m) => m.from === 'member' && !m.read).length, 0);
  const upcomingNikkah = state.nikkahApps.filter((a) => a.status === 'approved' && a.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Header user={user} subtitle="Khateeb portal – Nikkah, events and religious programmes" />
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={FileHeart} label="Nikkah applications to review" value={pending} color="red" />
        <StatCard icon={CalendarDays} label="Upcoming events" value={state.events.filter((e) => e.date >= new Date().toISOString().slice(0, 10)).length} />
        <StatCard icon={FileHeart} label="Approved Nikkahs ahead" value={upcomingNikkah.length} color="purple" />
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'nikkah', label: 'Nikkah applications', count: pending },
        { id: 'forms', label: 'Other submitted forms', count: homePending },
        { id: 'messages', label: 'Messages', count: unreadMsgs },
        { id: 'schedule', label: 'Nikkah schedule' },
        { id: 'events', label: 'Events & achievements' },
        { id: 'profile', label: 'My profile' },
      ]} />
      {tab === 'forms' && <div><p className="text-sm text-ink-500 mb-3">New home number applications submitted by families (view only – the committee approves them).</p><HomeAppsAdmin readOnly /></div>}
      {tab === 'messages' && <div><p className="text-sm text-ink-500 mb-3">Problems and questions that members chose to send to the Khateeb (alone, or together with the committee).</p><MediationAdmin me="khateeb" /></div>}
      {tab === 'profile' && (
        <div className="card max-w-2xl space-y-3">
          <h3 className="h2">{user.name}</h3>
          {[['Education', user.education], ['Religious qualification', user.qualification], ['Graduation details', user.graduation]].map(([l, v]) => (
            <div key={l} className="flex gap-4 py-2 border-b border-sand-200 last:border-0"><span className="w-48 text-sm text-ink-500">{l}</span><span className="text-sm font-semibold">{v || <span className="text-ink-400 font-normal">Not added yet – ask the admin to add it in Manage Portals</span>}</span></div>
          ))}
        </div>
      )}
      {tab === 'nikkah' && <NikkahAdmin />}
      {tab === 'schedule' && (
        <div className="card">
          {upcomingNikkah.map((a) => <div key={a.id} className="flex justify-between py-2 border-b last:border-0 text-sm"><span><b>{a.groom.name}</b> & <b>{a.bride.name}</b> · {a.venue}</span><span>{fmtDate(a.date)}</span></div>)}
          {!upcomingNikkah.length && <Empty>No approved Nikkahs scheduled.</Empty>}
        </div>
      )}
      {tab === 'events' && <EventsAdmin />}
    </div>
  );
}

export function InstitutionPortal() {
  const { state, user, patch, add, remove, toast } = useApp();
  const inst = state.institutions.find((i) => i.id === user.institutionId);
  const [tab, setTab] = useState('profile');
  const [p, setP] = useState(inst);
  if (!inst) return <div className="max-w-xl mx-auto my-16 card text-center text-sm">This account is not linked to an institution. Ask the admin to link it.</div>;
  const courses = state.courses.filter((c) => c.institutionId === inst.id);
  const pending = state.courseApplications.filter((a) => a.status === 'pending' && courses.some((c) => c.id === a.courseId)).length;
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Header user={user} subtitle={`${inst.type} · Institution portal`} />
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={GraduationCap} label="Students" value={inst.students} color="purple" />
        <StatCard icon={BookOpen} label="Courses" value={courses.length} />
        <StatCard icon={Building2} label="Pending applications" value={pending} color="red" />
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'profile', label: 'Profile' }, { id: 'courses', label: 'Courses' }, { id: 'apps', label: 'Applications', count: pending }, ...(featureOn(state.config, 'institutionReports') ? [{ id: 'reports', label: 'Financial reports' }] : [])]} />
      {tab === 'reports' && <InstitutionReports institutionId={inst.id} />}
      {tab === 'profile' && (
        <form className="card grid sm:grid-cols-2 gap-3 max-w-3xl" onSubmit={(e) => { e.preventDefault(); patch('institutions', inst.id, { ...p, students: Number(p.students) }); toast('Profile updated – dashboard student count refreshed'); }}>
          <Field label="Photo" className="sm:col-span-2"><ImageInput value={p.photo} onChange={(v) => setP({ ...p, photo: v })} label="Upload photo" /></Field>
          <Field label="Name"><input className="input" required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Type"><input className="input" value={p.type} onChange={(e) => setP({ ...p, type: e.target.value })} /></Field>
          <Field label="Number of students"><input type="number" min="0" className="input" value={p.students} onChange={(e) => setP({ ...p, students: e.target.value })} /></Field>
          <Field label="Contact"><input className="input" value={p.contact} onChange={(e) => setP({ ...p, contact: e.target.value })} /></Field>
          <Field label="Description" className="sm:col-span-2"><textarea className="input" rows={3} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
          <div><button className="btn-primary">Save profile</button></div>
        </form>
      )}
      {tab === 'courses' && <CrudManager title="Courses" items={courses} fields={courseFields(state, true)}
        onAdd={(d) => { add('courses', { ...d, institutionId: inst.id }); toast('Course added'); }}
        onUpdate={(id, d) => { patch('courses', id, { ...d, institutionId: inst.id }); toast('Course updated'); }}
        onDelete={(id) => remove('courses', id)} />}
      {tab === 'apps' && <CourseApplications institutionId={inst.id} />}
    </div>
  );
}
