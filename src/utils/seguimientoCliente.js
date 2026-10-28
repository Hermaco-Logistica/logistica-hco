import {
  calcularDiasDesdeRespuesta,
  obtenerDiasValidez,
  obtenerFechaRespuestaComprador,
  obtenerClaveDiaElSalvador,
  obtenerFechaLimiteSeguimientoItem
} from './cotizacionesEstancadasHelpers';
import { calcularDiasHabilesEntre, convertirFechaSeguimiento, sumarDiasHabiles } from './diasHabiles';

export const ESTADOS_SEGUIMIENTO_CLIENTE = {
  VIGENTE: 'vigente',
  ALERTA_INICIAL: 'alerta_inicial',
  EN_REVISION: 'en_revision',
  PRORROGA_DISPONIBLE: 'prorroga_disponible',
  CIERRE_REQUERIDO: 'cierre_requerido',
  CERRADO: 'cerrado'
};

export const MAX_REVISIONES_CLIENTE = 2;

const ESTADOS_CERRADOS = [
  'Pedido',
  'Comprado',
  'Anulado',
  'Anulada',
  'Denegado',
  'Cancelado',
  'Cancelada',
  'Rechazado',
  'Rechazada',
  'Venta Perdida'
];

const ESTADOS_SOLICITUD_CERRADOS = new Set([
  'pedido', 'comprado', 'anulado', 'anulada', 'denegado', 'cancelado',
  'cancelada', 'rechazado', 'rechazada', 'venta perdida'
]);

function obtenerFechaBaseItem(item, solicitud) {
  const seguimiento = item?.seguimientoCliente;
  if (seguimiento?.estado === ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION) {
    const inicioRevision = convertirFechaSeguimiento(seguimiento.fechaInicioRevision)
      || convertirFechaSeguimiento(seguimiento.fechaRevision);
    if (inicioRevision) return inicioRevision;
  }

  const fechaItem = convertirFechaSeguimiento(item?.fechaCotizacion)
    || convertirFechaSeguimiento(item?.negociacion?.ultimoCambio?.en)
    || convertirFechaSeguimiento(item?.negociacion?.ofertaVigente?.creadaEn);

  return fechaItem || obtenerFechaRespuestaComprador(solicitud);
}

function esItemActivoParaSeguimiento(item) {
  return Boolean(item)
    && !ESTADOS_CERRADOS.includes(item.estadoItem)
    && !item.idPedidoRelacionado
    && !item.pedidoGenerado;
}

function obtenerProrrogaAplicable(solicitud, index) {
  const prorrogaActual = solicitud?.prorrogaCliente;
  const historial = Array.isArray(prorrogaActual?.historial) ? prorrogaActual.historial : [];
  return [prorrogaActual, ...historial.slice().reverse()].filter(Boolean).find((prorroga) => (
    prorroga.estado === 'aprobada'
    && Array.isArray(prorroga.indicesItems)
    && prorroga.indicesItems.includes(index)
    && convertirFechaSeguimiento(prorroga?.fechasVencimientoAprobadas?.[index]
      || prorroga?.fechasVencimientoAprobadas?.[String(index)]
      || prorroga.fechaVencimientoAprobada)
  )) || null;
}

export function obtenerCantidadProrrogasItem(item, solicitud, index = null) {
  const revisiones = Number(item?.seguimientoCliente?.cantidadRevisiones || 0);
  const prorroga = solicitud?.prorrogaCliente;
  const solicitudesProrroga = Array.isArray(prorroga?.indicesItems) && prorroga.indicesItems.includes(index)
    ? Number(prorroga.ronda || 0)
    : 0;
  return revisiones + solicitudesProrroga;
}

export function obtenerClaveGrupoSeguimiento(item, solicitud, index = null) {
  const fecha = obtenerFechaLimiteSeguimientoItem(item, solicitud, index);
  const fechaClave = fecha ? obtenerClaveDiaElSalvador(fecha) : 'sin-fecha';
  return `${item?.estadoItem || 'Pendiente'}|${fechaClave}`;
}

