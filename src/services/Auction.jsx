import { useEffect, useState } from 'react';
import { Gavel, Crown, Timer, Trash2, Square, FileDown, Package } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApp } from '../store/AppContext';
import { CrudManager, Field, StatusBadge, Empty, SectionTitle, Modal } from '../components/ui';
import { inr, pdfInr, fmtDateTime, uid } from '../utils/format';
import { downloadPdf } from '../utils/pdf';

export const useNow = (ms = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
};
const isLive = (a, now) => a.status === 'live' && new Date(a.endsAt).getTime() > now;
const topBid = (a) => a.bids.reduce((best, b) => (!best || b.amount > best.amount ? b : best), null);
const minNext = (a) => { const t = topBid(a); return t ? t.amount + Number(a.increment) : Number(a.minBid); };
const countdown = (ms) => {
  if (ms <= 0) return 'Ended';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${d ? d + 'd ' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

function BidChart({ item }) {
  const data = [...item.bids].sort((a, b) => a.time.localeCompare(b.time)).map((b) => ({ t: new Date(b.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), amount: b.amount, bidder: b.bidder }));
  if (!data.length) return <div className="h-56 grid place-items-center text-sm text-slate-400 bg-slate-50 rounded-lg">No bids yet – be the first!</div>;
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="t" fontSize={11} />
        <YAxis fontSize={11} domain={['dataMin - 50', 'dataMax + 50']} />
        <Tooltip formatter={(v) => inr(v)} labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.bidder || ''}`} />
        <Line type="stepAfter" dataKey="amount" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const TopBidder = ({ item, ended }) => {
  const t = topBid(item);
  if (!t) return null;
  return (
    <div className="rounded-xl p-4 bg-gradient-to-r from-yellow-300 via-gold-400 to-amber-400 text-amber-950 flex items-center gap-3 shadow">
      <Crown size={28} />
      <div className="flex-1"><div className="text-xs font-semibold uppercase">{ended ? 'Winner' : 'Highest bidder'}</div><div className="font-black text-lg">{t.bidder}</div></div>
      <div className="text-2xl font-black">{inr(t.amount)}</div>
    </div>
  );
};

export default function AuctionPage() {
  const { state, update, toast, user } = useApp();
  const now = useNow();
  const [sel, setSel] = useState(state.auctionItems[0]?.id);
  const [bid, setBid] = useState({ bidder: user?.name || '', phone: '', amount: '' });
  const item = state.auctionItems.find((a) => a.id === sel) || state.auctionItems[0];

  const place = (e) => {
    e.preventDefault();
    const amt = Number(bid.amount);
    if (!isLive(item, Date.now())) return toast('This auction has ended', 'error');
    const need = minNext(item);
    if (amt < need) return toast(`Minimum bid is ${inr(need)}`, 'error');
    update((s) => { s.auctionItems.find((a) => a.id === item.id).bids.push({ id: uid('bid'), bidder: bid.bidder.trim(), phone: bid.phone.trim(), amount: amt, time: new Date().toISOString() }); });
    toast(`Bid of ${inr(amt)} placed!`);
    setBid({ ...bid, amount: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SectionTitle icon={Gavel} title="Live Auction (Lelam)" subtitle="Bids update live across every open screen." />
      {!item ? <Empty>No auctions right now.</Empty> : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {state.auctionItems.map((a) => {
              const live = isLive(a, now); const t = topBid(a);
              return (
                <button key={a.id} onClick={() => setSel(a.id)} className={`card w-full text-left flex gap-3 ${item.id === a.id ? 'ring-2 ring-purple-500' : 'hover:shadow-md'}`}>
                  {a.image ? <img src={a.image} alt="" className="w-14 h-14 rounded object-cover" /> : <div className="w-14 h-14 rounded bg-purple-50 grid place-items-center"><Package className="text-purple-600" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{a.name}</div>
                    <div className="text-xs text-slate-500">{t ? `Top ${inr(t.amount)}` : `Starts ${inr(a.minBid)}`} · {a.bids.length} bids</div>
                    <div className={`text-xs font-mono mt-1 ${live ? 'text-green-700' : 'text-slate-400'}`}>{live ? '● ' + countdown(new Date(a.endsAt) - now) : 'Ended'}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <div className="flex flex-wrap justify-between gap-2">
                <div><h2 className="text-xl font-bold">{item.name}</h2><p className="text-sm text-slate-500">{item.description}</p></div>
                <div className={`text-right ${isLive(item, now) ? 'text-green-700' : 'text-slate-500'}`}><div className="text-xs flex items-center gap-1 justify-end"><Timer size={12} />{isLive(item, now) ? 'Ends in' : 'Closed'}</div><div className="text-2xl font-mono font-bold">{countdown(new Date(item.endsAt) - now)}</div></div>
              </div>
              <div className="mt-4"><TopBidder item={item} ended={!isLive(item, now)} /></div>
              <div className="mt-4"><BidChart item={item} /></div>
            </div>
            {isLive(item, now) ? (
              <form onSubmit={place} className="card grid sm:grid-cols-4 gap-3 items-end">
                <Field label="Your name *"><input className="input" required value={bid.bidder} onChange={(e) => setBid({ ...bid, bidder: e.target.value })} /></Field>
                <Field label="Phone *"><input className="input" required value={bid.phone} onChange={(e) => setBid({ ...bid, phone: e.target.value })} /></Field>
                <Field label={`Bid (min ${inr(minNext(item))})`}><input type="number" className="input" min={minNext(item)} step="1" required placeholder={minNext(item)} value={bid.amount} onChange={(e) => setBid({ ...bid, amount: e.target.value })} /></Field>
                <button className="btn bg-purple-600 text-white hover:bg-purple-700"><Gavel size={16} />Place bid</button>
                <div className="sm:col-span-4 flex gap-2 text-xs">Quick bid: {[0, 1, 2].map((k) => { const v = minNext(item) + k * Number(item.increment); return <button type="button" key={k} className="badge bg-purple-100 text-purple-800" onClick={() => setBid({ ...bid, amount: v })}>{inr(v)}</button>; })}<span className="text-slate-400 ml-auto">Increment {inr(item.increment)}</span></div>
              </form>
            ) : <div className="card text-sm text-slate-500">Bidding has closed for this item.</div>}
            <div className="card">
              <h3 className="font-bold mb-2">Bid history</h3>
              {[...item.bids].sort((a, b) => b.amount - a.amount).map((b, i) => (
                <div key={b.id} className={`flex justify-between text-sm py-1.5 border-b last:border-0 ${i === 0 ? 'font-bold text-amber-700' : ''}`}><span>{i === 0 && '👑 '}{b.bidder}</span><span>{inr(b.amount)} <span className="text-xs text-slate-400 font-normal ml-2">{fmtDateTime(b.time)}</span></span></div>
              ))}
              {!item.bids.length && <Empty>No bids yet.</Empty>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuctionAdmin() {
  const { state, add, patch, remove, update, toast } = useApp();
  const now = useNow();
  const [bidsOf, setBidsOf] = useState(null);
  const toLocal = (iso) => { const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const items = state.auctionItems.map((a) => ({ ...a, endsLocal: toLocal(a.endsAt) }));
  const clean = ({ endsLocal, ...d }) => ({ ...d, minBid: Number(d.minBid), increment: Number(d.increment), endsAt: new Date(endsLocal).toISOString() });
  const watched = state.auctionItems.find((a) => a.id === bidsOf);

  const resultPdf = (a) => {
    const t = topBid(a);
    downloadPdf({
      org: state.masjid, title: `Auction Result – ${a.name}`, subtitle: `Closed ${fmtDateTime(a.endedAt || a.endsAt)}`,
      blocks: [
        { kv: [['Item', a.name], ['Starting bid', pdfInr(a.minBid)], ['Total bids', a.bids.length], ['Winner', t ? `${t.bidder} (${t.phone})` : 'No bids'], ['Winning amount', t ? pdfInr(t.amount) : '-']] },
        { heading: 'All bids' },
        { table: { head: ['#', 'Bidder', 'Phone', 'Amount', 'Time'], body: [...a.bids].sort((x, y) => y.amount - x.amount).map((b, i) => [i + 1, b.bidder, b.phone, pdfInr(b.amount), fmtDateTime(b.time)]) } },
      ],
    }, `auction-${a.id}.pdf`);
  };
  const endNow = (a) => { if (!confirm(`End "${a.name}" now?`)) return; patch('auctionItems', a.id, { status: 'ended', endedAt: new Date().toISOString(), endsAt: new Date().toISOString() }); toast('Auction ended'); };
  const postIncome = (a) => {
    const t = topBid(a); if (!t) return;
    update((s) => { s.transactions.push({ id: 'txn_' + a.id, date: new Date().toISOString().slice(0, 10), type: 'income', head: s.accountHeads.includes('Nercha Fund') ? 'Nercha Fund' : s.accountHeads[0], amount: t.amount, description: `Auction – ${a.name} – ${t.bidder}`, receipt: '' }); s.auctionItems.find((x) => x.id === a.id).posted = true; });
    toast(`${inr(t.amount)} added to the ledger`);
  };

  return (
    <div className="space-y-4">
      <CrudManager title="Auction Items" items={items} defaults={{ minBid: 100, increment: 10, endsLocal: toLocal(new Date(Date.now() + 86400000).toISOString()), status: 'live', bids: [] }}
        fields={[
          { name: 'image', label: 'Photo', type: 'image' },
          { name: 'name', label: 'Item', required: true },
          { name: 'minBid', label: 'Starting bid (₹)', type: 'number', min: 1, required: true },
          { name: 'increment', label: 'Min increment (₹)', type: 'number', min: 1, required: true },
          { name: 'endsLocal', label: 'Ends at', type: 'datetime-local', required: true, render: (a) => <span className={isLive(a, now) ? 'text-green-700 font-mono' : 'text-slate-400'}>{isLive(a, now) ? countdown(new Date(a.endsAt) - now) : 'Ended'}</span> },
          { name: 'top', label: 'Top bid', form: false, render: (a) => { const t = topBid(a); return t ? `${inr(t.amount)} · ${t.bidder}` : '—'; } },
          { name: 'description', label: 'Description', type: 'textarea', table: false },
        ]}
        extraActions={(a) => (
          <>
            <button className="btn-outline btn-sm mr-1" onClick={() => setBidsOf(a.id)}>Bids ({a.bids.length})</button>
            {isLive(a, now) && <button className="btn-outline btn-sm mr-1" title="End now" onClick={() => endNow(a)}><Square size={11} />End</button>}
            {!isLive(a, now) && <button className="btn-outline btn-sm mr-1" onClick={() => resultPdf(a)}><FileDown size={11} />Result</button>}
            {!isLive(a, now) && topBid(a) && !a.posted && <button className="btn-primary btn-sm mr-1" onClick={() => postIncome(a)}>Post to ledger</button>}
          </>
        )}
        onAdd={(d) => { add('auctionItems', { ...clean(d), status: 'live', bids: [] }); toast('Auction item added'); }}
        onUpdate={(id, d) => { const c = clean(d); patch('auctionItems', id, { ...c, status: new Date(c.endsAt) > new Date() ? 'live' : 'ended' }); toast('Auction updated'); }}
        onDelete={(id) => remove('auctionItems', id)} />
      <Modal open={!!watched} onClose={() => setBidsOf(null)} title={`Bids – ${watched?.name}`} wide>
        {watched && (
          <div className="space-y-4">
            <TopBidder item={watched} ended={!isLive(watched, now)} />
            <BidChart item={watched} />
            <table className="table"><thead><tr><th>Bidder</th><th>Phone</th><th>Amount</th><th>Time</th><th /></tr></thead>
              <tbody>{[...watched.bids].sort((a, b) => b.amount - a.amount).map((b) => (
                <tr key={b.id}><td>{b.bidder}</td><td>{b.phone}</td><td className="font-semibold">{inr(b.amount)}</td><td className="text-xs">{fmtDateTime(b.time)}</td>
                  <td className="text-right"><button className="p-1 text-slate-400 hover:text-red-600" title="Remove bad bid" onClick={() => { if (confirm('Remove this bid?')) { update((s) => { const a = s.auctionItems.find((x) => x.id === watched.id); a.bids = a.bids.filter((x) => x.id !== b.id); }); toast('Bid removed'); } }}><Trash2 size={14} /></button></td></tr>
              ))}</tbody></table>
            {!watched.bids.length && <Empty>No bids.</Empty>}
            <div className="flex gap-2"><StatusBadge status={isLive(watched, now) ? 'live' : 'ended'} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
