import { useState } from 'react';
import { FileUp, FileText, Check, Trash2, Eye } from 'lucide-react';
import { useApp, useFeature } from '../store/AppContext';
import { Field, Modal, StatusBadge, Empty, StoredImg } from '../components/ui';
import { fmtDateTime, readFile, readImage } from '../utils/format';

const MAX_MB = 3;

// Pick a PDF, image or spreadsheet and turn it into something we can store.
function FilePicker({ value, name, onChange }) {
  const [err, setErr] = useState('');
  const pick = async (file) => {
    setErr('');
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024 && !file.type.startsWith('image/')) return setErr(`The file is larger than ${MAX_MB} MB. Please save a smaller PDF.`);
    const data = file.type.startsWith('image/') ? await readImage(file, 1600) : await readFile(file);
    onChange(data, file.name);
  };
  return (
    <div>
      <label className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-sand-300 p-4 cursor-pointer hover:border-brand-300 hover:bg-brand-50/40 transition">
        <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center"><FileUp size={18} /></span>
        <span className="text-sm"><b>{value ? name || 'File attached' : 'Choose the report file'}</b><span className="block text-xs text-ink-500">PDF, photo or Excel · up to {MAX_MB} MB</span></span>
        <input type="file" className="hidden" accept="application/pdf,image/*,.xlsx,.xls,.csv,.doc,.docx" onChange={(e) => pick(e.target.files[0])} />
      </label>
      {err && <div className="text-xs text-clay-600 mt-1">{err}</div>}
    </div>
  );
}

// Inside the institution's portal.
export function InstitutionReports({ institutionId }) {
  const { state, add, remove, toast, ask } = useApp();
  const on = useFeature('institutionReports');
  const [form, setForm] = useState(null);
  const list = state.institutionReports.filter((r) => r.institutionId === institutionId).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  if (!on) return <div className="card"><Empty>Report upload is switched off by the Mahall committee.</Empty></div>;

  const submit = (e) => {
    e.preventDefault();
    if (!form.file) return toast('Please choose the report file', 'error');
    add('institutionReports', { ...form, institutionId, status: 'submitted', remark: '', submittedAt: new Date().toISOString() });
    toast('Report sent to the Mahall committee'); setForm(null);
  };
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div><div className="font-display text-xl font-semibold">Financial reports</div><p className="text-sm text-ink-500 mt-1">Send your income & expense statements, audit reports or fee collections directly to the Mahall committee.</p></div>
        {!form && <button className="btn-primary" onClick={() => setForm({ title: '', period: '', notes: '', file: '', fileName: '' })}><FileUp size={16} />Upload a report</button>}
      </div>
      {form && (
        <form onSubmit={submit} className="card grid sm:grid-cols-2 gap-3 animate-fade-up">
          <Field label="Report title *"><input className="input" required placeholder="e.g. Income & expenditure statement" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Period *"><input className="input" required placeholder="e.g. April–September 2026" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></Field>
          <div className="sm:col-span-2"><FilePicker value={form.file} name={form.fileName} onChange={(file, fileName) => setForm({ ...form, file, fileName })} /></div>
          <Field label="Notes for the committee" className="sm:col-span-2"><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary">Submit to committee</button></div>
        </form>
      )}
      <div className="card">
        {list.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 py-3 border-b border-sand-200 last:border-0">
            <span className="w-10 h-10 rounded-xl bg-sand-100 text-ink-500 grid place-items-center"><FileText size={18} /></span>
            <div className="flex-1 min-w-0"><div className="font-semibold">{r.title} <span className="text-ink-400 font-normal">· {r.period}</span></div><div className="text-xs text-ink-500">Sent {fmtDateTime(r.submittedAt)}{r.reviewedAt && ` · reviewed ${fmtDateTime(r.reviewedAt)}`}</div>{r.remark && <div className="text-xs mt-1">Committee: {r.remark}</div>}</div>
            <StatusBadge status={r.status === 'reviewed' ? 'approved' : 'pending'} />
            {r.status === 'submitted' && <button className="p-2 rounded-full text-ink-400 hover:text-clay-600 hover:bg-clay-50" title="Withdraw" onClick={async () => { if (await ask({ title: 'Withdraw this report?', danger: true, okLabel: 'Withdraw' })) { remove('institutionReports', r.id); toast('Report withdrawn', 'info'); } }}><Trash2 size={15} /></button>}
          </div>
        ))}
        {!list.length && <Empty>No reports sent yet.</Empty>}
      </div>
    </div>
  );
}

// Admin: every institution's reports.
export function InstitutionReportsAdmin() {
  const { state, patch, toast } = useApp();
  const [view, setView] = useState(null);
  const [remark, setRemark] = useState('');
  const [inst, setInst] = useState('');
  const list = state.institutionReports.filter((r) => !inst || r.institutionId === inst).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  const name = (id) => state.institutions.find((i) => i.id === id)?.name || 'Institution';
  const review = () => { patch('institutionReports', view.id, { status: 'reviewed', remark, reviewedAt: new Date().toISOString() }); toast('Marked as reviewed'); setView(null); };
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1"><div className="font-display text-xl font-semibold">Institution financial reports</div><div className="text-xs text-ink-500">Reports uploaded by madrasas, colleges and centres from their portal.</div></div>
        <select className="input w-56" value={inst} onChange={(e) => setInst(e.target.value)}><option value="">All institutions</option>{state.institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
      </div>
      <div className="overflow-x-auto">
        <table className="table"><thead><tr><th>Received</th><th>Institution</th><th>Report</th><th>Status</th><th /></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id}><td className="text-xs">{fmtDateTime(r.submittedAt)}</td><td className="font-medium">{name(r.institutionId)}</td><td>{r.title}<div className="text-xs text-ink-500">{r.period}</div></td>
              <td><StatusBadge status={r.status === 'reviewed' ? 'approved' : 'pending'} /></td>
              <td className="text-right"><button className="btn-outline btn-sm" onClick={() => { setView(r); setRemark(r.remark || ''); }}><Eye size={12} />Open</button></td></tr>
          ))}</tbody></table>
      </div>
      {!list.length && <Empty>No reports received yet.</Empty>}
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `${name(view.institutionId)} – ${view.title}` : ''} wide>
        {view && (
          <div className="space-y-4 text-sm">
            <div className="text-ink-600">Period: <b>{view.period}</b> · sent {fmtDateTime(view.submittedAt)}{view.fileName && ` · ${view.fileName}`}</div>
            {view.notes && <div className="bg-sand-50 rounded-2xl p-3">{view.notes}</div>}
            <div className="text-center"><StoredImg col="institutionReports" id={view.id} field="file" value={view.file} fileName={view.fileName} className="max-h-[60vh] mx-auto rounded-xl border" /></div>
            <Field label="Remark for the institution"><input className="input" value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
            <div className="flex justify-end"><button className="btn-primary" onClick={review}><Check size={14} />{view.status === 'reviewed' ? 'Save remark' : 'Mark as reviewed'}</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
