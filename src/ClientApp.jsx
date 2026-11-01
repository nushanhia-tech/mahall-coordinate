'use client';
import { usePathname } from 'next/navigation';
import App from './App';
import { AppProvider } from './store/AppContext';
import { MasjidSlugContext, setCurrentSlug, splitPath } from './router';
import Directory from './screens/Directory';
import SuperAdmin from './screens/SuperAdmin';

// "/"            → list of masjids
// "/super"       → site owner: add and manage masjids
// "/<masjid>/…"  → that masjid's website
export default function ClientApp({ initial }) {
  const { first } = splitPath(usePathname());
  if (!first) { setCurrentSlug(''); return <Directory />; }
  if (first === 'super') { setCurrentSlug(''); return <SuperAdmin />; }
  setCurrentSlug(first);
  return (
    <MasjidSlugContext.Provider value={first}>
      <AppProvider key={first} initial={initial?.masjid?.slug === first ? initial : null}>
        <App />
      </AppProvider>
    </MasjidSlugContext.Provider>
  );
}
