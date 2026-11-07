import { createContext, useCallback, useContext, useId, useState, useSyncExternalStore } from 'react';

/** Dónde se pinta un control: 'barra' (en línea, con prefijo interno) o 'hoja' (fila con etiqueta visible dentro de la hoja móvil). */
export const ContextoFiltros = createContext('barra');
export const useModoFiltro = () => useContext(ContextoFiltros);

/** Acordeón de la hoja móvil: solo una fila abierta a la vez. Valor: { abiertoId, abrir(id | null), alturaCuerpoFinal() } (alto que tendrá el cuerpo con la hoja ampliada). */
export const ContextoAcordeon = createContext(null);

/**
 * Estado de una fila desplegable de la hoja: `abierto` es true solo si esta fila es la abierta del acordeón; `abrir(true|false)`
 * la abre (cerrando la que hubiera) o la cierra. Sin proveedor usa estado local (la fila funciona suelta).
 */
export const useFilaAcordeon = () => {
  const ctx = useContext(ContextoAcordeon);
  const id = useId();
  const [local, setLocal] = useState(false);
  const abierto = ctx ? ctx.abiertoId === id : local;
  const abrirCtx = ctx ? ctx.abrir : null;
  const alturaCuerpoFinal = ctx ? ctx.alturaCuerpoFinal : null;
  const abrir = useCallback((valor) => {
    if (abrirCtx) abrirCtx(valor ? id : null);
    else setLocal(Boolean(valor));
  }, [abrirCtx, id]);
  return { id, abierto, abrir, alturaCuerpoFinal };
};

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