export function obtenerEstadoSeguimientoItem(item, solicitud, fechaReferencia = new Date(), index = null) {
  if (!item) return ESTADOS_SEGUIMIENTO_CLIENTE.CERRADO;
  if (ESTADOS_CERRADOS.includes(item.estadoItem) || item.idPedidoRelacionado || item.pedidoGenerado) {
    return ESTADOS_SEGUIMIENTO_CLIENTE.CERRADO;
  }

  const fechaBase = obtenerFechaBaseItem(item, solicitud);
  const fechaLimite = obtenerFechaLimiteSeguimientoItem(item, solicitud, index);
  if (!fechaBase || !fechaLimite) return ESTADOS_SEGUIMIENTO_CLIENTE.VIGENTE;

  const estaEnRevision = item.seguimientoCliente?.estado === ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION;
  const cantidadRevisiones = Number(item.seguimientoCliente?.cantidadRevisiones || 0);
  const prorrogaAprobada = obtenerProrrogaAplicable(solicitud, index);
  if (fechaReferencia < fechaLimite) {
    return estaEnRevision ? ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION : ESTADOS_SEGUIMIENTO_CLIENTE.VIGENTE;
  }
  if (prorrogaAprobada) return ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO;
  return cantidadRevisiones < MAX_REVISIONES_CLIENTE
    ? ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL
    : ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE;
}

export function obtenerDetalleSeguimientoItem(item, solicitud, fechaReferencia = new Date(), index = null) {
  const fechaBase = obtenerFechaBaseItem(item, solicitud);
  const diasValidez = obtenerDiasValidez(solicitud);
  const prorroga = obtenerProrrogaAplicable(solicitud, index);
  const fechaLimite = obtenerFechaLimiteSeguimientoItem(item, solicitud, index);
  const estado = obtenerEstadoSeguimientoItem(item, solicitud, fechaReferencia, index);
  const fechaInicioCiclo = convertirFechaSeguimiento(item?.seguimientoCliente?.fechaInicioRevision) || fechaBase;
  const diasTranscurridos = fechaInicioCiclo ? calcularDiasDesdeRespuesta(fechaInicioCiclo, fechaReferencia) : 0;
  const horasHastaVencimiento = fechaLimite
    ? Math.ceil((fechaLimite.getTime() - fechaReferencia.getTime()) / (60 * 60 * 1000))
    : null;
  const fechaAlertaInicial = fechaLimite;
  const vencida = Boolean(fechaLimite && fechaReferencia >= fechaLimite);
  const diasRestantes = vencida || !fechaLimite ? 0 : calcularDiasHabilesEntre(fechaReferencia, fechaLimite);
  const diasVencidos = !vencida ? 0 : calcularDiasHabilesEntre(fechaLimite, fechaReferencia);

  return {
    estado,
    fechaBase,
    fechaAlertaInicial,
    vencida,
    diasValidez: prorroga?.diasAprobados || diasValidez,
    diasTranscurridos,
    diasRestantes,
    diasVencidos,
    horasHastaVencimiento,
    esProrroga: Boolean(prorroga) || item?.seguimientoCliente?.estado === ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION,
    tieneProrrogaFormal: Boolean(prorroga),
    cantidadProrrogas: obtenerCantidadProrrogasItem(item, solicitud, index),
    cantidadRevisiones: Number(item?.seguimientoCliente?.cantidadRevisiones || 0)
  };
}

export function obtenerIndicesEnAlertaCliente(solicitud, items = solicitud?.productos || [], fechaReferencia = new Date()) {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => obtenerEstadoSeguimientoItem(item, solicitud, fechaReferencia, index) === ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL)
    .map(({ index }) => index);
}

