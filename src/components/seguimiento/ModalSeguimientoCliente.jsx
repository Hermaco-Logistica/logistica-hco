import React, { useState } from 'react';
import { CalendarClock, CalendarPlus, X } from 'lucide-react';
import { analizarDiasSolicitadosProrroga } from '../../utils/prorrogasCliente';
import { sumarDiasHabiles } from '../../utils/diasHabiles';

const formatoFecha = (fecha) => new Intl.DateTimeFormat('es-SV', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/El_Salvador'
}).format(fecha);

const formatoRangoFechas = (fechas = []) => {
  const ordenadas = fechas.filter(Boolean).slice().sort((a, b) => a - b);
  const unicas = [...new Set(ordenadas.map(formatoFecha))];
  if (!unicas.length) return 'Fecha por calcular';
  return unicas.length === 1 ? unicas[0] : `${unicas[0]} – ${unicas[unicas.length - 1]}`;
};

export const ModalSeguimientoCliente = ({
  isOpen,
  onClose,
  onConfirmar,
  onSolicitarProrroga,
  onPrepararProrroga,
  diasValidez = 5,
  fechasLimiteRevision = [],
  fechasLimiteProrroga = [],
  cantidadItems = 1,
  revisionesUsadas = 0,
  maxRevisiones = 2,
  permiteMantenerRevision,
  mostrarSolicitudProrroga = false,
  pendiente = false,
  guardando = false,
  guardandoProrroga = false
}) => {
  const puedeMantenerRevision = permiteMantenerRevision ?? revisionesUsadas < maxRevisiones;
  const [modo, setModo] = useState(puedeMantenerRevision ? 'revision' : 'prorroga');
  const [comentario, setComentario] = useState('');
  const [dias, setDias] = useState(String(diasValidez));
  const [motivo, setMotivo] = useState('');
  const [confirmarDiasIncongruentes, setConfirmarDiasIncongruentes] = useState(false);
  const motivoProrrogaValido = motivo.trim().length >= 10;
  const analisisProrroga = analizarDiasSolicitadosProrroga({
    fechasLimite: fechasLimiteProrroga,
    diasSolicitados: dias,
    fechaReferencia: new Date()
  });
  const fechasRevisionPropuestas = fechasLimiteRevision
    .map((fecha) => sumarDiasHabiles(fecha, diasValidez));
  const fechasMinimasPropuestas = analisisProrroga.fechas
    .map(({ fechaInicio }) => sumarDiasHabiles(fechaInicio, analisisProrroga.diasMinimos));

  if (!isOpen) return null;

  const estaGuardando = guardando || guardandoProrroga;
  const cerrar = () => {
    if (estaGuardando) return;
    onClose();
  };

  const confirmar = (event) => {
    event.preventDefault();
    if (modo === 'revision') {
      if (!comentario.trim() || !puedeMantenerRevision) return;
      onConfirmar(comentario.trim());
      return;
    }

    const diasNumero = Number(dias);
    if (!Number.isInteger(diasNumero) || diasNumero <= 0 || diasNumero > 90 || !motivoProrrogaValido || pendiente
      || (analisisProrroga.requiereConfirmacion && !confirmarDiasIncongruentes)) return;
    onSolicitarProrroga({ diasSolicitados: diasNumero, motivo: motivo.trim() });
  };

  const seleccionarProrroga = () => {
    if (pendiente || estaGuardando || !mostrarSolicitudProrroga) return;
    setModo('prorroga');
    onPrepararProrroga?.();
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <form onSubmit={confirmar} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2 ${modo === 'revision' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
              {modo === 'revision' ? <CalendarClock size={20} /> : <CalendarPlus size={20} />}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {modo === 'revision' ? 'Mantener en revisión' : 'Solicitar prórroga formal'}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {modo === 'revision'
                  ? `Se mantendrá la revisión por ${diasValidez} días hábiles adicionales.`
                  : 'Compras debe aprobar los días adicionales solicitados.'}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                {cantidadItems} {cantidadItems === 1 ? 'ítem afectado' : 'ítems afectados'} · Revisión {Math.min(revisionesUsadas + (modo === 'revision' ? 1 : 0), maxRevisiones)} de {maxRevisiones}
              </p>
            </div>
          </div>
          <button type="button" onClick={cerrar} disabled={estaGuardando} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {mostrarSolicitudProrroga && !pendiente && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1">
              <button type="button" onClick={() => setModo('revision')} disabled={!puedeMantenerRevision || estaGuardando} className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide ${modo === 'revision' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'} disabled:cursor-not-allowed disabled:opacity-40`}>
                Mantener revisión
              </button>
              <button type="button" onClick={seleccionarProrroga} disabled={estaGuardando} className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide ${modo === 'prorroga' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}>
                Solicitar prórroga
              </button>
            </div>
          )}

          {pendiente && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Ya existe una solicitud de prórroga pendiente de respuesta de Compras.
            </div>
          )}

          {modo === 'revision' ? (
            <div className="space-y-2">
              {fechasRevisionPropuestas.length > 0 && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Nueva fecha límite estimada: <strong>{formatoRangoFechas(fechasRevisionPropuestas)}</strong>. Se cuenta desde el vencimiento vigente.</p>}
              <label htmlFor="comentario-seguimiento-cliente" className="text-xs font-black uppercase tracking-wider text-slate-600">Comentario del seguimiento</label>
              <textarea id="comentario-seguimiento-cliente" value={comentario} onChange={(event) => setComentario(event.target.value)} rows={4} autoFocus required placeholder="Ej.: Cliente solicitó tiempo para validar la propuesta internamente." className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="dias-prorroga" className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600">Días adicionales solicitados</label>
                <input id="dias-prorroga" type="number" min="1" max="90" step="1" value={dias} onChange={(event) => { setDias(event.target.value); setConfirmarDiasIncongruentes(false); }} disabled={pendiente || estaGuardando} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100" />
              </div>
              {analisisProrroga.fechas.length > 0 && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Nueva fecha límite estimada: <strong>{formatoRangoFechas(analisisProrroga.fechas.map(({ fechaFin }) => fechaFin))}</strong>. Calculada desde el último vencimiento de cada ítem.</p>}
              {analisisProrroga.requiereConfirmacion && (
                <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-950" role="alert">
                  <p>Con esta cantidad, la nueva fecha límite quedaría vencida al momento de enviar la solicitud.</p>
                  <p>Recomendación mínima: <strong>{analisisProrroga.diasMinimos} días hábiles</strong> · fecha estimada {formatoRangoFechas(fechasMinimasPropuestas)}.</p>
                  <label className="flex items-start gap-2 font-semibold">
                    <input type="checkbox" checked={confirmarDiasIncongruentes} onChange={(event) => setConfirmarDiasIncongruentes(event.target.checked)} className="mt-0.5" />
                    Solicitar de todas formas {dias || 0} días hábiles desde el vencimiento vigente.
                  </label>
                </div>
              )}
              <div>
                <label htmlFor="motivo-prorroga" className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600">Comentario obligatorio</label>
                <textarea id="motivo-prorroga" rows={4} required minLength={10} value={motivo} onChange={(event) => setMotivo(event.target.value)} disabled={pendiente || estaGuardando} placeholder="Ej.: El cliente solicitó más tiempo para aprobar la compra." className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100" />
                <p className="mt-1 text-[10px] text-slate-500">Escribe al menos 10 caracteres para explicar la prórroga.</p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={cerrar} disabled={estaGuardando} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={estaGuardando || pendiente || (modo === 'revision' ? !comentario.trim() || !puedeMantenerRevision : !motivoProrrogaValido || Number(dias) > 90 || (analisisProrroga.requiereConfirmacion && !confirmarDiasIncongruentes))} className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50 ${modo === 'revision' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'}`}>
            {estaGuardando ? 'Guardando...' : modo === 'revision' ? 'Mantener en revisión' : 'Solicitar aprobación'}
          </button>
        </div>
      </form>
    </div>
  );
};
