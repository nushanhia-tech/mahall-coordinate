import { useEffect, useState } from 'react';
import { X, Plus, Pencil, Trash2, Upload, Search } from 'lucide-react';
import { readImage } from '../utils/format';
import { useApp } from '../store/AppContext';

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/30 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div className={`bg-white rounded-4xl shadow-lift w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-8 animate-fade-up`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="font-display text-xl font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full text-ink-500 hover:bg-sand-100 hover:text-ink-800" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function ImageInput({ value, onChange, label = 'Upload image', accept = 'image/*' }) {
  return (
    <div className="flex items-center gap-3">
      <label className="btn-outline cursor-pointer">
        <Upload size={14} /> {label}
        <input type="file" accept={accept} className="hidden" onChange={async (e) => onChange(await readImage(e.target.files[0]))} />
      </label>
      {value && (value.startsWith('data:image') ? <img src={value} alt="" className="h-12 w-12 object-cover rounded border" /> : <span className="text-xs text-brand-700">File attached</span>)}
      {value && <button type="button" className="text-xs text-red-600" onClick={() => onChange('')}>Remove</button>}
    </div>
  );
}

const STATUS_COLORS = {
  pending: 'bg-gold-100 text-gold-600', approved: 'bg-brand-100 text-brand-700', confirmed: 'bg-brand-100 text-brand-700',
  rejected: 'bg-clay-100 text-clay-600', active: 'bg-sky-100 text-sky-700', returned: 'bg-sand-200 text-ink-600',
  overdue: 'bg-clay-100 text-clay-600', live: 'bg-brand-100 text-brand-700', ended: 'bg-sand-200 text-ink-600', income: 'bg-brand-100 text-brand-700', expense: 'bg-clay-100 text-clay-600',
};
const DOTS = { pending: 'bg-gold-500', approved: 'bg-brand-500', confirmed: 'bg-brand-500', rejected: 'bg-clay-500', active: 'bg-sky-500', overdue: 'bg-clay-500', live: 'bg-brand-500 animate-pulse', income: 'bg-brand-500', expense: 'bg-clay-500' };
export const StatusBadge = ({ status }) => <span className={`badge capitalize ${STATUS_COLORS[status] || 'bg-sand-200 text-ink-600'}`}><span className={`w-1.5 h-1.5 rounded-full ${DOTS[status] || 'bg-ink-400'}`} />{status}</span>;

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 p-1 mb-5 rounded-full bg-white border border-sand-200 shadow-soft max-w-full overflow-x-auto scrollbar-none">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${active === t.id ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-500 hover:text-ink-800 hover:bg-sand-100'}`}>
          {t.label}{t.count ? <span className={`ml-1.5 badge ${active === t.id ? 'bg-white/25 text-white' : 'bg-clay-500 text-white'}`}>{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export const Empty = ({ children = 'Nothing here yet.' }) => (
  <div className="text-center py-10">
    <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-sand-100 grid place-items-center text-xl">🌙</div>
    <div className="text-sm text-ink-400">{children}</div>
  </div>
);

export const StatCard = ({ icon: Icon, label, value, color = 'brand' }) => {
  const colors = { brand: 'from-brand-100 to-brand-50 text-brand-700', blue: 'from-sky-100 to-sky-50 text-sky-700', amber: 'from-gold-100 to-gold-50 text-gold-600', purple: 'from-violet-100 to-violet-50 text-violet-700', red: 'from-clay-100 to-clay-50 text-clay-600' };
  return (
    <div className="card card-hover flex items-center gap-4 animate-fade-up">
      <div className={`w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br grid place-items-center ${colors[color]}`}><Icon size={22} /></div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-ink-900 tabular-nums truncate">{value}</div>
        <div className="text-xs text-ink-500 font-medium">{label}</div>
      </div>
    </div>
  );
};

// Generic add/edit/delete table driven by a field list.
// field: { name, label, type: text|number|date|time|textarea|select|image|password, options, required, table (show in table), render }
export function CrudManager({ title, items, fields, onAdd, onUpdate, onDelete, defaults = {}, searchKeys, extraActions, canDelete = () => true, addLabel = 'Add' }) {
  const { ask } = useApp();
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const cols = fields.filter((f) => f.table !== false);
  const list = q && searchKeys ? items.filter((it) => searchKeys.some((k) => String(it[k] ?? '').toLowerCase().includes(q.toLowerCase()))) : items;

  const save = (e) => {
    e.preventDefault();
    const data = { ...editing };
    fields.forEach((f) => { if (f.type === 'number' && data[f.name] !== '' && data[f.name] != null) data[f.name] = Number(data[f.name]); });
    if (data.id) onUpdate(data.id, data); else onAdd(data);
    setEditing(null);
  };

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="h2">{title} <span className="ml-1 badge bg-sand-200 text-ink-600 align-middle">{items.length}</span></h3>
        <div className="flex gap-2">
          {searchKeys && (
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-ink-400" />
              <input className="input pl-9 w-52" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          )}
          <button className="btn-primary" onClick={() => setEditing({ ...defaults })}><Plus size={16} /> {addLabel}</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr>{cols.map((c) => <th key={c.name}>{c.label}</th>)}<th className="text-right">Actions</th></tr></thead>
          <tbody>
            {list.map((it) => (
              <tr key={it.id}>
                {cols.map((c) => (
                  <td key={c.name}>
                    {c.render ? c.render(it) : c.type === 'image' ? (it[c.name] ? <img src={it[c.name]} alt="" className="h-10 w-10 object-cover rounded" /> : '—') : c.type === 'password' ? '••••••' : String(it[c.name] ?? '')}
                  </td>
                ))}
                <td className="text-right whitespace-nowrap">
                  {extraActions?.(it)}
                  <button className="p-2 rounded-full text-ink-400 hover:text-brand-700 hover:bg-brand-50" title="Edit" onClick={() => setEditing({ ...it })}><Pencil size={15} /></button>
                  {canDelete(it) && <button className="p-2 rounded-full text-ink-400 hover:text-clay-600 hover:bg-clay-50" title="Delete" onClick={async () => { if (await ask({ title: 'Delete record?', message: 'This cannot be undone.', danger: true, okLabel: 'Delete' })) onDelete(it.id); }}><Trash2 size={15} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <Empty />}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`${editing?.id ? 'Edit' : 'Add'} ${title.replace(/s$/, '')}`}>
        {editing && (
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            {fields.filter((f) => f.form !== false).map((f) => (
              <Field key={f.name} label={f.label + (f.required ? ' *' : '')} className={f.type === 'textarea' || f.type === 'image' || f.full ? 'col-span-2' : ''}>
                {f.type === 'textarea' ? (
                  <textarea className="input" rows={3} required={f.required} value={editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} />
                ) : f.type === 'select' ? (
                  <select className="input" required={f.required} value={editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}>
                    <option value="">— Select —</option>
                    {(typeof f.options === 'function' ? f.options(editing) : f.options).map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'image' ? (
                  <ImageInput value={editing[f.name]} onChange={(v) => setEditing({ ...editing, [f.name]: v })} />
                ) : (
                  <input className="input" type={f.type === 'password' ? 'text' : f.type || 'text'} min={f.min} step={f.step} required={f.required} value={editing[f.name] ?? ''} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} />
                )}
              </Field>
            ))}
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function SectionTitle({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between mb-4 gap-3">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink-900 flex items-center gap-3">{Icon && <span className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center"><Icon size={20} /></span>}{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Look up a visitor's own records by phone number (server only returns matches).
export const usePhoneLookup = (kind, phone) => {
  const { api } = useApp();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const p = phone.trim();
    if (p.length < 10) { setRows([]); return; }
    const t = setTimeout(() => api(`/api/lookup?kind=${kind}&phone=${encodeURIComponent(p)}`).then((d) => setRows(d.rows)).catch(() => setRows([])), 300);
    return () => clearTimeout(t);
  }, [kind, phone, api]);
  return rows;
};

// Shows an uploaded image that may be stored on the server (value === '__stored__');
// it is fetched only when this is on screen.
export function StoredImg({ col, id, field, value, className = '' }) {
  const { api } = useApp();
  const stored = value === '__stored__';
  const [src, setSrc] = useState(stored ? '' : value);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!stored) { setSrc(value); return; }
    let cancelled = false;
    setSrc(''); setFailed(false);
    api(`/api/file?col=${col}&id=${encodeURIComponent(id)}&field=${field}`)
      .then((d) => { if (!cancelled) setSrc(d.data); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [col, id, field, value, stored, api]);
  if (failed) return <div className="text-sm text-red-600 text-center py-6">Could not load the image.</div>;
  if (!src) return <div className="text-sm text-slate-400 text-center py-6">Loading image…</div>;
  if (!src.startsWith('data:image')) {
    return <button className="btn-primary" onClick={() => fetch(src).then((r) => r.blob()).then((b) => import('../utils/download').then((m) => m.saveFile('bill.pdf', b)))}>Download file</button>;
  }
  return <img src={src} alt="" className={className} />;
}
