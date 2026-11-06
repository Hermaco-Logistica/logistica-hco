import React from 'react';

/** Conmutador de un filtro (activo / inactivo). `onChange(nuevoValor)`. Sin etiqueta aparte: el texto del botón es el nombre. */
export const FiltroConmutador = ({ activo, onChange, etiqueta, titulo, ariaLabel, className = '' }) => (
  <button
    type="button"
    aria-pressed={activo}
    aria-label={ariaLabel}
    title={titulo}
    onClick={() => onChange(!activo)}
    className={`h-11 cursor-pointer whitespace-nowrap rounded-xl border px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary md:h-9 ${activo ? 'border-slate-900 bg-slate-900 text-white' : 'border-border bg-surface-muted text-slate-700 hover:bg-surface'} ${className}`}
  >
    {etiqueta}
  </button>
);
