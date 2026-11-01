import ClientApp from '@/ClientApp';
import { contextForSlug, clientStateFor } from '@/lib/state';
import { slugOk } from '@/lib/masjids';

export const dynamic = 'force-dynamic';

// The page arrives with the masjid's data already inside it, so there is no loading screen.
// If the database is slow, give up after 4 seconds and let the browser fetch the data itself.
async function initialData(slug) {
  if (!slugOk(slug)) return null;
  try {
    return await Promise.race([
      contextForSlug(slug).then(clientStateFor),
      new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
  } catch {
    return null;
  }
}

export default async function Page({ params }) {
  const { slug = [] } = await params;
  const initial = slug.length ? await initialData(slug[0]) : null;
  return <ClientApp initial={initial} />;
}
