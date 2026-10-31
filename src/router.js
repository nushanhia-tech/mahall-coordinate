import { useEffect, useState } from 'react';

export const navigate = (path) => { window.location.hash = path; window.scrollTo(0, 0); };

export const useRoute = () => {
  const get = () => (window.location.hash.replace(/^#/, '') || '/');
  const [path, setPath] = useState(get);
  useEffect(() => {
    const on = () => setPath(get());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
};
