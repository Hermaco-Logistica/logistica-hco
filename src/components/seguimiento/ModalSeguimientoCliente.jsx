import React, { useEffect, useState } from 'react';
import { Modal, ModalAreaTexto, ModalBoton, ModalCallout, ModalCuerpo, ModalEncabezado, ModalNumero, ModalPestanas, ModalPie, ModalSeccion } from '../Modal';
import { CalendarClock, CalendarDays, CalendarPlus, TriangleAlert } from 'lucide-react';
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
  modoInicial = 'revision',
  modoControlado,
  onCambiarModo,
  diasValidez = 5,
  fechasLimiteRevision = [],
  fechasLimiteProrroga = [],
  cantidadItems = 1,
  cantidadItemsProrroga = null,
  revisionesUsadas = 0,
  maxRevisiones = 2,
  permiteMantenerRevision,
  mostrarSolicitudProrroga = false,
  pendiente = false,
  guardando = false,
  guardandoProrroga = false
}) => {
  const puedeMantenerRevision = permiteMantenerRevision ?? revisionesUsadas < maxRevisiones;
  const [modoInterno, setModoInterno] = useState(modoInicial);
  const modo = modoControlado ?? modoInterno;
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

  useEffect(() => {
    if (!isOpen) return;
    console.info('[SeguimientoPedidoManual] modal actualizado', {
      modoVisible: modo,
      modoInicial,
      modoControlado,
      cantidadRevision: cantidadItems,
      cantidadProrroga: cantidadItemsProrroga,
      puedeMantenerRevision,
      mostrarSolicitudProrroga,
      pendiente
    });
  }, [isOpen, modo, modoInicial, modoControlado, cantidadItems, cantidadItemsProrroga, puedeMantenerRevision, mostrarSolicitudProrroga, pendiente]);

  if (!isOpen) return null;

  const estaGuardando = guardando || guardandoProrroga;
  const cerrar = () => {
    if (estaGuardando) return;
    onClose();
  };

  const cambiarModo = (siguienteModo) => {
    if (modoControlado === undefined) setModoInterno(siguienteModo);
    onCambiarModo?.(siguienteModo);
  };

  const confirmar = (event) => {
    event.preventDefault();
    console.info('[SeguimientoPedidoManual] submit del modal', {
      modoEnviado: modo,
      cantidadObjetivo: modo === 'revision' ? cantidadItems : cantidadItemsProrroga ?? cantidadItems,
      enviarA: modo === 'revision' ? 'onConfirmar' : 'onSolicitarProrroga'
    });
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
    console.info('[SeguimientoPedidoManual] selección de pestaña prórroga', {
      modoAntes: modo,
      cantidadObjetivo: cantidadItemsProrroga ?? 'no informada'
    });
    cambiarModo('prorroga');
    onPrepararProrroga?.();
  };

  const tono = modo === 'revision' ? 'aviso' : 'info';
  const titulo = modo === 'revision' ? 'Mantener en revisión' : 'Solicitar prórroga formal';
  const deshabilitarEnvio = estaGuardando || pendiente || (modo === 'revision'
    ? !comentario.trim() || !puedeMantenerRevision
    : !motivoProrrogaValido || Number(dias) > 90 || (analisisProrroga.requiereConfirmacion && !confirmarDiasIncongruentes));

  return (
    <Modal etiqueta={titulo} como="form" onSubmit={confirmar} onCerrar={cerrar} bloqueado={estaGuardando}>
      <ModalEncabezado
        titulo={titulo}
        subtitulo={modo === 'revision'
          ? `Se mantendrá la revisión por ${diasValidez} días hábiles adicionales.`
          : 'Compras debe aprobar los días adicionales solicitados.'}
        referencia={`${cantidadItems} ${cantidadItems === 1 ? 'ítem afectado' : 'ítems afectados'} · Revisión ${Math.min(revisionesUsadas + (modo === 'revision' ? 1 : 0), maxRevisiones)} de ${maxRevisiones}`}
        icono={modo === 'revision' ? CalendarClock : CalendarPlus}
        tono={tono}
        onCerrar={cerrar}
        cerrarDeshabilitado={estaGuardando}
      />

      <ModalCuerpo>
        {mostrarSolicitudProrroga && !pendiente && (
          <ModalPestanas
            etiqueta="Tipo de seguimiento"
            tono={tono}
            activa={modo}
            opciones={[
              { clave: 'revision', texto: 'Mantener revisión' },
              { clave: 'prorroga', texto: 'Solicitar prórroga', cantidad: cantidadItemsProrroga === null ? undefined : cantidadItemsProrroga }
            ]}
            puedeElegir={(clave) => (clave === 'revision' ? puedeMantenerRevision && !estaGuardando : !estaGuardando && cantidadItemsProrroga !== 0)}
            onElegir={(clave) => (clave === 'revision' ? cambiarModo('revision') : seleccionarProrroga())}
          />
        )}

        {pendiente && (
          <ModalCallout tono="aviso" icono={TriangleAlert} role="alert">
            Ya existe una solicitud de prórroga pendiente de respuesta de Compras.
          </ModalCallout>
        )}

        {modo === 'revision' ? (
          <>
            {fechasRevisionPropuestas.length > 0 && (
              <ModalCallout tono="info" icono={CalendarDays}>
                Nueva fecha límite estimada: <strong className="font-semibold">{formatoRangoFechas(fechasRevisionPropuestas)}</strong>. Se cuenta desde el vencimiento vigente.
              </ModalCallout>
            )}
            <ModalSeccion etiqueta="Comentario del seguimiento" htmlFor="comentario-seguimiento-cliente">
              <ModalAreaTexto id="comentario-seguimiento-cliente" tono={tono} value={comentario} onChange={(event) => setComentario(event.target.value)} autoFocus required placeholder="Ej.: Cliente solicitó tiempo para validar la propuesta internamente." />
            </ModalSeccion>
          </>
        ) : (
          <>
            <ModalSeccion etiqueta="Días adicionales solicitados" htmlFor="dias-prorroga">
              <ModalNumero id="dias-prorroga" tono={tono} valor={dias} sufijo="días" disabled={pendiente || estaGuardando} onCambiar={(valor) => { setDias(valor); setConfirmarDiasIncongruentes(false); }} />
            </ModalSeccion>
            {analisisProrroga.fechas.length > 0 && (
              <ModalCallout tono="info" icono={CalendarDays}>
                Nueva fecha límite estimada: <strong className="font-semibold">{formatoRangoFechas(analisisProrroga.fechas.map(({ fechaFin }) => fechaFin))}</strong>. Calculada desde el último vencimiento de cada ítem.
              </ModalCallout>
            )}
            {analisisProrroga.requiereConfirmacion && (
              <ModalCallout tono="aviso" icono={TriangleAlert} role="alert">
                <p>Con esta cantidad, la nueva fecha límite quedaría vencida al momento de enviar la solicitud.</p>
                <p className="mt-1">Recomendación mínima: <strong className="font-semibold">{analisisProrroga.diasMinimos} días hábiles</strong> · fecha estimada {formatoRangoFechas(fechasMinimasPropuestas)}.</p>
                <label className="mt-2 flex items-start gap-2 font-medium">
                  <input type="checkbox" checked={confirmarDiasIncongruentes} onChange={(event) => setConfirmarDiasIncongruentes(event.target.checked)} className="mt-0.5" />
                  Solicitar de todas formas {dias || 0} días hábiles desde el vencimiento vigente.
                </label>
              </ModalCallout>
            )}
            <ModalSeccion etiqueta="Comentario obligatorio" htmlFor="motivo-prorroga">
              <ModalAreaTexto id="motivo-prorroga" tono={tono} required minLength={10} value={motivo} onChange={(event) => setMotivo(event.target.value)} disabled={pendiente || estaGuardando} placeholder="Ej.: El cliente solicitó más tiempo para aprobar la compra." ayuda="Escribe al menos 10 caracteres para explicar la prórroga." />
            </ModalSeccion>
          </>
        )}
      </ModalCuerpo>

      <ModalPie>
        <ModalBoton onClick={cerrar} disabled={estaGuardando}>Cancelar</ModalBoton>
        <ModalBoton type="submit" variante="primario" tono={tono} disabled={deshabilitarEnvio}>
          {estaGuardando ? 'Guardando...' : modo === 'revision' ? 'Mantener en revisión' : 'Solicitar aprobación'}
        </ModalBoton>
      </ModalPie>
    </Modal>
  );
};
