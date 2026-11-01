import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp, useConfig } from '../store/AppContext';
import { FEATURE_GROUPS, featureOn } from '../utils/features';

export function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative w-12 h-7 rounded-full transition shrink-0 ${on ? 'bg-brand-600' : 'bg-sand-300'}`}>
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

// Master panel: switch every member-facing option ON (visible) or OFF (hidden everywhere users look).
export default function FeaturesAdmin() {
  const { update, toast } = useApp();
  const config = useConfig();
  const [q, setQ] = useState('');
  const set = (key, value) => {
    update((s) => { s.config = { ...config, toggles: { ...config.toggles, [key]: value } }; });
    toast(`${value ? 'Shown' : 'Hidden'} for members`, value ? 'success' : 'info');
  };
  const setGroup = (items, value) => {
    const toggles = { ...config.toggles };
    items.forEach(([k]) => { toggles[k] = value; });
    update((s) => { s.config = { ...config, toggles }; });
    toast(value ? 'Whole group shown' : 'Whole group hidden', 'info');
  };
  const offCount = FEATURE_GROUPS.flatMap(([, i]) => i).filter(([k]) => !featureOn(config, k)).length;
  const match = (txt) => !q || txt.toLowerCase().includes(q.toLowerCase());

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="font-display text-xl font-semibold">Your Mahall, your rules</div>
          <p className="text-sm text-ink-500 mt-1 max-w-2xl">Switch any option <b>ON</b> to show it to members and visitors, or <b>OFF</b> to hide it everywhere they look. Admin pages always stay available so you can still manage the data. Switched-off services are also blocked on the server.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${offCount ? 'bg-gold-100 text-gold-600' : 'bg-brand-100 text-brand-700'}`}>{offCount ? `${offCount} hidden` : 'Everything visible'}</span>
          <input className="input w-56" placeholder="Search options…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="grid xl:grid-cols-2 gap-5">
        {FEATURE_GROUPS.map(([group, items]) => {
          const shown = items.filter(([k, l, d]) => match(`${group} ${l} ${d} ${k}`));
          if (!shown.length) return null;
          return (
            <div key={group} className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-lg font-semibold">{group}</h3>
                <div className="flex gap-1">
                  <button className="btn-outline btn-sm" onClick={() => setGroup(items, true)}><Eye size={12} />All on</button>
                  <button className="btn-outline btn-sm" onClick={() => setGroup(items, false)}><EyeOff size={12} />All off</button>
                </div>
              </div>
              <div className="divide-y divide-sand-200">
                {shown.map(([key, label, desc]) => {
                  const isOn = featureOn(config, key);
                  return (
                    <div key={key} className="flex items-center gap-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink-800">{label}</div>
                        {desc && <div className="text-xs text-ink-500 mt-0.5">{desc}</div>}
                      </div>
                      <span className={`text-[11px] font-bold w-14 text-right ${isOn ? 'text-brand-600' : 'text-ink-400'}`}>{isOn ? 'Visible' : 'Hidden'}</span>
                      <Switch on={isOn} onChange={(v) => set(key, v)} label={label} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
