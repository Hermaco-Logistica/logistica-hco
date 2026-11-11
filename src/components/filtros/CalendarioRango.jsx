import React, { useEffect, useRef, useState } from 'react';
import { obtenerDiasDelMes } from '../../views/vendedor/dashboard/utils/dashboardVendedorHelpers';

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const REDONDEO = { lg: 'rounded-lg', xl: 'rounded-xl' };
const NOMBRE_DIA = { day: 'numeric', month: 'long', year: 'numeric' };
const sinHora = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
const mesDe = (fecha) => fecha.getFullYear() * 12 + fecha.getMonth();
const claveDia = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
const sumarDias = (fecha, n) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + n);
/** Mismo día del mes `n` meses después (si no existe, el último día de ese mes). */
const sumarMeses = (fecha, n) => {
  const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + n + 1, 0).getDate();
  return new Date(fecha.getFullYear(), fecha.getMonth() + n, Math.min(fecha.getDate(), ultimo));
};

/**
 * Calendario mensual para elegir un día o un rango (controlado y presentacional: no guarda estado de selección ni cierra nada).
 *   <CalendarioRango inicio={Date|null} fin={Date|null} mes={Date} onCambiarMes={(±n) => …} onElegirDia={(Date) => …} max={Date} />
 * - Mismo aspecto que el calendario de la hoja de filtros de los dashboards: cabecera con el mes en mayúsculas y flechas `<` `>`,
 *   iniciales de días, números en filas de siete (`gap-1`, 11 px); inicio y fin `bg-slate-900` con texto blanco y círculo; días del medio
 *   `bg-slate-100`. La lógica de elegir (primer toque = inicio, segundo = fin) está en `elegirDiaRango` (elegirDiaRango.js).
 * - `max` (Date, opcional): último día elegible. Los posteriores quedan con `aria-disabled` y sin efecto al tocarlos ni alcanzables con el
 *   teclado, y la flecha `>` se deshabilita en el mes de `max`. Sin `max` no hay límite.
 * - `flechasRedondeo`: 'lg' (por defecto) o 'xl', el radio de las flechas de mes.
 * - Accesibilidad: cada día lleva `aria-label` con la fecha completa (y "inicio del rango", "fin del rango" o "dentro del rango"),
 *   `aria-pressed` si está en la selección y `aria-disabled` si es posterior a `max`; las flechas se llaman "Mes anterior" y "Mes siguiente";
 *   el título del mes es `aria-live="polite"`; el foco se ve (`focus-visible`, con separación) y los días no animan con movimiento reducido.
 * - Teclado (roving tabindex: un solo día en el orden de tabulación, el que tuvo el foco, o el inicio, o hoy, o el primero elegible): flechas
 *   izquierda/derecha (±1 día) y arriba/abajo (±7), Inicio/Fin (primer y último día de su fila), AvPág/RePág (mismo día del mes siguiente/
 *   anterior; cambia el mes con `onCambiarMes(±1)`), Enter y Espacio eligen (activación nativa del botón). Nunca pasa de `max`: un destino
 *   posterior se queda en `max` y uno en un mes posterior no se mueve.
 * - `autoFoco`: al montar lleva el foco al día de la selección (o a hoy), para abrirlo dentro de un modal.
 */
