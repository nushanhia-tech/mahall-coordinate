import { Lock } from 'lucide-react';
import { useApp } from './store/AppContext';
import { useRoute, navigate } from './router';
import Navbar from './components/Navbar';
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

function RequireLogin({ roles, children }) {
  const { user } = useApp();
  if (user && (!roles || roles.includes(user.role))) return children;
  return (
    <div className="max-w-md mx-auto my-16 card text-center">
      <Lock className="mx-auto text-brand-600 mb-3" size={32} />
      <h2 className="font-bold text-lg">{user ? 'You do not have access to this page' : 'Please log in to continue'}</h2>
      <p className="text-sm text-slate-500 mt-1">{user ? `Your account role is "${user.role}".` : 'This page is available to registered Mahall members.'}</p>
      {!user && <button className="btn-primary mt-4" onClick={() => { sessionStorage.setItem('mahall-after-login', window.location.pathname); navigate('/login'); }}>Go to login</button>}
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
  ['/services/rental', () => <RentalPage />],
  ['/services/chitty', () => <ChittyPage />],
  ['/services/auction', () => <AuctionPage />],
  ['/apply/nikkah', () => <RequireLogin><NikkahPage /></RequireLogin>],
  ['/apply/home', () => <RequireLogin><HomeApplyPage /></RequireLogin>],
  ['/mediation', () => <RequireLogin roles={['individual', 'khateeb', 'institution']}><MediationPage /></RequireLogin>],
  ['/courses', () => <CoursesPage />],
  ['/opportunities', () => <OpportunitiesPage />],
];

export default function App() {
  const path = useRoute();
  const { state } = useApp();
  const match = routes.find(([p]) => p === path) || routes.find(([p]) => p !== '/' && path.startsWith(p + '/'));
  const sub = match && path.length > match[0].length ? path.slice(match[0].length + 1) : '';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar path={path} />
      <main className="flex-1">{match ? match[1](sub) : <div className="p-16 text-center text-slate-500">Page not found. <button className="text-brand-700 underline" onClick={() => navigate('/')}>Go home</button></div>}</main>
      <footer className="bg-brand-900 text-brand-100 text-xs py-6 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between gap-2">
          <span>© {new Date().getFullYear()} {state.masjid.name} · Mahall Coordinating System</span>
          <span>{state.masjid.address}</span>
        </div>
      </footer>
    </div>
  );
}
