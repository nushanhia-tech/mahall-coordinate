'use client';
import { useEffect, useState } from 'react';
import { MapPin, Home, ShieldCheck, ArrowRight, Search } from 'lucide-react';
import { Logo } from '../components/Navbar';

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
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div className="absolute inset-0 pattern-stars" />
        <div className="absolute -top-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-brand-500/40 blur-3xl animate-float" />
        <div className="absolute -bottom-32 right-0 w-[28rem] h-[28rem] rounded-full bg-gold-400/25 blur-3xl animate-float" style={{ animationDelay: '-7s' }} />
        <div className="relative max-w-5xl mx-auto px-4">
          <header className="h-20 flex items-center justify-between">
            <div className="flex items-center gap-3"><Logo /><span className="font-display text-lg">Mahall Community</span></div>
            <a href="/super" className="text-xs text-brand-200 hover:text-white flex items-center gap-1.5"><ShieldCheck size={14} />Site admin</a>
          </header>
          <div className="pt-10 pb-24 max-w-2xl animate-fade-up">
            <div className="eyebrow !text-gold-300">Assalamu alaikum</div>
            <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] mt-3">Find your masjid.</h1>
            <p className="text-brand-100 mt-4 text-lg leading-relaxed">Every masjid here has its own home online – for families, donations, services and the committee.</p>
            {list && list.length > 3 && (
              <div className="relative mt-8 max-w-md">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                <input className="input !pl-11 !py-3.5 !rounded-full text-ink-800" placeholder="Search by name or place…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </section>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 -mt-12 relative pb-16">
        {error && <div className="card text-clay-600">{error}</div>}
        {!list && !error && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="card h-40 animate-pulse" />)}</div>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((m, idx) => (
            <a key={m.slug} href={`/${m.slug}`} className="card card-hover block group animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
              {m.logo ? <img src={m.logo} alt="" className="w-12 h-12 rounded-2xl object-cover ring-1 ring-sand-200 mb-4" /> : <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-gold-100 grid place-items-center text-2xl mb-4">🕌</div>}
              <div className="font-display text-xl font-semibold text-ink-900">{m.name}</div>
              {m.address && <div className="text-xs text-ink-500 flex items-start gap-1.5 mt-2"><MapPin size={12} className="mt-0.5 shrink-0" />{m.address}</div>}
              <div className="text-xs text-ink-500 flex items-center gap-1.5 mt-1.5"><Home size={12} />{m.homes} families</div>
              <div className="mt-5 text-sm font-semibold text-brand-600 flex items-center gap-1 group-hover:gap-2 transition-all">Visit <ArrowRight size={14} /></div>
            </a>
          ))}
        </div>
        {list && !shown.length && <div className="card text-center text-ink-400">No masjid matches “{q}”.</div>}
      </main>
    </div>
  );
}
