import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { HeartHandshake, Copy, Send } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Modal, Field, ImageInput } from './ui';

export const ChannelQR = ({ channel, size = 120 }) =>
  channel.qrImage ? <img src={channel.qrImage} alt={`${channel.name} QR`} style={{ width: size, height: size }} className="object-contain" />
    : <QRCodeSVG value={channel.qr || `upi://pay?pa=${channel.upi}`} size={size} />;

export default function DonateSection() {
  const { state, add, toast } = useApp();
  const [form, setForm] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!form.screenshot) return toast('Please attach the payment screenshot', 'error');
    add('donations', { ...form, amount: Number(form.amount), status: 'pending', date: new Date().toISOString(), remark: '' });
    toast('Thank you! Your donation will appear after the admin verifies it.');
    setForm(null);
  };

  return (
    <section id="donate">
      <div className="flex items-center gap-2 mb-4"><HeartHandshake className="text-brand-600" /><h2 className="text-2xl font-bold text-slate-800">Donate Us</h2></div>
      <div className="grid md:grid-cols-3 gap-4">
        {state.donationChannels.map((c) => (
          <div key={c.id} className="card flex flex-col">
            <h3 className="font-bold text-lg text-brand-800">{c.name}</h3>
            <div className="flex gap-4 mt-3">
              <div className="p-2 bg-white border rounded-lg"><ChannelQR channel={c} size={110} /></div>
              <dl className="text-xs space-y-1 text-slate-600">
                <div><dt className="font-semibold text-slate-800">UPI</dt><dd className="font-mono break-all">{c.upi}</dd></div>
                <div><dt className="font-semibold text-slate-800">A/c Name</dt><dd>{c.bank.holder}</dd></div>
                <div><dt className="font-semibold text-slate-800">Bank</dt><dd>{c.bank.bank}</dd></div>
                <div><dt className="font-semibold text-slate-800">A/c No · IFSC</dt><dd className="font-mono">{c.bank.accNo} · {c.bank.ifsc}</dd></div>
              </dl>
            </div>
            <div className="mt-auto pt-4 flex gap-2">
              <button className="btn-outline btn-sm" onClick={() => { navigator.clipboard?.writeText(c.upi); toast('UPI ID copied', 'info'); }}><Copy size={12} /> Copy UPI</button>
              <button className="btn-primary btn-sm flex-1" onClick={() => setForm({ channelId: c.id, name: '', phone: '', amount: '', note: '', screenshot: '' })}><Send size={12} /> I have donated</button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title="Submit donation proof">
        {form && (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Fund">
              <select className="input" value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })}>
                {state.donationChannels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Your name *"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Phone *"><input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            </div>
            <Field label="Amount (₹) *"><input className="input" type="number" min="1" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Note"><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <Field label="Payment screenshot *"><ImageInput value={form.screenshot} onChange={(v) => setForm({ ...form, screenshot: v })} label="Attach screenshot" /></Field>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary">Submit</button></div>
          </form>
        )}
      </Modal>
    </section>
  );
}
