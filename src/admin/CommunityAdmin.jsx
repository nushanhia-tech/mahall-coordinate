import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CrudManager, Tabs, StatusBadge, Empty } from '../components/ui';
import { fmtDate, fmtDateTime, inr } from '../utils/format';

export function CourseApplications({ institutionId }) {
  const { state, patch, toast, ask } = useApp();
  const courses = state.courses.filter((c) => !institutionId || c.institutionId === institutionId);
  const list = state.courseApplications.filter((a) => courses.some((c) => c.id === a.courseId)).sort((a, b) => b.date.localeCompare(a.date));
  const decide = async (a, status) => { let remark = ''; if (status === 'rejected') { remark = await ask({ title: 'Reject application', message: 'Reason (optional)', input: true, danger: true, okLabel: 'Reject' }); if (remark === null) return; } patch('courseApplications', a.id, { status, remark }); toast(`Application ${status}`); };
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead><tr><th>Date</th><th>Applicant</th><th>Course</th><th>Status</th><th /></tr></thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id}>
              <td className="text-xs">{fmtDateTime(a.date)}</td>
              <td><div className="font-medium">{a.name}</div><div className="text-xs text-slate-500">{a.phone} · age {a.age}{a.qualification && ` · ${a.qualification}`}</div></td>
              <td>{state.courses.find((c) => c.id === a.courseId)?.title}</td>
              <td><StatusBadge status={a.status} />{a.remark && <div className="text-xs text-slate-500">{a.remark}</div>}</td>
              <td className="text-right whitespace-nowrap">{a.status === 'pending' && <><button className="btn-primary btn-sm mr-1" onClick={() => decide(a, 'approved')}><Check size={12} />Admit</button><button className="btn-danger btn-sm" onClick={() => decide(a, 'rejected')}><X size={12} /></button></>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.length && <Empty>No course applications.</Empty>}
    </div>
  );
}

export const institutionFields = [
  { name: 'photo', label: 'Photo', type: 'image' },
  { name: 'name', label: 'Name', required: true },
  { name: 'type', label: 'Type' },
  { name: 'students', label: 'Students', type: 'number', min: 0, required: true },
  { name: 'contact', label: 'Contact' },
  { name: 'description', label: 'Description', type: 'textarea', table: false },
];

export const courseFields = (state, lockInst) => [
  { name: 'title', label: 'Course', required: true },
  ...(lockInst ? [] : [{ name: 'institutionId', label: 'Institution', type: 'select', required: true, options: state.institutions.map((i) => ({ value: i.id, label: i.name })), render: (c) => state.institutions.find((i) => i.id === c.institutionId)?.name || '—' }]),
  { name: 'duration', label: 'Duration' },
  { name: 'fee', label: 'Fee (₹)', type: 'number', min: 0, render: (c) => (c.fee ? inr(c.fee) : 'Free') },
  { name: 'seats', label: 'Seats', type: 'number', min: 1 },
  { name: 'description', label: 'Description', type: 'textarea', table: false },
];

export default function CommunityAdmin() {
  const { state, add, patch, remove, toast } = useApp();
  const [tab, setTab] = useState('institutions');
  const crud = (col, label) => ({
    onAdd: (d) => { add(col, d); toast(`${label} added`); },
    onUpdate: (id, d) => { patch(col, id, d); toast(`${label} updated`); },
    onDelete: (id) => { remove(col, id); toast(`${label} deleted`); },
  });
  return (
    <div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'institutions', label: 'Institutions' }, { id: 'courses', label: 'Courses' }, { id: 'apps', label: 'Course applications', count: state.courseApplications.filter((a) => a.status === 'pending').length }, { id: 'opps', label: 'Opportunities' }, { id: 'services', label: 'Services' }]} />
      {tab === 'institutions' && <CrudManager title="Institutions" items={state.institutions} fields={institutionFields} {...crud('institutions', 'Institution')} canDelete={(i) => !state.users.some((u) => u.institutionId === i.id)} />}
      {tab === 'courses' && <CrudManager title="Courses" items={state.courses} fields={courseFields(state)} {...crud('courses', 'Course')} />}
      {tab === 'apps' && <CourseApplications />}
      {tab === 'opps' && <CrudManager title="Opportunities" items={state.opportunities} defaults={{ type: 'Scholarship' }} fields={[
        { name: 'type', label: 'Type', type: 'select', required: true, options: ['Scholarship', 'Job', 'Service', 'Training'] },
        { name: 'title', label: 'Title', required: true },
        { name: 'deadline', label: 'Last date', type: 'date', render: (o) => fmtDate(o.deadline) },
        { name: 'contact', label: 'Contact' },
        { name: 'eligibility', label: 'Eligibility', table: false, full: true },
        { name: 'description', label: 'Description', type: 'textarea', table: false },
      ]} {...crud('opportunities', 'Opportunity')} />}
      {tab === 'services' && <CrudManager title="Services" items={state.services} fields={[{ name: 'title', label: 'Service', required: true }, { name: 'contact', label: 'Contact' }, { name: 'description', label: 'Description', type: 'textarea' }]} {...crud('services', 'Service')} />}
    </div>
  );
}
