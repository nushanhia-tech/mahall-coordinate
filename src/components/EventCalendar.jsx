import { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { fmtDate } from '../utils/format';

export default function EventCalendar({ events }) {
  const [ref, setRef] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [picked, setPicked] = useState('');
  const y = ref.getFullYear(), m = ref.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const days = new Date(y, m + 1, 0).getDate();
  const key = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const byDay = events.reduce((a, e) => { (a[e.date] ||= []).push(e); return a; }, {});
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = [...events].filter((e) => e.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date));
  const list = picked ? byDay[picked] || [] : upcoming;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <button className="p-1 rounded hover:bg-slate-100" onClick={() => setRef(new Date(y, m - 1, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <div className="font-semibold">{ref.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
          <button className="p-1 rounded hover:bg-slate-100" onClick={() => setRef(new Date(y, m + 1, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 mb-1">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }).map((_, i) => <div key={'x' + i} />)}
          {Array.from({ length: days }).map((_, i) => {
            const k = key(i + 1);
            const has = byDay[k];
            return (
              <button key={k} onClick={() => setPicked(picked === k ? '' : k)} className={`aspect-square rounded-lg text-sm relative ${picked === k ? 'bg-brand-600 text-white' : has ? 'bg-brand-100 text-brand-800 font-bold' : 'hover:bg-slate-100'} ${k === todayKey ? 'ring-2 ring-gold-400' : ''}`}>
                {i + 1}
                {has && <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${picked === k ? 'bg-white' : 'bg-brand-600'}`} />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div className="font-semibold mb-3">{picked ? `Events on ${fmtDate(picked)}` : 'Upcoming events'}</div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {list.map((e) => (
            <div key={e.id} className="border-l-4 border-brand-500 pl-3">
              <div className="font-semibold text-slate-800">{e.title}{e.rescheduledFrom && <span className="ml-2 badge bg-amber-100 text-amber-800">Rescheduled from {fmtDate(e.rescheduledFrom)}</span>}</div>
              <div className="text-xs text-slate-500 flex flex-wrap gap-3 mt-0.5"><span>{fmtDate(e.date)}</span>{e.time && <span className="flex items-center gap-1"><Clock size={11} />{e.time}</span>}{e.venue && <span className="flex items-center gap-1"><MapPin size={11} />{e.venue}</span>}</div>
              {e.description && <p className="text-sm text-slate-600 mt-1">{e.description}</p>}
            </div>
          ))}
          {!list.length && <div className="text-sm text-slate-400">No events.</div>}
        </div>
      </div>
    </div>
  );
}
