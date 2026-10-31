import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Check, CheckCheck, Plus, Home, ArrowLeft, Lock } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Modal, Field, Empty, SectionTitle } from '../components/ui';
import { uid, fmtDateTime } from '../utils/format';

const time = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const day = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function ChatWindow({ thread, me, title, subtitle, onBack }) {
  const { update } = useApp();
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const other = me === 'admin' ? 'member' : 'admin';

  // Mark the other side's messages as read when this thread is on screen.
  useEffect(() => {
    if (thread.messages.some((m) => m.from === other && !m.read)) {
      update((s) => { s.chats.find((c) => c.id === thread.id).messages.forEach((m) => { if (m.from === other) m.read = true; }); });
    }
  }, [thread, other, update]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread.messages.length, thread.id]);

  const send = (e) => {
    e.preventDefault();
    const t = text.trim(); if (!t) return;
    update((s) => { const c = s.chats.find((x) => x.id === thread.id); c.messages.push({ id: uid('msg'), from: me, text: t, time: new Date().toISOString(), read: false }); c.closed = false; });
    setText('');
  };
  const toggleClose = () => update((s) => { const c = s.chats.find((x) => x.id === thread.id); c.closed = !c.closed; });

  let lastDay = '';
  return (
    <div className="flex flex-col h-[70vh] min-h-[420px] rounded-xl overflow-hidden border bg-[#efeae2]">
      <div className="bg-brand-800 text-white px-4 py-3 flex items-center gap-3">
        {onBack && <button onClick={onBack} className="md:hidden"><ArrowLeft size={18} /></button>}
        <div className="w-9 h-9 rounded-full bg-white/20 grid place-items-center font-bold">{title[0]}</div>
        <div className="flex-1 min-w-0"><div className="font-semibold truncate">{title}</div><div className="text-[11px] text-brand-100 truncate">{subtitle}</div></div>
        {me === 'admin' && <button className="text-xs bg-white/15 px-2 py-1 rounded" onClick={toggleClose}>{thread.closed ? 'Reopen' : 'Mark resolved'}</button>}
      </div>
      {thread.householdInfo && <div className="bg-amber-50 text-amber-900 text-xs px-4 py-1.5 flex items-center gap-1.5 border-b"><Home size={12} />Household: {thread.householdInfo}</div>}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        <div className="text-center"><span className="text-[11px] bg-amber-100 text-amber-900 px-2 py-1 rounded inline-flex items-center gap-1"><Lock size={10} />Private between you and the Mahall committee</span></div>
        {thread.messages.map((m) => {
          const mine = m.from === me;
          const d = day(m.time); const showDay = d !== lastDay; lastDay = d;
          return (
            <div key={m.id}>
              {showDay && <div className="text-center my-2"><span className="text-[11px] bg-white/80 px-2 py-0.5 rounded shadow-sm text-slate-600">{d}</span></div>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-1.5 shadow-sm text-sm ${mine ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">{time(m.time)}{mine && (m.read ? <CheckCheck size={14} className="text-sky-500" /> : <Check size={14} />)}</div>
                </div>
              </div>
            </div>
          );
        })}
        {thread.closed && <div className="text-center text-xs text-slate-500 py-2">This matter was marked resolved. Sending a message reopens it.</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="bg-[#f0f2f5] p-2 flex gap-2">
        <input className="input rounded-full flex-1" placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="w-10 h-10 rounded-full bg-brand-600 text-white grid place-items-center hover:bg-brand-700" aria-label="Send"><Send size={16} /></button>
      </form>
    </div>
  );
}

function ThreadList({ threads, active, onPick, me, label }) {
  const other = me === 'admin' ? 'member' : 'admin';
  return (
    <div className="divide-y">
      {threads.map((t) => {
        const last = t.messages[t.messages.length - 1];
        const unread = t.messages.filter((m) => m.from === other && !m.read).length;
        return (
          <button key={t.id} onClick={() => onPick(t.id)} className={`w-full text-left px-3 py-3 flex gap-3 ${active === t.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-bold shrink-0">{label(t)[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-2"><span className="font-semibold text-sm truncate">{label(t)}</span><span className={`text-[10px] ${unread ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>{last && time(last.time)}</span></div>
              <div className="text-xs text-slate-500 truncate">{t.subject}</div>
              <div className="flex justify-between gap-2"><span className="text-xs text-slate-400 truncate">{last?.from === me && '✓ '}{last?.text}</span>{unread ? <span className="badge bg-brand-600 text-white">{unread}</span> : t.closed ? <span className="text-[10px] text-slate-400">resolved</span> : null}</div>
            </div>
          </button>
        );
      })}
      {!threads.length && <Empty>No conversations.</Empty>}
    </div>
  );
}

const sortThreads = (list) => [...list].sort((a, b) => (b.messages.at(-1)?.time || b.createdAt).localeCompare(a.messages.at(-1)?.time || a.createdAt));

export default function MediationPage() {
  const { state, user, update, toast } = useApp();
  const mine = sortThreads(state.chats.filter((c) => c.userId === user.id));
  const [active, setActive] = useState(mine[0]?.id || '');
  const [create, setCreate] = useState(null);
  const thread = state.chats.find((c) => c.id === active && c.userId === user.id);
  const hh = state.households.find((h) => h.id === user.householdId);

  const start = (e) => {
    e.preventDefault();
    const id = uid('chat');
    const nowIso = new Date().toISOString();
    update((s) => { s.chats.push({ id, userId: user.id, subject: create.subject, householdInfo: hh ? `${hh.homeNo} · ${hh.headName} · ${hh.members} members · ${hh.ward}` : user.role === 'institution' ? `Institution account – ${user.name}` : '', createdAt: nowIso, messages: [{ id: uid('msg'), from: 'member', text: create.message, time: nowIso, read: false }] }); });
    setActive(id); setCreate(null); toast('Conversation started – the committee will reply here');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SectionTitle icon={MessageCircle} title="Mediation Chat" subtitle="Raise family, property or community matters privately with the Mahall committee." action={<button className="btn-primary" onClick={() => setCreate({ subject: '', message: '' })}><Plus size={16} />New matter</button>} />
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`card p-0 overflow-hidden ${thread ? 'hidden md:block' : ''}`}><div className="px-4 py-3 font-semibold border-b">My conversations</div><ThreadList threads={mine} active={active} onPick={setActive} me="member" label={(t) => t.subject} /></div>
        <div className={`md:col-span-2 ${thread ? '' : 'hidden md:block'}`}>
          {thread ? <ChatWindow thread={thread} me="member" title="Mahall Committee" subtitle={thread.subject} onBack={() => setActive('')} /> : <div className="card h-full grid place-items-center text-slate-400 text-sm">Pick a conversation or start a new one.</div>}
        </div>
      </div>
      <Modal open={!!create} onClose={() => setCreate(null)} title="New mediation request">
        {create && (
          <form onSubmit={start} className="space-y-3">
            {hh && <div className="text-xs bg-amber-50 text-amber-900 rounded p-2">Your household details ({hh.homeNo} · {hh.headName}) will be attached automatically.</div>}
            <Field label="Subject *"><input className="input" required value={create.subject} onChange={(e) => setCreate({ ...create, subject: e.target.value })} /></Field>
            <Field label="Describe the matter *"><textarea className="input" rows={4} required value={create.message} onChange={(e) => setCreate({ ...create, message: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setCreate(null)}>Cancel</button><button className="btn-primary">Start conversation</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function MediationAdmin() {
  const { state } = useApp();
  const [filter, setFilter] = useState('open');
  const threads = sortThreads(state.chats.filter((c) => filter === 'all' || (filter === 'open' ? !c.closed : c.closed)));
  const [active, setActive] = useState(threads[0]?.id || '');
  const thread = state.chats.find((c) => c.id === active);
  const userOf = (t) => state.users.find((u) => u.id === t.userId);
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card p-0 overflow-hidden">
        <div className="flex gap-1 p-2 border-b">{['open', 'resolved', 'all'].map((f) => <button key={f} onClick={() => setFilter(f)} className={`btn-sm btn capitalize ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>{f}</button>)}</div>
        <ThreadList threads={threads} active={active} onPick={setActive} me="admin" label={(t) => userOf(t)?.name || 'Member'} />
      </div>
      <div className="md:col-span-2">
        {thread ? <ChatWindow thread={thread} me="admin" title={userOf(thread)?.name || 'Member'} subtitle={`${thread.subject} · opened ${fmtDateTime(thread.createdAt)}`} /> : <div className="card h-full grid place-items-center text-slate-400 text-sm">Select a conversation.</div>}
      </div>
    </div>
  );
}
