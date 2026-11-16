import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { clasesSegmento } from '../utils/etiquetas';
import { observarVisible } from '../utils/observadorVisible';
import { alternarPopoverUnico, cerrarPopoverUnico, useEsPopoverActivo } from '../utils/popoverUnico';
import { PopoverBarra } from './PopoverBarra';

const formatear = (n) => Number(n).toLocaleString();

/** Alto de la barra en px: para probar 8, 10 o 12 basta con cambiar este número. Al resaltar, el segmento crece 2 px (ESCALA_RESALTE). */
const ALTO_BARRA = 10;
const ESCALA_RESALTE = (ALTO_BARRA + 2) / ALTO_BARRA;

/**
 * Separador entre segmentos vecinos, en px (1, 2 o 3 para probar; 0 lo quita). Es el `gap` del contenedor flex: un hueco que deja ver la
 * superficie que hay detrás de la barra (blanco en la tabla y la tarjeta móvil, #fafbfd en la tarjeta Top, el tinte de la fila al pasar el
 * cursor), así que no necesita ningún color. Solo hay hueco entre segmentos vecinos, nunca al principio ni al final. No resta anchura a
 * un segmento en concreto: se resta del total y el resto se reparte en proporción (flex-grow), con el mínimo de 3 px de cada segmento.
 */
const SEPARADOR_BARRA = 2;

/**
 * Pista de la barra: lo que se ve en los huecos si no es transparente. Con separador debe ser `ninguna` (transparente) para que el hueco
 * sea de la superficie; con `slate100` o `slate50` el hueco se pinta de ese gris y se funde con los rellenos suaves.
 */
const PISTAS = { ninguna: '', slate100: 'bg-slate-100', slate50: 'bg-slate-50' };
const PISTA_BARRA = 'ninguna';

const reducirMovimiento = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Verdadero mientras la barra espera a verse o sus segmentos están creciendo: en ese tiempo ni se resalta ni se abre el popover. */
const animandoEntrada = (barra) => {
  if (!barra) return false;
  if (barra.dataset.anim === 'espera') return true;
  return typeof barra.getAnimations === 'function' && barra.getAnimations({ subtree: true }).some((a) => a.animationName === 'barra-crecer' && a.playState !== 'finished');
};

/** Índice del segmento bajo la coordenada x (o el más cercano, porque la zona de pulsación es más alta que la barra). */
const indiceEn = (barra, x) => {
  let mejor = -1;
  let distancia = Infinity;
  [...barra.children].forEach((segmento, i) => {
    const r = segmento.getBoundingClientRect();
    const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
    if (d < distancia) { distancia = d; mejor = i; }
  });
  return mejor;
};

/**
 * Barra apilada horizontal de extremos redondeados (ALTO_BARRA px de alto): reparte un total en segmentos de color planos y contiguos (por ejemplo el
 * volumen de un producto por estado final). Los colores salen de `clasesSegmento` (utils/etiquetas.js): aquí no hay colores.
 *
 *   <BarraApilada titulo="Volumen por estado" unidad="u." segmentos={[{ clave: 'ganado', tono: 'exito', texto: 'Ganado', valor: 20 }, ...]} />
 *
 * - Cada segmento mide en proporción a su valor (`flex-grow`) con un mínimo de 3 px para que uno pequeño no desaparezca; los de valor 0 no se dibujan.
 * - Entre segmentos vecinos hay un hueco de SEPARADOR_BARRA px que deja ver la superficie de detrás (sin color propio).
 * - Cada segmento lleva el fondo suave de la Etiqueta de su estado (clasesSegmento), sin contorno. Dos vecinos del mismo tono (venta perdida y
 *   rechazo) se pintan igual: su límite solo se ve en el popover.
 * - Es un botón (`aria-haspopup="dialog"`, `aria-expanded`): se enfoca con Tab y se abre con Enter o Espacio, con clic o con un toque. Su
 *   `aria-label` lista los segmentos no vacíos con su valor real. Al abrir muestra el desglose de los estados con unidades (los mismos del aria-label)
 *   en un popover (PopoverBarra) con el segmento tocado resaltado; solo hay uno abierto a la vez (utils/popoverUnico.js) y solo existe en
 *   el DOM el de la barra activa. Con el cursor, el segmento de abajo se resalta y se engrosa. Se cierra con Escape (el foco vuelve a la
 *   barra), al pulsar fuera o al abrir otro. No se abre mientras la barra anima su entrada. El clic no se propaga (las tarjetas clicables
 *   que la contienen no navegan).
 * - Animación (index.css, `.barra-apilada`): al entrar en el viewport los segmentos crecen de 0 a su ancho con transform y opacity, con
 *   una pequeña escalonada. Usa un único IntersectionObserver compartido (utils/observadorVisible.js), anima una vez por entrada a la
 *   vista y otra vez si cambian los valores o `reinicio` (por ejemplo el orden), y entonces cierra el popover. Con prefers-reduced-motion, o
 *   sin IntersectionObserver, la barra se muestra ya terminada.
 * No pinta nada si el total es 0.
 */
