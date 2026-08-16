import { useEffect, useState } from 'react';

/**
 * Acompanha uma media query via `matchMedia`.
 *
 * Substitui os listeners de `resize` que Sidebar e Header mantinham cada um por
 * conta própria: `matchMedia` só dispara quando o limite é cruzado, em vez de a
 * cada pixel redimensionado, e o valor inicial já sai correto no primeiro render
 * (evitando o "salto" de layout).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

/** Abaixo de 768px: navegação em gaveta em vez de barra lateral fixa. */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
