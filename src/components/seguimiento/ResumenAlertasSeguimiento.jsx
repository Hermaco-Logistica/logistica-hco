import React from 'react';
import { AlertCircle, ArrowRight, CalendarClock, Clock3 } from 'lucide-react';
import { ESTADOS_SEGUIMIENTO_CLIENTE, obtenerResumenSeguimientoCliente } from '../../utils/seguimientoCliente';

const etiquetas = {
  cierre_requerido: 'Cierre requerido',
  vencido: 'Seguimiento vencido',
  prorroga_pendiente: 'Prórroga pendiente de Compras',
  seis_horas: 'Vence en menos de 6 horas',
  un_dia: 'Vence en 1 día hábil',
  dos_dias: 'Vence en 2 días hábiles'
};

export const ResumenAlertasSeguimiento = ({ solicitudes = [], onAtender }) => {
  const avisos = solicitudes
    .map((solicitud) => ({ solicitud, resumen: obtenerResumenSeguimientoCliente(solicitud) }))
    .filter(({ resumen }) => Boolean(resumen.nivelAviso));

  if (avisos.length === 0) return null;

  const cierres = avisos.filter(({ resumen }) => resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO).length;
  const Icono = cierres > 0 ? AlertCircle : CalendarClock;

  return (
    <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950">
      <div className="flex items-start gap-3">
        <Icono size={20} className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xs font-black uppercase tracking-wider">Avisos de seguimiento</h2>
            <span className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold">{avisos.length}</span>
          </div>
          <p className="mt-1 text-xs font-medium">
            {cierres > 0
              ? `${cierres} solicitud${cierres === 1 ? '' : 'es'} requiere${cierres === 1 ? '' : 'n'} cierre.`
              : 'Hay solicitudes próximas a vencer o pendientes de respuesta de Compras.'}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {avisos.slice(0, 6).map(({ solicitud, resumen }) => (
              <button
                key={solicitud.id}
                type="button"
                onClick={() => onAtender?.(solicitud)}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-left transition hover:bg-white"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-slate-800">{solicitud.correlativo || 'Solicitud sin referencia'}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-amber-800">
                    <Clock3 size={12} /> {etiquetas[resumen.nivelAviso] || 'Revisar solicitud'}
                  </span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-amber-700" />
              </button>
            ))}
          </div>
          {avisos.length > 6 && <p className="mt-2 text-[10px] font-semibold text-amber-800">Hay {avisos.length - 6} avisos adicionales en tus solicitudes.</p>}
        </div>
      </div>
    </section>
  );
};