export const BarraApilada = ({ segmentos = [], titulo = 'Reparto', unidad = '', reinicio = '', className = '' }) => {
  const ref = useRef(null);
  const id = useId();
  const abierto = useEsPopoverActivo(id);
  const [claveActiva, setClaveActiva] = useState(null);
  const visibles = segmentos.filter((s) => Number(s.valor) > 0);
  const total = visibles.reduce((suma, s) => suma + Number(s.valor), 0);
  const firma = `${visibles.map((s) => `${s.clave}:${s.valor}`).join('|')}#${reinicio}`;

  useLayoutEffect(() => {
    const barra = ref.current;
    cerrarPopoverUnico(id);
    if (!barra || reducirMovimiento()) return undefined;
    barra.dataset.anim = 'espera';
    const cancelar = observarVisible(barra, () => { barra.dataset.anim = 'activa'; });
    if (!cancelar) { delete barra.dataset.anim; return undefined; }
    return cancelar;
  }, [firma, id]);

  useLayoutEffect(() => () => cerrarPopoverUnico(id), [id]);

  if (total <= 0) return null;

  const sufijo = unidad ? ` ${unidad}` : '';
  const etiqueta = `${titulo}: ${visibles.map((s) => `${s.texto} ${formatear(s.valor)}${sufijo}`).join(', ')}`;

  const resaltar = (indice) => [...ref.current.children].forEach((segmento, i) => {
    if (i === indice) segmento.dataset.hover = 'true'; else delete segmento.dataset.hover;
  });
  const alMover = (e) => {
    if (e.pointerType === 'touch') return;
    resaltar(animandoEntrada(ref.current) ? -1 : indiceEn(ref.current, e.clientX));
  };
  const cerrar = ({ devolverFoco = false } = {}) => {
    cerrarPopoverUnico(id);
    if (devolverFoco && ref.current) ref.current.focus();
  };
  const alPulsar = (e) => {
    e.stopPropagation();
    if (animandoEntrada(ref.current)) return;
    // Con el teclado (detail 0) no hay segmento tocado; con ratón o toque, el que está bajo el punto.
    const indice = e.detail === 0 ? -1 : indiceEn(ref.current, e.clientX);
    const clave = indice >= 0 ? visibles[indice].clave : null;
    if (abierto && clave !== null && clave !== claveActiva) { setClaveActiva(clave); return; }
    setClaveActiva(clave);
    alternarPopoverUnico(id);
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={etiqueta}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        onClick={alPulsar}
        onPointerMove={alMover}
        onPointerLeave={() => resaltar(-1)}
        style={{ height: ALTO_BARRA, columnGap: SEPARADOR_BARRA, '--escala-resalte': ESCALA_RESALTE }}
        className={`barra-apilada relative flex w-full cursor-pointer rounded-full ${PISTAS[PISTA_BARRA]} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${className}`.trim()}
      >
        {visibles.map((s, i) => (
          <span
            key={s.clave}
            data-seleccion={abierto && s.clave === claveActiva ? 'true' : undefined}
            className={`barra-seg block h-full first:rounded-l-full last:rounded-r-full ${clasesSegmento(s.tono)}`}
            style={{ flexGrow: Number(s.valor), flexBasis: 0, minWidth: 3, '--i': i }}
          />
        ))}
      </button>
      {abierto && (
        <PopoverBarra id={id} ancla={ref} segmentos={segmentos} titulo={titulo} unidad={unidad} claveActiva={claveActiva} alCerrar={cerrar} />
      )}
    </>
  );
};
