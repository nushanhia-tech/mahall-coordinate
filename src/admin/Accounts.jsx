import { useState } from 'react';
import { Plus, Pencil, Trash2, FileDown, Paperclip } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Tabs, Modal, Field, ImageInput, StatusBadge, Empty, StoredImg } from '../components/ui';
import { inr, pdfInr, today, fmtDate } from '../utils/format';
import { withRunningBalance, sumBy, periodRange } from '../utils/finance';
import { downloadPdf } from '../utils/pdf';
import { saveFile } from '../utils/download';

function Ledger() {
  const { state, add, patch, remove, toast, ask } = useApp();
  const [form, setForm] = useState(null);
  const [view, setView] = useState(null);
  const [filter, setFilter] = useState({ type: '', head: '' });
  const rows = withRunningBalance(state.transactions).reverse()
    .filter((t) => (!filter.type || t.type === filter.type) && (!filter.head || t.head === filter.head));

  const save = (e) => {
    e.preventDefault();
    const d = { ...form, amount: Number(form.amount) };
    if (d.amount <= 0) return toast('Amount must be more than zero', 'error');
    if (d.id) { patch('transactions', d.id, d); toast('Entry updated'); } else { add('transactions', d); toast(`${d.type === 'income' ? 'Income' : 'Expense'} recorded`); }
    setForm(null);
  };

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2 justify-between mb-4">
        <div className="flex gap-2">
          <select className="input w-36" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
          <select className="input w-44" value={filter.head} onChange={(e) => setFilter({ ...filter, head: e.target.value })}><option value="">All accounts</option>{state.accountHeads.map((h) => <option key={h}>{h}</option>)}</select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => setForm({ type: 'income', date: today(), head: state.accountHeads[0], amount: '', description: '', receipt: '' })}><Plus size={16} /> Income</button>
          <button className="btn-danger" onClick={() => setForm({ type: 'expense', date: today(), head: state.accountHeads[0], amount: '', description: '', receipt: '' })}><Plus size={16} /> Expense</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Date</th><th>Type</th><th>Account</th><th>Description</th><th className="text-right">Amount</th><th className="text-right">Running balance</th><th>Bill</th><th /></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="whitespace-nowrap">{fmtDate(t.date)}</td>
                <td><StatusBadge status={t.type} /></td>
                <td>{t.head}</td>
                <td>{t.description}</td>
                <td className={`text-right font-semibold ${t.type === 'income' ? 'text-green-700' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '−'}{inr(t.amount)}</td>
                <td className="text-right font-mono">{inr(t.balance)}</td>
                <td>{t.receipt ? <button className="text-brand-700" onClick={() => setView({ id: t.id, value: t.receipt })} title="View bill"><Paperclip size={15} /></button> : '—'}</td>
                <td className="whitespace-nowrap text-right">
                  <button className="p-1 text-slate-500 hover:text-brand-700" onClick={() => setForm({ ...t })}><Pencil size={14} /></button>
                  <button className="p-1 text-slate-500 hover:text-red-600" onClick={async () => { if (await ask({ title: 'Delete entry?', message: `${t.description} – ${inr(t.amount)}`, danger: true, okLabel: 'Delete' })) { remove('transactions', t.id); toast('Entry deleted'); } }}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty />}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={`${form?.id ? 'Edit' : 'New'} ${form?.type}`}>
        {form && (
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            <Field label="Type"><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="income">Income</option><option value="expense">Expense</option></select></Field>
            <Field label="Date *"><input type="date" className="input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Account head *"><select className="input" value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })}>{state.accountHeads.map((h) => <option key={h}>{h}</option>)}</select></Field>
            <Field label="Amount (₹) *"><input type="number" min="1" step="0.01" className="input" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Description *" className="col-span-2"><input className="input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label={form.type === 'income' ? 'Receipt' : 'Bill'} className="col-span-2"><ImageInput value={form.receipt} onChange={(v) => setForm({ ...form, receipt: v })} label="Upload bill / receipt" accept="image/*,application/pdf" /></Field>
            <div className="col-span-2 flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!view} onClose={() => setView(null)} title="Bill / Receipt" wide>
        {view && <div className="text-center"><StoredImg col="transactions" id={view.id} field="receipt" value={view.value} className="max-h-[70vh] mx-auto" /></div>}
      </Modal>
    </div>
  );
}

function Heads() {
  const { state, update, toast, ask } = useApp();
  const [name, setName] = useState('');
  const used = (h) => state.transactions.some((t) => t.head === h) || state.donationChannels.some((c) => c.accountHead === h);
  const addHead = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || state.accountHeads.includes(n)) return toast('Enter a new, unique name', 'error');
    update((s) => { s.accountHeads.push(n); }); setName(''); toast('Account head added');
  };
  const rename = async (h) => {
    const n = (await ask({ title: `Rename ${h}`, input: true, required: true, defaultValue: h, okLabel: 'Rename' }))?.trim();
    if (!n || n === h) return;
    if (state.accountHeads.includes(n)) return toast('That name exists', 'error');
    update((s) => {
      s.accountHeads = s.accountHeads.map((x) => (x === h ? n : x));
      s.transactions.forEach((t) => { if (t.head === h) t.head = n; });
      s.donationChannels.forEach((c) => { if (c.accountHead === h) c.accountHead = n; });
    });
    toast('Renamed – all entries moved to the new name');
  };
  return (
    <div className="card max-w-2xl">
      <form onSubmit={addHead} className="flex gap-2 mb-4"><input className="input" placeholder="New account head, e.g. Building Fund" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-primary"><Plus size={16} />Add</button></form>
      <table className="table">
        <thead><tr><th>Account</th><th className="text-right">Income</th><th className="text-right">Expense</th><th className="text-right">Balance</th><th /></tr></thead>
        <tbody>
          {state.accountHeads.map((h) => {
            const tx = state.transactions.filter((t) => t.head === h);
            const i = sumBy(tx, 'income'), x = sumBy(tx, 'expense');
            return (
              <tr key={h}>
                <td className="font-medium">{h}</td><td className="text-right text-green-700">{inr(i)}</td><td className="text-right text-red-600">{inr(x)}</td><td className="text-right font-semibold">{inr(i - x)}</td>
                <td className="text-right whitespace-nowrap">
                  <button className="p-1 text-slate-500 hover:text-brand-700" onClick={() => rename(h)}><Pencil size={14} /></button>
                  <button className="p-1 text-slate-500 hover:text-red-600 disabled:opacity-30" disabled={used(h)} title={used(h) ? 'In use – cannot delete' : 'Delete'} onClick={() => update((s) => { s.accountHeads = s.accountHeads.filter((x) => x !== h); })}><Trash2 size={14} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const buildReport = (state, { kind, ref, from, to, head }) => {
  let [a, b] = kind === 'custom' ? [from, to] : periodRange(kind, ref);
  const scoped = head ? state.transactions.filter((t) => t.head === head) : state.transactions;
  const before = scoped.filter((t) => t.date < a);
  const opening = sumBy(before, 'income') - sumBy(before, 'expense');
  const rows = withRunningBalance(scoped.filter((t) => t.date >= a && t.date <= b), opening);
  const income = sumBy(rows, 'income'), expense = sumBy(rows, 'expense');
  const summary = (head ? [head] : state.accountHeads).map((h) => {
    const tx = rows.filter((t) => t.head === h);
    return { head: h, income: sumBy(tx, 'income'), expense: sumBy(tx, 'expense') };
  });
  return { from: a, to: b, opening, rows, income, expense, closing: opening + income - expense, summary };
};

function Reports() {
  const { state } = useApp();
  const [p, setP] = useState({ kind: 'monthly', ref: today(), from: today().slice(0, 8) + '01', to: today(), head: '' });
  const r = buildReport(state, p);
  const label = { weekly: 'Weekly', monthly: 'Monthly', annual: 'Annual', custom: 'Custom period', all: 'Complete' }[p.kind];
  const title = `${label} Accounts Report${p.head ? ' – ' + p.head : ''}`;
  const pdf = () => downloadPdf({
    org: state.masjid, title, subtitle: p.kind === 'all' ? 'All transactions' : `Period: ${fmtDate(r.from)} to ${fmtDate(r.to)}`,
    blocks: [
      { kv: [['Opening balance', pdfInr(r.opening)], ['Total income', pdfInr(r.income)], ['Total expense', pdfInr(r.expense)], ['Closing balance', pdfInr(r.closing)]] },
      { heading: 'Transactions' },
      { table: { head: ['Date', 'Account', 'Description', 'Income', 'Expense', 'Balance'], body: [['', '', 'Opening balance', '', '', pdfInr(r.opening)], ...r.rows.map((t) => [fmtDate(t.date), t.head, t.description, t.type === 'income' ? pdfInr(t.amount) : '', t.type === 'expense' ? pdfInr(t.amount) : '', pdfInr(t.balance)])], foot: [['', '', 'Closing balance', pdfInr(r.income), pdfInr(r.expense), pdfInr(r.closing)]] } },
      { heading: 'Account summary' },
      { table: { head: ['Account', 'Income', 'Expense', 'Net'], body: r.summary.map((s) => [s.head, pdfInr(s.income), pdfInr(s.expense), pdfInr(s.income - s.expense)]) } },
    ],
  });
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3">
        <Field label="Report type"><select className="input" value={p.kind} onChange={(e) => setP({ ...p, kind: e.target.value })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="custom">Custom range</option><option value="all">Complete</option></select></Field>
        {['weekly', 'monthly', 'annual'].includes(p.kind) && <Field label="Any date in the period"><input type="date" className="input" value={p.ref} onChange={(e) => setP({ ...p, ref: e.target.value })} /></Field>}
        {p.kind === 'custom' && <><Field label="From"><input type="date" className="input" value={p.from} onChange={(e) => setP({ ...p, from: e.target.value })} /></Field><Field label="To"><input type="date" className="input" value={p.to} onChange={(e) => setP({ ...p, to: e.target.value })} /></Field></>}
        <Field label="Account"><select className="input" value={p.head} onChange={(e) => setP({ ...p, head: e.target.value })}><option value="">All accounts</option>{state.accountHeads.map((h) => <option key={h}>{h}</option>)}</select></Field>
        <button className="btn-primary" onClick={pdf}><FileDown size={16} /> Download PDF</button>
      </div>
      <div className="card">
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs text-slate-500 mb-3">{p.kind === 'all' ? 'All transactions' : `${fmtDate(r.from)} – ${fmtDate(r.to)}`}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
          {[['Opening', r.opening], ['Income', r.income], ['Expense', r.expense], ['Closing', r.closing]].map(([l, v]) => <div key={l} className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">{l}</div><div className="font-bold text-lg">{inr(v)}</div></div>)}
        </div>
        <table className="table">
          <thead><tr><th>Date</th><th>Account</th><th>Description</th><th className="text-right">Income</th><th className="text-right">Expense</th><th className="text-right">Balance</th></tr></thead>
          <tbody>
            <tr className="bg-slate-50 italic"><td colSpan={5}>Opening balance</td><td className="text-right">{inr(r.opening)}</td></tr>
            {r.rows.map((t) => <tr key={t.id}><td>{fmtDate(t.date)}</td><td>{t.head}</td><td>{t.description}</td><td className="text-right text-green-700">{t.type === 'income' ? inr(t.amount) : ''}</td><td className="text-right text-red-600">{t.type === 'expense' ? inr(t.amount) : ''}</td><td className="text-right font-mono">{inr(t.balance)}</td></tr>)}
            <tr className="bg-brand-50 font-bold"><td colSpan={3}>Closing balance</td><td className="text-right">{inr(r.income)}</td><td className="text-right">{inr(r.expense)}</td><td className="text-right">{inr(r.closing)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Accounts() {
  const [tab, setTab] = useState('ledger');
  return (
    <div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'ledger', label: 'Ledger' }, { id: 'heads', label: 'Account Heads' }, { id: 'reports', label: 'PDF Reports' }]} />
      {tab === 'ledger' && <Ledger />}
      {tab === 'heads' && <Heads />}
      {tab === 'reports' && <Reports />}
    </div>
  );
}
