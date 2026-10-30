import React, { useState } from 'react';
import { ArrowLeft, CalendarClock, CalendarPlus, Check, X } from 'lucide-react';
import { analizarDiasSolicitadosProrroga } from '../../utils/prorrogasCliente';
import { sumarDiasHabiles } from '../../utils/diasHabiles';

const formatoFecha = (fecha) => new Intl.DateTimeFormat('es-SV', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/El_Salvador'
}).format(fecha);

const formatoRangoFechas = (fechas = []) => {
  const unicas = [...new Set(fechas.filter(Boolean).sort((a, b) => a - b).map(formatoFecha))];
  if (!unicas.length) return 'Fecha por calcular';
  return unicas.length === 1 ? unicas[0] : `${unicas[0]} – ${unicas[unicas.length - 1]}`;
};

const PASOS = {
  revision: { titulo: 'Mantener en revisión', corto: 'Revisión', icono: CalendarClock, claseIcono: 'bg-amber-50 text-amber-700', claseTexto: 'text-amber-700' },
  prorroga: { titulo: 'Solicitar prórroga formal', corto: 'Prórroga', icono: CalendarPlus, claseIcono: 'bg-sky-50 text-sky-700', claseTexto: 'text-sky-700' }
};

const ListaItems = ({ items }) => (
  <ul className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    {items.map(({ indice, etiqueta, nota }) => (
      <li key={indice} className="text-xs leading-snug">
        <span className="block font-semibold text-slate-700">{etiqueta}</span>
        {nota && <span className="block text-[10px] text-slate-500">{nota}</span>}
      </li>
    ))}
  </ul>
);

