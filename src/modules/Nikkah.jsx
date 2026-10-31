import { useState } from 'react';
import { FileHeart, FileDown, Check, X, Eye } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Field, Modal, StatusBadge, Empty, SectionTitle } from '../components/ui';
import { fmtDate, fmtDateTime, daysFromNow } from '../utils/format';
import { downloadPdf } from '../utils/pdf';

const person = () => ({ name: '', father: '', dob: '', phone: '', address: '', mahall: '', occupation: '' });
const blank = () => ({ groom: person(), bride: person(), date: daysFromNow(30), venue: '', mahr: '', wali: '', witness1: '', witness2: '', notes: '' });

export function nikkahPdf(state, a) {
  const p = (x) => [['Name', x.name], ["Father's name", x.father], ['Date of birth', fmtDate(x.dob)], ['Phone', x.phone], ['Address', x.address], ['Mahall', x.mahall], ['Occupation', x.occupation]];
  downloadPdf({
    org: state.masjid, title: 'Nikkah Application', subtitle: `Application No. ${a.id.toUpperCase()} · Status: ${a.status.toUpperCase()}`,
    blocks: [
      { heading: 'Groom' }, { kv: p(a.groom) },
      { heading: 'Bride' }, { kv: p(a.bride) },
      { heading: 'Nikkah details' },
      { kv: [['Proposed date', fmtDate(a.date)], ['Venue', a.venue], ['Mahr', a.mahr], ['Wali (guardian)', a.wali], ['Witness 1', a.witness1], ['Witness 2', a.witness2], ['Notes', a.notes || '-']] },
      { heading: 'Office use' },
      { kv: [['Submitted', fmtDateTime(a.createdAt)], ['Decision', a.status], ['Decided on', a.decidedAt ? fmtDateTime(a.decidedAt) : '-'], ['Remarks', a.remark || '-']] },
      { text: '\n\nSignature of Khateeb: ____________________          Signature of Secretary: ____________________' },
    ],
  }, `nikkah-${a.id}.pdf`);
}

function PersonFields({ title, value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <fieldset className="border rounded-lg p-4 grid sm:grid-cols-2 gap-3">
      <legend className="px-2 font-semibold text-brand-800">{title}</legend>
      <Field label="Full name *"><input className="input" required value={value.name} onChange={set('name')} /></Field>
      <Field label="Father's name *"><input className="input" required value={value.father} onChange={set('father')} /></Field>
      <Field label="Date of birth *"><input type="date" className="input" required value={value.dob} onChange={set('dob')} /></Field>
      <Field label="Phone"><input className="input" value={value.phone} onChange={set('phone')} /></Field>
      <Field label="Mahall"><input className="input" value={value.mahall} onChange={set('mahall')} /></Field>
      <Field label="Occupation"><input className="input" value={value.occupation} onChange={set('occupation')} /></Field>
      <Field label="Address" className="sm:col-span-2"><input className="input" value={value.address} onChange={set('address')} /></Field>
    </fieldset>
  );
}

const age = (dob) => (dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000)) : 0);

export default function NikkahPage() {
  const { state, user, add, toast } = useApp();
  const [form, setForm] = useState(null);
  const mine = state.nikkahApps.filter((a) => a.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const submit = (e) => {
    e.preventDefault();
    if (age(form.groom.dob) < 21 || age(form.bride.dob) < 18) return toast('Groom must be 21+ and bride 18+ as per law', 'error');
    add('nikkahApps', { ...form, userId: user.id, status: 'pending', remark: '', createdAt: new Date().toISOString() });
    toast('Nikkah application submitted'); setForm(null);
  };
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SectionTitle icon={FileHeart} title="Nikkah Application" subtitle="Fill the form, track approval, and download the PDF." action={!form && <button className="btn-primary" onClick={() => setForm(blank())}>New application</button>} />
      {form && (
        <form onSubmit={submit} className="card space-y-4 mb-6">
          <PersonFields title="Groom" value={form.groom} onChange={(v) => setForm({ ...form, groom: v })} />
          <PersonFields title="Bride" value={form.bride} onChange={(v) => setForm({ ...form, bride: v })} />
          <fieldset className="border rounded-lg p-4 grid sm:grid-cols-2 gap-3">
            <legend className="px-2 font-semibold text-brand-800">Nikkah details</legend>
            <Field label="Proposed date *"><input type="date" className="input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Venue *"><input className="input" required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></Field>
            <Field label="Mahr *"><input className="input" required placeholder="e.g. 10 sovereign gold" value={form.mahr} onChange={(e) => setForm({ ...form, mahr: e.target.value })} /></Field>
            <Field label="Wali (bride's guardian) *"><input className="input" required value={form.wali} onChange={(e) => setForm({ ...form, wali: e.target.value })} /></Field>
            <Field label="Witness 1 *"><input className="input" required value={form.witness1} onChange={(e) => setForm({ ...form, witness1: e.target.value })} /></Field>
            <Field label="Witness 2 *"><input className="input" required value={form.witness2} onChange={(e) => setForm({ ...form, witness2: e.target.value })} /></Field>
            <Field label="Notes" className="sm:col-span-2"><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </fieldset>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary">Submit application</button></div>
        </form>
      )}
      <div className="card">
        <h3 className="font-bold mb-3">My applications</h3>
        {mine.map((a) => (
          <div key={a.id} className="flex flex-wrap justify-between items-center gap-2 py-3 border-b last:border-0">
            <div><div className="font-semibold">{a.groom.name} & {a.bride.name}</div><div className="text-xs text-slate-500">Nikkah on {fmtDate(a.date)} at {a.venue} · submitted {fmtDateTime(a.createdAt)}</div>{a.remark && <div className="text-xs mt-1">Remark: {a.remark}</div>}</div>
            <div className="flex items-center gap-2"><StatusBadge status={a.status} /><button className="btn-outline btn-sm" onClick={() => nikkahPdf(state, a)}><FileDown size={12} />PDF</button></div>
          </div>
        ))}
        {!mine.length && <Empty>You have not applied yet.</Empty>}
      </div>
    </div>
  );
}

