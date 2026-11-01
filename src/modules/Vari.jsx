import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Coins, Check, X, Banknote, FileDown, Smartphone, HandCoins } from 'lucide-react';
import { useApp, useConfig, useFeature } from '../store/AppContext';
import { Field, Modal, StatusBadge, Empty, ImageInput, StoredImg, StatCard, Tabs } from '../components/ui';
import { inr, pdfInr, fmtDateTime, uid } from '../utils/format';
import { variMonths, variRateFor } from '../utils/features';
import { downloadPdf } from '../utils/pdf';
import { donationReceiptPdf } from '../utils/receipts';

export const monthName = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); };

// The payment that counts for a home and month: confirmed beats pending beats rejected.
const paymentFor = (payments, householdId, month) => {
  const ps = payments.filter((p) => p.householdId === householdId && p.month === month);
  return ps.find((p) => p.status === 'confirmed') || ps.find((p) => p.status === 'pending') || ps.find((p) => p.status === 'rejected') || null;
};

const variReceipt = (state, p, hh) => {
  const t = state.transactions.find((x) => x.id === p.transactionId);
  donationReceiptPdf(state.masjid, { receiptNo: t?.docNo, name: `${hh?.headName || ''} (${hh?.homeNo || ''})`, phone: hh?.phone, amount: p.amount, channel: `Monthly Vari – ${monthName(p.month)}`, date: p.date, decidedAt: p.decidedAt, note: p.method === 'cash' ? 'Paid in cash' : `UPI${p.utr ? ` · ${p.utr}` : ''}` }, { title: 'MONTHLY VARI RECEIPT', file: 'vari-receipt' });
};

// ---------- member side ----------