/** Modal por pasos: primero los ítems que pueden mantenerse en revisión, luego los que solo admiten prórroga. */
export const ModalPlanSeguimientoCliente = ({
  isOpen,
  onClose,
  onConfirmar,
  plan,
  diasValidez = 5,
  guardando = false
}) => {
  const pasos = [plan.revision.length > 0 && 'revision', plan.prorroga.length > 0 && 'prorroga'].filter(Boolean);
  const [paso, setPaso] = useState(pasos[0]);
  const [comentario, setComentario] = useState('');
  const [dias, setDias] = useState(String(diasValidez));
  const [motivo, setMotivo] = useState('');
  const [confirmarDiasIncongruentes, setConfirmarDiasIncongruentes] = useState(false);

  const analisisProrroga = analizarDiasSolicitadosProrroga({
    fechasLimite: plan.prorroga.map(({ fechaLimite }) => fechaLimite).filter(Boolean),
    diasSolicitados: dias,
    fechaReferencia: new Date()
  });

  if (!isOpen || !paso) return null;

  const hayRevision = pasos.includes('revision');
  const hayProrroga = pasos.includes('prorroga');
  const posicion = pasos.indexOf(paso);
  const esUltimo = posicion === pasos.length - 1;
  const { titulo, icono: Icono, claseIcono } = PASOS[paso];

  const revisionValida = comentario.trim().length > 0;
  const diasNumero = Number(dias);
  const prorrogaValida = Number.isInteger(diasNumero) && diasNumero > 0 && diasNumero <= 90
    && motivo.trim().length >= 10
    && (!analisisProrroga.requiereConfirmacion || confirmarDiasIncongruentes);
  const puedeAvanzar = paso === 'revision'
    ? revisionValida
    : prorrogaValida && (!hayRevision || revisionValida);

  const cerrar = () => { if (!guardando) onClose(); };

  const enviar = (event) => {
    event.preventDefault();
    if (!puedeAvanzar || guardando) return;
    if (!esUltimo) {
      setPaso(pasos[posicion + 1]);
      return;
    }
    onConfirmar({
      comentario: comentario.trim(),
      prorroga: hayProrroga ? { diasSolicitados: diasNumero, motivo: motivo.trim() } : null
    });
  };

  const etiquetaBoton = guardando ? 'Guardando...'
    : !esUltimo ? `Siguiente: ${PASOS[pasos[posicion + 1]].corto.toLowerCase()}`
      : pasos.length > 1 ? 'Confirmar y enviar'
        : paso === 'revision' ? 'Mantener en revisión' : 'Solicitar aprobación';
  const itemsPaso = paso === 'revision' ? plan.revision : plan.prorroga;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <form onSubmit={enviar} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2 ${claseIcono}`}><Icono size={20} /></div>
            <div>
              <h2 className="text-base font-black text-slate-900">{titulo}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {paso === 'revision'
                  ? `Se mantendrá la revisión por ${diasValidez} días hábiles adicionales.`
                  : 'Compras debe aprobar los días adicionales solicitados.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={cerrar} disabled={guardando} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {pasos.length > 1 && (
            <ol className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1" aria-label="Pasos del seguimiento">
              {pasos.map((clave, i) => {
                const activo = clave === paso;
                const completado = i < posicion;
                const cantidad = clave === 'revision' ? plan.revision.length : plan.prorroga.length;
                return (
                  <li key={clave}>
                    <button
                      type="button"
                      disabled={!completado || guardando}
                      onClick={() => setPaso(clave)}
                      aria-current={activo ? 'step' : undefined}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide ${activo ? `bg-white shadow-sm ${PASOS[clave].claseTexto}` : 'text-slate-500'} disabled:cursor-default`}
                    >
                      {completado ? <Check size={12} className="text-emerald-600" /> : <span>{i + 1}</span>}
                      {PASOS[clave].corto} ({cantidad})
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-600">
              {itemsPaso.length} {itemsPaso.length === 1 ? 'ítem' : 'ítems'} {paso === 'revision' ? 'para revisión' : 'para prórroga'}
            </p>
            <ListaItems items={itemsPaso} />
            {paso === 'prorroga' && hayRevision && (
              <p className="text-[10px] text-slate-500">La revisión de {plan.revision.length} {plan.revision.length === 1 ? 'ítem' : 'ítems'} se registra al confirmar este paso.</p>
            )}
          </div>

          {paso === 'revision' ? (
            <div className="space-y-2">
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Nueva fecha límite estimada: <strong>{formatoRangoFechas(plan.revision.map(({ fechaLimite }) => fechaLimite && sumarDiasHabiles(fechaLimite, diasValidez)))}</strong>. Se cuenta desde el vencimiento vigente.
              </p>
              <label htmlFor="comentario-seguimiento-cliente" className="text-xs font-black uppercase tracking-wider text-slate-600">Comentario del seguimiento</label>
              <textarea id="comentario-seguimiento-cliente" value={comentario} onChange={(event) => setComentario(event.target.value)} rows={3} autoFocus required placeholder="Ej.: Cliente solicitó tiempo para validar la propuesta internamente." className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="dias-prorroga" className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600">Días adicionales solicitados</label>
                <input id="dias-prorroga" type="number" min="1" max="90" step="1" value={dias} onChange={(event) => { setDias(event.target.value); setConfirmarDiasIncongruentes(false); }} disabled={guardando} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100" />
              </div>
              {analisisProrroga.fechas.length > 0 && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Nueva fecha límite estimada: <strong>{formatoRangoFechas(analisisProrroga.fechas.map(({ fechaFin }) => fechaFin))}</strong>. Calculada desde el último vencimiento de cada ítem.</p>}
              {analisisProrroga.requiereConfirmacion && (
                <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-950" role="alert">
                  <p>Con esta cantidad, la nueva fecha límite quedaría vencida al momento de enviar la solicitud.</p>
                  <p>Recomendación mínima: <strong>{analisisProrroga.diasMinimos} días hábiles</strong> · fecha estimada {formatoRangoFechas(analisisProrroga.fechas.map(({ fechaInicio }) => sumarDiasHabiles(fechaInicio, analisisProrroga.diasMinimos)))}.</p>
                  <label className="flex items-start gap-2 font-semibold">
                    <input type="checkbox" checked={confirmarDiasIncongruentes} onChange={(event) => setConfirmarDiasIncongruentes(event.target.checked)} className="mt-0.5" />
                    Solicitar de todas formas {dias || 0} días hábiles desde el vencimiento vigente.
                  </label>
                </div>
              )}
              <div>
                <label htmlFor="motivo-prorroga" className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600">Comentario obligatorio</label>
                <textarea id="motivo-prorroga" rows={3} required minLength={10} autoFocus value={motivo} onChange={(event) => setMotivo(event.target.value)} disabled={guardando} placeholder="Ej.: El cliente solicitó más tiempo para aprobar la compra." className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100" />
                <p className="mt-1 text-[10px] text-slate-500">Escribe al menos 10 caracteres para explicar la prórroga.</p>
              </div>
            </div>
          )}

          {plan.excluidos.length > 0 && (
            <details className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-slate-500">No incluidos ({plan.excluidos.length})</summary>
              <ul className="mt-1.5 space-y-1">
                {plan.excluidos.map(({ indice, etiqueta, motivo: motivoExclusion }) => (
                  <li key={indice}><span className="font-semibold text-slate-700">{etiqueta}</span> — {motivoExclusion}</li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
          {posicion > 0 ? (
            <button type="button" onClick={() => setPaso(pasos[posicion - 1])} disabled={guardando} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              <ArrowLeft size={13} /> Atrás
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={cerrar} disabled={guardando} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={guardando || !puedeAvanzar} className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50 ${paso === 'revision' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'}`}>
              {etiquetaBoton}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