export function obtenerResumenSeguimientoCliente(solicitud, items = solicitud?.productos || [], fechaReferencia = new Date()) {
  const activos = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => esItemActivoParaSeguimiento(item));
  const enAlerta = activos.filter(({ item, index }) => (
    obtenerEstadoSeguimientoItem(item, solicitud, fechaReferencia, index) === ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL
  ));
  const gruposActivos = new Set(activos.map(({ item, index }) => obtenerClaveGrupoSeguimiento(item, solicitud, index)));
  const puedeSolicitarSolicitudCompleta = activos.length > 0 && gruposActivos.size === 1;
  const detalles = activos.map(({ item, index }) => ({
    index,
    ...obtenerDetalleSeguimientoItem(item, solicitud, fechaReferencia, index)
  }));
  const indicesRevisionDisponible = detalles
    .filter((detalle) => detalle.cantidadRevisiones < MAX_REVISIONES_CLIENTE
      && !detalle.tieneProrrogaFormal
      && (detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL || detalle.diasRestantes <= 2))
    .map((detalle) => detalle.index);
  const itemsRevisionDisponible = activos.filter(({ index }) => indicesRevisionDisponible.includes(index));
  const gruposRevisionDisponible = new Set(itemsRevisionDisponible
    .map(({ item, index }) => obtenerClaveGrupoSeguimiento(item, solicitud, index)));
  const puedeMarcarSolicitudCompleta = activos.length > 0
    && indicesRevisionDisponible.length === activos.length
    && gruposRevisionDisponible.size === 1;
  const revisionesTotales = items.reduce((maximo, item) => (
    Math.max(maximo, Number(item?.seguimientoCliente?.cantidadRevisiones || 0))
  ), 0);
  const historialProrrogas = solicitud?.prorrogaCliente?.historial;
  const prorrogasTotales = Array.isArray(historialProrrogas) && historialProrrogas.length > 0
    ? historialProrrogas.filter((prorroga) => prorroga.estado === 'aprobada').length
    : solicitud?.prorrogaCliente
      ? (solicitud.prorrogaCliente.estado === 'aprobada' ? 1 : 0)
      : 0;
  const estadoSolicitud = String(solicitud?.estado || '').trim().toLowerCase();
  const solicitudCerrada = ESTADOS_SOLICITUD_CERRADOS.has(estadoSolicitud)
    || (items.length > 0 && activos.length === 0);
  const detallePrioritario = [...detalles]
    .sort((a, b) => (a.diasRestantes - b.diasRestantes) || (b.diasVencidos - a.diasVencidos))[0] || null;
  const cantidadProrrogas = detalles.reduce((maximo, detalle) => Math.max(maximo, detalle.cantidadProrrogas || 0), 0);
  const tieneCierreRequerido = detalles.some((detalle) => detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO);
  const tieneProrrogaDisponible = detalles.some((detalle) => detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE);
  const tieneAlertaInicial = detalles.some((detalle) => detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL);
  const tieneRevision = detalles.some((detalle) => detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION);
  const estado = tieneCierreRequerido
    ? ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO
    : tieneProrrogaDisponible
      ? ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE
    : tieneAlertaInicial
      ? ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL
      : tieneRevision
        ? ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION
        : ESTADOS_SEGUIMIENTO_CLIENTE.VIGENTE;
  const indicesProrrogaDisponible = detalles
    .filter((detalle) => detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL
      || detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE
      || (!detalle.tieneProrrogaFormal && detalle.cantidadRevisiones >= MAX_REVISIONES_CLIENTE && detalle.diasRestantes <= 2)
      || (detalle.tieneProrrogaFormal && detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.VIGENTE && detalle.diasRestantes <= 2))
    .map((detalle) => detalle.index);
  const detalleAviso = [...detalles]
    .filter((detalle) => detalle.estado !== ESTADOS_SEGUIMIENTO_CLIENTE.CERRADO)
    .sort((a, b) => (a.horasHastaVencimiento ?? Number.MAX_SAFE_INTEGER) - (b.horasHastaVencimiento ?? Number.MAX_SAFE_INTEGER))[0] || null;
  const prorrogaPendiente = solicitud?.prorrogaCliente?.estado === 'pendiente';
  const prorrogaAprobadaVigente = detalles.length > 0
    && detalles.every((detalle) => detalle.esProrroga && detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.VIGENTE)
    && !detalles.some((detalle) => detalle.diasRestantes <= 2);
  const nivelAviso = prorrogaAprobadaVigente
    ? null
    : estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO
    ? 'cierre_requerido'
    : estado === ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE
      ? 'prorroga_disponible'
    : estado === ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL
      ? 'vencido'
      : prorrogaPendiente
        ? 'prorroga_pendiente'
        : detalleAviso?.horasHastaVencimiento !== null && detalleAviso?.horasHastaVencimiento <= 6
          ? 'seis_horas'
          : detalleAviso?.diasRestantes <= 1
            ? 'un_dia'
            : detalleAviso?.diasRestantes <= 2
              ? 'dos_dias'
              : null;
  const prorrogaActual = solicitud?.prorrogaCliente;
  const fechasAnclaProrroga = Object.values(prorrogaActual?.fechasVencimientoOriginales || {})
    .map(convertirFechaSeguimiento).filter(Boolean).sort((a, b) => a - b);
  const fechasFinProrroga = (prorrogaActual?.indicesItems || []).map((index) => {
    const fechasAprobadas = prorrogaActual?.fechasVencimientoAprobadas || {};
    const aprobada = convertirFechaSeguimiento(fechasAprobadas[index] || fechasAprobadas[String(index)]);
    if (aprobada) return aprobada;
    const fechasOriginales = prorrogaActual?.fechasVencimientoOriginales || {};
    const ancla = convertirFechaSeguimiento(fechasOriginales[index] || fechasOriginales[String(index)]);
    const dias = Number(prorrogaActual?.diasAprobados || prorrogaActual?.diasSolicitados || 0);
    return ancla && dias > 0 ? sumarDiasHabiles(ancla, dias) : null;
  }).filter(Boolean).sort((a, b) => a - b);

  return {
    indicesActivos: activos.map(({ index }) => index),
    indicesEnAlerta: enAlerta.map(({ index }) => index),
    indicesRevisionDisponible,
    indicesProrrogaDisponible,
    puedeMarcarSolicitudCompleta,
    puedeSolicitarSolicitudCompleta,
    estado,
    detalles,
    diasValidez: detallePrioritario?.diasValidez || obtenerDiasValidez(solicitud),
    fechaAlertaInicial: detallePrioritario?.fechaAlertaInicial || null,
    vencida: Boolean(detallePrioritario?.vencida),
    horasHastaVencimiento: detallePrioritario?.horasHastaVencimiento ?? null,
    diasRestantes: detallePrioritario?.diasRestantes || 0,
    diasVencidos: detallePrioritario?.diasVencidos || 0,
    revisionesUsadas: detalles.reduce((maximo, detalle) => Math.max(maximo, detalle.cantidadRevisiones || 0), 0),
    revisionesTotales,
    prorrogasTotales,
    solicitudCerrada,
    estadoCierre: solicitudCerrada ? (solicitud?.estado || 'Cerrada') : null,
    maxRevisiones: MAX_REVISIONES_CLIENTE,
    puedeMantenerRevision: indicesRevisionDisponible.length > 0,
    puedeSolicitarProrroga: indicesProrrogaDisponible.length > 0 && !prorrogaPendiente,
    cantidadProrrogas,
    estadoProrroga: solicitud?.prorrogaCliente?.estado || null,
    diasProrrogaSolicitados: Number(solicitud?.prorrogaCliente?.diasSolicitados || 0),
    diasProrrogaAprobados: Number(solicitud?.prorrogaCliente?.diasAprobados || 0),
    respuestaProrroga: solicitud?.prorrogaCliente?.respuestaComprador || '',
    motivoProrroga: solicitud?.prorrogaCliente?.motivo || '',
    respondidoPorProrroga: solicitud?.prorrogaCliente?.respondidoPor || '',
    fechaRespuestaProrroga: convertirFechaSeguimiento(solicitud?.prorrogaCliente?.fechaRespuesta),
    fechaInicioProrroga: fechasAnclaProrroga[0] || convertirFechaSeguimiento(prorrogaActual?.fechaVencimientoOriginal),
    fechaFinProrroga: fechasFinProrroga[0] || convertirFechaSeguimiento(prorrogaActual?.fechaVencimientoAprobada),
    nivelAviso,
    prorrogaPendiente,
    etiquetaAccion: puedeMarcarSolicitudCompleta
      ? 'Marcar solicitud en revisión'
      : 'Seleccionar ítems para revisión'
  };
}

