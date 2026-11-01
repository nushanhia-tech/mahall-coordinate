import { Lock } from 'lucide-react';
import { useApp } from './store/AppContext';
import { useRoute, navigate } from './router';
import Navbar, { Logo } from './components/Navbar';
import QuickFind from './components/QuickFind';
import { featureOn } from './utils/features';
import Dashboard from './screens/Dashboard';
import Login from './screens/Login';
import AdminPortal from './admin/AdminPortal';
import { IndividualPortal, KhateebPortal, InstitutionPortal } from './screens/Portals';
import RentalPage from './services/Rental';
import ChittyPage from './services/Chitty';
import AuctionPage from './services/Auction';
import NikkahPage from './modules/Nikkah';
import HomeApplyPage from './modules/HomeApply';
import MediationPage from './modules/Mediation';
import { CoursesPage, OpportunitiesPage } from './modules/Community';

function RequireLogin({ roles, children, note }) {
  const { user } = useApp();
  const here = useRoute();
  if (user && (!roles || roles.includes(user.role))) return children;
  return (
    <div className="max-w-md mx-auto my-20 card text-center p-8 animate-fade-up">
      <div className="mx-auto mb-4 w-14 h-14 rounded-3xl bg-brand-50 text-brand-600 grid place-items-center"><Lock size={24} /></div>
      <h2 className="font-display text-2xl font-semibold text-ink-900">{user ? 'This page is not for your account' : 'Please log in first'}</h2>
      <p className="text-sm text-ink-500 mt-2">{note || (user ? `You are logged in as ${user.role}. Ask your masjid admin if you need access.` : 'This part of the site is for registered members of the Mahall. It only takes a moment.')}</p>
      {!user && <button className="btn-primary mt-4" onClick={() => { sessionStorage.setItem('mahall-after-login', here); navigate('/login'); }}>Go to login</button>}
    </div>
  );
}

// A page whose feature the admin switched off shows a gentle note instead (admins still get in).
function FeatureGate({ k, title, children }) {
  const { state, user } = useApp();
  if (user?.role === 'admin' || featureOn(state.config, k)) return children;
  return (
    <div className="max-w-md mx-auto my-20 card text-center p-8">
      <div className="text-3xl">🌙</div>
      <h2 className="font-display text-2xl font-semibold mt-2">{title} is not available</h2>
      <p className="text-sm text-ink-500 mt-2">The Mahall committee has turned this service off for now.</p>
      <button className="btn-primary mt-5" onClick={() => navigate('/')}>Back to home</button>
    </div>
  );
}

const routes = [
  ['/', () => <Dashboard />],
  ['/login', () => <Login />],
  ['/admin', (sub) => <RequireLogin roles={['admin']}><AdminPortal tab={sub} /></RequireLogin>],
  ['/portal', () => <RequireLogin roles={['individual']}><IndividualPortal /></RequireLogin>],
  ['/khateeb', () => <RequireLogin roles={['khateeb']}><KhateebPortal /></RequireLogin>],
  ['/institution', () => <RequireLogin roles={['institution']}><InstitutionPortal /></RequireLogin>],
  ['/services/rental', () => <RequireLogin roles={['individual']} note="The rental cart is only for registered Mahall families. Please log in with your home (Individual) account."><RentalPage /></RequireLogin>],
  ['/services/chitty', () => <FeatureGate k="chitty" title="Chitty"><ChittyPage /></FeatureGate>],
  ['/services/auction', () => <FeatureGate k="auction" title="The auction"><AuctionPage /></FeatureGate>],
  ['/apply/nikkah', () => <RequireLogin><NikkahPage /></RequireLogin>],
  ['/apply/home', () => <RequireLogin><HomeApplyPage /></RequireLogin>],
  ['/mediation', () => <RequireLogin roles={['individual', 'khateeb', 'institution']}><MediationPage /></RequireLogin>],
  ['/courses', () => <CoursesPage />],
  ['/opportunities', () => <FeatureGate k="opportunitiesPage" title="Opportunities"><OpportunitiesPage /></FeatureGate>],
];

export default function App() {
  const path = useRoute();
  const { state } = useApp();
  const match = routes.find(([p]) => p === path) || routes.find(([p]) => p !== '/' && path.startsWith(p + '/'));
  const sub = match && path.length > match[0].length ? path.slice(match[0].length + 1) : '';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar path={path} />
      <QuickFind />
      <main className="flex-1">{match ? match[1](sub) : (
        <div className="max-w-md mx-auto my-20 card text-center p-8">
          <div className="text-4xl mb-2">🧭</div>
          <h2 className="font-display text-2xl font-semibold">We couldn't find that page</h2>
          <p className="text-sm text-ink-500 mt-2">It may have moved. Let's take you somewhere useful.</p>
          <button className="btn-primary mt-5" onClick={() => navigate('/')}>Back to home</button>
        </div>
      )}</main>
      <footer className="mt-16 bg-brand-900 text-brand-100 print:hidden relative overflow-hidden">
        <div className="absolute inset-0 pattern-stars opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 py-10 grid gap-6 md:grid-cols-3 items-start">
          <div className="flex items-center gap-3">
            <Logo size={44} src={state.masjid.logo} />
            <div>
              <div className="font-display text-lg text-white">{state.masjid.name}</div>
              <div className="text-xs text-brand-200">{state.masjid.address}</div>
            </div>
          </div>
          <p className="text-sm text-brand-100/90 italic font-display md:text-center">“The best of people are those most beneficial to people.”</p>
          <div className="text-xs text-brand-200 md:text-right space-y-1">
            <div>Made with care for our community · {new Date().getFullYear()}</div>
            <a href="/" className="inline-block underline decoration-brand-500 underline-offset-4 hover:text-white">See all masjids</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
