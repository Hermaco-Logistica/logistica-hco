import React from 'react';

/**
 * Selector segmentado plano (pista gris, opción activa en blanco, sin sombra). `opciones`: [{ value, label }]. `onChange(valor)`.
 */
export const FiltroSegmentado = ({ opciones = [], value, onChange, ariaLabel, className = '' }) => (
  <div role="group" aria-label={ariaLabel} className={`inline-flex h-11 items-center gap-0.5 rounded-xl bg-slate-100 p-0.5 max-md:col-span-2 max-md:w-full md:h-9 ${className}`}>
    {opciones.map((o) => {
      const activo = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          aria-pressed={activo}
          onClick={() => onChange(o.value)}
          className={`h-full cursor-pointer whitespace-nowrap rounded-[10px] px-3 max-md:flex-1 text-xs font-semibold transition-colors ${activo ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);
