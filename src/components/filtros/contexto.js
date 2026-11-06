import { createContext, useContext, useSyncExternalStore } from 'react';

/** Dónde se pinta un control: 'barra' (en línea, con prefijo interno) o 'hoja' (fila con etiqueta visible dentro de la hoja móvil). */
export const ContextoFiltros = createContext('barra');
export const useModoFiltro = () => useContext(ContextoFiltros);

const MQ_MOVIL = '(max-width: 767px)';
const suscribir = (cb) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const m = window.matchMedia(MQ_MOVIL);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const esMovil = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(MQ_MOVIL).matches;
/** true bajo `md` (767 px). Sin matchMedia (SSR, pruebas) devuelve false. */
export const useMovil = () => useSyncExternalStore(suscribir, esMovil, () => false);
