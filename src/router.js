'use client';
import { createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

// Every masjid lives under its own address: /<masjid-slug>/...
// Inside a masjid, screens use paths like "/admin/accounts"; the slug is added and removed here.
export const MasjidSlugContext = createContext('');
let currentSlug = '';
export const setCurrentSlug = (s) => { currentSlug = s; };

export const splitPath = (pathname) => {
  const parts = (pathname || '/').split('/').filter(Boolean);
  return { first: parts[0] || '', rest: '/' + parts.slice(1).join('/') };
};

// Go to another screen. Uses the browser history directly, so no server round trip is needed.
export const navigate = (path, { replace = false } = {}) => {
  const full = currentSlug ? `/${currentSlug}${path === '/' ? '' : path}` || '/' : path;
  if (replace) window.history.replaceState(null, '', full);
  else window.history.pushState(null, '', full);
  window.scrollTo(0, 0);
};

// Go to a page outside the current masjid (directory, super admin, another masjid).
export const navigateGlobal = (path) => { window.history.pushState(null, '', path); window.scrollTo(0, 0); };

// Current screen path inside the masjid, e.g. "/admin/accounts".
export const useRoute = () => {
  const slug = useContext(MasjidSlugContext);
  const pathname = usePathname() || '/';
  if (!slug) return pathname;
  return splitPath(pathname).rest;
};

export const useMasjidSlug = () => useContext(MasjidSlugContext);
export const getCurrentSlug = () => currentSlug;
