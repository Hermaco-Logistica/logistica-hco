import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModoFiltro, useMovil } from './contexto';

/**
 * Contenedor del calendario emergente de fechas. No contiene lógica de rango: los hijos son el calendario existente (cabecera de mes
 * + cuadrícula de días). La vista conserva su disparador, su estado `abierto` y su `relative` en escritorio.
 *   - dentro de la hoja móvil de BarraFiltros: en línea bajo la fila "Fecha", con altura animada (grid-template-rows 0fr → 1fr);
 *     cerrado queda `inert` y oculto a lectores de pantalla.
 *   - escritorio (≥ md): desplegable absoluto bajo el disparador (`surface-flotante`, `right-0`, `w-72`).
 *   - móvil fuera de BarraFiltros: hoja inferior en un portal a <body> (fuera del contexto de apilamiento de <main>, que dejaba el
 *     calendario detrás del BottomDock), con fondo oscurecido, botón de cerrar y `surface-flotante`, apoyada sobre el dock
 *     (`bottom: var(--bottom-dock-h)`).
 * Cierra con el fondo, el botón o Escape (`onCerrar`). El portal detiene `mousedown` para no activar el "clic fuera" de la vista.
 */
export const FiltroFechasContenedor = ({ abierto, onCerrar, titulo = 'Filtrar por fecha', children }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const movil = useMovil();
  useEffect(() => {
    if (!abierto || enHoja) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, enHoja, onCerrar]);

  if (enHoja) {
    return (
      <div data-fechas-contenedor data-estado={abierto ? 'abierto' : 'cerrado'} inert={!abierto} aria-hidden={!abierto} className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="mx-auto w-full max-w-xs px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    );
  }
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
