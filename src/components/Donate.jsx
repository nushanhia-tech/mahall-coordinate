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
    toast('JazakAllahu khairan! Your donation will appear once the committee confirms it.');
    setForm(null);
  };

  return (
    <section id="donate" className="scroll-mt-24">
      <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-gold-50 via-white to-brand-50 border border-gold-100 p-6 sm:p-10">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-gold-200/40 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="eyebrow mb-2">Sadaqah · Zakat · Nercha</div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 flex items-center gap-3"><HeartHandshake className="text-clay-500" size={32} />Your kindness keeps our masjid alive</h2>
          <p className="text-ink-600 mt-3 leading-relaxed">Scan a QR code with any UPI app, or transfer to the bank account. Then tap <b>“I have donated”</b> so we can thank you and show it in our open accounts.</p>
        </div>
        <div className="relative grid md:grid-cols-3 gap-4 mt-8">
          {state.donationChannels.map((c, idx) => (
            <div key={c.id} className="card card-hover flex flex-col !bg-white animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <h3 className="font-display text-xl font-semibold text-ink-900">{c.name}</h3>
              <div className="flex gap-4 mt-4">
                <div className="p-2.5 bg-white border border-sand-200 rounded-2xl shadow-soft shrink-0"><ChannelQR channel={c} size={104} /></div>
                <dl className="text-xs space-y-1.5 text-ink-500 min-w-0">
                  {c.upi && <div><dt className="font-bold text-ink-700">UPI</dt><dd className="font-mono break-all">{c.upi}</dd></div>}
                  {c.bank.holder && <div><dt className="font-bold text-ink-700">Account name</dt><dd>{c.bank.holder}</dd></div>}
                  {c.bank.bank && <div><dt className="font-bold text-ink-700">Bank</dt><dd>{c.bank.bank}</dd></div>}
                  {c.bank.accNo && <div><dt className="font-bold text-ink-700">A/c · IFSC</dt><dd className="font-mono break-all">{c.bank.accNo} · {c.bank.ifsc}</dd></div>}
                  {!c.upi && !c.bank.accNo && <div className="text-ink-400">Payment details coming soon.</div>}
                </dl>
              </div>
              <div className="mt-auto pt-5 flex gap-2">
                {c.upi && <button className="btn-outline btn-sm" onClick={() => { navigator.clipboard?.writeText(c.upi); toast('UPI ID copied', 'info'); }}><Copy size={12} /> Copy UPI</button>}
                <button className="btn-primary btn-sm flex-1" onClick={() => setForm({ channelId: c.id, name: '', phone: '', amount: '', note: '', screenshot: '' })}><Send size={12} /> I have donated</button>
              </div>
            </div>
          ))}
        </div>
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
