import { useState } from 'react';
import { BookOpen, Building2, Briefcase, GraduationCap, Phone, CalendarClock } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { usePhoneLookup, Field, Modal, Empty, SectionTitle, StatusBadge } from '../components/ui';
import { inr, fmtDate, today } from '../utils/format';

export function CoursesPage() {
  const { state, add, toast, user } = useApp();
  const [inst, setInst] = useState('');
  const [apply, setApply] = useState(null);
  const [lookup, setLookup] = useState('');
  const courses = state.courses.filter((c) => !inst || c.institutionId === inst);
  const taken = (c) => state.courseApplications.filter((a) => a.courseId === c.id && a.status !== 'rejected').length;
  const submit = (e) => {
    e.preventDefault();
    if (state.courseApplications.some((a) => a.courseId === apply.courseId && a.phone === apply.phone && a.status !== 'rejected')) return toast('You have already applied for this course', 'error');
    add('courseApplications', { ...apply, status: 'pending', date: new Date().toISOString(), userId: user?.id || '' });
    toast('Application sent to the institution'); setLookup(apply.phone); setApply(null);
  };
  const mine = usePhoneLookup('courses', lookup);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      <section>
        <SectionTitle icon={Building2} title="Our Institutions" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.institutions.map((i) => (
            <button key={i.id} onClick={() => setInst(inst === i.id ? '' : i.id)} className={`card p-0 overflow-hidden text-left ${inst === i.id ? 'ring-2 ring-brand-500' : 'hover:shadow-md'}`}>
              {i.photo ? <img src={i.photo} alt="" className="h-36 w-full object-cover" /> : <div className="h-36 bg-gradient-to-br from-brand-100 to-brand-50 grid place-items-center"><Building2 className="text-brand-600" size={40} /></div>}
              <div className="p-4">
                <div className="font-bold">{i.name}</div>
                <div className="text-xs text-slate-500">{i.type}</div>
                <p className="text-sm text-slate-600 mt-2">{i.description}</p>
                <div className="flex justify-between mt-3 text-xs"><span className="flex items-center gap-1 text-purple-700 font-semibold"><GraduationCap size={14} />{i.students} students</span><span className="flex items-center gap-1 text-slate-500"><Phone size={12} />{i.contact}</span></div>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionTitle icon={BookOpen} title="Courses" subtitle={inst ? `Showing courses from ${state.institutions.find((i) => i.id === inst)?.name}` : 'All courses offered by Mahall institutions'} action={inst && <button className="btn-outline btn-sm" onClick={() => setInst('')}>Show all</button>} />
          <div className="grid sm:grid-cols-2 gap-4">
            {courses.map((c) => {
              const left = Number(c.seats || 0) - taken(c);
              return (
                <div key={c.id} className="card flex flex-col">
                  <div className="font-bold text-slate-800">{c.title}</div>
                  <div className="text-xs text-slate-500">{state.institutions.find((i) => i.id === c.institutionId)?.name}</div>
                  <p className="text-sm text-slate-600 mt-2 flex-1">{c.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs my-3"><span className="badge bg-slate-100">{c.duration}</span><span className="badge bg-brand-100 text-brand-800">{c.fee ? inr(c.fee) : 'Free'}</span><span className={`badge ${left > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'}`}>{left > 0 ? `${left} seats left` : 'Full'}</span></div>
                  <button className="btn-primary btn-sm" disabled={left <= 0} onClick={() => setApply({ courseId: c.id, name: user?.name || '', phone: '', age: '', qualification: '' })}>Apply</button>
                </div>
              );
            })}
            {!courses.length && <Empty>No courses yet.</Empty>}
          </div>
        </div>
        <div className="card h-fit">
          <h3 className="font-bold mb-2">Check my application</h3>
          <input className="input" placeholder="Phone number" value={lookup} onChange={(e) => setLookup(e.target.value)} />
          <div className="mt-3 space-y-2">
            {mine.map((a) => <div key={a.id} className="text-sm border rounded p-2 flex justify-between gap-2"><span>{state.courses.find((c) => c.id === a.courseId)?.title}</span><StatusBadge status={a.status} /></div>)}
            {lookup.trim().length >= 10 && !mine.length && <div className="text-xs text-slate-400">No applications found.</div>}
          </div>
        </div>
      </section>
      <Modal open={!!apply} onClose={() => setApply(null)} title={`Apply – ${state.courses.find((c) => c.id === apply?.courseId)?.title}`}>
        {apply && (
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Field label="Full name *" className="col-span-2"><input className="input" required value={apply.name} onChange={(e) => setApply({ ...apply, name: e.target.value })} /></Field>
            <Field label="Phone *"><input className="input" required value={apply.phone} onChange={(e) => setApply({ ...apply, phone: e.target.value })} /></Field>
            <Field label="Age *"><input type="number" min="5" className="input" required value={apply.age} onChange={(e) => setApply({ ...apply, age: e.target.value })} /></Field>
            <Field label="Qualification" className="col-span-2"><input className="input" value={apply.qualification} onChange={(e) => setApply({ ...apply, qualification: e.target.value })} /></Field>
            <div className="col-span-2 flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setApply(null)}>Cancel</button><button className="btn-primary">Submit</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function OpportunitiesPage() {
  const { state } = useApp();
  const [type, setType] = useState('');
  const types = [...new Set(state.opportunities.map((o) => o.type))];
  const list = state.opportunities.filter((o) => !type || o.type === type).sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SectionTitle icon={Briefcase} title="Opportunities" subtitle="Scholarships, jobs and services for the community." />
      <div className="flex gap-2 mb-4">{['', ...types].map((t) => <button key={t} onClick={() => setType(t)} className={`btn-sm btn ${type === t ? 'bg-brand-600 text-white' : 'bg-white border'}`}>{t || 'All'}</button>)}</div>
      <div className="space-y-3">
        {list.map((o) => {
          const closed = o.deadline && o.deadline < today();
          return (
            <div key={o.id} className={`card ${closed ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap justify-between gap-2">
                <div><span className="badge bg-brand-100 text-brand-800 mr-2">{o.type}</span><span className="font-bold text-lg">{o.title}</span></div>
                {o.deadline && <span className={`text-xs flex items-center gap-1 ${closed ? 'text-red-600' : 'text-slate-500'}`}><CalendarClock size={13} />{closed ? 'Closed' : 'Last date'} {fmtDate(o.deadline)}</span>}
              </div>
              <p className="text-sm text-slate-600 mt-2">{o.description}</p>
              {o.eligibility && <p className="text-sm mt-1"><b>Eligibility:</b> {o.eligibility}</p>}
              {o.contact && <p className="text-sm text-brand-700 mt-1">Contact: {o.contact}</p>}
            </div>
          );
        })}
        {!list.length && <Empty>No opportunities right now.</Empty>}
      </div>
    </div>
  );
}
