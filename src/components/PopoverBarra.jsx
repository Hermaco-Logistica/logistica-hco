import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Etiqueta } from './Etiqueta';

const SEPARACION = 8;
const MARGEN = 8;
const ANCHO = 256;

const formatear = (n) => Number(n).toLocaleString();
const porcentaje = (valor, total) => {
  const p = (valor / total) * 100;
  return p < 1 ? '<1' : String(Math.round(p));
};

/**
 * Desglose de una BarraApilada en un globo anclado a la barra, en un portal a <body> (no lo recorta ningún overflow ni lo tapa la tarjeta vecina).
 * Lista solo los estados con unidades (en el orden en que llegan) con una Etiqueta compacta de su tono —la misma pastilla que ese estado tiene
 * en las listas: TONOS de etiquetas.js—, sus unidades y su porcentaje, y resalta el segmento tocado con un fondo de fila neutro (`bg-slate-100`).
 * Por eso su alto varía con el número de filas; el ancho es fijo (256 px). Sin ningún estado con unidades no pinta nada.
 *
 * Posición (se calcula con el tamaño medido del globo y se repite con scroll y resize): debajo de la barra y, si no cabe y arriba hay más sitio,
 * encima; centrado sobre la barra y empujado hacia dentro para no salirse del viewport (8 px de margen). Si no cabe ni arriba ni abajo, toma el
 * lado con más espacio y su contenido se desplaza. Si la barra sale del viewport al hacer scroll, se cierra.
 * Se cierra con Escape y al pulsar fuera (la barra se encarga de su propio clic). Las animaciones están en index.css (.popover-barra).
 */
export const PopoverBarra = ({ id, ancla, segmentos, titulo, unidad, claveActiva, alCerrar }) => {
  const ref = useRef(null);
  const ultimo = useRef(alCerrar);
  useEffect(() => { ultimo.current = alCerrar; });

  const posicionar = () => {
    const globo = ref.current;
    const barra = ancla.current;
    if (!globo || !barra) return;
    const r = barra.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) { ultimo.current(); return; }
    globo.style.maxHeight = '';
    const w = globo.offsetWidth;
    const h = globo.offsetHeight;
    const abajo = vh - r.bottom - SEPARACION - MARGEN;
    const arriba = r.top - SEPARACION - MARGEN;
    const dir = h <= abajo || abajo >= arriba ? 'abajo' : 'arriba';
    const disponible = Math.max(96, dir === 'abajo' ? abajo : arriba);
    const alto = Math.min(h, disponible);
    if (h > disponible) globo.style.maxHeight = `${disponible}px`;
    const centro = r.left + r.width / 2;
    const left = Math.max(MARGEN, Math.min(centro - w / 2, vw - w - MARGEN));
    globo.style.left = `${left}px`;
    globo.style.top = `${dir === 'abajo' ? r.bottom + SEPARACION : r.top - SEPARACION - alto}px`;
    globo.style.setProperty('--origen-x', `${Math.max(0, Math.min(w, centro - left))}px`);
    globo.dataset.dir = dir;
  };

  useLayoutEffect(() => { posicionar(); });

  useEffect(() => {
    const alMover = () => posicionar();
    const alPulsar = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (ancla.current && ancla.current.contains(e.target)) return;
      ultimo.current();
    };
    const alTeclear = (e) => { if (e.key === 'Escape') { e.stopPropagation(); ultimo.current({ devolverFoco: true }); } };
    window.addEventListener('scroll', alMover, true);
    window.addEventListener('resize', alMover);
    document.addEventListener('pointerdown', alPulsar);
    document.addEventListener('keydown', alTeclear, true);
    return () => {
      window.removeEventListener('scroll', alMover, true);
      window.removeEventListener('resize', alMover);
      document.removeEventListener('pointerdown', alPulsar);
      document.removeEventListener('keydown', alTeclear, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- posicionar solo lee refs y el DOM
  }, [ancla]);

  const filas = segmentos.filter((s) => Number(s.valor) > 0);
  if (typeof document === 'undefined' || filas.length === 0) return null;
  const total = filas.reduce((suma, s) => suma + Number(s.valor), 0);
  const sufijo = unidad ? ` ${unidad}` : '';

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-label={`${titulo}: desglose por estado`}
      data-popover-barra
      onClick={(e) => e.stopPropagation()}
      style={{ width: ANCHO }}
      className="popover-barra surface-flotante fixed z-[90] overflow-y-auto rounded-xl p-3 text-[11px] text-slate-600"
    >
      <p className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <span className="font-semibold text-slate-700">{titulo}</span>
        <span className="font-mono text-slate-500">{formatear(total)}{sufijo}</span>
      </p>
      <ul className="space-y-0.5">
        {filas.map((s) => {
          const valor = Number(s.valor);
          return (
            <li
              key={s.clave}
              data-clave={s.clave}
              data-activo={s.clave === claveActiva ? 'true' : undefined}
              className={`flex items-center justify-between gap-2 rounded-lg px-1 py-0.5 ${s.clave === claveActiva ? 'bg-slate-100' : ''}`.trim()}
            >
              <Etiqueta tono={s.tono} tamano="compacta" sinIcono>{s.texto}</Etiqueta>
              <span className="flex items-baseline gap-2 font-mono">
                <span className="font-semibold text-slate-700">{formatear(valor)}{sufijo}</span>
                <span className="w-9 text-right text-slate-500">{porcentaje(valor, total)} %</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>,
    document.body
  );
};
