import React from 'react';
import { claseCampo, claseFila } from './estilosCampo';
import { useModoFiltro } from './contexto';

/**
 * Conmutador de un filtro (activo / inactivo). `onChange(nuevoValor)`. El texto del botón es el nombre.
 * Activo usa el estado "seleccionado" (fondo --color-filtro-activo, texto primary-strong). En la hoja móvil es una fila con
 * interruptor a la derecha (la pista activa va en primary-strong).
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
        className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 text-left text-sm font-medium outline-none focus-visible:bg-surface-muted ${claseFila(activo)} ${activo ? 'text-filtro-texto' : 'text-slate-700'} ${className}`}
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
      className={`${claseCampo({ seleccionado: activo })} w-full cursor-pointer justify-center whitespace-nowrap px-3 outline-none ${className}`}
    >
      {etiqueta}
    </button>
  );
};
