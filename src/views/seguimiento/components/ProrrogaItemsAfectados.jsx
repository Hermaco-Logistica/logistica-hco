import React from 'react';
import { StatusChip } from '../../../components/detalle/StatusChip';
import { esItemCerrado } from '../../../utils/estadoItem';

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
    <div className="space-y-2 py-1">
      {productos.map((item, indice) => {
        const eventosItem = eventos.filter((evento) => eventoAfectaItem(evento, indice));
        if (eventosItem.length === 0) return null;
        return (
          <article
            key={`${solicitud.id}-item-${indice}`}
            className="rounded-[6px] border border-[var(--detalle-border)] bg-[var(--detalle-surface)] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--detalle-text)]">
                  Ítem {indice + 1} · {item.descripcion || item.producto || 'Producto sin descripción'}
                </p>
                {item.marca && (
                  <p className="mt-0.5 text-[11px] text-[var(--detalle-text-subtle)]">
                    Marca: {item.marca}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip
                  status={esItemCerrado(item) ? 'resuelta' : 'info'}
                  label={esItemCerrado(item) ? `Cerrado · ${item.estadoItem || item.estado || 'resuelto'}` : 'Ítem activo'}
                />
                <span className="text-[11px] font-medium text-[var(--detalle-text-muted)]">
                  {eventosItem.length} registro{eventosItem.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <ul className="mt-2 space-y-1 border-t border-[var(--detalle-border)] pt-2">
              {eventosItem.map((evento, indiceEvento) => (
                <li
                  key={`${evento.clave || indiceEvento}-${indiceEvento}`}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-[var(--detalle-text-muted)]"
                >
                  <span>{etiquetaEvento(evento)}</span>
                  <span className="shrink-0 font-medium text-[var(--detalle-text-subtle)] tabular-nums">
                    {fechaCorta(evento.fechaEvento)}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
};
