'use client';
import App from './App';
import { AppProvider } from './store/AppContext';

export default function ClientApp() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
