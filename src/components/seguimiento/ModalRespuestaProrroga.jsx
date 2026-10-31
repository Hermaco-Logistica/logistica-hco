import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, MessageSquareText, XCircle } from 'lucide-react';
import { Modal, ModalAreaTexto, ModalBoton, ModalCallout, ModalCuerpo, ModalEncabezado, ModalPie, ModalSeccion } from '../Modal';
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

  const titulo = esAprobacion ? 'Aprobar prórroga' : 'Rechazar prórroga';
  const tono = esAprobacion ? 'exito' : 'peligro';

  return (
    <Modal etiqueta={titulo} como="form" onSubmit={confirmar} onCerrar={onClose} bloqueado={guardando}>
      <ModalEncabezado
        titulo={titulo}
        subtitulo={`${solicitud.diasSolicitados} días solicitados`}
        referencia={solicitud.correlativo || 'Solicitud'}
        icono={esAprobacion ? CheckCircle2 : XCircle}
        tono={tono}
        onCerrar={onClose}
        cerrarDeshabilitado={guardando}
      />
      <ModalCuerpo>
        <ModalSeccion etiqueta="Motivo del vendedor">
          <ModalCallout tono="neutral" icono={MessageSquareText}>{solicitud.motivo || 'Sin motivo registrado.'}</ModalCallout>
        </ModalSeccion>
        <ModalCallout tono="info" icono={CalendarDays}>
          <p>Última fecha límite base: <strong className="font-semibold">{resumenFechas(fechasPropuestas, 'fechaInicio')}</strong></p>
          {esAprobacion && <p className="mt-1">Nueva fecha límite si se aprueba: <strong className="font-semibold">{resumenFechas(fechasPropuestas, 'fechaFin')}</strong></p>}
          {fechasPropuestas.length > 1 && <p className="mt-1 text-[12.5px] opacity-80">Las fechas pueden variar entre ítems.</p>}
        </ModalCallout>
        <ModalSeccion etiqueta={esAprobacion ? 'Comentario opcional' : 'Motivo del rechazo'} htmlFor="respuesta-prorroga">
          <ModalAreaTexto id="respuesta-prorroga" tono={tono} value={comentario} onChange={(event) => setComentario(event.target.value)} required={!esAprobacion} disabled={guardando} />
        </ModalSeccion>
      </ModalCuerpo>
      <ModalPie>
        <ModalBoton onClick={onClose} disabled={guardando}>Cancelar</ModalBoton>
        <ModalBoton type="submit" variante={esAprobacion ? 'primario' : 'peligro'} tono={tono} disabled={guardando || (!esAprobacion && !comentario.trim())}>
          {guardando ? 'Guardando...' : esAprobacion ? 'Aprobar' : 'Rechazar'}
        </ModalBoton>
      </ModalPie>
    </Modal>
  );
};
