import React from 'react';
import { useModoFiltro } from './contexto';

/**
 * Conmutador de un filtro (activo / inactivo). `onChange(nuevoValor)`. El texto del botón es el nombre.
 * Activo usa el color del rol. En la hoja móvil es una fila con interruptor a la derecha.
 */
export const FiltroConmutador = ({ activo, onChange, etiqueta, titulo, ariaLabel, className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  if (enHoja) {
    return (
      <button
        type="button"
        aria-pressed={activo}
        aria-label={ariaLabel}
        title={titulo}
        onClick={() => onChange(!activo)}
        className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 text-left text-sm font-medium text-slate-700 outline-none focus-visible:bg-surface-muted ${className}`}
      >
        <span>{etiqueta}</span>
        <span aria-hidden="true" className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${activo ? 'bg-primary-strong' : 'bg-slate-300'}`}>
          <span className={`size-5 rounded-full bg-white transition-transform ${activo ? 'translate-x-4' : 'translate-x-0'}`} />
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={activo}
      aria-label={ariaLabel}
      title={titulo}
      onClick={() => onChange(!activo)}
      className={`h-11 cursor-pointer whitespace-nowrap rounded-xl border px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary md:h-9 ${activo ? 'border-primary-strong bg-primary-strong text-primary-soft' : 'border-border bg-surface-muted text-slate-700 hover:bg-surface'} ${className}`}
    >
      {etiqueta}
    </button>
  );
};
