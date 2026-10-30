import React from 'react';
import { ESTADOS_SEGUIMIENTO_CLIENTE, obtenerHistorialPlazosItem } from '../../utils/seguimientoCliente';
import './seguimiento.css';

const formatoFecha = (fecha) => fecha
  ? new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', timeZone: 'America/El_Salvador' }).format(fecha)
  : '—';

const TONOS_CHIP = {
  danger: 'text-rose-700 bg-rose-50 border-rose-300',
  warning: 'text-amber-800 bg-amber-50 border-amber-300',
  info: 'text-sky-700 bg-sky-50 border-sky-300'
};

const ESTADOS_PRORROGA = { pendiente: 'pendiente', aprobada: 'aprobada', rechazada: 'rechazada' };

function obtenerChip({ detalle, elegibleRevision, elegibleProrroga, prorrogaPendiente }) {
  if (prorrogaPendiente) return { tono: 'info', texto: 'Prórroga pendiente', titulo: 'Compras aún no responde la prórroga solicitada.' };
  if (detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO || (detalle.vencida && !elegibleRevision && !elegibleProrroga)) {
    return { tono: 'danger', texto: 'Sin extensiones', titulo: 'Agotó revisiones y prórroga. Ciérralo como pedido o venta perdida.' };
  }
  if (detalle.vencida && !elegibleRevision) {
    return { tono: 'warning', texto: 'Solo prórroga', titulo: 'Ya usó todas sus revisiones. Solo puede pedir prórroga formal.' };
  }
  if (detalle.vencida) return { tono: 'danger', texto: 'Vencido', titulo: 'Puede mantenerse en revisión o pedir prórroga.' };
  if (detalle.diasRestantes <= 2) return { tono: 'warning', texto: 'Por vencer', titulo: 'Vence en 2 días hábiles o menos.' };
  if (detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION) return { tono: 'info', texto: 'En revisión', titulo: 'Revisión activa con el cliente.' };
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
  const chip = obtenerChip({ detalle, elegibleRevision, elegibleProrroga, prorrogaPendiente });
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
        {chip && (
          <span title={chip.titulo} className={`self-center inline-flex items-center text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-sm ${TONOS_CHIP[chip.tono]}`}>
            {chip.texto}
          </span>
        )}
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
