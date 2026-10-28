import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { completarAnclasProrroga, obtenerFechasVencimientoProrroga } from '../../utils/prorrogasCliente';

const fechaTexto = (fecha) => fecha
  ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: 'America/El_Salvador' }).format(fecha)
  : 'Sin fecha';

const resumenFechas = (fechas, clave) => {
  const valores = fechas.map((entrada) => entrada[clave]).filter(Boolean).sort((a, b) => a - b);
  if (!valores.length) return 'Sin fecha calculable';
  const inicio = fechaTexto(valores[0]);
  const fin = fechaTexto(valores[valores.length - 1]);
  return inicio === fin ? inicio : `${inicio} – ${fin}`;
};

export const ModalRespuestaProrroga = ({ solicitud, solicitudBase, accion, guardando = false, onClose, onConfirmar }) => {
  const [comentario, setComentario] = useState('');
  const esAprobacion = accion === 'aprobada';

  if (!solicitud || !accion) return null;

  const prorrogaConAnclas = completarAnclasProrroga(solicitudBase || {}, solicitud);
  const fechasPropuestas = obtenerFechasVencimientoProrroga(prorrogaConAnclas);

  const confirmar = (event) => {
    event.preventDefault();
    if (!esAprobacion && !comentario.trim()) return;
    onConfirmar(comentario.trim());
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <form onSubmit={confirmar} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-black text-slate-900">{esAprobacion ? 'Aprobar prórroga' : 'Rechazar prórroga'}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{solicitud.correlativo || 'Solicitud'} · {solicitud.diasSolicitados} días solicitados</p>
        </div>
        <div className="space-y-3 px-5 py-5">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{solicitud.motivo || 'Sin motivo registrado.'}</p>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <p>Última fecha límite base: <strong>{resumenFechas(fechasPropuestas, 'fechaInicio')}</strong></p>
            {esAprobacion && <p className="mt-1">Nueva fecha límite si se aprueba: <strong>{resumenFechas(fechasPropuestas, 'fechaFin')}</strong></p>}
            {fechasPropuestas.length > 1 && <p className="mt-1 text-[10px] text-slate-500">Las fechas pueden variar entre ítems.</p>}
          </div>
          <label htmlFor="respuesta-prorroga" className="block text-xs font-black uppercase tracking-wider text-slate-600">{esAprobacion ? 'Comentario opcional' : 'Motivo del rechazo'}</label>
          <textarea id="respuesta-prorroga" rows={3} value={comentario} onChange={(event) => setComentario(event.target.value)} required={!esAprobacion} disabled={guardando} className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100" />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} disabled={guardando} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={guardando || (!esAprobacion && !comentario.trim())} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50 ${esAprobacion ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
            {esAprobacion ? <Check size={14} /> : <X size={14} />}
            {guardando ? 'Guardando...' : esAprobacion ? 'Aprobar' : 'Rechazar'}
          </button>
        </div>
      </form>
    </div>
  );
};
