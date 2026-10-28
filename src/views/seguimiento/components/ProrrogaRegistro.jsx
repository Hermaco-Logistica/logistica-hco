import React, { useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronUp, Clock3, History, X } from 'lucide-react';
import { completarAnclasProrroga, obtenerFechaVencimientoProrroga, obtenerFechasVencimientoProrroga } from '../../../utils/prorrogasCliente';
import { ProrrogaItemsAfectados } from './ProrrogaItemsAfectados';

const obtenerFecha = (fecha) => {
  if (!fecha) return null;
  if (typeof fecha.toDate === 'function') return fecha.toDate();
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  return Number.isNaN(valor.getTime()) ? null : valor;
};

const fechaTexto = (fecha) => {
  const valor = obtenerFecha(fecha);
  return valor
    ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: 'America/El_Salvador' }).format(valor)
    : 'Sin fecha';
};

const fechasTexto = (fechas = []) => {
  const ordenadas = fechas.filter(Boolean).slice().sort((a, b) => a - b);
  const unicas = [...new Set(ordenadas.map(fechaTexto))];
  if (!unicas.length) return 'Sin fecha';
  return unicas.length === 1 ? unicas[0] : `${unicas[0]} – ${unicas[unicas.length - 1]}`;
};

const StatusBadge = ({ label, tone = 'neutral', mobile = false }) => {
  const styles = {
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    neutral: 'border-slate-200 bg-slate-100 text-slate-600'
  };
  const StatusIcon = tone === 'success' ? Check : tone === 'danger' ? X : tone === 'neutral' ? History : Clock3;
  return <span className={`inline-flex min-h-6 items-center gap-1 border px-2 text-[9px] font-black uppercase tracking-wide ${mobile ? 'rounded-full' : 'rounded-md'} ${styles[tone]}`}><StatusIcon size={11} />{label}</span>;
};

