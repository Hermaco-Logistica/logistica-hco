import React, { useState } from 'react';
import { Modal, ModalAreaTexto, ModalBoton, ModalCallout, ModalCuerpo, ModalEncabezado, ModalLista, ModalNumero, ModalPestanas, ModalPie, ModalSeccion, ModalTarjetaItem } from '../Modal';
import { ArrowLeft, CalendarClock, CalendarDays, CalendarPlus, TriangleAlert } from 'lucide-react';
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
  revision: { titulo: 'Mantener en revisión', corto: 'Revisión', icono: CalendarClock, tono: 'aviso' },
  prorroga: { titulo: 'Solicitar prórroga formal', corto: 'Prórroga', icono: CalendarPlus, tono: 'info' }
};

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
  const { titulo, icono, tono } = PASOS[paso];

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
    <Modal etiqueta={titulo} como="form" onSubmit={enviar} onCerrar={cerrar} bloqueado={guardando}>
      <ModalEncabezado
        titulo={titulo}
        subtitulo={paso === 'revision'
          ? `Se mantendrá la revisión por ${diasValidez} días hábiles adicionales.`
          : 'Compras debe aprobar los días adicionales solicitados.'}
        icono={icono}
        tono={tono}
        onCerrar={cerrar}
        cerrarDeshabilitado={guardando}
      />

      <ModalCuerpo>
        {pasos.length > 1 && (
          <ModalPestanas
            etiqueta="Pasos del seguimiento"
            tono={tono}
            activa={paso}
            opciones={pasos.map((clave, i) => ({
              clave,
              texto: PASOS[clave].corto,
              cantidad: clave === 'revision' ? plan.revision.length : plan.prorroga.length,
              completada: i < posicion
            }))}
            puedeElegir={(clave) => !guardando && pasos.indexOf(clave) < posicion}
            onElegir={setPaso}
          />
        )}

        <ModalSeccion etiqueta={`${itemsPaso.length} ${itemsPaso.length === 1 ? 'ítem' : 'ítems'} ${paso === 'revision' ? 'para revisión' : 'para prórroga'}`}>
          <ModalLista>
            {itemsPaso.map(({ indice, etiqueta, nota }) => (
              <ModalTarjetaItem key={indice} titulo={etiqueta} subtitulo={nota} />
            ))}
          </ModalLista>
          {paso === 'prorroga' && hayRevision && (
            <p className="mt-2 text-[12.5px] text-neutral-500">La revisión de {plan.revision.length} {plan.revision.length === 1 ? 'ítem' : 'ítems'} se registra al confirmar este paso.</p>
          )}
        </ModalSeccion>

        {paso === 'revision' ? (
          <>
            <ModalCallout tono="info" icono={CalendarDays}>
              Nueva fecha límite estimada: <strong className="font-semibold">{formatoRangoFechas(plan.revision.map(({ fechaLimite }) => fechaLimite && sumarDiasHabiles(fechaLimite, diasValidez)))}</strong>. Se cuenta desde el vencimiento vigente.
            </ModalCallout>
            <ModalSeccion etiqueta="Comentario del seguimiento" htmlFor="comentario-seguimiento-cliente">
              <ModalAreaTexto id="comentario-seguimiento-cliente" tono={tono} value={comentario} onChange={(event) => setComentario(event.target.value)} autoFocus required placeholder="Ej.: Cliente solicitó tiempo para validar la propuesta internamente." />
            </ModalSeccion>
          </>
        ) : (
          <>
            <ModalSeccion etiqueta="Días adicionales solicitados" htmlFor="dias-prorroga">
              <ModalNumero id="dias-prorroga" tono={tono} valor={dias} sufijo="días" disabled={guardando} onCambiar={(valor) => { setDias(valor); setConfirmarDiasIncongruentes(false); }} />
            </ModalSeccion>
            {analisisProrroga.fechas.length > 0 && (
              <ModalCallout tono="info" icono={CalendarDays}>
                Nueva fecha límite estimada: <strong className="font-semibold">{formatoRangoFechas(analisisProrroga.fechas.map(({ fechaFin }) => fechaFin))}</strong>. Calculada desde el último vencimiento de cada ítem.
              </ModalCallout>
            )}
            {analisisProrroga.requiereConfirmacion && (
              <ModalCallout tono="aviso" icono={TriangleAlert} role="alert">
                <p>Con esta cantidad, la nueva fecha límite quedaría vencida al momento de enviar la solicitud.</p>
                <p className="mt-1">Recomendación mínima: <strong className="font-semibold">{analisisProrroga.diasMinimos} días hábiles</strong> · fecha estimada {formatoRangoFechas(analisisProrroga.fechas.map(({ fechaInicio }) => sumarDiasHabiles(fechaInicio, analisisProrroga.diasMinimos)))}.</p>
                <label className="mt-2 flex items-start gap-2 font-medium">
                  <input type="checkbox" checked={confirmarDiasIncongruentes} onChange={(event) => setConfirmarDiasIncongruentes(event.target.checked)} className="mt-0.5" />
                  Solicitar de todas formas {dias || 0} días hábiles desde el vencimiento vigente.
                </label>
              </ModalCallout>
            )}
            <ModalSeccion etiqueta="Comentario obligatorio" htmlFor="motivo-prorroga">
              <ModalAreaTexto id="motivo-prorroga" tono={tono} required minLength={10} autoFocus value={motivo} onChange={(event) => setMotivo(event.target.value)} disabled={guardando} placeholder="Ej.: El cliente solicitó más tiempo para aprobar la compra." ayuda="Escribe al menos 10 caracteres para explicar la prórroga." />
            </ModalSeccion>
          </>
        )}

        {plan.excluidos.length > 0 && (
          <details className="rounded-[14px] bg-neutral-100 p-3.5 text-[13.5px] text-neutral-600">
            <summary className="cursor-pointer text-[13px] font-medium text-neutral-500">No incluidos ({plan.excluidos.length})</summary>
            <ul className="mt-2 space-y-1">
              {plan.excluidos.map(({ indice, etiqueta, motivo: motivoExclusion }) => (
                <li key={indice}><span className="font-semibold text-neutral-800">{etiqueta}</span> — {motivoExclusion}</li>
              ))}
            </ul>
          </details>
        )}
      </ModalCuerpo>

      <ModalPie className="justify-between">
        {posicion > 0 ? (
          <ModalBoton onClick={() => setPaso(pasos[posicion - 1])} disabled={guardando} icono={ArrowLeft}>Atrás</ModalBoton>
        ) : <span />}
        <div className="flex gap-2.5">
          <ModalBoton onClick={cerrar} disabled={guardando}>Cancelar</ModalBoton>
          <ModalBoton type="submit" variante="primario" tono={tono} disabled={guardando || !puedeAvanzar}>
            {etiquetaBoton}
          </ModalBoton>
        </div>
      </ModalPie>
    </Modal>
  );
};
