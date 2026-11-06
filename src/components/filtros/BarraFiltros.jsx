import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Modal } from '../Modal';
import { useCerrarModal } from '../modalCierre';
import { Button } from '../ui/Button';
import { ContextoAcordeon, ContextoFiltros, useMovil } from './contexto';

/** Contenido de la hoja móvil: cabecera (tirador, X, título, Limpiar), cuerpo con scroll en bloques planos y pie "Ver N resultados". */
const ContenidoHoja = ({ idTitulo, titulo, busqueda, filtros, limpiar, textoVer }) => {
  const cerrar = useCerrarModal();
  const [abiertoId, setAbiertoId] = useState(null);
  const acordeon = useMemo(() => ({ abiertoId, abrir: setAbiertoId }), [abiertoId]);
  return (
    <ContextoFiltros.Provider value="hoja">
      <ContextoAcordeon.Provider value={acordeon}>
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
      <div data-hoja-cuerpo className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-background px-4 py-3">
        {busqueda && <div className="surface-plana overflow-hidden">{busqueda}</div>}
        {filtros && <div className="surface-plana divide-y divide-border overflow-hidden">{filtros}</div>}
      </div>
      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Button variant="primary" size="block" onClick={cerrar} className="h-11">{textoVer}</Button>
      </div>
      </ContextoAcordeon.Provider>
    </ContextoFiltros.Provider>
  );
};

const HUECO = 8;
/** Ancho mínimo de una columna: un select con prefijo ("Estado: Cotizado") y un campo de fecha caben cómodos; los valores largos se apilan y recortan. */
const ANCHO_MINIMO_COLUMNA = 160;

/**
 * Reparte los hijos de la rejilla en `columnas` columnas: devuelve el span final de cada hijo y el número de filas. Los controles
 * se colocan en orden; el bloque final (limpiar + extremo, span 2) comparte fila con el último control si cabe y, si no, el último
 * control de la fila anterior baja con él (el bloque nunca queda solo). El hueco de cada fila lo absorbe su último control, así todas
 * las filas ocupan el ancho completo y quedan equilibradas.
 */
const distribuir = (info, columnas) => {
  const bloque = info.find((it) => it.bloque);
  const controles = info.filter((it) => !it.bloque);
  const spanBloque = bloque ? Math.min(bloque.base, columnas) : 0;
  const filas = [[]];
  let usado = 0;
  controles.forEach((it) => {
    const s = Math.min(it.base, columnas);
    if (usado + s > columnas) { filas.push([]); usado = 0; }
    filas[filas.length - 1].push({ it, s });
    usado += s;
  });
  let bloqueFila = filas.length - 1;
  if (bloque) {
    if (usado + spanBloque > columnas) {
      const previa = filas[filas.length - 1];
      if (previa.length > 1) { filas.push([previa.pop()]); bloqueFila = filas.length - 1; }
      else { filas.push([]); bloqueFila = filas.length - 1; }
    }
  }
  let huecos = 0;
  filas.forEach((fila, i) => {
    const ocupado = fila.reduce((t, x) => t + x.s, 0) + (bloque && i === bloqueFila ? spanBloque : 0);
    const hueco = columnas - ocupado;
    if (hueco > 0 && fila.length) { fila[fila.length - 1].s += hueco; huecos += hueco; }
  });
  const soloBloque = Boolean(bloque) && filas[bloqueFila].length === 0 && filas.length > 1;
  const spans = new Map();
  filas.forEach((fila) => fila.forEach((x) => spans.set(x.it, x.s)));
  return { spans, spanBloque, total: filas.length, huecos, soloBloque };
};

/**
 * Escritorio: rejilla de columnas iguales que ocupa todo el ancho de la barra. Cada hijo declara su peso con data-span (la búsqueda 2,
 * el bloque final limpiar + extremo 2, el resto 1); el bloque se reserva siempre (no se mueve nada al aparecer "Limpiar"). Se elige
 * el número de columnas con menos filas, sin "Limpiar" solo y con el mínimo de huecos repartidos (ver `distribuir`).
 * Se escribe directamente en el DOM (sin estado) en cada render y al cambiar el ancho (sidebar abierto o plegado).
 */
const repartir = (rejilla) => {
  const ancho = rejilla.clientWidth;
  if (!ancho) return;
  const info = [...rejilla.children].map((el) => ({ el, base: Number(el.getAttribute('data-span')) || 1, bloque: el.hasAttribute('data-bloque') }));
  const maximo = Math.max(1, Math.min(12, Math.floor((ancho + HUECO) / (ANCHO_MINIMO_COLUMNA + HUECO))));
  let mejor = null;
  for (let c = maximo; c >= 1; c -= 1) {
    const d = distribuir(info, c);
    const puntos = d.total * 1000 + (d.soloBloque ? 100000 : 0) + d.huecos * 10;
    if (!mejor || puntos < mejor.puntos) mejor = { c, puntos, d };
  }
  const { c, d } = mejor;
  rejilla.style.gridTemplateColumns = `repeat(${c}, minmax(0, 1fr))`;
  info.forEach((it) => {
    it.el.style.gridColumn = it.bloque ? `span ${d.spanBloque} / -1` : `span ${d.spans.get(it) || 1}`;
  });
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
  const rejilla = useRef(null);
  useLayoutEffect(() => {
    const el = rejilla.current;
    if (!el) return undefined;
    repartir(el);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(() => repartir(el));
    observador.observe(el);
    return () => observador.disconnect();
  });
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
        <div ref={rejilla} className="grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] items-center gap-2">
          {busqueda && <div data-span="2" className="min-w-0">{busqueda}</div>}
          {filtros}
          {(limpiar || extremo) && <div data-bloque data-span="2" className="flex min-w-0 items-center justify-end gap-2">{limpiar}{extremo}</div>}
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
