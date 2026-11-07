import React from 'react';
import { FilaAcordeon } from './FilaAcordeon';
import { useModoFiltro } from './contexto';

/** Hasta este número de opciones el segmentado sigue siendo una fila con botones también en la hoja móvil. */
const MAX_OPCIONES_SEGMENTADO_EN_HOJA = 3;

/**
 * Selector segmentado plano (pista gris, opción activa en blanco). `opciones`: [{ value, label }]. `onChange(valor)`.
 * `prefijo` (opcional, solo en la barra): nombre del filtro dentro de la pista ("Vendedor:"); en la hoja lo da `etiqueta`.
 * `valorNeutro` (opcional): el valor que equivale a "sin filtro"; si `value` es otro, el segmentado usa el estado "seleccionado".
 * En la hoja móvil es una fila con `etiqueta` (por defecto `ariaLabel`): con 3 opciones o menos, la fila lleva los botones a la
 * derecha (un toque, sin desplegar nada); con más, se despliega como acordeón con la misma lista de opciones que los selects.
 */
export const FiltroSegmentado = ({ opciones = [], value, onChange, ariaLabel, etiqueta, prefijo, valorNeutro, className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const seleccionado = valorNeutro !== undefined && value !== valorNeutro;
  if (enHoja && opciones.length > MAX_OPCIONES_SEGMENTADO_EN_HOJA) {
    const elegida = opciones.find((o) => o.value === value);
    return (
      <FilaAcordeon etiqueta={etiqueta || ariaLabel} textoValor={elegida ? elegida.label : ''} opciones={opciones} value={value} onElegir={onChange} ariaLabel={ariaLabel} seleccionado={seleccionado} className={className} />
    );
  }
  const control = (
    <div role="group" aria-label={ariaLabel} className={`inline-flex items-center gap-0.5 rounded-xl p-0.5 ${seleccionado ? 'bg-filtro-activo' : 'bg-slate-100'} ${enHoja ? 'h-9' : `h-11 md:h-9 ${className}`}`}>
      {prefijo && !enHoja && <span aria-hidden="true" className={`shrink-0 pl-2 pr-1 text-xs font-medium ${seleccionado ? 'text-filtro-texto' : 'text-slate-500'}`}>{prefijo}</span>}
      {opciones.map((o) => {
        const activo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(o.value)}
            className={`h-full cursor-pointer whitespace-nowrap rounded-[10px] px-3 text-xs font-semibold transition-colors ${activo ? `bg-white ${seleccionado ? 'text-filtro-texto' : 'text-slate-900'}` : 'text-slate-500 hover:text-slate-800'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
  if (!enHoja) return control;
  return (
    <div className={`flex min-h-11 items-center justify-between gap-3 px-4 py-1 ${seleccionado ? 'bg-filtro-activo' : ''} ${className}`}>
      <span className={`shrink-0 text-sm font-medium ${seleccionado ? 'text-filtro-texto' : 'text-slate-700'}`}>{etiqueta || ariaLabel}</span>
      {control}
    </div>
  );
};
