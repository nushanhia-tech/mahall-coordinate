'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

let router = null;

export const navigate = (path) => {
  if (router) router.push(path);
  else window.location.href = path;
  window.scrollTo(0, 0);
};

// Current path, e.g. "/admin/accounts". Also registers the Next router for navigate().
export const useRoute = () => {
  const r = useRouter();
  useEffect(() => { router = r; }, [r]);
  return usePathname() || '/';
};