export function NikkahAdmin() {
  const { state, patch, toast, user } = useApp();
  const [status, setStatus] = useState('pending');
  const [view, setView] = useState(null);
  const [remark, setRemark] = useState('');
  const list = state.nikkahApps.filter((a) => !status || a.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const decide = (s) => {
    if (s === 'rejected' && !remark.trim()) return toast('Please give a reason for rejection', 'error');
    patch('nikkahApps', view.id, { status: s, remark, decidedAt: new Date().toISOString(), decidedBy: user.name });
    toast(`Application ${s}`); setView(null);
  };
  return (
    <div className="card">
      <div className="flex gap-2 mb-4">{['pending', 'approved', 'rejected', ''].map((s) => <button key={s} onClick={() => setStatus(s)} className={`btn-sm btn capitalize ${status === s ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>{s || 'All'}</button>)}</div>
      <table className="table"><thead><tr><th>Submitted</th><th>Couple</th><th>Nikkah date</th><th>Status</th><th /></tr></thead>
        <tbody>{list.map((a) => (
          <tr key={a.id}><td className="text-xs">{fmtDateTime(a.createdAt)}</td><td className="font-medium">{a.groom.name} & {a.bride.name}</td><td>{fmtDate(a.date)}<div className="text-xs text-slate-500">{a.venue}</div></td><td><StatusBadge status={a.status} />{a.remark && <div className="text-xs text-slate-500">{a.remark}</div>}</td>
            <td className="text-right whitespace-nowrap"><button className="btn-outline btn-sm mr-1" onClick={() => { setView(a); setRemark(a.remark || ''); }}><Eye size={12} />Review</button><button className="btn-outline btn-sm" onClick={() => nikkahPdf(state, a)}><FileDown size={12} /></button></td></tr>
        ))}</tbody></table>
      {!list.length && <Empty>No applications.</Empty>}
      <Modal open={!!view} onClose={() => setView(null)} title="Nikkah application" wide>
        {view && (
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              {['groom', 'bride'].map((k) => (
                <div key={k} className="bg-slate-50 rounded-lg p-3"><div className="font-bold capitalize mb-1">{k}</div>{Object.entries({ Name: view[k].name, Father: view[k].father, 'DOB / Age': `${fmtDate(view[k].dob)} (${age(view[k].dob)})`, Phone: view[k].phone, Mahall: view[k].mahall, Occupation: view[k].occupation, Address: view[k].address }).map(([l, v]) => <div key={l}><span className="text-slate-500">{l}:</span> {v || '—'}</div>)}</div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-lg p-3 grid sm:grid-cols-2 gap-1">{Object.entries({ Date: fmtDate(view.date), Venue: view.venue, Mahr: view.mahr, Wali: view.wali, 'Witness 1': view.witness1, 'Witness 2': view.witness2, Notes: view.notes }).map(([l, v]) => <div key={l}><span className="text-slate-500">{l}:</span> {v || '—'}</div>)}</div>
            <Field label="Remarks"><textarea className="input" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => nikkahPdf(state, view)}><FileDown size={14} />PDF</button>
              <button className="btn-danger" onClick={() => decide('rejected')}><X size={14} />Reject</button>
              <button className="btn-primary" onClick={() => decide('approved')}><Check size={14} />Approve</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
