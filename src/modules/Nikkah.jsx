import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FileHeart, FileDown, Check, X, Eye, Plus, Trash2, UserPlus, Receipt } from 'lucide-react';
import { useApp, useConfig, useFeature } from '../store/AppContext';
import { Field, Modal, StatusBadge, Empty, SectionTitle, ImageInput, StoredImg } from '../components/ui';
import { fmtDate, fmtDateTime, daysFromNow, inr, pdfInr, uid } from '../utils/format';
import { downloadPdf } from '../utils/pdf';

const person = () => ({ name: '', father: '', mother: '', dob: '', phone: '', address: '', mahall: '', occupation: '', education: '' });
const witness = () => ({ name: '', address: '', phone: '', idType: 'Aadhaar', idNumber: '', notes: '' });
const blank = () => ({
  groom: person(), bride: person(), date: daysFromNow(30), venue: '', mahr: '',
  wali: '', waliAddress: '', waliRelation: '', witnesses: [witness(), witness()], notes: '',
  feeChoice: 'upload', feeReceipt: '', feeUtr: '',
});
const ID_TYPES = ['Aadhaar', 'Voter ID', 'Passport', 'Driving licence', 'PAN', 'Other'];

// All witnesses of an application (older applications stored only two names).
const witnessesOf = (a) => (a.witnesses?.length ? a.witnesses : [a.witness1, a.witness2].filter(Boolean).map((name) => ({ name })));
const feeLabel = (a) => (!Number(a.feeAmount) ? 'No fee' : { verified: 'Fee verified', submitted: 'Receipt submitted', unpaid: 'Pay at office' }[a.feeStatus] || 'Fee pending');

export function nikkahPdf(state, a) {
  const p = (x) => [['Name', x.name], ["Father's name", x.father], ["Mother's name", x.mother || '-'], ['Date of birth', fmtDate(x.dob)], ['Education & qualification', x.education || '-'], ['Occupation', x.occupation || '-'], ['Phone', x.phone || '-'], ['Address', x.address || '-'], ['Mahall', x.mahall || '-']];
  const ws = witnessesOf(a);
  downloadPdf({
    org: state.masjid, title: 'Nikkah Application', subtitle: `Application No. ${a.id.toUpperCase()} · Status: ${a.status.toUpperCase()}`,
    blocks: [
      { heading: 'Groom' }, { kv: p(a.groom) },
      { heading: 'Bride' }, { kv: p(a.bride) },
      { heading: 'Waliyy (guardian of the bride)' },
      { kv: [['Name', a.wali], ['Relationship / family position', a.waliRelation || '-'], ['Full address', a.waliAddress || '-']] },
      { heading: `Witnesses (${ws.length})` },
      { table: { head: ['#', 'Full name', 'Address', 'Phone', 'ID', 'Notes'], body: ws.map((w, i) => [i + 1, w.name, w.address || '', w.phone || '', w.idNumber ? `${w.idType || ''} ${w.idNumber}` : '', w.notes || '']) } },
      { heading: 'Nikkah details' },
      { kv: [['Proposed date', fmtDate(a.date)], ['Venue', a.venue], ['Mahr', a.mahr], ['Notes', a.notes || '-']] },
      { heading: 'Registration fee' },
      { kv: [['Fee', Number(a.feeAmount) ? pdfInr(a.feeAmount) : 'No fee'], ['Payment', feeLabel(a)], ['UPI reference', a.feeUtr || '-']] },
      { heading: 'Office use' },
      { kv: [['Submitted', fmtDateTime(a.createdAt)], ['Decision', a.status], ['Decided on', a.decidedAt ? fmtDateTime(a.decidedAt) : '-'], ['Decided by', a.decidedBy || '-'], ['Remarks', a.remark || '-']] },
      { text: '\n\nSignature of Khateeb: ____________________          Signature of Secretary: ____________________' },
    ],
  }, `nikkah-${a.id}.pdf`);
}

function PersonFields({ title, value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <fieldset className="rounded-3xl border border-sand-200 p-5 grid sm:grid-cols-2 gap-3">
      <legend className="px-2 font-display text-lg font-semibold text-brand-800">{title}</legend>
      <Field label="Full name *"><input className="input" required value={value.name} onChange={set('name')} /></Field>
      <Field label="Date of birth *"><input type="date" className="input" required value={value.dob} onChange={set('dob')} /></Field>
      <Field label="Father's name *"><input className="input" required value={value.father} onChange={set('father')} /></Field>
      <Field label="Mother's name *"><input className="input" required value={value.mother} onChange={set('mother')} /></Field>
      <Field label="Education & qualification *" className="sm:col-span-2"><input className="input" required placeholder="e.g. B.Com, Plus Two, Hafiz, Diploma in…" value={value.education} onChange={set('education')} /></Field>
      <Field label="Occupation"><input className="input" value={value.occupation} onChange={set('occupation')} /></Field>
      <Field label="Phone"><input className="input" inputMode="tel" value={value.phone} onChange={set('phone')} /></Field>
      <Field label="Mahall"><input className="input" value={value.mahall} onChange={set('mahall')} /></Field>
      <Field label="Address"><input className="input" value={value.address} onChange={set('address')} /></Field>
    </fieldset>
  );
}

