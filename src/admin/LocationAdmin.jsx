import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { CrudManager, Field, ImageInput } from '../components/ui';
import { MapEmbed } from '../screens/Dashboard';

export default function LocationAdmin() {
  const { state, update, add, patch, remove, toast } = useApp();
  const [m, setM] = useState(state.masjid);
  const save = (e) => { e.preventDefault(); update((s) => { s.masjid = { ...m, lat: Number(m.lat), lng: Number(m.lng) }; }); toast('Masjid details saved'); };
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setM({ ...m, lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }), () => toast('Could not get location', 'error'));
  const saveBranding = (patch) => { update((st) => { st.masjid = { ...st.masjid, ...patch }; }); setM((x) => ({ ...x, ...patch })); toast('Branding updated – visible across the site'); };
  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="h2">Masjid logo & photo</h3>
        <p className="text-sm text-ink-500 mt-1">The logo appears in the header, footer, login page and masjid directory. The photo appears behind the welcome section on the home page and on the login page.</p>
        <div className="grid md:grid-cols-2 gap-5 mt-5">
          <div className="rounded-3xl border border-sand-200 p-4 flex items-center gap-4">
            {m.logo ? <img src={m.logo} alt="Logo" className="w-20 h-20 rounded-2xl object-cover ring-1 ring-sand-200" /> : <div className="w-20 h-20 rounded-2xl bg-sand-100 grid place-items-center text-ink-400 text-xs text-center">No logo</div>}
            <div className="space-y-2">
              <div className="font-semibold text-sm">Logo</div>
              <div className="text-xs text-ink-500">Square image works best (e.g. 512 × 512).</div>
              <ImageInput value={m.logo} onChange={(v) => saveBranding({ logo: v })} label={m.logo ? 'Change logo' : 'Upload logo'} maxSize={400} />
            </div>
          </div>
          <div className="rounded-3xl border border-sand-200 p-4 flex items-center gap-4">
            {m.photo ? <img src={m.photo} alt="Masjid" className="w-32 h-20 rounded-2xl object-cover ring-1 ring-sand-200" /> : <div className="w-32 h-20 rounded-2xl bg-sand-100 grid place-items-center text-ink-400 text-xs">No photo</div>}
            <div className="space-y-2">
              <div className="font-semibold text-sm">Masjid photo</div>
              <div className="text-xs text-ink-500">A wide photo of the masjid (landscape).</div>
              <ImageInput value={m.photo} onChange={(v) => saveBranding({ photo: v })} label={m.photo ? 'Change photo' : 'Upload photo'} maxSize={1400} />
            </div>
          </div>
        </div>
      </div>
      <form onSubmit={save} className="card grid lg:grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-3 content-start">
          <Field label="Masjid / Mahall name" className="col-span-2"><input className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} required /></Field>
          <Field label="Tagline" className="col-span-2"><input className="input" value={m.tagline} onChange={(e) => setM({ ...m, tagline: e.target.value })} /></Field>
          <Field label="Address" className="col-span-2"><input className="input" value={m.address} onChange={(e) => setM({ ...m, address: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={m.phone} onChange={(e) => setM({ ...m, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={m.email} onChange={(e) => setM({ ...m, email: e.target.value })} /></Field>
          <Field label="Latitude"><input className="input" type="number" step="any" value={m.lat} onChange={(e) => setM({ ...m, lat: e.target.value })} /></Field>
          <Field label="Longitude"><input className="input" type="number" step="any" value={m.lng} onChange={(e) => setM({ ...m, lng: e.target.value })} /></Field>
          <Field label="About" className="col-span-2"><textarea className="input" rows={3} value={m.about} onChange={(e) => setM({ ...m, about: e.target.value })} /></Field>
          <div className="col-span-2 flex gap-2"><button type="button" className="btn-outline" onClick={locate}>Use my current location</button><button className="btn-primary">Save details</button></div>
        </div>
        <div><span className="label">Map preview</span><MapEmbed lat={Number(m.lat)} lng={Number(m.lng)} className="h-80" /></div>
      </form>
      <CrudManager title="Committee Members" items={state.committee} fields={[{ name: 'name', label: 'Name', required: true }, { name: 'role', label: 'Role', required: true }, { name: 'phone', label: 'Phone' }]}
        onAdd={(d) => { add('committee', d); toast('Member added'); }} onUpdate={(id, d) => { patch('committee', id, d); toast('Member updated'); }} onDelete={(id) => remove('committee', id)} />
      <CrudManager title="Help Desk Contacts" items={state.helpdesk} fields={[{ name: 'name', label: 'Name', required: true }, { name: 'service', label: 'Service' }, { name: 'phone', label: 'Phone', required: true }]}
        onAdd={(d) => { add('helpdesk', d); toast('Contact added'); }} onUpdate={(id, d) => { patch('helpdesk', id, d); toast('Contact updated'); }} onDelete={(id) => remove('helpdesk', id)} />
    </div>
  );
}
