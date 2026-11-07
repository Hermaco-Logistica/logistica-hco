import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Modal } from '../Modal';
import { useCerrarModal } from '../modalCierre';
import { Button } from '../ui/Button';
import { ContextoAcordeon, ContextoFiltros, useMovil } from './contexto';
import { alturaAmpliadaPx, animarAlturaHoja, OBJETIVO_CSS } from './alturaHoja';
import { limpiarEntradaColgada, useCapaAtras } from './capasAtras';

/**
 * Contenido de la hoja móvil: cabecera fija (tirador, X, título, Limpiar), cuerpo con scroll propio en bloques planos y pie fijo
 * "Ver N resultados". El cuerpo se desplaza con el dedo (overflow-y auto, overscroll-behavior contain y touch-action pan-y: no arrastra
 * la página de detrás). Al desplegar una fila la hoja crece a la altura completa (alturaHoja.js) y vuelve al cerrarla. El botón
 * atrás cierra primero la fila y después la hoja (capasAtras.js).
 */
const ContenidoHoja = ({ idTitulo, titulo, busqueda, filtros, limpiar, textoVer }) => {
  const cerrar = useCerrarModal();
  const [abiertoId, setAbiertoId] = useState(null);
  const raiz = useRef(null);
  const cabecera = useRef(null);
  const pie = useRef(null);
  const ampliada = useRef(false);
  const alturaReposo = useRef(0);
  const cancelar = useRef(() => {});

  useCapaAtras(true, cerrar);

  const acordeon = useMemo(() => ({
    abiertoId,
    abrir: setAbiertoId,
    alturaCuerpoFinal: () => alturaAmpliadaPx() - (cabecera.current ? cabecera.current.offsetHeight : 0) - (pie.current ? pie.current.offsetHeight : 0)
  }), [abiertoId]);

  useEffect(() => {
    const panel = raiz.current && raiz.current.closest('[role="dialog"]');
    if (!panel) return;
    const hayFila = abiertoId !== null;
    if (hayFila && !ampliada.current) {
      ampliada.current = true;
      alturaReposo.current = panel.offsetHeight;
      cancelar.current();
      cancelar.current = animarAlturaHoja(panel, panel.offsetHeight, OBJETIVO_CSS, 'abrir');
    } else if (!hayFila && ampliada.current) {
      ampliada.current = false;
      cancelar.current();
      cancelar.current = animarAlturaHoja(panel, panel.offsetHeight, alturaReposo.current, 'cerrar');
    }
  }, [abiertoId]);
  useEffect(() => () => cancelar.current(), []);

  return (
    <ContextoFiltros.Provider value="hoja">
      <ContextoAcordeon.Provider value={acordeon}>
        <div ref={raiz} className="flex min-h-0 flex-1 flex-col">
          <div ref={cabecera} className="shrink-0 px-2 pt-2">
            <div aria-hidden="true" className="mx-auto mb-1 h-1 w-9 rounded-full bg-border" />
            <div className="grid grid-cols-[3rem_1fr_auto] items-center">
              <button type="button" onClick={cerrar} aria-label="Cerrar filtros" className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
                <X size={18} aria-hidden="true" />
              </button>
              <h2 id={idTitulo} className="text-center text-sm font-bold text-slate-800">{titulo}</h2>
              <div className="min-w-12 text-right">{limpiar}</div>
            </div>
          </div>
          <div data-hoja-cuerpo className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-contain bg-background px-4 py-3">
            {busqueda && <div className="surface-plana overflow-hidden">{busqueda}</div>}
            {filtros && <div className="surface-plana divide-y divide-border overflow-hidden">{filtros}</div>}
          </div>
          <div ref={pie} className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <Button variant="primary" size="block" onClick={cerrar} className="h-11">{textoVer}</Button>
          </div>
        </div>
      </ContextoAcordeon.Provider>
    </ContextoFiltros.Provider>
  );
};

const HUECO = 8;
/** Ancho mínimo (visible) de un control de peso 1: un select con prefijo ("Estado: Cotizado") y un campo de fecha caben cómodos. */
const ANCHO_MINIMO_CONTROL = 160;
/** Ancho reservado, siempre, para "Limpiar filtros (N)" + contador (invisible sin filtros activos: al aparecer no mueve nada). */
const ANCHO_BLOQUE = 288;
/** Resolución de la rejilla: pistas de ~4 px, así cada fila cierra a ras del ancho (el sobrante es de redondeo, no de diseño). */
const PASO = 4;

