import { useState } from 'react';
import { HomeIcon, Plus, Trash2, FileDown, Check, X, Eye, MapPin } from 'lucide-react';
import { useApp, useFeature } from '../store/AppContext';
import { MapEmbed } from '../screens/Dashboard';
import { Field, Modal, StatusBadge, Empty, SectionTitle } from '../components/ui';
import { fmtDateTime, uid } from '../utils/format';
import { downloadPdf } from '../utils/pdf';

const blank = (user) => ({ applicant: user?.name || '', phone: '', currentAddress: '', newAddress: '', ward: 'Ward 1', lat: '', lng: '', gpsAccuracy: '', gpsCapturedAt: '', reason: '', family: [{ name: user?.name || '', age: '', relation: 'Self', gender: 'Male' }] });

const counters = (state) => ({ homes: state.households.length, people: state.households.reduce((a, h) => a + Number(h.members || 0), 0) });

export function homeAppPdf(state, a) {
  const c = counters(state);
  downloadPdf({
    org: state.masjid, title: 'New Home Number Application', subtitle: `Application No. ${a.id.toUpperCase()} · Status: ${a.status.toUpperCase()}${a.homeNo ? ` · Home No. ${a.homeNo}` : ''}`,
    blocks: [
      { kv: [['Applicant', a.applicant], ['Phone', a.phone], ['Current address', a.currentAddress], ['New home address', a.newAddress], ['Ward', a.ward], ['GPS location', a.lat && a.lng ? `${a.lat}, ${a.lng}${a.gpsAccuracy ? ` (±${a.gpsAccuracy} m)` : ''}` : '-'], ['GPS captured', a.gpsCapturedAt ? fmtDateTime(a.gpsCapturedAt) : 'Not captured live'], ['Reason', a.reason || '-']] },
      { heading: `Family members (${a.family.length})` },
      { table: { head: ['#', 'Name', 'Age', 'Gender', 'Relation'], body: a.family.map((f, i) => [i + 1, f.name, f.age, f.gender, f.relation]) } },
      { heading: 'Office use' },
      { kv: [['Submitted', fmtDateTime(a.createdAt)], ['Decision', a.status], ['Assigned home number', a.homeNo || '-'], ['Remarks', a.remark || '-']] },
      { heading: 'Mahall register (as of today)' },
      { kv: [['Registered homes', String(c.homes)], ['Community members', String(c.people)]] },
    ],
  }, `home-application-${a.id}.pdf`);
}

