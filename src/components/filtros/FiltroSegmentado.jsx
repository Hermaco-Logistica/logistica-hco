import React, { useEffect, useRef, useState } from 'react';
import { FilaAcordeon } from './FilaAcordeon';
import { FiltroSelect } from './FiltroSelect';
import { useModoFiltro } from './contexto';

/** Hasta este número de opciones el segmentado sigue siendo una fila con botones también en la hoja móvil. */
const MAX_OPCIONES_SEGMENTADO_EN_HOJA = 3;

/**
 * Selector segmentado plano (pista gris suave; opción activa con el tono oscuro del rol: fondo `segmento-activo` (primary-strong un 20 % más oscuro), texto `primary-soft`, negrita;
 * el fondo cambia con transición suave, sin movimientos bruscos). `opciones`: [{ value, label }]. `onChange(valor)`.
 * `prefijo` (opcional, solo en la barra): nombre del filtro dentro de la pista ("Vendedor:"); en la hoja lo da `etiqueta`.
 * `valorNeutro` (opcional): el valor que equivale a "sin filtro"; si `value` es otro, el segmentado usa el estado "seleccionado".
 * La pista es compacta: ocupa el ancho de su contenido (`w-max`, no se estira a la fila) y cubre TODAS las opciones; los botones
 * comparten ancho (rejilla `auto-cols-fr`, el de la opción más larga). `completo` la lleva al ancho del contenedor (p. ej. en un
 * acordeón), repartiendo el ancho a partes iguales.
 * `peso` (opcional, solo en la barra de escritorio): peso del control en el reparto de la rejilla (ancho mínimo = 160 px × peso).
 * `colapsable` (solo en la barra de escritorio): si la celda que le toca es más estrecha que la fila de botones (se mide el ancho natural
 * de la fila), se muestra como desplegable `FiltroSelect` sin "Todos" ("Ordenar: Más RFQs", con `prefijo`) y vuelve a la fila de botones
 * cuando la celda vuelve a caber; el estado, las opciones y `onChange` son los mismos.
 * En la hoja móvil es una fila con `etiqueta` (por defecto `ariaLabel`): con 3 opciones o menos, la fila lleva los botones a la
 * derecha (un toque, sin desplegar nada); con más, se despliega como acordeón con la misma lista de opciones que los selects.
 */
export const FiltroSegmentado = ({ opciones = [], value, onChange, ariaLabel, etiqueta, prefijo, valorNeutro, completo = false, peso, colapsable = false, className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const refCelda = useRef(null);
  const refPista = useRef(null);
  const natural = useRef(0);
  const [colapsado, setColapsado] = useState(false);
  useEffect(() => {
    const celda = refCelda.current;
    if (!colapsable || enHoja || !celda || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(() => {
      if (refPista.current) natural.current = refPista.current.offsetWidth;
      setColapsado(natural.current > 0 && celda.clientWidth < natural.current);
    });
    observador.observe(celda);
    return () => observador.disconnect();
  }, [colapsable, enHoja]);
  const seleccionado = valorNeutro !== undefined && value !== valorNeutro;
  if (enHoja && opciones.length > MAX_OPCIONES_SEGMENTADO_EN_HOJA) {
    const elegida = opciones.find((o) => o.value === value);
    return (
      <FilaAcordeon etiqueta={etiqueta || ariaLabel} textoValor={elegida ? elegida.label : ''} opciones={opciones} value={value} onElegir={onChange} ariaLabel={ariaLabel} seleccionado={seleccionado} className={className} />
    );
  }
  const control = (
    <div
      ref={refPista}
      role="group"
      aria-label={ariaLabel}
      className={`${completo ? 'flex w-full' : `inline-flex w-max ${colapsable ? '' : 'max-w-full'}`} items-center rounded-xl p-0.5 ${seleccionado ? 'bg-filtro-activo' : 'bg-slate-100'} ${enHoja ? 'h-9' : `h-11 md:h-9 ${className}`}`}
    >
      {prefijo && !enHoja && <span aria-hidden="true" className={`shrink-0 pl-2 pr-1 text-xs font-medium ${seleccionado ? 'text-filtro-texto' : 'text-slate-500'}`}>{prefijo}</span>}
      <div className={`grid h-full auto-cols-fr grid-flow-col gap-0.5 ${completo ? 'flex-1' : ''}`}>
        {opciones.map((o) => {
          const activo = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={activo}
              onClick={() => onChange(o.value)}
              className={`inline-flex h-full cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] px-3 text-xs font-medium transition-colors duration-[var(--anim-cerrar)] ease-[var(--ease-cerrar)] ${activo ? 'bg-segmento-activo font-semibold text-primary-soft' : `text-slate-600 hover:text-slate-900`}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
  if (!enHoja) {
    if (!colapsable && peso === undefined) return control;
    return (
      <div ref={refCelda} data-peso={peso} className="min-w-0">
        {colapsado ? (
          <FiltroSelect sinTodos value={value} onChange={onChange} opciones={opciones} prefijo={prefijo} etiqueta={etiqueta} ariaLabel={ariaLabel} />
        ) : control}
      </div>
    );
  }
  return (
    <div className={`flex min-h-11 items-center justify-between gap-3 px-4 py-1 ${seleccionado ? 'bg-filtro-activo' : ''} ${className}`}>
      <span className={`shrink-0 text-sm font-medium ${seleccionado ? 'text-filtro-texto' : 'text-slate-700'}`}>{etiqueta || ariaLabel}</span>
      {control}
    </div>
  );
};
