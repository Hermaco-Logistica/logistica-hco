import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useModoFiltro } from './contexto';

const normalizar = (o) => (typeof o === 'string' ? { value: o, label: o } : o);

/**
 * Select compacto con chevron. Conserva el <select> nativo. `prefijo` es el nombre del filtro ("Estado:"), porque no hay etiqueta
 * encima. Con "Todos" va en línea ("Estado: Todos"); con un valor elegido pasa a una línea pequeña encima del valor, para que un
 * valor largo ("Carlos Rivera Hernández") use todo el ancho y se recorte con puntos suspensivos sin tapar el nombre del filtro.
 * `etiquetaTodos` es el texto de la opción vacía. `onChange(valor)` recibe el valor, no el evento.
 * En la hoja móvil es una fila: `etiqueta` (por defecto el prefijo sin ":") a la izquierda y el valor a la derecha con chevron;
 * el <select> nativo cubre toda la fila (transparente) y sigue siendo lo que se toca.
 */
export const FiltroSelect = ({ value, onChange, opciones = [], prefijo, etiqueta, etiquetaTodos = 'Todos', ariaLabel, id, className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const lista = opciones.map(normalizar);
  const nativo = (clases) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel || prefijo || etiqueta || etiquetaTodos}
      className={clases}
    >
      <option value="">{etiquetaTodos}</option>
      {lista.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
  if (enHoja) {
    const titulo = etiqueta || (prefijo ? prefijo.replace(/:$/, '') : ariaLabel);
    const elegido = lista.find((o) => o.value === value);
    return (
      <div className={`relative flex min-h-11 items-center justify-between gap-3 px-4 text-sm focus-within:bg-surface-muted ${className}`}>
        <span aria-hidden="true" className="shrink-0 font-medium text-slate-700">{titulo}</span>
        <span aria-hidden="true" className="flex min-w-0 items-center gap-1.5 text-slate-500">
          <span className="truncate">{elegido ? elegido.label : etiquetaTodos}</span>
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        </span>
        {nativo('absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0')}
      </div>
    );
  }
  const apilado = Boolean(prefijo) && value !== '' && value !== undefined && value !== null;
  return (
    <div className={`relative flex h-11 min-w-0 items-center rounded-xl border border-border bg-surface-muted text-xs font-medium text-slate-700 transition-colors focus-within:border-slate-400 focus-within:bg-surface md:h-9 md:w-40 ${className}`}>
      {prefijo && !apilado && <span aria-hidden="true" className="shrink-0 pl-3 pr-1 text-slate-500">{prefijo}</span>}
      {apilado && <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1 text-[9px] font-semibold leading-none text-slate-500">{prefijo.replace(/:$/, '')}</span>}
      {nativo(`h-full min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent pr-8 text-xs font-medium text-slate-700 outline-none ${apilado ? 'pl-3 pt-3' : prefijo ? 'pl-0' : 'pl-3'}`)}
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 text-slate-400" />
    </div>
  );
};
