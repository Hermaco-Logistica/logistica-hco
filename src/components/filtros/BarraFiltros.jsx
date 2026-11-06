import React, { useId, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Modal } from '../Modal';
import { useCerrarModal } from '../modalCierre';
import { Button } from '../ui/Button';
import { ContextoFiltros, useMovil } from './contexto';

/** Contenido de la hoja móvil: cabecera (tirador, X, título, Limpiar), cuerpo con scroll en bloques planos y pie "Ver N resultados". */
const ContenidoHoja = ({ idTitulo, titulo, busqueda, filtros, limpiar, textoVer }) => {
  const cerrar = useCerrarModal();
  return (
    <ContextoFiltros.Provider value="hoja">
      <div className="shrink-0 px-2 pt-2">
        <div aria-hidden="true" className="mx-auto mb-1 h-1 w-9 rounded-full bg-border" />
        <div className="grid grid-cols-[3rem_1fr_auto] items-center">
          <button type="button" onClick={cerrar} aria-label="Cerrar filtros" className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <X size={18} aria-hidden="true" />
          </button>
          <h2 id={idTitulo} className="text-center text-sm font-bold text-slate-800">{titulo}</h2>
          <div className="min-w-12 text-right">{limpiar}</div>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-background px-4 py-3">
        {busqueda && <div className="surface-plana overflow-hidden">{busqueda}</div>}
        {filtros && <div className="surface-plana divide-y divide-border overflow-hidden">{filtros}</div>}
      </div>
      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Button variant="primary" size="block" onClick={cerrar} className="h-11">{textoVer}</Button>
      </div>
    </ContextoFiltros.Provider>
  );
};

/**
 * Tarjeta de filtros: `surface` (sin borde, sombra de reposo) con una fila superior opcional y una fila de filtros.
 * Slots (props con nodos): `encabezado` (título y acciones principales), `busqueda`, `filtros` (selects, segmentados, conmutadores,
 * fecha…), `limpiar` (BotonLimpiar) y `extremo` (contador, exportar). Cada control se pinta una sola vez:
 *   - escritorio: todo en una fila con flex-wrap; `limpiar` + `extremo` son el último bloque (ml-auto), así "Limpiar" queda al final
 *     de la última fila y nunca solo en una fila de abajo;
 *   - móvil (< md): la barra muestra "Filtros (N)" (y `extremo`); al tocarlo sube una hoja inferior (Modal, variante `hojaInferior`)
 *     con la búsqueda, los `filtros` como filas con etiqueta visible, "Limpiar (N)" en la cabecera y "Ver N resultados" en el pie.
 *     Los filtros se aplican al instante: el pie solo cierra la hoja. La barra no guarda estado de filtros, solo si la hoja está abierta.
 * `filtrosActivos` es el número de "Filtros (N)"; `resultados` el de "Ver N resultados" (opcional).
 * `busquedaEnBarraMovil` deja la búsqueda en la barra móvil en vez de dentro de la hoja.
 */
export const BarraFiltros = ({ encabezado, busqueda, filtros, limpiar, extremo, filtrosActivos = 0, resultados, busquedaEnBarraMovil = false, tituloHoja = 'Filtros', className = '' }) => {
  const movil = useMovil();
  const [abierta, setAbierta] = useState(false);
  const idHoja = useId();
  const idTitulo = useId();
  const hojaAbierta = movil && abierta;
  const textoVer = resultados === undefined || resultados === null ? 'Ver resultados' : `Ver ${resultados} ${resultados === 1 ? 'resultado' : 'resultados'}`;
  const busquedaEnHoja = busqueda && !busquedaEnBarraMovil;

  return (
    <section aria-label="Filtros" className={`surface p-3.5 md:p-4 ${className}`}>
      {encabezado && <div className="mb-3 flex flex-wrap items-center justify-between gap-2">{encabezado}</div>}
      {movil ? (
        <div className="flex flex-wrap items-center gap-2">
          {busqueda && busquedaEnBarraMovil && <div className="min-w-0 flex-1">{busqueda}</div>}
          {(filtros || busquedaEnHoja) && (
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={hojaAbierta}
              aria-controls={idHoja}
              onClick={() => setAbierta(true)}
              className={`inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold ${filtrosActivos > 0 ? 'border-primary text-primary-strong' : 'border-border text-slate-600'}`}
            >
              <Filter size={14} aria-hidden="true" />
              <span>Filtros{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}</span>
            </button>
          )}
          {extremo && <div className="ml-auto flex items-center gap-2">{extremo}</div>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {busqueda && <div className="min-w-0 md:w-72 md:max-w-full">{busqueda}</div>}
          {filtros}
          {(limpiar || extremo) && <div className="ml-auto flex items-center gap-2">{limpiar}{extremo}</div>}
        </div>
      )}
      {hojaAbierta && (
        <Modal
          variante="hojaInferior"
          ancho="completo"
          soloMovil
          atraparFoco
          etiqueta={tituloHoja}
          aria-labelledby={idTitulo}
          id={idHoja}
          onCerrar={() => setAbierta(false)}
        >
          <ContenidoHoja idTitulo={idTitulo} titulo={tituloHoja} busqueda={busquedaEnHoja ? busqueda : null} filtros={filtros} limpiar={limpiar} textoVer={textoVer} />
        </Modal>
      )}
    </section>
  );
};
