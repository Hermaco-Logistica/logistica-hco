import React from 'react';

const fechaCorta = (fecha) => {
  if (!fecha) return '';
  const valor = typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '';
  return new Intl.DateTimeFormat('es-SV', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/El_Salvador'
  }).format(valor);
};

const eventoAfectaItem = (evento, indice) => evento.tipo === 'revision'
  ? Number(evento.indiceItem) === indice
  : (evento.prorroga?.indicesItems || []).some((item) => Number(item) === indice);

const etiquetaEvento = (evento) => {
  if (evento.tipo === 'revision') {
    const numero = evento.revision?.numero || 1;
    const vence = fechaCorta(evento.revision?.fechaVencimientoRevision);
    return `Mantener en revisión · revisión ${numero}${vence ? ` · hasta ${vence}` : ''}`;
  }

  const prorroga = evento.prorroga || {};
  const estado = prorroga.estado === 'pendiente'
    ? 'Prórroga pendiente'
    : prorroga.estado === 'aprobada'
      ? 'Prórroga aprobada'
      : prorroga.estado === 'rechazada' ? 'Prórroga rechazada' : 'Prórroga';
  return `${estado} · ${prorroga.diasSolicitados || 0} días solicitados`;
};

/** Lista cada ítem y los registros de revisión o prórroga que lo afectaron. */
export const ProrrogaItemsAfectados = ({ solicitud, record }) => {
  const productos = Array.isArray(solicitud.productos) ? solicitud.productos : [];
  const eventos = record.eventos || [record];

  return (
    <div className="grid gap-2">
      {productos.map((item, indice) => {
        const eventosItem = eventos.filter((evento) => eventoAfectaItem(evento, indice));
        if (eventosItem.length === 0) return null;
        return (
          <article key={`${solicitud.id}-item-${indice}`} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">Ítem {indice + 1} · {item.descripcion || item.producto || 'Producto sin descripción'}</p>
                {item.marca && <p className="mt-0.5 text-[10px] font-medium text-slate-500">Marca: {item.marca}</p>}
              </div>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-800">
                {eventosItem.length} registro{eventosItem.length === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="mt-2 grid gap-1 border-t border-slate-100 pt-2">
              {eventosItem.map((evento, indiceEvento) => (
                <li key={`${evento.clave || indiceEvento}-${indiceEvento}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-slate-600">
                  <span>{etiquetaEvento(evento)}</span>
                  <span className="shrink-0 font-medium text-slate-500">{fechaCorta(evento.fechaEvento)}</span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
};
