import { useState } from 'react';
import { Check, X, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Tabs, Modal, Field, ImageInput, StatusBadge, Empty, StoredImg } from '../components/ui';
import { ChannelQR } from '../components/Donate';
import { inr, fmtDateTime, uid } from '../utils/format';

function Queue() {
  const { state, update, toast } = useApp();
  const [status, setStatus] = useState('pending');
  const [act, setAct] = useState(null);
  const [shot, setShot] = useState(null);
  const list = [...state.donations].filter((d) => !status || d.status === status).sort((a, b) => b.date.localeCompare(a.date));
  const ch = (id) => state.donationChannels.find((c) => c.id === id);

  const decide = (e) => {
    e.preventDefault();
    update((s) => {
      const d = s.donations.find((x) => x.id === act.id);
      d.status = act.decision; d.remark = act.remark; d.decidedAt = new Date().toISOString();
      if (act.decision === 'approved') {
        const tid = uid('txn');
        d.transactionId = tid; d.accountHead = act.head;
        s.transactions.push({ id: tid, date: new Date().toISOString().slice(0, 10), type: 'income', head: act.head, amount: d.amount, description: `Donation – ${ch(d.channelId)?.name} – ${d.name}`, receipt: d.screenshot, ref: d.id });
      }
    });
    toast(act.decision === 'approved' ? `Approved – ${inr(act.amount)} added to ${act.head}` : 'Donation rejected');
    setAct(null);
  };

  return (
    <div className="card">
      <div className="flex gap-2 mb-4">{['pending', 'approved', 'rejected', ''].map((s) => <button key={s} onClick={() => setStatus(s)} className={`btn-sm btn capitalize ${status === s ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>{s || 'All'}</button>)}</div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Date</th><th>Donor</th><th>Fund</th><th className="text-right">Amount</th><th>Proof</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id}>
                <td className="whitespace-nowrap text-xs">{fmtDateTime(d.date)}</td>
                <td><div className="font-medium">{d.name}</div><div className="text-xs text-slate-500">{d.phone}{d.note && ` · ${d.note}`}</div></td>
                <td>{ch(d.channelId)?.name}</td>
                <td className="text-right font-semibold">{inr(d.amount)}</td>
                <td>{d.screenshot ? <button className="text-brand-700 flex items-center gap-1 text-xs" onClick={() => setShot({ id: d.id, value: d.screenshot })}><ImageIcon size={14} />View</button> : <span className="text-xs text-slate-400">none</span>}</td>
                <td><StatusBadge status={d.status} />{d.remark && <div className="text-xs text-slate-500 mt-0.5">{d.remark}</div>}{d.accountHead && <div className="text-xs text-slate-500">→ {d.accountHead}</div>}</td>
                <td className="text-right whitespace-nowrap">
                  {d.status === 'pending' && <>
                    <button className="btn-primary btn-sm mr-1" onClick={() => setAct({ ...d, decision: 'approved', head: ch(d.channelId)?.accountHead || state.accountHeads[0], remark: '' })}><Check size={12} />Approve</button>
                    <button className="btn-danger btn-sm" onClick={() => setAct({ ...d, decision: 'rejected', remark: '' })}><X size={12} />Reject</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <Empty>No {status} donations.</Empty>}
      </div>
      <Modal open={!!act} onClose={() => setAct(null)} title={act?.decision === 'approved' ? 'Approve donation' : 'Reject donation'}>
        {act && (
          <form onSubmit={decide} className="space-y-3">
            <p className="text-sm">{act.name} · <b>{inr(act.amount)}</b> · {ch(act.channelId)?.name}</p>
            {act.screenshot && <div className="text-center"><StoredImg col="donations" id={act.id} field="screenshot" value={act.screenshot} className="max-h-64 rounded border mx-auto" /></div>}
            {act.decision === 'approved' && <Field label="Post income to account"><select className="input" value={act.head} onChange={(e) => setAct({ ...act, head: e.target.value })}>{state.accountHeads.map((h) => <option key={h}>{h}</option>)}</select></Field>}
            <Field label={act.decision === 'rejected' ? 'Reason *' : 'Remark'}><input className="input" required={act.decision === 'rejected'} value={act.remark} onChange={(e) => setAct({ ...act, remark: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setAct(null)}>Cancel</button><button className={act.decision === 'approved' ? 'btn-primary' : 'btn-danger'}>Confirm</button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!shot} onClose={() => setShot(null)} title="Payment screenshot" wide>{shot && <div className="text-center"><StoredImg col="donations" id={shot.id} field="screenshot" value={shot.value} className="max-h-[70vh] mx-auto" /></div>}</Modal>
    </div>
  );
}

function Channels() {
  const { state, update, toast } = useApp();
  const [edit, setEdit] = useState(null);
  const save = (e) => {
    e.preventDefault();
    update((s) => { const i = s.donationChannels.findIndex((c) => c.id === edit.id); s.donationChannels[i] = { ...edit, qr: edit.qr || `upi://pay?pa=${edit.upi}&pn=${encodeURIComponent(edit.name)}` }; });
    toast('Payment details updated'); setEdit(null);
  };
  const set = (k, v) => setEdit({ ...edit, [k]: v });
  const setBank = (k, v) => setEdit({ ...edit, bank: { ...edit.bank, [k]: v } });
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {state.donationChannels.map((c) => (
        <div key={c.id} className="card">
          <div className="flex justify-between items-start"><h3 className="font-bold">{c.name}</h3><button className="btn-outline btn-sm" onClick={() => setEdit(structuredClone(c))}>Edit</button></div>
          <div className="my-3 flex justify-center"><ChannelQR channel={c} size={120} /></div>
          <div className="text-xs space-y-0.5 text-slate-600"><div>UPI: <b>{c.upi}</b></div><div>{c.bank.holder}</div><div>{c.bank.bank} · {c.bank.accNo} · {c.bank.ifsc}</div><div>Posts to: <b>{c.accountHead}</b></div></div>
        </div>
      ))}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit ${edit?.name}`}>
        {edit && (
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            <Field label="Fund name"><input className="input" value={edit.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Default account"><select className="input" value={edit.accountHead} onChange={(e) => set('accountHead', e.target.value)}>{state.accountHeads.map((h) => <option key={h}>{h}</option>)}</select></Field>
            <Field label="UPI ID" className="col-span-2"><input className="input" value={edit.upi} onChange={(e) => setEdit({ ...edit, upi: e.target.value, qr: '' })} /></Field>
            <Field label="QR code image (optional – otherwise generated from UPI ID)" className="col-span-2"><ImageInput value={edit.qrImage} onChange={(v) => set('qrImage', v)} label="Upload QR" /></Field>
            <Field label="Account holder"><input className="input" value={edit.bank.holder} onChange={(e) => setBank('holder', e.target.value)} /></Field>
            <Field label="Bank"><input className="input" value={edit.bank.bank} onChange={(e) => setBank('bank', e.target.value)} /></Field>
            <Field label="Account number"><input className="input" value={edit.bank.accNo} onChange={(e) => setBank('accNo', e.target.value)} /></Field>
            <Field label="IFSC"><input className="input" value={edit.bank.ifsc} onChange={(e) => setBank('ifsc', e.target.value)} /></Field>
            <div className="col-span-2 flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default function Donations() {
  const { state } = useApp();
  const [tab, setTab] = useState('queue');
  return (
    <div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'queue', label: 'Donation requests', count: state.donations.filter((d) => d.status === 'pending').length }, { id: 'channels', label: 'QR & bank details' }]} />
      {tab === 'queue' ? <Queue /> : <Channels />}
    </div>
  );
}
