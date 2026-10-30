import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { obtenerDiasValidez } from '../../utils/cotizacionesEstancadasHelpers';
import { completarAnclasProrroga, obtenerFechasVencimientoProrroga } from '../../utils/prorrogasCliente';
import { obtenerEtiquetaItemSeguimiento } from '../../utils/seguimientoCliente';
import { ModalComentariosProrroga } from './ModalComentariosProrroga';

const formatoFecha = (fecha) => fecha
  ? new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', timeZone: 'America/El_Salvador' }).format(fecha)
  : '—';

/**
 * Ayuda a Compras a decidir una prórroga pendiente: ítems afectados, plazos y criterios de evaluación.
 * Es informativo: no bloquea la aprobación ni el rechazo.
 */
export const PanelCriteriosProrroga = ({ solicitud, resumen }) => {
  // undefined = cerrado, null = todos los ítems, número = un ítem.
  const [comentariosEnfocados, setComentariosEnfocados] = useState(undefined);
  const prorroga = solicitud?.prorrogaCliente;
  if (!prorroga || prorroga.estado !== 'pendiente' || !resumen) return null;

  const indices = Array.isArray(prorroga.indicesItems) ? prorroga.indicesItems : [];
  const fechas = obtenerFechasVencimientoProrroga(completarAnclasProrroga(solicitud, prorroga));
  const filas = indices.map((indice) => ({
    indice,
    etiqueta: obtenerEtiquetaItemSeguimiento(solicitud.productos?.[indice], indice),
    detalle: resumen.detalles.find((d) => d.index === indice),
    fechas: fechas.find((f) => f.index === indice)
  }));

  const dias = Number(prorroga.diasSolicitados || 0);
  const validez = obtenerDiasValidez(solicitud);
  const max = resumen.maxRevisiones;
  const conRevisionesLibres = filas.filter(({ detalle }) => detalle && detalle.cantidadRevisiones < max).length;
  const previas = Math.max(0, Number(prorroga.ronda || 1) - 1);

  const criterios = [
    {
      ok: conRevisionesLibres === 0,
      texto: conRevisionesLibres === 0
        ? `Revisiones agotadas (${max}/${max}) en todos los ítems`
        : `${conRevisionesLibres} ${conRevisionesLibres === 1 ? 'ítem aún tiene' : 'ítems aún tienen'} revisiones disponibles`
    },
    {
      ok: dias <= validez,
      texto: `${dias} días hábiles solicitados · validez estándar de ${validez}`
    },
    {
      ok: previas === 0,
      texto: previas === 0 ? 'Primera prórroga de esta solicitud' : `Ya hubo ${previas} ${previas === 1 ? 'prórroga previa' : 'prórrogas previas'}`
    },
    {
      ok: String(prorroga.motivo || '').trim().length >= 10,
      texto: 'Motivo documentado por el vendedor'
    }
  ];

  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Criterios para evaluar la prórroga">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Criterios de evaluación</h3>

      <ul className="mt-3 space-y-1.5">
        {criterios.map(({ ok, texto }) => (
          <li key={texto} className="flex items-start gap-2 text-xs font-medium text-slate-700">
            {ok
              ? <CheckCircle2 size={14} className="mt-px shrink-0 text-emerald-600" aria-label="Cumple" />
              : <AlertTriangle size={14} className="mt-px shrink-0 text-amber-600" aria-label="Revisar" />}
            <span>{texto}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Ítems afectados ({filas.length})
          </span>
          {filas.length > 1 && (
            <button type="button" onClick={() => setComentariosEnfocados(null)} className="text-[10px] font-bold text-sky-700 hover:underline">
              Ver comentarios de todos
            </button>
          )}
        </div>
        <ul className="mt-2 divide-y divide-slate-100">
          {filas.map(({ indice, etiqueta, detalle, fechas: rango }) => (
            <li key={indice} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5 text-xs">
              <span className="min-w-0 font-semibold text-slate-700">{etiqueta}</span>
              <span className="flex flex-wrap items-baseline gap-x-2 text-slate-500">
                {detalle && <>Rev. {detalle.cantidadRevisiones}/{max} · </>}
                {formatoFecha(rango?.fechaInicio)} → <strong className="text-slate-700">{formatoFecha(rango?.fechaFin)}</strong>
                <button type="button" onClick={() => setComentariosEnfocados(indice)} className="font-bold text-sky-700 hover:underline">
                  Ver más
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <ModalComentariosProrroga
        solicitud={solicitud}
        prorroga={prorroga}
        indiceEnfocado={comentariosEnfocados}
        onCambiarEnfoque={setComentariosEnfocados}
        onClose={() => setComentariosEnfocados(undefined)}
      />
    </section>
  );
};
