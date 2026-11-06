import React from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { claseCampo, claseFila, claseIcono } from './estilosCampo';
import { useModoFiltro } from './contexto';

/**
 * Disparador del calendario (el estado del rango y del desplegable los lleva la vista). Va junto a FiltroFechasContenedor.
 * `texto` es el rango ya formateado; `activo` indica que hay fechas elegidas (estado "seleccionado" y "×" que llama a `onLimpiar`).
 * En barra es un campo compacto con icono; en la hoja móvil es una fila "Fecha | rango ⌄" que despliega el calendario en línea.
 */
export const FiltroFechaCampo = ({ texto, activo = false, expandido = false, onClick, onLimpiar, etiqueta = 'Fecha', ariaLabel, className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const limpiar = activo && onLimpiar && (
    <button
      type="button"
      aria-label="Quitar fechas"
      onClick={(e) => { e.stopPropagation(); onLimpiar(); }}
      className={`flex shrink-0 cursor-pointer items-center justify-center text-primary hover:text-danger ${enHoja ? 'size-11' : 'size-8'}`}
    >
      <X size={14} aria-hidden="true" />
    </button>
  );
  if (enHoja) {
    return (
      <div className={`flex min-h-11 items-center pr-1 ${claseFila(activo)} ${className}`}>
        <button type="button" aria-expanded={expandido} aria-label={ariaLabel} onClick={onClick} className="flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-3 pl-4 pr-1 text-left text-sm outline-none focus-visible:bg-surface-muted">
          <span className={`shrink-0 font-medium ${activo ? 'text-filtro-texto' : 'text-slate-700'}`}>{etiqueta}</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={`truncate ${activo ? 'font-semibold text-filtro-texto' : 'text-slate-500'}`}>{texto}</span>
            <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform ${expandido ? 'rotate-180' : ''} ${claseIcono(activo)}`} />
          </span>
        </button>
        {limpiar}
      </div>
    );
  }
  return (
    <div className={`${claseCampo({ seleccionado: activo })} w-full ${className}`}>
      <button type="button" aria-expanded={expandido} aria-label={ariaLabel || etiqueta} onClick={onClick} className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-[inherit] pl-3 pr-2 text-left outline-none">
        <Calendar size={14} aria-hidden="true" className={`shrink-0 ${claseIcono(activo)}`} />
        <span className={`truncate ${activo ? 'font-semibold text-filtro-texto' : ''}`}>{texto}</span>
      </button>
      {limpiar}
    </div>
  );
};