export default function HomeApplyPage() {
  const { state, user, add, toast } = useApp();
  const [form, setForm] = useState(null);
  const mine = state.homeApps.filter((a) => a.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const setF = (i, k, v) => setForm({ ...form, family: form.family.map((f, j) => (j === i ? { ...f, [k]: v } : f)) });
  const gpsRequired = useFeature('homeGpsRequired');
  const enabled = useFeature('homeApplication', { forAdmins: true });
  const [gps, setGps] = useState({ busy: false, error: '' });
  // Live GPS from the phone. High accuracy, never a cached position.
  const locate = () => {
    if (!navigator.geolocation) return setGps({ busy: false, error: 'This device or browser cannot share its location.' });
    setGps({ busy: true, error: '' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setForm((f) => ({ ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6), gpsAccuracy: Math.round(p.coords.accuracy), gpsCapturedAt: new Date().toISOString() }));
        setGps({ busy: false, error: '' });
      },
      (err) => setGps({ busy: false, error: err.code === 1 ? 'Location permission was refused. Allow location for this site in your browser settings and try again.' : 'Could not get your location. Go outside or near a window and try again.' }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };
  const submit = (e) => {
    e.preventDefault();
    if (!form.family.length) return toast('Add at least one family member', 'error');
    if (gpsRequired && !form.gpsCapturedAt) return toast('Please stand near your home and tap "Capture my live location" first', 'error');
    add('homeApps', { ...form, userId: user.id, status: 'pending', remark: '', createdAt: new Date().toISOString() });
    toast('Application submitted'); setForm(null);
  };
  if (!enabled) return <div className="max-w-md mx-auto my-20 card text-center p-8"><div className="text-3xl">🏠</div><h2 className="font-display text-2xl mt-2">New home registration is not open online</h2><p className="text-sm text-ink-500 mt-2">Please contact the Mahall office.</p></div>;
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SectionTitle icon={HomeIcon} title="New Home Number Application" subtitle="Register a new household with the Mahall." action={!form && <button className="btn-primary" onClick={() => setForm(blank(user))}>New application</button>} />
      {form && (
        <form onSubmit={submit} className="card space-y-4 mb-6">
          <div className="rounded-3xl border-2 border-clay-400 bg-clay-50 p-5 flex flex-col sm:flex-row gap-4 sm:items-center" role="alert">
            <div className="w-12 h-12 rounded-2xl bg-clay-500 text-white grid place-items-center shrink-0"><MapPin size={22} /></div>
            <div className="flex-1">
              <div className="font-display text-lg font-semibold text-clay-600">Disclaimer: You must physically stand near your home while filling out this application</div>
              <p className="text-sm text-ink-600 mt-1">We record the live GPS position of your phone so the committee can find the house. {gpsRequired ? 'The application cannot be sent without it.' : ''}</p>
            </div>
            <button type="button" className="btn-danger shrink-0" onClick={locate} disabled={gps.busy}>{gps.busy ? 'Finding you…' : form.gpsCapturedAt ? 'Capture again' : 'Capture my live location'}</button>
          </div>
          {gps.error && <div className="text-sm text-clay-600 bg-clay-50 rounded-2xl px-4 py-2.5">{gps.error}</div>}
          {form.gpsCapturedAt && (
            <div className="rounded-3xl border border-brand-200 bg-brand-50 p-4 grid md:grid-cols-2 gap-4 items-center">
              <div className="text-sm space-y-1">
                <div className="font-semibold text-brand-800">✓ Live location captured</div>
                <div className="font-mono text-xs">{form.lat}, {form.lng}</div>
                <div className="text-xs text-ink-500">Accuracy about {form.gpsAccuracy} m · {fmtDateTime(form.gpsCapturedAt)}</div>
                {form.gpsAccuracy > 100 && <div className="text-xs text-gold-600">Accuracy is low. Step outside and capture again for a better position.</div>}
              </div>
              <MapEmbed lat={Number(form.lat)} lng={Number(form.lng)} className="h-40 rounded-2xl border-0" />
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Applicant (head of family) *"><input className="input" required value={form.applicant} onChange={(e) => setForm({ ...form, applicant: e.target.value })} /></Field>
            <Field label="Phone *"><input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Current address *"><input className="input" required value={form.currentAddress} onChange={(e) => setForm({ ...form, currentAddress: e.target.value })} /></Field>
            <Field label="New home address *"><input className="input" required value={form.newAddress} onChange={(e) => setForm({ ...form, newAddress: e.target.value })} /></Field>
            <Field label="Ward"><select className="input" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })}>{['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'].map((w) => <option key={w}>{w}</option>)}</select></Field>
            <div className="flex gap-2 items-end">
              <Field label="Latitude (from GPS)" className="flex-1"><input className="input bg-sand-50" readOnly={gpsRequired} value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value, gpsCapturedAt: '' })} /></Field>
              <Field label="Longitude (from GPS)" className="flex-1"><input className="input bg-sand-50" readOnly={gpsRequired} value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value, gpsCapturedAt: '' })} /></Field>
            </div>
            <Field label="Reason (new house, separated family, moved in …)" className="sm:col-span-2"><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2"><span className="font-semibold">Family members ({form.family.length})</span><button type="button" className="btn-outline btn-sm" onClick={() => setForm({ ...form, family: [...form.family, { name: '', age: '', relation: '', gender: 'Male' }] })}><Plus size={12} />Add member</button></div>
            <div className="space-y-2">
              {form.family.map((f, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input className="input col-span-4" placeholder="Name *" required value={f.name} onChange={(e) => setF(i, 'name', e.target.value)} />
                  <input className="input col-span-2" type="number" min="0" placeholder="Age *" required value={f.age} onChange={(e) => setF(i, 'age', e.target.value)} />
                  <select className="input col-span-2" value={f.gender} onChange={(e) => setF(i, 'gender', e.target.value)}><option>Male</option><option>Female</option></select>
                  <input className="input col-span-3" placeholder="Relation *" required value={f.relation} onChange={(e) => setF(i, 'relation', e.target.value)} />
                  <button type="button" className="col-span-1 text-slate-400 hover:text-red-600" onClick={() => setForm({ ...form, family: form.family.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary">Submit application</button></div>
        </form>
      )}
      <div className="card">
        <h3 className="font-bold mb-3">My applications</h3>
        {mine.map((a) => (
          <div key={a.id} className="flex flex-wrap justify-between items-center gap-2 py-3 border-b last:border-0">
            <div><div className="font-semibold">{a.applicant} · {a.family.length} members</div><div className="text-xs text-slate-500">{a.newAddress} · submitted {fmtDateTime(a.createdAt)}</div>{a.homeNo && <div className="text-sm text-brand-700 font-semibold mt-1">Home number: {a.homeNo}</div>}{a.remark && <div className="text-xs mt-1">Remark: {a.remark}</div>}</div>
            <div className="flex items-center gap-2"><StatusBadge status={a.status} /><button className="btn-outline btn-sm" onClick={() => homeAppPdf(state, a)}><FileDown size={12} />PDF</button></div>
          </div>
        ))}
        {!mine.length && <Empty>You have not applied yet.</Empty>}
      </div>
    </div>
  );
}

export function HomeAppsAdmin({ readOnly = false }) {
  const { state, update, patch, toast } = useApp();
  const [status, setStatus] = useState('pending');
  const [view, setView] = useState(null);
  const list = state.homeApps.filter((a) => !status || a.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const nextNo = () => 'MH-' + String(Math.max(0, ...state.households.map((h) => parseInt(String(h.homeNo).replace(/\D/g, ''), 10) || 0)) + 1).padStart(3, '0');

  const approve = () => {
    if (state.households.some((h) => h.homeNo === view.homeNo)) return toast('That home number is already used', 'error');
    let approved;
    update((s) => {
      const hid = uid('h');
      s.households.push({ id: hid, homeNo: view.homeNo, headName: view.applicant, members: view.family.length, phone: view.phone, ward: view.ward, address: view.newAddress, lat: view.lat, lng: view.lng, family: view.family });
      const a = s.homeApps.find((x) => x.id === view.id);
      Object.assign(a, { status: 'approved', homeNo: view.homeNo, remark: view.remark, decidedAt: new Date().toISOString(), householdId: hid });
      const u = s.users.find((x) => x.id === a.userId);
      if (u && u.role === 'individual' && !u.householdId) u.householdId = hid;
      approved = { state: s, app: { ...a } };
    });
    toast(`Approved – household ${view.homeNo} created, dashboard counters updated`);
    setView(null);
    setTimeout(() => approved && homeAppPdf(approved.state, approved.app), 0);
  };
  const reject = () => { if (!view.remark?.trim()) return toast('Give a reason for rejection', 'error'); patch('homeApps', view.id, { status: 'rejected', remark: view.remark, decidedAt: new Date().toISOString() }); toast('Application rejected'); setView(null); };

  return (
    <div className="card">
      <div className="flex gap-2 mb-4">{['pending', 'approved', 'rejected', ''].map((s) => <button key={s} onClick={() => setStatus(s)} className={`btn-sm btn capitalize ${status === s ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>{s || 'All'}</button>)}</div>
      <table className="table"><thead><tr><th>Submitted</th><th>Applicant</th><th>Members</th><th>Address</th><th>Status</th><th /></tr></thead>
        <tbody>{list.map((a) => (
          <tr key={a.id}><td className="text-xs">{fmtDateTime(a.createdAt)}</td><td className="font-medium">{a.applicant}<div className="text-xs text-slate-500">{a.phone}</div></td><td>{a.family.length}</td><td className="text-xs">{a.newAddress}<div>{a.ward}</div></td><td><StatusBadge status={a.status} />{a.homeNo && <div className="text-xs font-semibold text-brand-700">{a.homeNo}</div>}</td>
            <td className="text-right whitespace-nowrap"><button className="btn-outline btn-sm mr-1" onClick={() => setView({ ...a, homeNo: a.homeNo || nextNo(), remark: a.remark || '' })}><Eye size={12} />{readOnly ? 'View' : 'Review'}</button><button className="btn-outline btn-sm" onClick={() => homeAppPdf(state, a)}><FileDown size={12} /></button></td></tr>
        ))}</tbody></table>
      {!list.length && <Empty>No applications.</Empty>}
      <Modal open={!!view} onClose={() => setView(null)} title="New home application" wide>
        {view && (
          <div className="space-y-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg">{Object.entries({ Applicant: view.applicant, Phone: view.phone, 'Current address': view.currentAddress, 'New address': view.newAddress, Ward: view.ward, Location: view.lat ? `${view.lat}, ${view.lng}${view.gpsAccuracy ? ` (±${view.gpsAccuracy} m, live GPS ${fmtDateTime(view.gpsCapturedAt)})` : ' (typed, not live GPS)'}` : '—', Reason: view.reason }).map(([l, v]) => <div key={l}><span className="text-slate-500">{l}:</span> {v || '—'}</div>)}</div>
            {view.lat && view.lng && <MapEmbed lat={Number(view.lat)} lng={Number(view.lng)} className="h-48 rounded-2xl" />}
            <table className="table"><thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Relation</th></tr></thead><tbody>{view.family.map((f, i) => <tr key={i}><td>{f.name}</td><td>{f.age}</td><td>{f.gender}</td><td>{f.relation}</td></tr>)}</tbody></table>
            {view.status === 'pending' && !readOnly ? (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Assign home number"><input className="input" value={view.homeNo} onChange={(e) => setView({ ...view, homeNo: e.target.value })} /></Field>
                  <Field label="Remarks"><input className="input" value={view.remark} onChange={(e) => setView({ ...view, remark: e.target.value })} /></Field>
                </div>
                <div className="flex justify-end gap-2"><button className="btn-danger" onClick={reject}><X size={14} />Reject</button><button className="btn-primary" onClick={approve}><Check size={14} />Approve & create household</button></div>
              </>
            ) : <div>Decision: <StatusBadge status={view.status} /> {view.remark}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
