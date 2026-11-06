import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const MQ_MOVIL = '(max-width: 767px)';
const suscribir = (cb) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const m = window.matchMedia(MQ_MOVIL);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const esMovil = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(MQ_MOVIL).matches;

/**
 * Contenedor del calendario emergente de fechas. No contiene lógica de rango: los hijos son el calendario existente (cabecera de mes
 * + cuadrícula de días). La vista conserva su disparador, su estado `abierto` y su `relative` en escritorio.
 *   - escritorio (≥ md): desplegable absoluto bajo el disparador (`surface-flotante`, `right-0`, `w-72`), igual que hoy.
 *   - móvil (< md): hoja inferior en un portal a <body> (fuera del contexto de apilamiento de <main>, que dejaba el calendario
 *     detrás del BottomDock), con fondo oscurecido, botón de cerrar y `surface-flotante`. Se apoya sobre el dock
 *     (`bottom: var(--bottom-dock-h)`) y su alto máximo respeta esa altura.
 * Cierra con el fondo, el botón o Escape (`onCerrar`). El portal detiene `mousedown` para no activar el "clic fuera" de la vista.
 */
export const FiltroFechasContenedor = ({ abierto, onCerrar, titulo = 'Filtrar por fecha', children }) => {
  const movil = useSyncExternalStore(suscribir, esMovil, () => false);
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  if (!movil) {
    return (
      <div data-fechas-contenedor className="surface-flotante absolute right-0 z-30 mt-2 w-72 rounded-3xl p-5 animate-in fade-in slide-in-from-top-3 duration-200">
        {children}
      </div>
    );
  }
  return createPortal(
    // eslint-disable-next-line no-restricted-syntax -- hoja inferior anclada al dock, no un modal centrado: <Modal /> no la cubre
    <div data-fechas-contenedor className="fixed inset-0 z-[80]" onMouseDown={(e) => e.stopPropagation()}>
      <button type="button" aria-label="Cerrar calendario" onClick={onCerrar} className="absolute inset-0 cursor-default bg-secondary/55" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="surface-flotante absolute inset-x-0 bottom-[var(--bottom-dock-h,0px)] flex max-h-[calc(100dvh-var(--bottom-dock-h,0px)-1rem)] flex-col rounded-t-3xl p-5 animate-in fade-in slide-in-from-bottom-6 duration-200"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">{titulo}</span>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="mx-auto w-full max-w-sm overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
};
