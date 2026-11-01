'use client';
import { useEffect, useState } from 'react';
import { Moon, MapPin, Home, ShieldCheck } from 'lucide-react';

// The site's home page: every masjid that uses this site.
export default function Directory() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    fetch('/api/masjids', { cache: 'no-store' }).then((r) => r.json())
      .then((d) => (d.masjids ? setList(d.masjids) : setError(d.error || 'Could not load the list')))
      .catch(() => setError('Could not load the list'));
  }, []);
  const shown = (list || []).filter((m) => !q || `${m.name} ${m.address}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-800 text-white">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold"><span className="w-9 h-9 rounded-full bg-gold-400 text-brand-900 grid place-items-center"><Moon size={18} fill="currentColor" /></span>Mahall Coordinating System</div>
          <a href="/super" className="text-xs text-brand-100 hover:text-white flex items-center gap-1"><ShieldCheck size={14} />Site admin</a>
        </div>
      </header>
      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-black">Choose your masjid</h1>
          <p className="text-brand-50 mt-2">Each masjid has its own website for members, donations, services and administration.</p>
          {list && list.length > 4 && <input className="input mt-5 max-w-md text-slate-800" placeholder="Search by name or place…" value={q} onChange={(e) => setQ(e.target.value)} />}
        </div>
      </section>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {error && <div className="card text-red-600">{error}</div>}
        {!list && !error && <div className="text-slate-400">Loading…</div>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((m) => (
            <a key={m.slug} href={`/${m.slug}`} className="card hover:shadow-md hover:border-brand-400 transition block">
              <div className="font-bold text-lg text-brand-800">{m.name}</div>
              {m.address && <div className="text-xs text-slate-500 flex items-start gap-1 mt-1"><MapPin size={12} className="mt-0.5 shrink-0" />{m.address}</div>}
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-2"><Home size={12} />{m.homes} registered homes</div>
              <div className="text-xs text-brand-700 mt-3 font-medium">Open →</div>
            </a>
          ))}
        </div>
        {list && !shown.length && <div className="text-slate-400 text-sm">No masjids found.</div>}
      </main>
    </div>
  );
}
