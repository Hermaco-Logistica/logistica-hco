import React from 'react';
import { X } from 'lucide-react';
import { convertirFechaSeguimiento } from '../../utils/diasHabiles';
import { obtenerEtiquetaItemSeguimiento } from '../../utils/seguimientoCliente';

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Comentarios del vendedor">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900">Comentarios del vendedor</h2>
            <p className="mt-1 truncate text-xs text-slate-500">
              {indiceEnfocado === null ? `Todos los ítems afectados (${indices.length})` : etiqueta(indiceEnfocado)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {comentarios.length === 0 && (
            <p className="text-xs italic text-slate-500">El vendedor no dejó comentarios para este ítem.</p>
          )}
          {comentarios.map(({ titulo, texto, autor, fecha, indices: afectados }) => (
            <article key={`${titulo}-${texto}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">{titulo}</h3>
                <span className="text-[10px] text-slate-400">{[autor, formatoFecha(fecha)].filter(Boolean).join(' · ')}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-snug text-slate-800">{texto}</p>
              {afectados.length > 1 && (
                <p className="mt-2 border-t border-slate-200 pt-1.5 text-[10px] text-slate-500">
                  Aplica a {afectados.length} ítems: {afectados.map((indice) => `Ítem ${indice + 1}`).join(', ')}
                </p>
              )}
            </article>
          ))}
        </div>

        {indices.length > 1 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={() => onCambiarEnfoque(indiceEnfocado === null ? indices[0] : null)}
              className="text-xs font-bold text-sky-700 hover:underline"
            >
              {indiceEnfocado === null ? 'Ver un ítem a la vez' : 'Ver comentarios de todos los ítems'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