export function MyVari() {
  const { state, user, add, toast } = useApp();
  const config = useConfig();
  const on = useFeature('vari'), upiOn = useFeature('variUpi'), cashOn = useFeature('variCash');
  const hh = state.households.find((h) => h.id === user.householdId);
  const [pay, setPay] = useState(null);
  if (!on || !hh) return null;
  const rate = variRateFor(hh, config);
  const months = variMonths(config.vari.startMonth);
  const rows = months.map((m) => ({ month: m, p: paymentFor(state.variPayments, hh.id, m) }));
  const due = rows.filter((r) => !r.p || r.p.status === 'rejected');
  const upi = config.vari.upi || state.donationChannels[0]?.upi || '';

  const submit = (e) => {
    e.preventDefault();
    if (pay.method === 'upi' && !pay.screenshot) return toast('Attach the UPI screenshot', 'error');
    add('variPayments', { householdId: hh.id, month: pay.month, amount: rate, method: pay.method, screenshot: pay.screenshot || '', utr: pay.utr || '', note: pay.note || '', status: 'pending', date: new Date().toISOString(), remark: '' });
    toast(pay.method === 'cash' ? 'Thank you! The committee will confirm when the collector hands over the cash.' : 'Payment sent – the committee will confirm it soon.');
    setPay(null);
  };

  return (
    <div className="card">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h3 className="h2 flex items-center gap-2"><Coins size={20} className="text-gold-500" />Monthly Vari</h3>
          <p className="text-sm text-ink-500 mt-1">Your home's monthly contribution to the Mahall: <b>{inr(rate)}</b> a month.</p>
        </div>
        <div className={`rounded-2xl px-4 py-2 text-right ${due.length ? 'bg-clay-50 text-clay-600' : 'bg-brand-50 text-brand-700'}`}>
          <div className="text-xs font-semibold">{due.length ? `${due.length} month${due.length > 1 ? 's' : ''} due` : 'All paid'}</div>
          <div className="text-xl font-extrabold">{inr(due.length * rate)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {rows.slice(0, 12).map(({ month, p }) => {
          const st = p?.status === 'confirmed' ? 'paid' : p?.status === 'pending' ? 'pending' : 'due';
          return (
            <div key={month} className={`rounded-2xl border-2 p-3 ${{ paid: 'border-brand-200 bg-brand-50/60', pending: 'border-gold-200 bg-gold-50', due: 'border-clay-100 bg-white' }[st]}`}>
              <div className="text-sm font-bold">{monthName(month)}</div>
              <div className="text-[11px] text-ink-500 capitalize">{st === 'paid' ? `Paid · ${p.method}` : st === 'pending' ? `Waiting for confirmation (${p.method})` : p?.status === 'rejected' ? `Not accepted${p.remark ? `: ${p.remark}` : ''}` : 'Due'}</div>
              {st === 'due' && (upiOn || cashOn) && (
                <div className="flex gap-1 mt-2">
                  {upiOn && <button className="btn-primary btn-sm !px-2.5" onClick={() => setPay({ month, method: 'upi' })}><Smartphone size={11} />UPI</button>}
                  {cashOn && <button className="btn-outline btn-sm !px-2.5" onClick={() => setPay({ month, method: 'cash' })}><HandCoins size={11} />Cash</button>}
                </div>
              )}
              {st === 'paid' && <button className="text-[11px] text-brand-700 font-semibold mt-1.5 flex items-center gap-1" onClick={() => variReceipt(state, p, hh)}><FileDown size={11} />Receipt</button>}
            </div>
          );
        })}
      </div>
      {!months.length && <Empty>The Vari has not started yet.</Empty>}
      <Modal open={!!pay} onClose={() => setPay(null)} title={pay ? `${monthName(pay.month)} · ${inr(rate)}` : ''}>
        {pay && (
          <form onSubmit={submit} className="space-y-4">
            {pay.method === 'upi' ? (
              <>
                {upi && <div className="flex items-center gap-4 bg-sand-50 rounded-2xl p-4"><QRCodeSVG value={`upi://pay?pa=${upi}&pn=${encodeURIComponent(state.masjid.name)}&am=${rate}&tn=${encodeURIComponent(`Vari ${hh.homeNo} ${pay.month}`)}`} size={110} /><div className="text-sm"><div>Pay <b>{inr(rate)}</b> to</div><div className="font-mono">{upi}</div><div className="text-xs text-ink-500 mt-1">Note: Vari {hh.homeNo} {pay.month}</div></div></div>}
                <Field label="UPI reference / UTR"><input className="input" value={pay.utr || ''} onChange={(e) => setPay({ ...pay, utr: e.target.value })} /></Field>
                <Field label="Payment screenshot *"><ImageInput value={pay.screenshot} onChange={(v) => setPay({ ...pay, screenshot: v })} label="Attach screenshot" /></Field>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-600">Tell the committee you paid <b>{inr(rate)}</b> in cash for {monthName(pay.month)}. It shows as paid once the collector hands it over and the committee confirms.</p>
                <Field label="Paid to (collector's name) / note"><input className="input" value={pay.note || ''} onChange={(e) => setPay({ ...pay, note: e.target.value })} placeholder="e.g. Paid to Ashraf (ward collector)" /></Field>
              </>
            )}
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setPay(null)}>Cancel</button><button className="btn-primary">{pay.method === 'cash' ? 'I paid in cash' : 'Send payment'}</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// ---------- admin side ----------

export function VariAdmin() {
  const { state, update, patch, toast, flush, ask } = useApp();
  const config = useConfig();
  const months = variMonths(config.vari.startMonth);
  const [tab, setTab] = useState('month');
  const [month, setMonth] = useState(months[0] || new Date().toISOString().slice(0, 7));
  const [settings, setSettings] = useState(config.vari);
  const [shot, setShot] = useState(null);
  const [q, setQ] = useState('');
  const pending = state.variPayments.filter((p) => p.status === 'pending').sort((a, b) => a.month.localeCompare(b.month));
  const homes = state.households.filter((h) => !q || `${h.homeNo} ${h.headName} ${h.ward}`.toLowerCase().includes(q.toLowerCase()));
  const rows = homes.map((h) => ({ h, rate: variRateFor(h, config), p: paymentFor(state.variPayments, h.id, month) }));
  const expected = state.households.reduce((a, h) => a + variRateFor(h, config), 0);
  const collected = state.variPayments.filter((p) => p.month === month && p.status === 'confirmed').reduce((a, p) => a + Number(p.amount), 0);
  const paidHomes = state.households.filter((h) => paymentFor(state.variPayments, h.id, month)?.status === 'confirmed').length;
  const hhOf = (id) => state.households.find((h) => h.id === id);

  // Confirm a payment (or record cash) and put it in the accounts with a receipt number.
  const confirm = async (payment, { cash = false } = {}) => {
    const hh = hhOf(payment.householdId);
    const pid = payment.id || uid('vp');
    update((s) => {
      const tid = uid('txn');
      const now = new Date().toISOString();
      const p = s.variPayments.find((x) => x.id === pid);
      const data = { status: 'confirmed', decidedAt: now, transactionId: tid };
      if (p) Object.assign(p, data);
      else s.variPayments.push({ id: pid, householdId: payment.householdId, month: payment.month, amount: payment.amount, method: 'cash', screenshot: '', utr: '', note: 'Recorded by committee', remark: '', date: now, ...data });
      s.transactions.push({ id: tid, date: now.slice(0, 10), type: 'income', head: config.vari.head || s.accountHeads[0], amount: Number(payment.amount), description: `Monthly Vari – ${hh?.homeNo} ${hh?.headName} – ${monthName(payment.month)}`, receipt: p?.screenshot || '', ref: pid });
    });
    toast(`${cash ? 'Cash recorded' : 'Payment confirmed'} – ${hh?.homeNo} · ${monthName(payment.month)}`);
    const fresh = await flush();
    const saved = fresh?.variPayments.find((x) => x.id === pid);
    if (saved && (await ask({ title: 'Print the receipt?', message: `${hh?.headName} · ${inr(saved.amount)} · ${monthName(saved.month)}`, okLabel: 'Download receipt' }))) variReceipt(fresh, saved, hh);
  };
  const reject = async (p) => {
    const remark = await ask({ title: 'Not accepted', message: 'Tell the family why (they will see this).', input: true, danger: true, okLabel: 'Reject' });
    if (remark === null) return;
    patch('variPayments', p.id, { status: 'rejected', remark, decidedAt: new Date().toISOString() });
    toast('Payment rejected', 'info');
  };
  const setRate = async (h) => {
    const v = await ask({ title: `Monthly rate for ${h.homeNo}`, message: `Leave empty to use the default ${inr(config.vari.defaultRate)}.`, input: true, defaultValue: h.variRate ? String(h.variRate) : '', okLabel: 'Save' });
    if (v === null) return;
    patch('households', h.id, { variRate: v === '' ? null : Number(v) });
    toast('Rate saved');
  };
  const monthPdf = () => downloadPdf({
    org: state.masjid, title: `Monthly Vari – ${monthName(month)}`, subtitle: `${paidHomes} of ${state.households.length} homes paid · collected ${pdfInr(collected)} of ${pdfInr(expected)}`,
    blocks: [{ table: { head: ['Home', 'Head of family', 'Ward', 'Rate', 'Status', 'Method', 'Date'], body: state.households.map((h) => { const p = paymentFor(state.variPayments, h.id, month); return [h.homeNo, h.headName, h.ward || '', pdfInr(variRateFor(h, config)), p?.status === 'confirmed' ? 'PAID' : p?.status === 'pending' ? 'Waiting' : 'DUE', p?.method || '', p ? fmtDateTime(p.decidedAt || p.date) : '']; }) } }],
  }, `vari-${month}.pdf`);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Coins} label={`Collected · ${monthName(month)}`} value={inr(collected)} />
        <StatCard icon={Check} label="Homes paid this month" value={`${paidHomes} / ${state.households.length}`} color="blue" />
        <StatCard icon={Banknote} label="Waiting for confirmation" value={pending.length} color="red" />
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'month', label: 'Month view' }, { id: 'queue', label: 'Confirm payments', count: pending.length }, { id: 'settings', label: 'Rates & settings' }]} />
      {tab === 'month' && (
        <div className="card">
          <div className="flex flex-wrap gap-2 items-end mb-4">
            <Field label="Month"><select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}</select></Field>
            <input className="input w-56" placeholder="Search home or name…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-outline ml-auto" onClick={monthPdf}><FileDown size={14} />Month report PDF</button>
          </div>
          <div className="overflow-x-auto">
            <table className="table"><thead><tr><th>Home</th><th>Family</th><th>Rate</th><th>Status</th><th /></tr></thead>
              <tbody>{rows.map(({ h, rate, p }) => (
                <tr key={h.id}>
                  <td className="font-mono text-xs font-bold">{h.homeNo}</td>
                  <td>{h.headName}<div className="text-xs text-ink-400">{h.ward}</div></td>
                  <td><button className="underline decoration-dotted underline-offset-4" onClick={() => setRate(h)} title="Change rate">{inr(rate)}</button>{h.variRate ? <span className="text-[10px] text-gold-600 ml-1">custom</span> : null}</td>
                  <td>{p?.status === 'confirmed' ? <span className="badge bg-brand-100 text-brand-700">Paid · {p.method}</span> : p?.status === 'pending' ? <StatusBadge status="pending" /> : <span className="badge bg-clay-100 text-clay-600">Due</span>}</td>
                  <td className="text-right whitespace-nowrap">
                    {p?.status === 'pending' && <><button className="btn-primary btn-sm mr-1" onClick={() => confirm(p)}><Check size={12} />Confirm</button><button className="btn-danger btn-sm mr-1" onClick={() => reject(p)}><X size={12} /></button></>}
                    {(!p || p.status === 'rejected') && <button className="btn-outline btn-sm" onClick={() => confirm({ householdId: h.id, month, amount: rate }, { cash: true })}><Banknote size={12} />Add cash</button>}
                    {p?.status === 'confirmed' && <button className="btn-outline btn-sm" onClick={() => variReceipt(state, p, h)}><FileDown size={12} />Receipt</button>}
                  </td>
                </tr>
              ))}</tbody></table>
          </div>
          {!state.households.length && <Empty>Add households first.</Empty>}
        </div>
      )}
      {tab === 'queue' && (
        <div className="card overflow-x-auto">
          <table className="table"><thead><tr><th>Sent</th><th>Home</th><th>Month</th><th>Amount</th><th>Proof / note</th><th /></tr></thead>
            <tbody>{pending.map((p) => { const h = hhOf(p.householdId); return (
              <tr key={p.id}>
                <td className="text-xs">{fmtDateTime(p.date)}</td><td>{h?.homeNo} · {h?.headName}</td><td>{monthName(p.month)}</td><td>{inr(p.amount)}<div className="text-xs text-ink-400 capitalize">{p.method}{p.utr && ` · ${p.utr}`}</div></td>
                <td className="text-xs">{p.screenshot ? <button className="text-brand-700 font-semibold" onClick={() => setShot(p)}>View screenshot</button> : p.note || '—'}</td>
                <td className="text-right whitespace-nowrap"><button className="btn-primary btn-sm mr-1" onClick={() => confirm(p)}><Check size={12} />Confirm</button><button className="btn-danger btn-sm" onClick={() => reject(p)}><X size={12} /></button></td>
              </tr>); })}</tbody></table>
          {!pending.length && <Empty>Nothing waiting. All caught up.</Empty>}
        </div>
      )}
      {tab === 'settings' && (
        <form className="card grid sm:grid-cols-2 gap-4 max-w-2xl" onSubmit={(e) => { e.preventDefault(); update((s) => { s.config = { ...config, vari: { ...settings, defaultRate: Number(settings.defaultRate) || 0 } }; }); toast('Vari settings saved'); }}>
          <Field label="Default monthly rate per home (₹)"><input type="number" min="0" className="input" value={settings.defaultRate} onChange={(e) => setSettings({ ...settings, defaultRate: e.target.value })} /></Field>
          <Field label="Collection started from (month)"><input type="month" className="input" value={settings.startMonth} onChange={(e) => setSettings({ ...settings, startMonth: e.target.value })} /></Field>
          <Field label="UPI ID for Vari payments"><input className="input" placeholder="(first donation UPI)" value={settings.upi} onChange={(e) => setSettings({ ...settings, upi: e.target.value })} /></Field>
          <Field label="Post to account"><select className="input" value={settings.head} onChange={(e) => setSettings({ ...settings, head: e.target.value })}>{state.accountHeads.map((h) => <option key={h}>{h}</option>)}</select></Field>
          <p className="sm:col-span-2 text-xs text-ink-500">Give a home its own rate by clicking the amount in the Month view. Members pay by UPI or tell you they paid cash; both wait for your confirmation. Confirmed payments go into the accounts with a receipt number.</p>
          <div><button className="btn-primary">Save settings</button></div>
        </form>
      )}
      <Modal open={!!shot} onClose={() => setShot(null)} title="Payment screenshot" wide>{shot && <div className="text-center"><StoredImg col="variPayments" id={shot.id} field="screenshot" value={shot.screenshot} className="max-h-[70vh] mx-auto" /></div>}</Modal>
    </div>
  );
}
