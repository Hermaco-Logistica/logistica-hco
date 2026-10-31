import React from 'react';
import { ESTADOS_SEGUIMIENTO_CLIENTE, obtenerHistorialPlazosItem } from '../../utils/seguimientoCliente';
import { Etiqueta } from '../Etiqueta';
import './seguimiento.css';

const formatoFecha = (fecha) => fecha
  ? new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', timeZone: 'America/El_Salvador' }).format(fecha)
  : '—';

const ESTADOS_PRORROGA = { pendiente: 'pendiente', aprobada: 'aprobada', rechazada: 'rechazada' };

/** Clave del catálogo `vigenciaItem` (utils/etiquetas.js) que corresponde al estado del ítem. */
function obtenerClaveVigencia({ detalle, elegibleRevision, elegibleProrroga, prorrogaPendiente }) {
  if (prorrogaPendiente) return 'prorroga_pendiente';
  if (detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO || (detalle.vencida && !elegibleRevision && !elegibleProrroga)) return 'sin_extensiones';
  if (detalle.vencida && !elegibleRevision) return 'solo_prorroga';
  if (detalle.vencida) return 'vencido';
  if (detalle.diasRestantes <= 2) return 'por_vencer';
  if (detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION) return 'en_revision';
  return null;
}

/** Resumen compacto de vigencia y extensiones de un ítem, pensado para la sección "Condiciones". */
export const SeguimientoItemCondicion = ({
  item,
  solicitud,
  index,
  detalle,
  maxRevisiones = 2,
  elegibleRevision = false,
  elegibleProrroga = false,
  prorrogaPendiente = false,
  className = ''
}) => {
  if (!detalle) return null;

  const plazos = obtenerHistorialPlazosItem(item, solicitud, index);
  const claveVigencia = obtenerClaveVigencia({ detalle, elegibleRevision, elegibleProrroga, prorrogaPendiente });
  const vigencia = detalle.vencida
    ? `Venció ${formatoFecha(detalle.fechaAlertaInicial)} · hace ${detalle.diasVencidos} d. háb.`
    : `Vence ${formatoFecha(detalle.fechaAlertaInicial)} · ${detalle.diasRestantes} d. háb.`;

  return (
    <div className={`pedido-item-seguimiento ${className}`}>
      <div className="pedido-item-seguimiento__resumen">
        <div className="min-w-0">
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Vigencia</span>
          <span className={`text-sm font-bold ${detalle.vencida ? 'text-rose-700' : 'text-slate-700'}`}>{vigencia}</span>
        </div>
        <div>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Revisiones</span>
          <span className="text-sm font-bold text-slate-700">{detalle.cantidadRevisiones}/{maxRevisiones}</span>
        </div>
        {claveVigencia && <Etiqueta dominio="vigenciaItem" valor={claveVigencia} className="self-center" />}
      </div>

      {plazos.length > 1 && (
        <details className="pedido-item-seguimiento__plazos">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700">
            Plazos ({plazos.length})
          </summary>
          <ol className="mt-1.5 space-y-1 text-xs text-slate-600">
            {plazos.map((plazo, posicion) => (
              <li key={`${plazo.tipo}-${posicion}`} className="flex flex-wrap items-baseline gap-x-2" title={plazo.comentario || undefined}>
                <span className="font-semibold text-slate-700">{plazo.etiqueta}</span>
                <span>{formatoFecha(plazo.desde)} → {formatoFecha(plazo.hasta)}</span>
                {plazo.tipo === 'prorroga' && (
                  <span className="text-[10px] text-slate-500">{plazo.dias} d. háb. · {ESTADOS_PRORROGA[plazo.estado] || plazo.estado}</span>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
};
