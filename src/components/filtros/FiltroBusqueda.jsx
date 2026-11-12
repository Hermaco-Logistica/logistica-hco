import React from 'react';
import { Search } from 'lucide-react';
import { claseCampo, claseFila, claseIcono } from './estilosCampo';
import { useModoFiltro } from './contexto';

/**
 * Campo de búsqueda de una barra de filtros. Recibe `value` y `onChange(texto)`; el estado, la persistencia y el reinicio de la
 * paginación los pone la vista (en su onChange). Sin etiqueta visible: `ariaLabel` da el nombre accesible.
 * Con texto usa el estado "seleccionado" (fondo --color-filtro-activo, texto primary-strong, lupa primary).
 * Dentro de la hoja móvil va sin borde ni fondo propios (el bloque de la hoja es la superficie; con texto la fila se tiñe).
 * `etiqueta` (opcional): en la hoja la fila lleva ese texto visible a la izquierda y el campo a la derecha, como las demás filas.
 */
export const FiltroBusqueda = ({ value, onChange, placeholder = 'Buscar…', ariaLabel, etiqueta, id, className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const seleccionado = Boolean(value);
  if (enHoja && etiqueta) {
    return (
      <label className={`flex min-h-11 min-w-0 cursor-text items-center justify-between gap-3 px-4 text-sm ${claseFila(seleccionado)} ${className}`}>
        <span className={`shrink-0 font-medium ${seleccionado ? 'text-filtro-texto' : 'text-slate-700'}`}>{etiqueta}</span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel || etiqueta}
          className={`min-w-0 flex-1 bg-transparent text-right text-sm font-medium outline-none placeholder:text-slate-400 ${seleccionado ? 'font-semibold text-filtro-texto' : 'text-slate-500'}`}
        />
      </label>
    );
  }
  const caja = enHoja
    ? `flex min-h-11 min-w-0 items-center gap-2 px-4 ${claseFila(seleccionado)} ${seleccionado ? 'text-filtro-texto' : 'text-slate-700'}`
    : `${claseCampo({ seleccionado })} gap-2 px-3 focus-within:bg-surface`;
  return (
    <div className={`${caja} ${className}`}>
      <Search size={enHoja ? 16 : 14} aria-hidden="true" className={`shrink-0 ${claseIcono(seleccionado)}`} />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className={`min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-slate-500 ${seleccionado ? 'text-filtro-texto' : 'text-slate-700'} ${enHoja ? 'text-sm' : 'text-xs'}`}
      />
    </div>
  );
};
