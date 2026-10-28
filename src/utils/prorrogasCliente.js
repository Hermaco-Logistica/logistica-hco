import { obtenerFechaLimiteSeguimientoItem } from './cotizacionesEstancadasHelpers';
import { convertirFechaSeguimiento, sumarDiasHabiles } from './diasHabiles';

export const ESTADOS_PRORROGA_CLIENTE = {
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  PENDIENTE_RESPUESTA_VENCIDA: 'pendiente_respuesta_vencida'
};

const obtenerFechaAncla = (prorroga, index) => {
  const fechas = prorroga?.fechasVencimientoOriginales || {};
  return convertirFechaSeguimiento(fechas[index] || fechas[String(index)] || prorroga?.fechaVencimientoOriginal);
};

/** Calcula cada nueva fecha desde la última fecha límite efectiva del ítem. */
export function obtenerFechasVencimientoProrroga(prorroga) {
  const dias = Number(prorroga?.diasAprobados || prorroga?.diasSolicitados || 0);
  const indices = Array.isArray(prorroga?.indicesItems) ? prorroga.indicesItems : [];
  if (dias <= 0) return [];

  return indices.map((index) => {
    const fechaInicio = obtenerFechaAncla(prorroga, index);
    const mapaAprobadas = prorroga?.fechasVencimientoAprobadas || {};
    const fechaAprobada = convertirFechaSeguimiento(mapaAprobadas[index] || mapaAprobadas[String(index)]);
    return {
      index,
      fechaInicio,
      fechaFin: fechaAprobada || (fechaInicio ? sumarDiasHabiles(fechaInicio, dias) : null)
    };
  }).filter(({ fechaInicio, fechaFin }) => fechaInicio && fechaFin);
}

/** Compatibilidad con pantallas que muestran una sola fecha: entrega el vencimiento más próximo. */
export function obtenerFechaVencimientoProrroga(prorroga, index = null) {
  const fechasAprobadas = prorroga?.fechasVencimientoAprobadas || {};
  if (index !== null) {
    const individual = convertirFechaSeguimiento(fechasAprobadas[index] || fechasAprobadas[String(index)]);
    if (individual) return individual;
  }
  const fechas = obtenerFechasVencimientoProrroga(prorroga);
  if (index !== null) return fechas.find((fecha) => fecha.index === index)?.fechaFin || null;
  if (fechas.length) return fechas.map(({ fechaFin }) => fechaFin).sort((a, b) => a - b)[0];
  return convertirFechaSeguimiento(prorroga?.fechaVencimientoAprobada);
}

/** Completa el ancla de solicitudes antiguas antes de mostrarlas o aprobarlas. */
export function completarAnclasProrroga(solicitud, prorroga) {
  const anteriores = prorroga?.fechasVencimientoOriginales || {};
  const fechasVencimientoOriginales = Object.fromEntries((prorroga?.indicesItems || []).map((index) => [
    index,
    convertirFechaSeguimiento(anteriores[index] || anteriores[String(index)])
      || obtenerFechaLimiteSeguimientoItem(solicitud?.productos?.[index], solicitud, index)
  ]).filter(([, fecha]) => fecha));
  const fechaVencimientoOriginal = Object.values(fechasVencimientoOriginales)
    .sort((a, b) => a - b)[0] || convertirFechaSeguimiento(prorroga?.fechaVencimientoOriginal);
  return { ...prorroga, fechaVencimientoOriginal, fechasVencimientoOriginales };
}

/** Recomienda días suficientes para que cada ítem conserve el plazo de validez completo desde hoy. */
export function analizarDiasSolicitadosProrroga({ fechasLimite = [], diasSolicitados, fechaReferencia = new Date() }) {
  const dias = Math.max(0, Math.floor(Number(diasSolicitados) || 0));
  const fechas = fechasLimite
    .map((entrada, indice) => ({
      index: entrada?.index ?? indice,
      fechaInicio: convertirFechaSeguimiento(entrada?.fechaLimite || entrada?.fechaInicio || entrada)
    }))
    .filter(({ fechaInicio }) => fechaInicio)
    .map(({ index, fechaInicio }) => {
      const fechaFin = sumarDiasHabiles(fechaInicio, dias);
      let diasMinimos = 0;
      let fechaMinima = fechaInicio;
      while (fechaMinima <= fechaReferencia && diasMinimos < 10000) {
        diasMinimos += 1;
        fechaMinima = sumarDiasHabiles(fechaInicio, diasMinimos);
      }
      return {
        index,
        fechaInicio,
        fechaFin,
        diasMinimos
      };
    });
  const diasMinimos = fechas.reduce((maximo, fecha) => Math.max(maximo, fecha.diasMinimos), 1);
  return {
    fechas,
    diasMinimos,
    diasSolicitados: dias,
    requiereConfirmacion: fechas.some(({ fechaFin }) => fechaFin <= fechaReferencia)
  };
}

export function crearSolicitudProrroga({
  solicitud,
  indicesItems,
  diasSolicitados,
  motivo,
  usuarioEmail,
  usuarioUid,
  fechaSolicitud,
  ronda
}) {
  const prorrogaAnterior = solicitud?.prorrogaCliente;
  const historialAnterior = Array.isArray(prorrogaAnterior?.historial)
    ? prorrogaAnterior.historial
    : prorrogaAnterior
      ? [Object.fromEntries(Object.entries(prorrogaAnterior).filter(([clave]) => clave !== 'historial'))]
      : [];
  const indicesSolicitados = [...new Set((indicesItems || [])
    .map(Number)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < (solicitud?.productos?.length || 0)))];
  const fechasVencimientoOriginales = Object.fromEntries(indicesSolicitados.map((index) => [
    index,
    obtenerFechaLimiteSeguimientoItem(solicitud?.productos?.[index], solicitud, index)
  ]).filter(([, fecha]) => fecha));
  const fechaVencimientoOriginal = Object.values(fechasVencimientoOriginales)
    .sort((a, b) => a - b)[0] || null;
  const nuevoRegistro = {
    solicitudId: solicitud.id,
    correlativo: solicitud.correlativo || '',
    tipoSolicitud: solicitud.tipo || 'RFQ',
    cliente: solicitud.cliente || '',
    vendedorId: usuarioUid || solicitud.vendedorId || '',
    vendedorEmail: usuarioEmail || solicitud.vendedorEmail || '',
    vendedorNombre: solicitud.vendedorNombre || '',
    indicesItems: indicesSolicitados,
    diasSolicitados: Number(diasSolicitados),
    motivo: motivo.trim(),
    ronda: Number(ronda || 1),
    estado: ESTADOS_PRORROGA_CLIENTE.PENDIENTE,
    fechaSolicitud,
    fechaVencimientoOriginal,
    fechasVencimientoOriginales,
    solicitadoPor: usuarioEmail || ''
  };
  return { ...nuevoRegistro, historial: [...historialAnterior, nuevoRegistro] };
}