/** Reparte los elementos (en orden) en el mínimo de filas posible, equilibradas, y sin que el bloque final quede solo en una fila. */
const planificarFilas = (area, hayBloque, ancho) => {
  const n = area.length;
  const carga = (a, b) => area.slice(a, b).reduce((s, x) => s + x, 0);
  for (let filas = 1; filas <= n; filas += 1) {
    let mejor = null;
    const recorrer = (inicio, quedan, cortes) => {
      if (quedan === 1) {
        if (carga(inicio, n) > ancho) return;
        if (hayBloque && filas > 1 && n - inicio < 2) return;
        const cs = [...cortes, n];
        const maximo = Math.max(...cs.map((fin, i) => carga(i ? cs[i - 1] : 0, fin)));
        if (!mejor || maximo < mejor.maximo) mejor = { cs, maximo };
        return;
      }
      for (let fin = inicio + 1; fin <= n - (quedan - 1); fin += 1) {
        if (carga(inicio, fin) > ancho) break;
        recorrer(fin, quedan - 1, [...cortes, fin]);
      }
    };
    recorrer(0, filas, []);
    if (mejor) return mejor.cs;
  }
  return area.map((_, i) => i + 1);
};

/**
 * Escritorio: los controles ocupan TODO el ancho de la barra. Cada hijo declara su peso con data-peso (búsqueda 2, "Resultado" 1,4,
 * el resto 1) y el bloque final (data-bloque) tiene un ancho fijo reservado. Se planifican las filas (mínimo de filas, equilibradas) y
 * en cada fila el espacio libre se reparte entre los controles en proporción a su peso; el resultado se traduce a pistas de ~4 px
 * (grid-template-columns con T pistas, sin hueco de columna: la separación de 8 px la da el margen de 4 px de cada hijo). Escribe en
 * el DOM (sin estado) en cada render y al cambiar el ancho (sidebar abierto o plegado).
 */
const repartir = (rejilla) => {
  const ancho = rejilla.clientWidth;
  if (!ancho) return;
  const hijos = [...rejilla.children];
  const items = hijos.map((el) => {
    const bloque = el.hasAttribute('data-bloque');
    const peso = Number(el.getAttribute('data-peso')) || 1;
    return { el, bloque, peso, minimo: bloque ? ANCHO_BLOQUE : Math.round(ANCHO_MINIMO_CONTROL * peso) };
  });
  const area = items.map((it) => it.minimo + HUECO);
  const cortes = planificarFilas(area, items.some((it) => it.bloque), ancho);
  const pistas = Math.max(1, Math.round(ancho / PASO));
  const ancho1 = ancho / pistas;
  let inicio = 0;
  cortes.forEach((fin) => {
    const fila = items.slice(inicio, fin);
    const minimos = area.slice(inicio, fin).reduce((s, x) => s + x, 0);
    const libre = Math.max(0, ancho - minimos);
    const pesos = fila.filter((it) => !it.bloque).reduce((s, it) => s + it.peso, 0);
    let usadas = 0;
    fila.forEach((it, k) => {
      const base = area[inicio + k];
      const crece = !it.bloque && pesos > 0 ? (libre * it.peso) / pesos : 0;
      const span = k === fila.length - 1 ? pistas - usadas : Math.max(1, Math.round((base + crece) / ancho1));
      usadas += span;
      it.el.style.gridColumn = `span ${span}`;
      it.el.style.margin = `0 ${HUECO / 2}px`;
      it.el.style.width = 'auto';
    });
    inicio = fin;
  });
  rejilla.style.gridTemplateColumns = `repeat(${pistas}, minmax(0, 1fr))`;
};

/**
 * Tarjeta de filtros: `surface` (sin borde, sombra de reposo) con una fila superior opcional y una fila de filtros.
 * Slots (props con nodos): `encabezado` (título y acciones principales), `busqueda`, `filtros` (selects, segmentados, conmutadores,
 * fecha…), `limpiar` (BotonLimpiar) y `extremo` (contador, exportar). Cada control se pinta una sola vez:
 *   - escritorio: rejilla que ocupa todo el ancho (ver `repartir`); `limpiar` + `extremo` son el último bloque, con ancho reservado;
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
  useEffect(() => { limpiarEntradaColgada(); }, []);
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
        <div ref={rejilla} className="-mx-1 grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] items-center gap-y-2">
          {busqueda && <div data-peso="2" className="min-w-0">{busqueda}</div>}
          {filtros}
          {(limpiar || extremo) && <div data-bloque className="flex min-w-0 items-center justify-end gap-2">{limpiar}{extremo}</div>}
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
