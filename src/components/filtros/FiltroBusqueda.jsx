import React from 'react';
import { Search } from 'lucide-react';
import { useModoFiltro } from './contexto';

/**
 * Campo de búsqueda de una barra de filtros. Recibe `value` y `onChange(texto)`; el estado, la persistencia y el reinicio de la
 * paginación los pone la vista (en su onChange). Sin etiqueta visible: `ariaLabel` da el nombre accesible.
 * Dentro de la hoja móvil va sin borde ni fondo propios (el bloque de la hoja es la superficie).
 */
export const FiltroBusqueda = ({ value, onChange, placeholder = 'Buscar…', ariaLabel, id, className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const caja = enHoja
    ? 'flex min-h-11 min-w-0 items-center gap-2 px-4 text-slate-700'
    : 'flex h-11 min-w-0 items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 text-slate-700 transition-colors focus-within:border-slate-400 focus-within:bg-surface md:h-9';
  return (
    <div className={`${caja} ${className}`}>
      <Search size={enHoja ? 16 : 14} aria-hidden="true" className="shrink-0 text-slate-400" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className={`min-w-0 flex-1 bg-transparent font-medium text-slate-700 outline-none placeholder:text-slate-500 ${enHoja ? 'text-sm' : 'text-xs'}`}
      />
    </div>
  );
};
