import { useState } from 'react';
import { X, Plus, Pencil, Trash2, Upload, Search } from 'lucide-react';
import { readImage } from '../utils/format';
import { useApp } from '../store/AppContext';

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-8`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
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
  pending: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800', confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700', active: 'bg-blue-100 text-blue-800', returned: 'bg-slate-200 text-slate-700',
  overdue: 'bg-red-100 text-red-700', live: 'bg-green-100 text-green-800', ended: 'bg-slate-200 text-slate-700', income: 'bg-green-100 text-green-800', expense: 'bg-red-100 text-red-700',
};
export const StatusBadge = ({ status }) => <span className={`badge capitalize ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-4">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${active === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          {t.label}{t.count ? <span className="ml-1.5 badge bg-red-500 text-white">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export const Empty = ({ children = 'Nothing here yet.' }) => <div className="text-center text-sm text-slate-400 py-8">{children}</div>;

export const StatCard = ({ icon: Icon, label, value, color = 'brand' }) => {
  const colors = { brand: 'bg-brand-100 text-brand-700', blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700', purple: 'bg-purple-100 text-purple-700', red: 'bg-red-100 text-red-700' };
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}><Icon size={22} /></div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500 font-medium">{label}</div>
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
        <h3 className="h2">{title} <span className="text-sm text-slate-400 font-normal">({items.length})</span></h3>
        <div className="flex gap-2">
          {searchKeys && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input className="input pl-8 w-48" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
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
              <tr key={it.id} className="hover:bg-slate-50">
                {cols.map((c) => (
                  <td key={c.name}>
                    {c.render ? c.render(it) : c.type === 'image' ? (it[c.name] ? <img src={it[c.name]} alt="" className="h-10 w-10 object-cover rounded" /> : '—') : c.type === 'password' ? '••••••' : String(it[c.name] ?? '')}
                  </td>
                ))}
                <td className="text-right whitespace-nowrap">
                  {extraActions?.(it)}
                  <button className="p-1.5 text-slate-500 hover:text-brand-700" title="Edit" onClick={() => setEditing({ ...it })}><Pencil size={15} /></button>
                  {canDelete(it) && <button className="p-1.5 text-slate-500 hover:text-red-600" title="Delete" onClick={async () => { if (await ask({ title: 'Delete record?', message: 'This cannot be undone.', danger: true, okLabel: 'Delete' })) onDelete(it.id); }}><Trash2 size={15} /></button>}
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
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">{Icon && <Icon className="text-brand-600" size={24} />}{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
