import React from 'react';
import { ChevronDown } from 'lucide-react';

const normalizar = (o) => (typeof o === 'string' ? { value: o, label: o } : o);

/**
 * Select compacto con chevron. Conserva el <select> nativo. `prefijo` es el nombre del filtro dentro del campo ("Estado:"), porque
 * no hay etiqueta encima. `etiquetaTodos` es el texto de la opción vacía. `onChange(valor)` recibe el valor, no el evento.
 */
export const FiltroSelect = ({ value, onChange, opciones = [], prefijo, etiquetaTodos = 'Todos', ariaLabel, id, className = '' }) => (
  <div className={`relative flex h-11 min-w-0 items-center rounded-xl border border-border bg-surface-muted text-xs font-medium text-slate-700 transition-colors focus-within:border-slate-400 focus-within:bg-surface md:h-9 ${className}`}>
    {prefijo && <span aria-hidden="true" className="shrink-0 pl-3 pr-1 text-slate-500">{prefijo}</span>}
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel || prefijo || etiquetaTodos}
      className={`h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-8 text-xs font-medium text-slate-700 outline-none ${prefijo ? 'pl-0' : 'pl-3'}`}
    >
      <option value="">{etiquetaTodos}</option>
      {opciones.map(normalizar).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 text-slate-400" />
  </div>
);