export const CalendarioRango = ({ inicio = null, fin = null, mes, onCambiarMes, onElegirDia, max, flechasRedondeo = 'lg', autoFoco = false, className = '' }) => {
  const raiz = useRef(null);
  const pedirFoco = useRef(false);
  const [foco, setFoco] = useState(null);
  const redondeo = REDONDEO[flechasRedondeo] || REDONDEO.lg;
  const maxSinHora = max ? sinHora(max) : null;
  const siguienteBloqueada = max ? mesDe(mes) >= mesDe(max) : false;
  const flecha = `enabled:hover:bg-slate-100 p-1.5 ${redondeo} font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`;
  const esElegible = (dia) => maxSinHora === null || sinHora(dia) <= maxSinHora;
  const dias = obtenerDiasDelMes(mes);

  // Día que queda en el orden de tabulación: el que tuvo el foco, el inicio, hoy, `max` o el primero elegible del mes mostrado.
  const enMes = (dia) => Boolean(dia) && mesDe(dia) === mesDe(mes) && esElegible(dia);
  const candidato = [foco, inicio, new Date(), max].find(enMes) || dias.find((dia) => dia && esElegible(dia)) || null;
  const claveTabulable = candidato ? claveDia(candidato) : null;

  useEffect(() => {
    if (!pedirFoco.current || !foco) return;
    pedirFoco.current = false;
    raiz.current?.querySelector(`[data-dia="${claveDia(foco)}"]`)?.focus();
  }, [foco, mes]);

  useEffect(() => {
    if (!autoFoco) return undefined;
    // Un cuadro después: el modal lleva el foco a su panel al montar y este debe quedar encima.
    const id = requestAnimationFrame(() => raiz.current?.querySelector('[data-dia][tabindex="0"]')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [autoFoco]);

  const mover = (destino) => {
    let dia = destino;
    if (maxSinHora !== null && sinHora(dia) > maxSinHora) {
      if (mesDe(dia) > mesDe(max)) return;
      dia = new Date(max.getFullYear(), max.getMonth(), max.getDate());
    }
    pedirFoco.current = true;
    setFoco(dia);
    const salto = mesDe(dia) - mesDe(mes);
    if (salto !== 0) onCambiarMes(salto);
  };

  const alTeclear = (evento, dia) => {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    const semana = dia.getDay();
    const destinos = {
      ArrowLeft: () => sumarDias(dia, -1),
      ArrowRight: () => sumarDias(dia, 1),
      ArrowUp: () => sumarDias(dia, -7),
      ArrowDown: () => sumarDias(dia, 7),
      Home: () => { const d = sumarDias(dia, -semana); return mesDe(d) < mesDe(dia) ? new Date(dia.getFullYear(), dia.getMonth(), 1) : d; },
      End: () => { const d = sumarDias(dia, 6 - semana); return mesDe(d) > mesDe(dia) ? new Date(dia.getFullYear(), dia.getMonth() + 1, 0) : d; },
      PageUp: () => sumarMeses(dia, -1),
      PageDown: () => sumarMeses(dia, 1)
    };
    const destino = destinos[evento.key];
    if (!destino) return;
    evento.preventDefault();
    mover(destino());
  };

  return (
    <div ref={raiz} className={className}>
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
        {dias.map((dia, idx) => {
          if (!dia) return <div key={`vacio-${idx}`} />;
          const marca = dia.getTime();
          const esInicio = Boolean(inicio) && marca === inicio.getTime();
          const esFin = Boolean(fin) && marca === fin.getTime();
          const enRango = Boolean(inicio && fin) && marca > inicio.getTime() && marca < fin.getTime();
          const deshabilitado = !esElegible(dia);

          let color = 'hover:bg-slate-100 text-slate-700';
          if (esInicio || esFin) color = 'bg-slate-900 text-white rounded-full font-black';
          if (enRango) color = 'bg-slate-100 text-slate-900 rounded-none';
          if (deshabilitado) color = 'text-slate-300 cursor-not-allowed';

          const papel = esInicio && esFin ? ', un día' : esInicio ? ', inicio del rango' : esFin ? ', fin del rango' : enRango ? ', dentro del rango' : '';
          const clave = claveDia(dia);
          return (
            <button
              key={idx}
              type="button"
              data-dia={clave}
              tabIndex={clave === claveTabulable ? 0 : -1}
              aria-label={`${dia.toLocaleDateString('es-ES', NOMBRE_DIA)}${papel}`}
              aria-pressed={esInicio || esFin || enRango}
              aria-disabled={deshabilitado || undefined}
              onClick={() => { if (!deshabilitado) onElegirDia(dia); }}
              onFocus={() => { if (!deshabilitado) setFoco(dia); }}
              onKeyDown={(evento) => alTeclear(evento, dia)}
              className={`text-center py-1 text-[11px] font-bold rounded-full transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${color}`}
            >
              {dia.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
