import React from 'react';
import { obtenerDiasDelMes } from '../../views/vendedor/dashboard/utils/dashboardVendedorHelpers';

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const REDONDEO = { lg: 'rounded-lg', xl: 'rounded-xl' };
const NOMBRE_DIA = { day: 'numeric', month: 'long', year: 'numeric' };
const sinHora = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();

/**
 * Calendario mensual para elegir un día o un rango (controlado y presentacional: no guarda estado ni cierra nada).
 *   <CalendarioRango inicio={Date|null} fin={Date|null} mes={Date} onCambiarMes={(±1) => …} onElegirDia={(Date) => …} max={Date} />
 * - Mismo aspecto que el calendario de la hoja de filtros de los dashboards: cabecera con el mes en mayúsculas y flechas `<` `>`,
 *   iniciales de días, números en filas de siete (`gap-1`, 11 px); inicio y fin `bg-slate-900` con texto blanco y círculo; días del medio
 *   `bg-slate-100`. La lógica de elegir (primer toque = inicio, segundo = fin) está en `elegirDiaRango` (elegirDiaRango.js).
 * - `max` (Date, opcional): último día elegible. Los posteriores quedan con `aria-disabled` y sin efecto al tocarlos, y la flecha `>`
 *   se deshabilita en el mes de `max`. Sin `max` no hay límite.
 * - `flechasRedondeo`: 'lg' (por defecto) o 'xl', el radio de las flechas de mes.
 * - Accesibilidad: cada día lleva `aria-label` con la fecha completa (y "inicio del rango", "fin del rango" o "dentro del rango"),
 *   `aria-pressed` si está en la selección y `aria-disabled` si es posterior a `max`; las flechas se llaman "Mes anterior" y "Mes siguiente";
 *   el título del mes es `aria-live="polite"`; foco visible. Sin navegación con las flechas del teclado (se recorre con Tab).
 */
export const CalendarioRango = ({ inicio = null, fin = null, mes, onCambiarMes, onElegirDia, max, flechasRedondeo = 'lg', className = '' }) => {
  const redondeo = REDONDEO[flechasRedondeo] || REDONDEO.lg;
  const maxSinHora = max ? sinHora(max) : null;
  const mesDeMax = max ? max.getFullYear() * 12 + max.getMonth() : null;
  const siguienteBloqueada = mesDeMax !== null && mes.getFullYear() * 12 + mes.getMonth() >= mesDeMax;
  const flecha = `enabled:hover:bg-slate-100 p-1.5 ${redondeo} font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary`;
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <button type="button" aria-label="Mes anterior" onClick={() => onCambiarMes(-1)} className={flecha}>&lt;</button>
        <span aria-live="polite" className="text-xs font-black uppercase text-slate-700 tracking-wider">
          {mes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" aria-label="Mes siguiente" disabled={siguienteBloqueada} onClick={() => onCambiarMes(1)} className={flecha}>&gt;</button>
      </div>

      <div aria-hidden="true" className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 mb-2">
        {DIAS_SEMANA.map((inicial, i) => <span key={i}>{inicial}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {obtenerDiasDelMes(mes).map((dia, idx) => {
          if (!dia) return <div key={`vacio-${idx}`} />;
          const marca = dia.getTime();
          const esInicio = Boolean(inicio) && marca === inicio.getTime();
          const esFin = Boolean(fin) && marca === fin.getTime();
          const enRango = Boolean(inicio && fin) && marca > inicio.getTime() && marca < fin.getTime();
          const deshabilitado = maxSinHora !== null && marca > maxSinHora;

          let color = 'hover:bg-slate-100 text-slate-700';
          if (esInicio || esFin) color = 'bg-slate-900 text-white rounded-full font-black';
          if (enRango) color = 'bg-slate-100 text-slate-900 rounded-none';
          if (deshabilitado) color = 'text-slate-300 cursor-not-allowed';

          const papel = esInicio && esFin ? ', un día' : esInicio ? ', inicio del rango' : esFin ? ', fin del rango' : enRango ? ', dentro del rango' : '';
          return (
            <button
              key={idx}
              type="button"
              aria-label={`${dia.toLocaleDateString('es-ES', NOMBRE_DIA)}${papel}`}
              aria-pressed={esInicio || esFin || enRango}
              aria-disabled={deshabilitado || undefined}
              onClick={() => { if (!deshabilitado) onElegirDia(dia); }}
              className={`text-center py-1 text-[11px] font-bold rounded-full transition-all focus-visible:outline-2 focus-visible:outline-primary ${color}`}
            >
              {dia.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
