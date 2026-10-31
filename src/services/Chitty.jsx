import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Coins, LogOut, Check, X, FileDown, Banknote, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CrudManager, Field, Modal, StatusBadge, Tabs, Empty, ImageInput, SectionTitle, StatCard } from '../components/ui';
import { inr, pdfInr, fmtDateTime, monthLabel } from '../utils/format';
import { downloadPdf } from '../utils/pdf';

const CK = 'mahall-chitty-member';
export const currentChittyMonth = (c) => {
  const [y, m] = c.startMonth.split('-').map(Number);
  const now = new Date();
  return Math.min(c.months, Math.max(1, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) + 1));
};
const payFor = (state, memberId, month) => {
  const ps = state.chittyPayments.filter((p) => p.memberId === memberId && p.month === month);
  return ps.find((p) => p.status === 'confirmed') || ps.find((p) => p.status === 'pending') || ps.find((p) => p.status === 'rejected');
};
const poolTotal = (state) => state.chittyPayments.filter((p) => p.status === 'confirmed').reduce((a, p) => a + Number(p.amount), 0);

export default function ChittyPage() {
  const { state, add, toast } = useApp();
  const [memberId, setMemberId] = useState(() => sessionStorage.getItem(CK) || '');
  const [cred, setCred] = useState({ code: '', password: '' });
  const [pay, setPay] = useState(null);
  const c = state.chitty;
  const member = state.chittyMembers.find((m) => m.id === memberId);

  const login = (e) => {
    e.preventDefault();
    const m = state.chittyMembers.find((x) => x.code.toLowerCase() === cred.code.trim().toLowerCase() && x.password === cred.password);
    if (!m) return toast('Wrong Chitty number or password', 'error');
    sessionStorage.setItem(CK, m.id); setMemberId(m.id);
  };
  const logout = () => { sessionStorage.removeItem(CK); setMemberId(''); };

  if (!member) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <form onSubmit={login} className="card space-y-4">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Coins className="text-amber-600" /> Chitty Login</h1>
          <p className="text-sm text-slate-500">{c.name} · {inr(c.monthlyAmount)} × {c.months} months</p>
          <Field label="Chitty number"><input className="input" placeholder="C-001" value={cred.code} onChange={(e) => setCred({ ...cred, code: e.target.value })} required /></Field>
          <Field label="Chitty password"><input type="password" className="input" value={cred.password} onChange={(e) => setCred({ ...cred, password: e.target.value })} required /></Field>
          <button className="btn-primary w-full">Log in</button>
          <p className="text-xs text-slate-400">Demo: C-001 / chitty123</p>
        </form>
      </div>
    );
  }

  const cur = currentChittyMonth(c);
  const months = Array.from({ length: c.months }, (_, i) => i + 1);
  const paidCount = months.filter((m) => payFor(state, member.id, m)?.status === 'confirmed').length;
  const submit = (e) => {
    e.preventDefault();
    if (!pay.screenshot) return toast('Please attach the UPI screenshot', 'error');
    add('chittyPayments', { memberId: member.id, month: pay.month, amount: c.monthlyAmount, method: 'upi', screenshot: pay.screenshot, utr: pay.utr, status: 'pending', date: new Date().toISOString() });
    toast('Payment submitted – waiting for admin confirmation'); setPay(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SectionTitle icon={Coins} title={c.name} subtitle={`Welcome ${member.name} (${member.code})`} action={<button className="btn-outline" onClick={logout}><LogOut size={14} />Log out</button>} />
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Coins} label="Monthly instalment" value={inr(c.monthlyAmount)} color="amber" />
        <StatCard icon={Check} label="Months paid" value={`${paidCount} / ${c.months}`} />
        <StatCard icon={Banknote} label="Total paid" value={inr(paidCount * c.monthlyAmount)} color="blue" />
      </div>
      <div className="card">
        <h3 className="font-bold mb-3">Instalments</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {months.map((m) => {
            const p = payFor(state, member.id, m);
            const st = p?.status === 'confirmed' ? 'paid' : p?.status === 'pending' ? 'pending' : m <= cur ? 'due' : 'upcoming';
            const cls = { paid: 'border-green-300 bg-green-50', pending: 'border-amber-300 bg-amber-50', due: 'border-red-300 bg-red-50', upcoming: 'border-slate-200' }[st];
            return (
              <div key={m} className={`border-2 rounded-lg p-3 ${cls}`}>
                <div className="text-xs text-slate-500">Month {m}</div>
                <div className="font-semibold">{monthLabel(c.startMonth, m - 1)}</div>
                <div className="text-xs capitalize mt-1">{st === 'paid' ? `Paid · ${p.method}` : st}{p?.status === 'rejected' && st !== 'pending' ? ' (last attempt rejected)' : ''}</div>
                {(st === 'due' || st === 'upcoming') && <button className="btn-primary btn-sm mt-2 w-full" onClick={() => setPay({ month: m, screenshot: '', utr: '' })}>Pay {inr(c.monthlyAmount)}</button>}
              </div>
            );
          })}
        </div>
      </div>
      <Modal open={!!pay} onClose={() => setPay(null)} title={`Pay month ${pay?.month}`}>
        {pay && (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex gap-4 items-center bg-slate-50 rounded-lg p-3">
              <QRCodeSVG value={`upi://pay?pa=${c.upi}&pn=Mahall%20Chitty&am=${c.monthlyAmount}&tn=${member.code}%20M${pay.month}`} size={120} />
              <div className="text-sm"><div>Pay <b>{inr(c.monthlyAmount)}</b> to</div><div className="font-mono">{c.upi}</div><div className="text-xs text-slate-500 mt-1">Note: {member.code} M{pay.month}</div></div>
            </div>
            <Field label="UPI reference / UTR"><input className="input" value={pay.utr} onChange={(e) => setPay({ ...pay, utr: e.target.value })} /></Field>
            <Field label="Payment screenshot *"><ImageInput value={pay.screenshot} onChange={(v) => setPay({ ...pay, screenshot: v })} label="Attach screenshot" /></Field>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setPay(null)}>Cancel</button><button className="btn-primary">Submit payment</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function ChittyAdmin() {
  const { state, add, patch, remove, update, toast, ask } = useApp();
  const c = state.chitty;
  const [tab, setTab] = useState('monthly');
  const [month, setMonth] = useState(() => currentChittyMonth(c));
  const [shot, setShot] = useState('');
  const [settings, setSettings] = useState(c);
  const pending = state.chittyPayments.filter((p) => p.status === 'pending');
  const mem = (id) => state.chittyMembers.find((m) => m.id === id);
  const months = Array.from({ length: c.months }, (_, i) => i + 1);

  const confirmPay = (p) => { patch('chittyPayments', p.id, { status: 'confirmed', decidedAt: new Date().toISOString() }); toast(`Confirmed ${mem(p.memberId)?.code} month ${p.month}`); };
  const rejectPay = async (p) => { const remark = await ask({ title: 'Reject payment', message: 'Reason for rejection', input: true, danger: true, okLabel: 'Reject' }); if (remark === null) return; patch('chittyPayments', p.id, { status: 'rejected', remark }); toast('Payment rejected', 'info'); };
  const cash = (memberId, m) => { add('chittyPayments', { memberId, month: m, amount: c.monthlyAmount, method: 'cash', screenshot: '', status: 'confirmed', date: new Date().toISOString() }); toast('Cash payment recorded'); };

  const monthRows = state.chittyMembers.map((m) => ({ m, p: payFor(state, m.id, month) }));
  const paidThis = monthRows.filter((r) => r.p?.status === 'confirmed').length;

  const pdfMonthly = () => downloadPdf({
    org: state.masjid, title: `Chitty Report – Month ${month} (${monthLabel(c.startMonth, month - 1)})`, subtitle: c.name,
    blocks: [
      { kv: [['Paid', `${paidThis} / ${state.chittyMembers.length}`], ['Collected this month', pdfInr(paidThis * c.monthlyAmount)], ['Pending', pdfInr((state.chittyMembers.length - paidThis) * c.monthlyAmount)], ['Pool total (all months)', pdfInr(poolTotal(state))]] },
      { table: { head: ['No.', 'Member', 'Phone', 'Status', 'Method', 'Date'], body: monthRows.map(({ m, p }) => [m.code, m.name, m.phone, p?.status === 'confirmed' ? 'PAID' : p?.status === 'pending' ? 'Awaiting confirmation' : 'PENDING', p?.method || '', p ? fmtDateTime(p.date) : '']) } },
    ],
  }, `chitty-month-${month}.pdf`);

  const pdfComplete = () => downloadPdf({
    org: state.masjid, title: 'Chitty Complete Report', subtitle: `${c.name} · ${pdfInr(c.monthlyAmount)} x ${c.months} months`,
    blocks: [
      { kv: [['Members', state.chittyMembers.length], ['Pool total', pdfInr(poolTotal(state))], ['Expected total', pdfInr(state.chittyMembers.length * c.months * c.monthlyAmount)]] },
      { table: { head: ['No.', 'Member', ...months.map((m) => `M${m}`), 'Paid'], body: state.chittyMembers.map((m) => { const st = months.map((x) => payFor(state, m.id, x)); return [m.code, m.name, ...st.map((p) => (p?.status === 'confirmed' ? 'Y' : p?.status === 'pending' ? '?' : '-')), pdfInr(st.filter((p) => p?.status === 'confirmed').length * c.monthlyAmount)]; }) } },
      { text: 'Y = paid, ? = awaiting confirmation, - = not paid' },
    ],
  }, 'chitty-complete-report.pdf');

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <StatCard icon={Coins} label="Pool total" value={inr(poolTotal(state))} color="amber" />
        <StatCard icon={Check} label={`Paid – month ${month}`} value={`${paidThis} / ${state.chittyMembers.length}`} />
        <StatCard icon={ImageIcon} label="UPI payments to confirm" value={pending.length} color="red" />
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'monthly', label: 'Monthly status' }, { id: 'queue', label: 'Confirm payments', count: pending.length }, { id: 'members', label: 'Members' }, { id: 'settings', label: 'Settings' }]} />
      {tab === 'monthly' && (
        <div className="card">
          <div className="flex flex-wrap gap-2 items-end mb-4">
            <Field label="Month"><select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{months.map((m) => <option key={m} value={m}>Month {m} – {monthLabel(c.startMonth, m - 1)}</option>)}</select></Field>
            <button className="btn-outline" onClick={pdfMonthly}><FileDown size={14} />Monthly PDF</button>
            <button className="btn-outline" onClick={pdfComplete}><FileDown size={14} />Complete PDF</button>
          </div>
          <table className="table"><thead><tr><th>No.</th><th>Member</th><th>Status</th><th /></tr></thead>
            <tbody>{monthRows.map(({ m, p }) => (
              <tr key={m.id} className={!p || p.status === 'rejected' ? 'bg-red-50/50' : ''}>
                <td className="font-mono">{m.code}</td><td>{m.name}<div className="text-xs text-slate-500">{m.phone}</div></td>
                <td>{p?.status === 'confirmed' ? <span className="badge bg-green-100 text-green-800">Paid · {p.method}</span> : p?.status === 'pending' ? <StatusBadge status="pending" /> : <span className="badge bg-red-100 text-red-700">Not paid</span>}</td>
                <td className="text-right whitespace-nowrap">
                  {p?.status === 'pending' && <><button className="btn-primary btn-sm mr-1" onClick={() => confirmPay(p)}><Check size={12} />Confirm</button><button className="btn-danger btn-sm mr-1" onClick={() => rejectPay(p)}><X size={12} /></button></>}
                  {(!p || p.status === 'rejected') && <button className="btn-outline btn-sm" onClick={() => cash(m.id, month)}><Banknote size={12} />Record cash</button>}
                </td>
              </tr>
            ))}</tbody></table>
        </div>
      )}
      {tab === 'queue' && (
        <div className="card overflow-x-auto">
          <table className="table"><thead><tr><th>Submitted</th><th>Member</th><th>Month</th><th>Amount</th><th>Proof</th><th /></tr></thead>
            <tbody>{pending.map((p) => (
              <tr key={p.id}>
                <td className="text-xs">{fmtDateTime(p.date)}</td><td>{mem(p.memberId)?.code} · {mem(p.memberId)?.name}</td><td>M{p.month} – {monthLabel(c.startMonth, p.month - 1)}</td><td>{inr(p.amount)}{p.utr && <div className="text-xs text-slate-500">UTR {p.utr}</div>}</td>
                <td>{p.screenshot ? <button className="text-brand-700 text-xs flex items-center gap-1" onClick={() => setShot(p.screenshot)}><ImageIcon size={13} />View</button> : '—'}</td>
                <td className="text-right whitespace-nowrap"><button className="btn-primary btn-sm mr-1" onClick={() => confirmPay(p)}><Check size={12} />Confirm</button><button className="btn-danger btn-sm" onClick={() => rejectPay(p)}><X size={12} />Reject</button></td>
              </tr>
            ))}</tbody></table>
          {!pending.length && <Empty>No payments waiting.</Empty>}
        </div>
      )}
      {tab === 'members' && (
        <CrudManager title="Chitty Members" items={state.chittyMembers} searchKeys={['code', 'name', 'phone']}
          defaults={{ code: 'C-' + String(state.chittyMembers.length + 1).padStart(3, '0'), password: 'chitty123' }}
          fields={[{ name: 'code', label: 'Chitty No.', required: true }, { name: 'name', label: 'Name', required: true }, { name: 'phone', label: 'Phone' }, { name: 'password', label: 'Password', type: 'password', required: true },
            { name: 'paid', label: 'Paid months', form: false, render: (m) => months.filter((x) => payFor(state, m.id, x)?.status === 'confirmed').length }]}
          onAdd={(d) => { if (state.chittyMembers.some((m) => m.code === d.code)) return toast('Chitty number already used', 'error'); add('chittyMembers', d); toast('Member added'); }}
          onUpdate={(id, d) => { patch('chittyMembers', id, d); toast('Member updated'); }}
          onDelete={(id) => { update((s) => { s.chittyMembers = s.chittyMembers.filter((m) => m.id !== id); s.chittyPayments = s.chittyPayments.filter((p) => p.memberId !== id); }); toast('Member removed'); }} />
      )}
      {tab === 'settings' && (
        <form className="card grid sm:grid-cols-2 gap-3 max-w-2xl" onSubmit={(e) => { e.preventDefault(); update((s) => { s.chitty = { ...settings, monthlyAmount: Number(settings.monthlyAmount), months: Number(settings.months) }; }); toast('Chitty settings saved'); }}>
          <Field label="Chitty name" className="sm:col-span-2"><input className="input" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} /></Field>
          <Field label="Monthly amount (₹)"><input type="number" min="1" className="input" value={settings.monthlyAmount} onChange={(e) => setSettings({ ...settings, monthlyAmount: e.target.value })} /></Field>
          <Field label="Number of months"><input type="number" min="1" className="input" value={settings.months} onChange={(e) => setSettings({ ...settings, months: e.target.value })} /></Field>
          <Field label="Start month"><input type="month" className="input" value={settings.startMonth} onChange={(e) => setSettings({ ...settings, startMonth: e.target.value })} /></Field>
          <Field label="UPI ID for payments"><input className="input" value={settings.upi} onChange={(e) => setSettings({ ...settings, upi: e.target.value })} /></Field>
          <div className="sm:col-span-2"><button className="btn-primary">Save</button></div>
        </form>
      )}
      <Modal open={!!shot} onClose={() => setShot('')} title="Payment screenshot" wide><img src={shot} alt="" className="max-h-[70vh] mx-auto" /></Modal>
    </div>
  );
}