export function crearSeguimientoEnRevision({
  comentario,
  usuarioEmail = '',
  fecha = new Date(),
  fechaLimiteActual,
  diasExtension = 5,
  revisionesPrevias = 0,
  seguimientoPrevio = null
}) {
  const fechaInicioRevision = convertirFechaSeguimiento(fechaLimiteActual) || convertirFechaSeguimiento(fecha);
  const cantidadRevisiones = Number(revisionesPrevias || 0) + 1;
  const fechaVencimientoRevision = sumarDiasHabiles(fechaInicioRevision, diasExtension);
  const historialPrevio = Array.isArray(seguimientoPrevio?.historial)
    ? seguimientoPrevio.historial
    : seguimientoPrevio?.fechaRevision
      ? [{
        numero: Number(seguimientoPrevio.cantidadRevisiones || revisionesPrevias || 1),
        fechaRevision: seguimientoPrevio.fechaRevision,
        fechaInicioRevision: seguimientoPrevio.fechaInicioRevision || seguimientoPrevio.fechaRevision,
        fechaVencimientoRevision: seguimientoPrevio.fechaVencimientoRevision || null,
        diasExtension: null,
        comentario: seguimientoPrevio.comentario || '',
        registradoPor: seguimientoPrevio.registradoPor || ''
      }]
      : [];
  const nuevaRevision = {
    numero: cantidadRevisiones,
    fechaRevision: fecha,
    fechaInicioRevision,
    fechaVencimientoRevision,
    diasExtension: Number(diasExtension),
    comentario: comentario.trim(),
    registradoPor: usuarioEmail
  };

  return {
    estado: ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION,
    fechaRevision: fecha,
    fechaInicioRevision,
    fechaVencimientoRevision,
    cantidadRevisiones,
    comentario: comentario.trim(),
    registradoPor: usuarioEmail,
    actualizadoEn: fecha,
    historial: [...historialPrevio, nuevaRevision]
  };
}
