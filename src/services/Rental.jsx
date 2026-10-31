import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, FileDown, RotateCcw, AlertTriangle, Package } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CrudManager, Field, Modal, StatusBadge, Tabs, Empty, SectionTitle } from '../components/ui';
import { inr, pdfInr, fmtDateTime, fmtDuration, cheapestPenalty, UNIT_MS, UNIT_LABEL } from '../utils/format';
import { downloadPdf } from '../utils/pdf';

const UNITS = ['hour', 'day', 'week', 'month'];
const localNow = () => { const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
const rentedQty = (state, itemId) => state.rentals.filter((r) => r.status === 'active').reduce((a, r) => a + r.items.filter((i) => i.itemId === itemId).reduce((x, i) => x + i.qty, 0), 0);
export const isOverdue = (r) => r.status === 'active' && new Date(r.due) < new Date();

export function rentalBillPdf(state, r) {
  const item = (id) => state.rentalItems.find((x) => x.id === id);
  const lines = r.items.map((i) => { const it = item(i.itemId); const rate = it?.rates[r.unit] || 0; return [it?.name || 'Item', i.qty, `${pdfInr(rate)} / ${UNIT_LABEL[r.unit]}`, `${r.duration} ${UNIT_LABEL[r.unit]}(s)`, pdfInr(rate * i.qty * r.duration)]; });
  downloadPdf({
    org: state.masjid, title: 'Rental Bill', subtitle: `Bill No. ${r.id.toUpperCase()}`,
    blocks: [
      { kv: [['Customer', r.name], ['Phone', r.phone], ['Rented on', fmtDateTime(r.start)], ['Due back', fmtDateTime(r.due)], ['Returned on', r.returnedAt ? fmtDateTime(r.returnedAt) : 'Not yet returned'], ['Late by', r.returnedAt && new Date(r.returnedAt) > new Date(r.due) ? fmtDuration(new Date(r.returnedAt) - new Date(r.due)) : 'On time']] },
      { heading: 'Items' },
      { table: { head: ['Item', 'Qty', 'Rate', 'Period', 'Amount'], body: lines, foot: [['', '', '', 'Base rent', pdfInr(r.baseAmount)]] } },
      ...(r.penalty ? [{ heading: 'Late return penalty' }, { text: r.penaltyDetail }] : []),
      { kv: [['Base rent', pdfInr(r.baseAmount)], ['Penalty', pdfInr(r.penalty || 0)], ['TOTAL PAYABLE', pdfInr((r.baseAmount || 0) + (r.penalty || 0))]] },
      ...(r.remark ? [{ heading: 'Return remark' }, { text: r.remark }] : []),
      { text: 'Penalty rule: overdue time is rounded up to whole hours, days, weeks and months, and the cheapest of those is charged.' },
    ],
  }, `rental-bill-${r.id}.pdf`);
}

export default function RentalPage() {
  const { state, add, toast, user } = useApp();
  const [cart, setCart] = useState({});
  const [unit, setUnit] = useState('day');
  const [duration, setDuration] = useState(1);
  const [book, setBook] = useState(null);
  const [lookup, setLookup] = useState('');
  const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ item: state.rentalItems.find((i) => i.id === id), qty })).filter((x) => x.item);
  const unitOk = (u) => items.every(({ item }) => Number(item.rates[u]) > 0);
  const total = items.reduce((a, { item, qty }) => a + qty * Number(item.rates[unit] || 0) * duration, 0);
  const avail = (it) => it.stock - rentedQty(state, it.id);
  const setQty = (it, q) => setCart({ ...cart, [it.id]: Math.max(0, Math.min(avail(it), q)) });

  const confirm = (e) => {
    e.preventDefault();
    if (!unitOk(unit)) return toast(`Some items cannot be rented per ${unit}`, 'error');
    const start = new Date(book.start);
    const r = { name: book.name, phone: book.phone, items: items.map(({ item, qty }) => ({ itemId: item.id, qty })), unit, duration: Number(duration), start: start.toISOString(), due: new Date(start.getTime() + duration * UNIT_MS[unit]).toISOString(), status: 'active', baseAmount: total, returnedAt: '', remark: '', penalty: 0, penaltyDetail: '' };
    add('rentals', r);
    toast('Booking confirmed! Collect items from the Mahall office.');
    setCart({}); setBook(null); setLookup(book.phone);
  };
  const mine = lookup ? state.rentals.filter((r) => r.phone === lookup.trim()) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SectionTitle icon={ShoppingCart} title="Rental Cart" subtitle="Hire Mahall items by the hour, day, week or month." />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 content-start">
          {state.rentalItems.map((it) => {
            const a = avail(it);
            return (
              <div key={it.id} className="card flex flex-col">
                <div className="flex gap-3">
                  {it.image ? <img src={it.image} alt="" className="w-16 h-16 rounded object-cover" /> : <div className="w-16 h-16 rounded bg-blue-50 grid place-items-center"><Package className="text-blue-600" /></div>}
                  <div className="flex-1"><div className="font-bold">{it.name}</div><div className="text-xs text-slate-500">{it.description}</div><div className={`text-xs mt-1 ${a ? 'text-green-700' : 'text-red-600'}`}>{a} of {it.stock} available</div></div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center text-xs my-3">
                  {UNITS.map((u) => <div key={u} className={`rounded p-1 ${u === unit ? 'bg-brand-100 text-brand-800 font-semibold' : 'bg-slate-50'}`}><div className="text-[10px] uppercase text-slate-400">{u}</div>{Number(it.rates[u]) ? inr(it.rates[u]) : '—'}</div>)}
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <button className="btn-outline btn-sm" onClick={() => setQty(it, (cart[it.id] || 0) - 1)} aria-label="Less"><Minus size={12} /></button>
                  <span className="w-8 text-center font-semibold">{cart[it.id] || 0}</span>
                  <button className="btn-outline btn-sm" disabled={(cart[it.id] || 0) >= a} onClick={() => setQty(it, (cart[it.id] || 0) + 1)} aria-label="More"><Plus size={12} /></button>
                  {!cart[it.id] && <button className="btn-primary btn-sm ml-auto" disabled={!a} onClick={() => setQty(it, 1)}>Add to cart</button>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-4">
          <div className="card lg:sticky lg:top-20">
            <h3 className="font-bold flex items-center gap-2 mb-3"><ShoppingCart size={18} /> Your cart</h3>
            {items.length ? (
              <>
                {items.map(({ item, qty }) => (
                  <div key={item.id} className="flex justify-between text-sm py-1.5 border-b">
                    <span>{item.name} × {qty}</span>
                    <span className="flex items-center gap-2">{Number(item.rates[unit]) ? inr(qty * item.rates[unit] * duration) : <span className="text-red-600 text-xs">no {unit} rate</span>}<button onClick={() => setQty(item, 0)} className="text-slate-400 hover:text-red-600"><Trash2 size={13} /></button></span>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Field label="Rent per"><select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>{UNITS.map((u) => <option key={u} value={u} disabled={!unitOk(u)}>{UNIT_LABEL[u]}{!unitOk(u) ? ' (n/a)' : ''}</option>)}</select></Field>
                  <Field label={`Number of ${unit}s`}><input type="number" min="1" className="input" value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))} /></Field>
                </div>
                <div className="flex justify-between font-bold text-lg mt-4"><span>Total</span><span>{inr(total)}</span></div>
                <button className="btn-primary w-full mt-3" disabled={!unitOk(unit)} onClick={() => setBook({ name: user?.name || '', phone: '', start: localNow() })}>Book now</button>
              </>
            ) : <Empty>Your cart is empty.</Empty>}
          </div>
          <div className="card">
            <h3 className="font-bold mb-2">My bookings</h3>
            <input className="input" placeholder="Enter your phone number" value={lookup} onChange={(e) => setLookup(e.target.value)} />
            <div className="mt-3 space-y-2">
              {mine.map((r) => (
                <div key={r.id} className="text-sm border rounded-lg p-2">
                  <div className="flex justify-between"><span className="font-medium">{r.items.map((i) => `${state.rentalItems.find((x) => x.id === i.itemId)?.name} ×${i.qty}`).join(', ')}</span><StatusBadge status={isOverdue(r) ? 'overdue' : r.status} /></div>
                  <div className="text-xs text-slate-500">Due {fmtDateTime(r.due)} · {inr(r.baseAmount + (r.penalty || 0))}</div>
                </div>
              ))}
              {lookup && !mine.length && <div className="text-xs text-slate-400">No bookings for this number.</div>}
            </div>
          </div>
        </div>
      </div>
      <Modal open={!!book} onClose={() => setBook(null)} title="Confirm booking">
        {book && (
          <form onSubmit={confirm} className="space-y-3">
            <Field label="Your name *"><input className="input" required value={book.name} onChange={(e) => setBook({ ...book, name: e.target.value })} /></Field>
            <Field label="Phone *"><input className="input" required pattern="[0-9+ ]{10,14}" value={book.phone} onChange={(e) => setBook({ ...book, phone: e.target.value })} /></Field>
            <Field label="Pick-up time *"><input type="datetime-local" className="input" required value={book.start} onChange={(e) => setBook({ ...book, start: e.target.value })} /></Field>
            <p className="text-sm bg-slate-50 rounded p-3">{duration} {unit}(s) · Return by <b>{fmtDateTime(new Date(new Date(book.start).getTime() + duration * UNIT_MS[unit]))}</b> · Total <b>{inr(total)}</b><br /><span className="text-xs text-slate-500">Late returns are charged at the cheapest rate that covers the extra time.</span></p>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setBook(null)}>Cancel</button><button className="btn-primary">Confirm booking</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function RentalAdmin() {
  const { state, add, patch, remove, update, toast } = useApp();
  const [tab, setTab] = useState('active');
  const [ret, setRet] = useState(null);
  const active = state.rentals.filter((r) => r.status === 'active').sort((a, b) => a.due.localeCompare(b.due));
  const history = state.rentals.filter((r) => r.status === 'returned').sort((a, b) => b.returnedAt.localeCompare(a.returnedAt));
  const itemName = (id) => state.rentalItems.find((x) => x.id === id)?.name || 'Item';

  const calc = (r, at = new Date()) => {
    const over = at - new Date(r.due);
    const parts = r.items.map((i) => { const it = state.rentalItems.find((x) => x.id === i.itemId); const p = cheapestPenalty(it?.rates, over); return { ...p, qty: i.qty, name: it?.name, amount: p.amount * i.qty }; });
    const penalty = parts.reduce((a, p) => a + p.amount, 0);
    const detail = over > 0 ? `Returned ${fmtDuration(over)} late. ` + parts.map((p) => `${p.name} ×${p.qty}: ${p.count} ${UNIT_LABEL[p.unit]?.toLowerCase()}(s) = Rs. ${p.amount}`).join('; ') : '';
    return { over, penalty, detail };
  };

  const doReturn = (e) => {
    e.preventDefault();
    const at = new Date();
    const { penalty, detail } = calc(ret, at);
    const r = { ...ret, status: 'returned', returnedAt: at.toISOString(), penalty, penaltyDetail: detail, total: ret.baseAmount + penalty };
    update((s) => { const i = s.rentals.findIndex((x) => x.id === r.id); s.rentals[i] = r; if (ret.postIncome) s.transactions.push({ id: 'txn_' + r.id, date: at.toISOString().slice(0, 10), type: 'income', head: ret.head, amount: r.total, description: `Rental – ${r.name}`, receipt: '' }); });
    toast(`Returned. Total ${inr(r.total)}${penalty ? ` (incl. ${inr(penalty)} penalty)` : ''}`);
    rentalBillPdf(state, r);
    setRet(null);
  };

  const flatItems = state.rentalItems.map((i) => ({ ...i, rHour: i.rates.hour, rDay: i.rates.day, rWeek: i.rates.week, rMonth: i.rates.month }));
  const unflat = (d) => { const { rHour, rDay, rWeek, rMonth, ...rest } = d; return { ...rest, stock: Number(rest.stock), rates: { hour: Number(rHour) || 0, day: Number(rDay) || 0, week: Number(rWeek) || 0, month: Number(rMonth) || 0 } }; };

  const Row = ({ r }) => (
    <tr className={isOverdue(r) ? 'bg-red-50' : ''}>
      <td><div className="font-medium">{r.name}</div><div className="text-xs text-slate-500">{r.phone}</div></td>
      <td className="text-xs">{r.items.map((i) => <div key={i.itemId}>{itemName(i.itemId)} × {i.qty}</div>)}</td>
      <td className="text-xs">{r.duration} {r.unit}(s)<br />{fmtDateTime(r.start)}</td>
      <td className="text-xs">{fmtDateTime(r.due)}{isOverdue(r) && <div className="text-red-600 font-semibold flex items-center gap-1"><AlertTriangle size={11} />{fmtDuration(Date.now() - new Date(r.due))} late</div>}{r.returnedAt && <div>Returned {fmtDateTime(r.returnedAt)}</div>}</td>
      <td className="text-right">{inr(r.baseAmount)}{r.penalty ? <div className="text-xs text-red-600">+{inr(r.penalty)} penalty</div> : null}</td>
      <td className="text-right whitespace-nowrap">
        {r.status === 'active' ? <button className="btn-primary btn-sm mr-1" onClick={() => setRet({ ...r, remark: '', postIncome: true, head: state.accountHeads[0] })}><RotateCcw size={12} />Return</button> : <span className="text-xs text-slate-500 mr-2" title={r.remark}>{r.remark}</span>}
        <button className="btn-outline btn-sm" onClick={() => rentalBillPdf(state, r)}><FileDown size={12} />Bill</button>
      </td>
    </tr>
  );

  const preview = ret && calc(ret);
  return (
    <div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'active', label: 'Active rentals', count: active.filter(isOverdue).length }, { id: 'history', label: 'Returned' }, { id: 'items', label: 'Products' }]} />
      {tab !== 'items' ? (
        <div className="card overflow-x-auto">
          <table className="table"><thead><tr><th>Customer</th><th>Items</th><th>Period</th><th>Due</th><th className="text-right">Amount</th><th /></tr></thead>
            <tbody>{(tab === 'active' ? active : history).map((r) => <Row key={r.id} r={r} />)}</tbody></table>
          {!(tab === 'active' ? active : history).length && <Empty />}
        </div>
      ) : (
        <CrudManager title="Rental Products" items={flatItems} defaults={{ stock: 1, rHour: 0, rDay: 0, rWeek: 0, rMonth: 0 }} fields={[
          { name: 'image', label: 'Photo', type: 'image' },
          { name: 'name', label: 'Name', required: true },
          { name: 'stock', label: 'Stock', type: 'number', min: 0, required: true, render: (i) => `${i.stock - rentedQty(state, i.id)} / ${i.stock}` },
          { name: 'rHour', label: '₹/Hour', type: 'number', min: 0 },
          { name: 'rDay', label: '₹/Day', type: 'number', min: 0 },
          { name: 'rWeek', label: '₹/Week', type: 'number', min: 0 },
          { name: 'rMonth', label: '₹/Month', type: 'number', min: 0 },
          { name: 'description', label: 'Description', type: 'textarea', table: false },
        ]}
          onAdd={(d) => { add('rentalItems', unflat(d)); toast('Product added'); }}
          onUpdate={(id, d) => { patch('rentalItems', id, unflat(d)); toast('Product updated'); }}
          onDelete={(id) => { if (rentedQty(state, id)) return toast('This item is currently rented out', 'error'); remove('rentalItems', id); }} />
      )}
      <Modal open={!!ret} onClose={() => setRet(null)} title="Return items">
        {ret && (
          <form onSubmit={doReturn} className="space-y-3">
            <div className="text-sm bg-slate-50 p-3 rounded space-y-1">
              <div><b>{ret.name}</b> · due {fmtDateTime(ret.due)}</div>
              <div>Base rent: <b>{inr(ret.baseAmount)}</b></div>
              {preview.over > 0 ? <div className="text-red-700">Late by {fmtDuration(preview.over)} → penalty <b>{inr(preview.penalty)}</b><div className="text-xs">{preview.detail}</div></div> : <div className="text-green-700">Returned on time – no penalty.</div>}
              <div className="text-base">Total: <b>{inr(ret.baseAmount + preview.penalty)}</b></div>
            </div>
            <Field label="Remark (condition of items etc.)"><textarea className="input" rows={2} value={ret.remark} onChange={(e) => setRet({ ...ret, remark: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ret.postIncome} onChange={(e) => setRet({ ...ret, postIncome: e.target.checked })} /> Record payment as income in</label>
            {ret.postIncome && <select className="input" value={ret.head} onChange={(e) => setRet({ ...ret, head: e.target.value })}>{state.accountHeads.map((h) => <option key={h}>{h}</option>)}</select>}
            <p className="text-xs text-slate-500">The return time is stamped automatically and the bill PDF downloads.</p>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setRet(null)}>Cancel</button><button className="btn-primary">Confirm return & bill</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
