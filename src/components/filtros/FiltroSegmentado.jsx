import React from 'react';
import { useModoFiltro } from './contexto';

/**
 * Selector segmentado plano (pista gris, opción activa en blanco, sin sombra). `opciones`: [{ value, label }]. `onChange(valor)`.
 * En la hoja móvil es una fila con `etiqueta` (por defecto `ariaLabel`) a la izquierda y el segmentado a la derecha.
 */
export const FiltroSegmentado = ({ opciones = [], value, onChange, ariaLabel, etiqueta, className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const control = (
    <div role="group" aria-label={ariaLabel} className={`inline-flex items-center gap-0.5 rounded-xl bg-slate-100 p-0.5 ${enHoja ? 'h-9' : `h-11 md:h-9 ${className}`}`}>
      {opciones.map((o) => {
        const activo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(o.value)}
            className={`h-full cursor-pointer whitespace-nowrap rounded-[10px] px-3 text-xs font-semibold transition-colors ${activo ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
  if (!enHoja) return control;
  return (
    <div className={`flex min-h-11 items-center justify-between gap-3 px-4 py-1 ${className}`}>
      <span className="shrink-0 text-sm font-medium text-slate-700">{etiqueta || ariaLabel}</span>
      {control}
    </div>
  );
};
