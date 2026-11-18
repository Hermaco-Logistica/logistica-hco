import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * Tarjeta "Conversión" de los Historiales (F8c): porcentaje por ítems sin decimales (un guion si no hay ítems cerrados), subtítulo
 * "N ganados / M cerrados" y, en el `title`, el decimal y las solicitudes ganadas y parciales. Los datos salen de `resumirMovimientosHistorial`.
 * El subtítulo no se trunca: con cifras de cuatro dígitos o más no cabe en una línea en la tarjeta de 1/5 del ancho, así que envuelve en la
 * barra y cada mitad lleva `whitespace-nowrap` para no partir una cifra. En las vistas de decisión (anulaciones, ventas perdidas) no se pinta.
 */
export const TarjetaConversion = ({ conversion, itemsGanados, itemsCerrados, titulo }) => (
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
      <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 cursor-help" title={titulo}>
        <span className="whitespace-nowrap">{itemsGanados.toLocaleString()} {itemsGanados === 1 ? 'ganado' : 'ganados'}</span> / <span className="whitespace-nowrap">{itemsCerrados.toLocaleString()} {itemsCerrados === 1 ? 'cerrado' : 'cerrados'}</span>
      </div>
    </div>
  </div>
);