const age = (dob) => (dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000)) : 0);

export default function NikkahPage() {
  const { state, user, add, toast } = useApp();
  const config = useConfig();
  const enabled = useFeature('nikkah', { forAdmins: true });
  const feeOn = useFeature('nikkahFee');
  const fee = feeOn ? Number(config.nikkahFee || 0) : 0;
  const feeUpi = config.nikkahFeeUpi || state.donationChannels[0]?.upi || '';
  const [form, setForm] = useState(null);
  const mine = state.nikkahApps.filter((a) => a.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const setW = (i, k, v) => setForm({ ...form, witnesses: form.witnesses.map((w, j) => (j === i ? { ...w, [k]: v } : w)) });

  const submit = (e) => {
    e.preventDefault();
    if (age(form.groom.dob) < 21 || age(form.bride.dob) < 18) return toast('Groom must be 21+ and bride 18+ as per law', 'error');
    if (form.witnesses.length < 2) return toast('Please add at least two witnesses', 'error');
    if (fee > 0 && form.feeChoice === 'upload' && !form.feeReceipt) return toast('Attach the payment receipt, or choose "I will pay at the office"', 'error');
    const { feeChoice, ...rest } = form;
    add('nikkahApps', {
      ...rest, feeReceipt: fee > 0 && feeChoice === 'upload' ? form.feeReceipt : '', feeUtr: fee > 0 ? form.feeUtr : '',
      feeAmount: fee, feeStatus: fee > 0 ? (feeChoice === 'upload' ? 'submitted' : 'unpaid') : '',
      userId: user.id, status: 'pending', remark: '', createdAt: new Date().toISOString(),
    });
    toast('Nikkah application submitted. May Allah bless the couple.'); setForm(null);
  };

  if (!enabled) return <div className="max-w-md mx-auto my-20 card text-center p-8"><div className="text-3xl">🌙</div><h2 className="font-display text-2xl mt-2">Nikkah applications are not open online</h2><p className="text-sm text-ink-500 mt-2">Please contact the Mahall office.</p></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SectionTitle icon={FileHeart} title="Nikkah application" subtitle="Fill in the details of the couple, the Waliyy and the witnesses. You can follow the approval here and download the form as PDF." action={!form && <button className="btn-primary" onClick={() => setForm(blank())}><Plus size={16} />New application</button>} />
      {form && (
        <form onSubmit={submit} className="card space-y-5 mb-6 animate-fade-up">
          <PersonFields title="Groom" value={form.groom} onChange={(v) => setForm({ ...form, groom: v })} />
          <PersonFields title="Bride" value={form.bride} onChange={(v) => setForm({ ...form, bride: v })} />

          <fieldset className="rounded-3xl border border-sand-200 p-5 grid sm:grid-cols-2 gap-3">
            <legend className="px-2 font-display text-lg font-semibold text-brand-800">Waliyy details</legend>
            <Field label="Waliyy's full name *"><input className="input" required value={form.wali} onChange={(e) => setForm({ ...form, wali: e.target.value })} /></Field>
            <Field label="Family position / relationship to the bride *">
              <input className="input" required list="wali-relations" placeholder="e.g. Father, Grandfather, Brother" value={form.waliRelation} onChange={(e) => setForm({ ...form, waliRelation: e.target.value })} />
              <datalist id="wali-relations">{['Father', 'Paternal grandfather', 'Brother', 'Paternal uncle', "Uncle's son", 'Qazi / Khateeb'].map((r) => <option key={r} value={r} />)}</datalist>
            </Field>
            <Field label="Full address *" className="sm:col-span-2"><textarea className="input" rows={2} required value={form.waliAddress} onChange={(e) => setForm({ ...form, waliAddress: e.target.value })} /></Field>
          </fieldset>

          <fieldset className="rounded-3xl border border-sand-200 p-5 space-y-3">
            <legend className="px-2 font-display text-lg font-semibold text-brand-800">Witness details</legend>
            <p className="text-xs text-ink-500">At least two adult witnesses. Add as many as you need.</p>
            {form.witnesses.map((w, i) => (
              <div key={i} className="rounded-2xl bg-sand-50 border border-sand-200 p-4 grid sm:grid-cols-6 gap-3">
                <div className="sm:col-span-6 flex items-center justify-between"><span className="text-sm font-bold text-ink-700">Witness {i + 1}</span>
                  {form.witnesses.length > 2 && <button type="button" className="text-ink-400 hover:text-clay-600 p-1" onClick={() => setForm({ ...form, witnesses: form.witnesses.filter((_, j) => j !== i) })} aria-label="Remove witness"><Trash2 size={15} /></button>}</div>
                <Field label="Full name *" className="sm:col-span-3"><input className="input" required value={w.name} onChange={(e) => setW(i, 'name', e.target.value)} /></Field>
                <Field label="Phone *" className="sm:col-span-3"><input className="input" required inputMode="tel" value={w.phone} onChange={(e) => setW(i, 'phone', e.target.value)} /></Field>
                <Field label="Full address *" className="sm:col-span-6"><input className="input" required value={w.address} onChange={(e) => setW(i, 'address', e.target.value)} /></Field>
                <Field label="ID type" className="sm:col-span-2"><select className="input" value={w.idType} onChange={(e) => setW(i, 'idType', e.target.value)}>{ID_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                <Field label="ID number *" className="sm:col-span-4"><input className="input" required value={w.idNumber} onChange={(e) => setW(i, 'idNumber', e.target.value)} /></Field>
                <Field label="Notes" className="sm:col-span-6"><input className="input" placeholder="e.g. Groom's uncle, member of MH-012" value={w.notes} onChange={(e) => setW(i, 'notes', e.target.value)} /></Field>
              </div>
            ))}
            <button type="button" className="btn-outline btn-sm" onClick={() => setForm({ ...form, witnesses: [...form.witnesses, witness()] })}><UserPlus size={13} />Add another witness</button>
          </fieldset>

          <fieldset className="rounded-3xl border border-sand-200 p-5 grid sm:grid-cols-2 gap-3">
            <legend className="px-2 font-display text-lg font-semibold text-brand-800">Nikkah details</legend>
            <Field label="Proposed date *"><input type="date" className="input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Venue *"><input className="input" required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></Field>
            <Field label="Mahr *" className="sm:col-span-2"><input className="input" required placeholder="e.g. 10 sovereign gold" value={form.mahr} onChange={(e) => setForm({ ...form, mahr: e.target.value })} /></Field>
            <Field label="Notes" className="sm:col-span-2"><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </fieldset>

          {fee > 0 && (
            <fieldset className="rounded-3xl border-2 border-gold-200 bg-gold-50/60 p-5 space-y-4">
              <legend className="px-2 font-display text-lg font-semibold text-gold-600">Marriage registration fee</legend>
              <div className="flex flex-wrap items-center gap-5">
                <div><div className="text-xs text-ink-500">Registration fee</div><div className="text-3xl font-extrabold text-ink-900">{inr(fee)}</div></div>
                {feeUpi && <div className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-sand-200"><QRCodeSVG value={`upi://pay?pa=${feeUpi}&pn=${encodeURIComponent(state.masjid.name)}&am=${fee}&tn=Nikkah%20registration`} size={88} /><div className="text-xs"><div className="text-ink-500">Pay by UPI to</div><div className="font-mono font-semibold">{feeUpi}</div></div></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                {[['upload', 'I have paid – attach receipt'], ['office', 'I will pay at the office']].map(([v, l]) => (
                  <button type="button" key={v} onClick={() => setForm({ ...form, feeChoice: v })} className={`btn btn-sm ${form.feeChoice === v ? 'bg-brand-600 text-white' : 'bg-white border border-sand-300 text-ink-700'}`}>{l}</button>
                ))}
              </div>
              {form.feeChoice === 'upload' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Payment receipt / screenshot *"><ImageInput value={form.feeReceipt} onChange={(v) => setForm({ ...form, feeReceipt: v })} label="Attach receipt" accept="image/*,application/pdf" /></Field>
                  <Field label="UPI reference / UTR (optional)"><input className="input" value={form.feeUtr} onChange={(e) => setForm({ ...form, feeUtr: e.target.value })} /></Field>
                </div>
              )}
            </fieldset>
          )}
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary">Submit application</button></div>
        </form>
      )}
      <div className="card">
        <h3 className="h2 mb-3">My applications</h3>
        {mine.map((a) => (
          <div key={a.id} className="flex flex-wrap justify-between items-center gap-2 py-3 border-b border-sand-200 last:border-0">
            <div><div className="font-semibold">{a.groom.name} & {a.bride.name}</div><div className="text-xs text-ink-500">Nikkah on {fmtDate(a.date)} at {a.venue} · submitted {fmtDateTime(a.createdAt)}</div>{Number(a.feeAmount) > 0 && <div className="text-xs mt-1">Fee {inr(a.feeAmount)} · {feeLabel(a)}</div>}{a.remark && <div className="text-xs mt-1">Remark: {a.remark}</div>}</div>
            <div className="flex items-center gap-2"><StatusBadge status={a.status} /><button className="btn-outline btn-sm" onClick={() => nikkahPdf(state, a)}><FileDown size={12} />PDF</button></div>
          </div>
        ))}
        {!mine.length && <Empty>You have not applied yet.</Empty>}
      </div>
    </div>
  );
}

// Fee amount and UPI used on the Nikkah form (admin only).
function FeeSettings() {
  const { update, toast } = useApp();
  const config = useConfig();
  const [f, setF] = useState({ nikkahFee: config.nikkahFee, nikkahFeeUpi: config.nikkahFeeUpi });
  return (
    <form className="card mb-5 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); update((s) => { s.config = { ...config, nikkahFee: Number(f.nikkahFee) || 0, nikkahFeeUpi: f.nikkahFeeUpi.trim() }; }); toast('Registration fee saved'); }}>
      <div className="flex-1 min-w-[200px]"><div className="font-display text-lg font-semibold">Marriage registration fee</div><div className="text-xs text-ink-500">Shown on the Nikkah form (can be hidden in Features & visibility).</div></div>
      <Field label="Fee (₹)"><input type="number" min="0" className="input w-32" value={f.nikkahFee} onChange={(e) => setF({ ...f, nikkahFee: e.target.value })} /></Field>
      <Field label="UPI ID for the fee"><input className="input w-56" placeholder="(first donation UPI)" value={f.nikkahFeeUpi} onChange={(e) => setF({ ...f, nikkahFeeUpi: e.target.value })} /></Field>
      <button className="btn-primary">Save</button>
    </form>
  );
}

export function NikkahAdmin({ readOnly = false }) {
  const { state, patch, update, toast, user } = useApp();
  const isAdmin = user.role === 'admin';
  const [status, setStatus] = useState('pending');
  const [view, setView] = useState(null);
  const [remark, setRemark] = useState('');
  const [postFee, setPostFee] = useState(true);
  const list = state.nikkahApps.filter((a) => !status || a.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const decide = (s) => {
    if (s === 'rejected' && !remark.trim()) return toast('Please give a reason for rejection', 'error');
    patch('nikkahApps', view.id, { status: s, remark, decidedAt: new Date().toISOString(), decidedBy: user.name });
    toast(`Application ${s}`); setView(null);
  };
  // Mark the fee as received; admins also record it in the ledger (it gets a receipt number).
  const verifyFee = () => {
    update((s) => {
      const a = s.nikkahApps.find((x) => x.id === view.id);
      a.feeStatus = 'verified';
      if (isAdmin && postFee && Number(a.feeAmount) > 0) {
        s.transactions.push({ id: uid('txn'), date: new Date().toISOString().slice(0, 10), type: 'income', head: s.accountHeads[0] || 'General Fund', amount: Number(a.feeAmount), description: `Nikkah registration fee – ${a.groom.name} & ${a.bride.name}`, receipt: a.feeReceipt, ref: a.id });
      }
    });
    setView({ ...view, feeStatus: 'verified' });
    toast(isAdmin && postFee ? 'Fee verified and added to the accounts' : 'Fee marked as verified');
  };

  return (
    <div>
      {isAdmin && <FeeSettings />}
      <div className="card">
        <div className="flex flex-wrap gap-2 mb-4">{['pending', 'approved', 'rejected', ''].map((s) => <button key={s} onClick={() => setStatus(s)} className={`btn-sm btn capitalize ${status === s ? 'bg-brand-600 text-white' : 'bg-sand-100 text-ink-600'}`}>{s || 'All'}</button>)}</div>
        <div className="overflow-x-auto">
          <table className="table"><thead><tr><th>Submitted</th><th>Couple</th><th>Nikkah date</th><th>Fee</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((a) => (
              <tr key={a.id}><td className="text-xs">{fmtDateTime(a.createdAt)}</td><td className="font-medium">{a.groom.name} & {a.bride.name}</td><td>{fmtDate(a.date)}<div className="text-xs text-ink-500">{a.venue}</div></td>
                <td className="text-xs">{Number(a.feeAmount) ? <>{inr(a.feeAmount)}<div className={a.feeStatus === 'verified' ? 'text-brand-700 font-semibold' : 'text-gold-600'}>{feeLabel(a)}</div></> : '—'}</td>
                <td><StatusBadge status={a.status} />{a.remark && <div className="text-xs text-ink-500">{a.remark}</div>}</td>
                <td className="text-right whitespace-nowrap"><button className="btn-outline btn-sm mr-1" onClick={() => { setView(a); setRemark(a.remark || ''); }}><Eye size={12} />{readOnly ? 'View' : 'Review'}</button><button className="btn-outline btn-sm" onClick={() => nikkahPdf(state, a)}><FileDown size={12} /></button></td></tr>
            ))}</tbody></table>
        </div>
        {!list.length && <Empty>No applications.</Empty>}
      </div>
      <Modal open={!!view} onClose={() => setView(null)} title="Nikkah application" wide>
        {view && (
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              {['groom', 'bride'].map((k) => (
                <div key={k} className="bg-sand-50 rounded-2xl p-4 space-y-0.5"><div className="font-display text-base font-semibold capitalize mb-1">{k}</div>{Object.entries({ Name: view[k].name, Father: view[k].father, Mother: view[k].mother, 'DOB / Age': `${fmtDate(view[k].dob)} (${age(view[k].dob)})`, Education: view[k].education, Occupation: view[k].occupation, Phone: view[k].phone, Mahall: view[k].mahall, Address: view[k].address }).map(([l, v]) => <div key={l}><span className="text-ink-500">{l}:</span> {v || '—'}</div>)}</div>
              ))}
            </div>
            <div className="bg-sand-50 rounded-2xl p-4"><div className="font-display text-base font-semibold mb-1">Waliyy</div><div><span className="text-ink-500">Name:</span> {view.wali || '—'} · <span className="text-ink-500">Relationship:</span> {view.waliRelation || '—'}</div><div><span className="text-ink-500">Address:</span> {view.waliAddress || '—'}</div></div>
            <div className="bg-sand-50 rounded-2xl p-4">
              <div className="font-display text-base font-semibold mb-2">Witnesses ({witnessesOf(view).length})</div>
              <div className="space-y-2">{witnessesOf(view).map((w, i) => <div key={i} className="rounded-xl bg-white p-3 border border-sand-200"><b>{i + 1}. {w.name}</b>{w.phone && ` · ${w.phone}`}{w.idNumber && <span className="text-ink-500"> · {w.idType} {w.idNumber}</span>}{w.address && <div className="text-xs text-ink-500">{w.address}</div>}{w.notes && <div className="text-xs italic text-ink-500">{w.notes}</div>}</div>)}</div>
            </div>
            <div className="bg-sand-50 rounded-2xl p-4 grid sm:grid-cols-2 gap-1">{Object.entries({ Date: fmtDate(view.date), Venue: view.venue, Mahr: view.mahr, Notes: view.notes }).map(([l, v]) => <div key={l}><span className="text-ink-500">{l}:</span> {v || '—'}</div>)}</div>
            {Number(view.feeAmount) > 0 && (
              <div className="rounded-2xl border-2 border-gold-200 bg-gold-50/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3"><Receipt size={16} className="text-gold-600" /><b>Registration fee {inr(view.feeAmount)}</b><span className="badge bg-white text-ink-700">{feeLabel(view)}</span>{view.feeUtr && <span className="text-xs text-ink-500">UTR {view.feeUtr}</span>}</div>
                {view.feeReceipt && <div className="text-center"><StoredImg col="nikkahApps" id={view.id} field="feeReceipt" value={view.feeReceipt} className="max-h-64 mx-auto rounded-xl border" /></div>}
                {!readOnly && view.feeStatus !== 'verified' && (
                  <div className="flex flex-wrap items-center gap-3">
                    {isAdmin && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={postFee} onChange={(e) => setPostFee(e.target.checked)} />Add to accounts as income (gets a receipt number)</label>}
                    <button className="btn-gold btn-sm" onClick={verifyFee}><Check size={12} />Fee received</button>
                  </div>
                )}
              </div>
            )}
            {!readOnly && <Field label="Remarks"><textarea className="input" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>}
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => nikkahPdf(state, view)}><FileDown size={14} />PDF</button>
              {!readOnly && <><button className="btn-danger" onClick={() => decide('rejected')}><X size={14} />Reject</button><button className="btn-primary" onClick={() => decide('approved')}><Check size={14} />Approve</button></>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
