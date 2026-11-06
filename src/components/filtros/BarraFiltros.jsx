import React, { useId, useState } from 'react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

/**
 * Tarjeta de filtros: `surface` (sin borde, sombra de reposo) con una fila superior opcional y una fila de filtros.
 * Slots (props con nodos): `encabezado` (título y acciones principales), `busqueda`, `filtros` (selects, segmentados, conmutadores,
 * calendario…), `limpiar` (BotonLimpiar) y `extremo` (contador, exportar). Un solo marcado para móvil y escritorio:
 *   - escritorio: todo en una fila con flex-wrap; `limpiar` + `extremo` son el último bloque (ml-auto), así "Limpiar" queda al final de
 *     la última fila y nunca solo en una fila de abajo;
 *   - móvil: primera fila con la búsqueda, "Filtros (N)" y `limpiar`; los `filtros` se pliegan debajo; `extremo` al final.
 * `filtrosActivos` es el número que se muestra en "Filtros (N)". No guarda estado de filtros: solo si el panel móvil está abierto.
 */
export const BarraFiltros = ({ encabezado, busqueda, filtros, limpiar, extremo, filtrosActivos = 0, className = '' }) => {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  return (
    <section aria-label="Filtros" className={`surface p-3.5 md:p-4 ${className}`}>
      {encabezado && <div className="mb-3 flex flex-wrap items-center justify-between gap-2">{encabezado}</div>}
      <div className="flex flex-wrap items-center gap-2">
        {busqueda && <div className="min-w-0 max-md:order-1 max-md:flex-1 md:w-72 md:max-w-full">{busqueda}</div>}
        {filtros && (
          <>
            <button
              type="button"
              aria-expanded={abierto}
              aria-controls={idPanel}
              onClick={() => setAbierto((v) => !v)}
              className={`inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold md:hidden max-md:order-2 ${filtrosActivos > 0 ? 'border-primary text-primary-strong' : 'border-border text-slate-600'}`}
            >
              <Filter size={14} aria-hidden="true" />
              <span>Filtros{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}</span>
              {abierto ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
            </button>
            <div id={idPanel} className={`${abierto ? 'flex' : 'hidden'} basis-full flex-wrap items-center gap-2 max-md:order-4 md:contents`}>{filtros}</div>
          </>
        )}
        {(limpiar || extremo) && (
          <div className="contents md:ml-auto md:flex md:items-center md:gap-2">
            {limpiar && <div className="max-md:order-3">{limpiar}</div>}
            {extremo && <div className="flex items-center gap-2 max-md:order-5 max-md:ml-auto">{extremo}</div>}
          </div>
        )}
      </div>
    </section>
  );
};
