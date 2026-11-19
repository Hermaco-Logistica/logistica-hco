import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * Tarjeta "Conversión" de los Historiales (F8c): porcentaje por ítems sin decimales (un guion si no hay ítems cerrados), subtítulo
 * "N de M ítems cerrados" ("1 de 1 ítem cerrado" en singular; no dice "ganados / cerrados" para no confundirse con el número de solicitudes
 * del encabezado) y, en el `title`, el decimal y las solicitudes ganadas y parciales. Si hay ítems abiertos, el `title` y el `aria-label`
 * añaden "N ítems abiertos no cuentan" (singular: "1 ítem abierto no cuenta"); sin abiertos no se muestra. Los datos salen de
 * `resumirMovimientosHistorial`. El subtítulo no se trunca: con cifras de cuatro dígitos o más no cabe en una línea en la tarjeta de 1/5 del
 * ancho, así que envuelve y las cifras ("N de M") van con `whitespace-nowrap` para no partirlas. En las vistas de decisión (anulaciones,
 * ventas perdidas) no se pinta.
 */
const textoAbiertos = (n) => (n > 0 ? `${n.toLocaleString()} ${n === 1 ? 'ítem abierto no cuenta' : 'ítems abiertos no cuentan'}` : '');

export const TarjetaConversion = ({ conversion, itemsGanados, itemsCerrados, itemsAbiertos = 0, titulo }) => {
  const subtitulo = `${itemsGanados.toLocaleString()} de ${itemsCerrados.toLocaleString()} ${itemsCerrados === 1 ? 'ítem cerrado' : 'ítems cerrados'}`;
  const abiertos = textoAbiertos(itemsAbiertos);
  return (
    <div className="surface p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl flex flex-col justify-between col-span-2 lg:col-span-1">
      <div className="flex items-center gap-2 text-slate-400 mb-1.5">
        <TrendingUp size={14} className="text-slate-400 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider truncate">Conversión</span>
      </div>
      <div>
        <div className="text-lg sm:text-2xl font-bold font-mono text-slate-800 tracking-tight flex items-baseline gap-1">
          {conversion === null ? '—' : (
            <>
              {Math.round(conversion)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400">%</span>
            </>
          )}
        </div>
        <div
          className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 cursor-help"
          title={abiertos ? `${titulo}. ${abiertos}` : titulo}
          {...(abiertos ? { role: 'group', 'aria-label': `${subtitulo}. ${abiertos}` } : {})}
        >
          <span className="whitespace-nowrap">{itemsGanados.toLocaleString()} de {itemsCerrados.toLocaleString()}</span> {itemsCerrados === 1 ? 'ítem cerrado' : 'ítems cerrados'}
        </div>
      </div>
    </div>
  );
};