const AccionesRegistro = ({ record, puedeResponder, onAtender, onResponder, mobile = false }) => {
  const { solicitud, prorroga } = record;
  const esPendiente = record.tipo === 'prorroga' && prorroga.estado === 'pendiente';
  return (
    <div className={mobile ? `grid gap-2 ${puedeResponder && esPendiente ? 'grid-cols-2' : 'grid-cols-1'}` : 'flex flex-wrap gap-2'}>
      <button type="button" onClick={() => onAtender(solicitud)} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${mobile && puedeResponder && esPendiente ? 'col-span-2' : ''}`}>
        <ArrowRight size={13} /> Atender
      </button>
      {puedeResponder && esPendiente && (
        <>
          <button type="button" onClick={() => onResponder(solicitud, prorroga, 'aprobada')} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-[10px] font-black uppercase tracking-wide text-white transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
            <Check size={13} /> Aprobar
          </button>
          <button type="button" onClick={() => onResponder(solicitud, prorroga, 'rechazada')} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">
            <X size={13} /> Rechazar
          </button>
        </>
      )}
    </div>
  );
};

/** Presenta una prórroga o evento de revisión en tarjeta móvil y fila de escritorio. */
export const ProrrogaRegistro = ({ record, view, puedeResponder, onAtender, onResponder }) => {
  const [expandido, setExpandido] = useState(false);
  const { solicitud } = record;
  const esRevision = record.tipo === 'revision';
  let badgeLabel;
  let badgeTone;
  let descripcionEstado;
  let metadatos = [];

  if (esRevision) {
    const { revision, item } = record;
    const ultimaRevision = Number(revision.numero || 0) >= Number(item.seguimientoCliente?.cantidadRevisiones || 0);
    const vencimiento = obtenerFecha(revision.fechaVencimientoRevision);
    const vencida = Boolean(vencimiento && vencimiento <= new Date());
    badgeLabel = !ultimaRevision ? 'Reprogramada' : vencida ? 'Plazo vencido' : 'En revisión';
    badgeTone = !ultimaRevision ? 'neutral' : vencida ? 'danger' : 'warning';
    descripcionEstado = `Revisión ${revision.numero || item.seguimientoCliente?.cantidadRevisiones || 1} · Ítem ${record.indiceItem + 1}`;
    metadatos = [
      ['Tiempo adicional', revision.diasExtension ? `${revision.diasExtension} días hábiles` : 'Según validez de la solicitud'],
      ['Vencimiento base', fechaTexto(revision.fechaInicioRevision)],
      ['Revisión hasta', fechaTexto(revision.fechaVencimientoRevision)],
      ['Registrada', fechaTexto(revision.fechaRevision)],
      ['Registrada por', revision.registradoPor || solicitud.vendedorEmail || 'Vendedor']
    ];
  } else {
    const { prorroga } = record;
    const aprobada = prorroga.estado === 'aprobada';
    const pendiente = prorroga.estado === 'pendiente';
    badgeLabel = pendiente ? 'Pendiente' : aprobada ? 'Aprobada' : 'Rechazada';
    badgeTone = pendiente ? 'warning' : aprobada ? 'success' : 'danger';
    const prorrogaConAnclas = completarAnclasProrroga(solicitud, prorroga);
    const fechas = obtenerFechasVencimientoProrroga(prorrogaConAnclas);
    const fechaFinal = obtenerFechaVencimientoProrroga(prorrogaConAnclas);
    const fechasFinales = fechas.map(({ fechaFin }) => fechaFin);
    metadatos = [
      ['Días solicitados', `${prorroga.diasSolicitados || 0} días hábiles`],
      ['Días aprobados', aprobada ? `${prorroga.diasAprobados || 0} días hábiles` : '—'],
      ['Vencimiento base', fechasTexto(fechas.map(({ fechaInicio }) => fechaInicio))],
      ['Nueva fecha límite', fechasTexto(fechasFinales.length ? fechasFinales : [fechaFinal])],
      ['Solicitada', fechaTexto(prorroga.fechaSolicitud)],
      ['Atendida por', prorroga.respondidoPor || (pendiente ? 'Pendiente de Compras' : 'Sin dato')]
    ];
    descripcionEstado = prorroga.motivo || 'Sin comentario del vendedor.';
  }

  const coberturaLabel = record.cobertura?.completa ? 'Completa' : 'Parcial';
  const coberturaTone = record.cobertura?.completa ? 'success' : 'warning';
  const mostrarDetalleItems = !record.cobertura?.completa;
  const itemsAfectados = record.cobertura?.itemsAfectados || 0;
  const totalItems = record.cobertura?.totalItems || 0;
  const resumenEventos = [
    record.cantidadRevisiones > 0 && `${record.cantidadRevisiones} ${record.cantidadRevisiones === 1 ? 'revisión' : 'revisiones'}`,
    record.cantidadProrrogas > 0 && `${record.cantidadProrrogas} ${record.cantidadProrrogas === 1 ? 'prórroga' : 'prórrogas'}`
  ].filter(Boolean).join(' · ');

  const vendedor = solicitud.vendedorNombre || solicitud.vendedorEmail || record.revision?.registradoPor || 'Vendedor';
  const cliente = solicitud.cliente || record.prorroga?.cliente || 'Cliente sin nombre';
  const tipo = solicitud.tipo || record.prorroga?.tipoSolicitud || 'RFQ';
  const referencia = solicitud.correlativo || 'Solicitud sin referencia';
  const tituloMovil = cliente;
  const subtituloMovil = esRevision
    ? `${tipo} · ${itemsAfectados} de ${totalItems} items`
    : `${tipo} · Ronda ${record.prorroga.ronda || 1}`;
  const subtitulo = esRevision
    ? `${record.cantidadRevisiones || 1} ${record.cantidadRevisiones === 1 ? 'revisión' : 'revisiones'}`
    : `Ronda ${record.prorroga.ronda || 1}`;

  if (view === 'mobile') {
    return (
      <article className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all active:scale-[0.98] touch-manipulation ${badgeTone === 'warning' ? 'border-amber-200' : badgeTone === 'success' ? 'border-emerald-200' : badgeTone === 'danger' ? 'border-rose-200' : 'border-slate-200'}`}>
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] font-bold tracking-wider text-slate-400">#{referencia}</span>
          <StatusBadge label={badgeLabel} tone={badgeTone} mobile />
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge label={`${coberturaLabel} · ${itemsAfectados}/${totalItems} items`} tone={coberturaTone} mobile />
          {resumenEventos && <span className="text-[9px] font-bold text-slate-500">{resumenEventos}</span>}
        </div>

        <div className="mb-3 pr-2">
          <h2 className="line-clamp-2 text-sm font-black uppercase leading-tight text-slate-800">{tituloMovil}</h2>
          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
            <span className="truncate font-bold uppercase text-blue-700">{subtituloMovil}</span>
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{vendedor}</p>
        </div>

        <p className="mb-3 line-clamp-3 text-xs leading-5 text-slate-700">{esRevision ? record.revision.comentario || 'Sin comentario registrado.' : descripcionEstado}</p>

        {mostrarDetalleItems && (
          <>
            <button
              type="button"
              aria-expanded={expandido}
              onClick={() => setExpandido((estado) => !estado)}
              className="mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              {expandido ? 'Ocultar ítems' : 'Ver ítems'}
              {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandido && <div className="mb-3"><ProrrogaItemsAfectados solicitud={solicitud} record={record} /></div>}
          </>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {metadatos.slice(0, esRevision ? 1 : 2).map(([label, value]) => (
            <div key={label} className="flex items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
              <span className="text-[9px] font-bold uppercase text-slate-500">{label}:</span>
              <span className="font-mono text-[10px] font-black text-slate-700">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2">
            {metadatos.slice(esRevision ? 1 : 2).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <span className="block truncate text-[9px] font-bold uppercase text-slate-400">{label}</span>
                <strong className="mt-0.5 block break-words text-[10px] font-bold text-slate-700">{value}</strong>
              </div>
            ))}
          </div>
        </div>

          {!esRevision && !['pendiente', 'aprobada'].includes(record.prorroga.estado) && record.prorroga.respuestaComprador && (
            <p className="mt-3 border-l-2 border-slate-300 pl-2 text-[11px] text-slate-600">Respuesta: {record.prorroga.respuestaComprador}</p>
          )}
          <div className="mt-4">
            <AccionesRegistro record={record} puedeResponder={puedeResponder} onAtender={onAtender} onResponder={onResponder} mobile />
          </div>
      </article>
    );
  }

  return (
    <>
      <tr className="hidden border-b border-slate-100 text-sm transition-colors hover:bg-slate-50/80 md:table-row">
        <td className="px-4 py-4 align-top">
          <span className="block font-mono text-xs font-bold text-slate-700">{referencia}</span>
          <span className="mt-1 block max-w-52 truncate text-xs font-semibold text-slate-500">{cliente}</span>
        </td>
        <td className="px-4 py-4 align-top">
          <span className="block text-xs font-bold text-slate-700">{vendedor}</span>
          <span className="mt-1 block text-[10px] text-slate-500">{tipo} · {subtitulo}</span>
        </td>
        <td className="px-4 py-4 align-top">
          <div className="grid justify-items-start gap-1.5">
            <StatusBadge label={badgeLabel} tone={badgeTone} />
            <StatusBadge label={`${coberturaLabel} · ${itemsAfectados}/${totalItems} items`} tone={coberturaTone} />
            {resumenEventos && <span className="text-[10px] font-semibold text-slate-500">{resumenEventos}</span>}
          </div>
        </td>
        <td className="max-w-sm px-4 py-4 align-top">
          <p className="line-clamp-2 text-xs leading-5 text-slate-700">{esRevision ? record.revision.comentario || 'Sin comentario registrado.' : descripcionEstado}</p>
          {mostrarDetalleItems && (
            <button
              type="button"
              aria-expanded={expandido}
              onClick={() => setExpandido((estado) => !estado)}
              className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              {expandido ? 'Ocultar ítems' : 'Ver ítems'}
              {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
          {esRevision && <span className="mt-1 block text-[10px] font-semibold text-slate-500">{record.cantidadRevisiones || 1} registros de revisión · {itemsAfectados}/{totalItems} ítems</span>}
        </td>
        <td className="px-4 py-4 align-top">
          <div className="grid gap-1 text-[10px] text-slate-500">
            {metadatos.slice(0, 3).map(([label, value]) => <span key={label}><b className="text-slate-600">{label}:</b> {value}</span>)}
          </div>
        </td>
        <td className="px-4 py-4 align-top"><AccionesRegistro record={record} puedeResponder={puedeResponder} onAtender={onAtender} onResponder={onResponder} /></td>
      </tr>
      {mostrarDetalleItems && expandido && (
        <tr className="hidden md:table-row">
          <td colSpan={6} className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <ProrrogaItemsAfectados solicitud={solicitud} record={record} />
          </td>
        </tr>
      )}
    </>
  );
};
