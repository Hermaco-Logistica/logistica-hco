import React from 'react';
import { MessageSquareText } from 'lucide-react';
import { convertirFechaSeguimiento } from '../../utils/diasHabiles';
import { obtenerEtiquetaItemSeguimiento } from '../../utils/seguimientoCliente';
import { Modal, ModalBoton, ModalCuerpo, ModalEncabezado, ModalPie } from '../Modal';

const formatoFecha = (fecha) => fecha
  ? new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/El_Salvador' }).format(fecha)
  : '';

const obtenerRevisiones = (seguimiento) => {
  if (Array.isArray(seguimiento?.historial) && seguimiento.historial.length) return seguimiento.historial;
  return seguimiento?.fechaRevision ? [seguimiento] : [];
};

/** Reúne los comentarios del vendedor y agrupa los ítems que comparten exactamente el mismo texto. */
const reunirComentarios = (solicitud, prorroga, indices) => {
  const grupos = new Map();
  const agregar = (clave, entrada, indice) => {
    const existente = grupos.get(clave);
    if (existente) existente.indices.push(indice);
    else grupos.set(clave, { ...entrada, indices: [indice] });
  };

  indices.forEach((indice) => {
    if (String(prorroga.motivo || '').trim()) {
      agregar('prorroga', {
        titulo: 'Motivo de la prórroga',
        texto: prorroga.motivo.trim(),
        autor: prorroga.solicitadoPor || prorroga.vendedorEmail || '',
        fecha: convertirFechaSeguimiento(prorroga.fechaSolicitud)
      }, indice);
    }
    obtenerRevisiones(solicitud.productos?.[indice]?.seguimientoCliente).forEach((revision, posicion) => {
      const numero = revision.numero || posicion + 1;
      const texto = String(revision.comentario || '').trim();
      if (!texto) return;
      agregar(`revision-${numero}-${texto}`, {
        titulo: `Revisión ${numero}`,
        texto,
        autor: revision.registradoPor || '',
        fecha: convertirFechaSeguimiento(revision.fechaRevision)
      }, indice);
    });
  });
  return [...grupos.values()];
};

/** Comentarios del vendedor sobre un ítem (indiceEnfocado) o sobre todos los ítems de la prórroga (null). */
export const ModalComentariosProrroga = ({ solicitud, prorroga, indiceEnfocado, onCambiarEnfoque, onClose }) => {
  if (indiceEnfocado === undefined || !prorroga) return null;

  const indices = Array.isArray(prorroga.indicesItems) ? prorroga.indicesItems : [];
  const etiqueta = (indice) => obtenerEtiquetaItemSeguimiento(solicitud.productos?.[indice], indice);
  const comentarios = reunirComentarios(solicitud, prorroga, indices)
    .filter(({ indices: afectados }) => indiceEnfocado === null || afectados.includes(indiceEnfocado));

  return (
    <Modal etiqueta="Comentarios del vendedor" onCerrar={onClose}>
      <ModalEncabezado
        titulo="Comentarios del vendedor"
        subtitulo={indiceEnfocado === null ? `Todos los ítems afectados (${indices.length})` : etiqueta(indiceEnfocado)}
        icono={MessageSquareText}
        tono="info"
        onCerrar={onClose}
      />
      <ModalCuerpo className="space-y-2">
        {comentarios.length === 0 && (
          <p className="text-[13.5px] text-neutral-500">El vendedor no dejó comentarios para este ítem.</p>
        )}
        {comentarios.map(({ titulo, texto, autor, fecha, indices: afectados }) => (
          <article key={`${titulo}-${texto}`} className="rounded-[14px] bg-neutral-100 p-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="text-[13px] font-medium text-neutral-500">{titulo}</h3>
              <span className="text-xs text-neutral-400">{[autor, formatoFecha(fecha)].filter(Boolean).join(' · ')}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-[1.45] text-neutral-900">{texto}</p>
            {afectados.length > 1 && (
              <p className="mt-2 text-[12.5px] text-neutral-500">
                Aplica a {afectados.length} ítems: {afectados.map((indice) => `Ítem ${indice + 1}`).join(', ')}
              </p>
            )}
          </article>
        ))}
      </ModalCuerpo>

      {indices.length > 1 && (
        <ModalPie className="justify-start">
          <ModalBoton onClick={() => onCambiarEnfoque(indiceEnfocado === null ? indices[0] : null)}>
            {indiceEnfocado === null ? 'Ver un ítem a la vez' : 'Ver comentarios de todos los ítems'}
          </ModalBoton>
        </ModalPie>
      )}
    </Modal>
  );
};
