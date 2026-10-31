/**
 * LÓGICA COMPARTIDA DE COTIZACIONES ESTANCADAS (Backend Cloud Functions)
 *
 * Enlace con frontend: Este archivo replica fielmente la lógica de:
 *   src/utils/cotizacionesEstancadasHelpers.js
 *   src/utils/diasHabiles.js (copiado en ./diasHabiles.js)
 * Mantener sincronizados ambos archivos ante cualquier cambio en reglas de negocio.
 *
 * Criterios:
 *   - Zona horaria: America/El_Salvador (UTC-6)
 *   - Excluye domingos del cómputo
 *   - Umbral: validez de cada solicitud (RFQ 5 días, Pedido Manual 10, o el texto `validez`)
 *   - Extienden el plazo: revisión activa del cliente y prórroga aprobada
 *   - Roles sujetos a bloqueo: 'vendedor', 'gerente'
 */

import { convertirFechaSeguimiento, sumarDiasHabiles } from './diasHabiles.js';

export const ZONA_HORARIA_EL_SALVADOR = 'America/El_Salvador';
export const ROLES_CON_BLOQUEO = ['vendedor', 'gerente'];
export const ESTADOS_SOLICITUD_EVALUABLES = ['Cotizado', 'Pedido Parcial', 'Cotizado Parcial'];

export const DIAS_VALIDEZ_DEFAULT_RFQ = 5;
export const DIAS_VALIDEZ_DEFAULT_PEDIDO_MANUAL = 10;

/**
 * Dias de validez de una solicitud: diasValidez, luego el texto validez y, finalmente,
 * el default de su tipo.
 */
export function obtenerDiasValidez(solicitud = null) {
  const valorNumerico = Number(solicitud?.diasValidez);
  if (Number.isFinite(valorNumerico) && valorNumerico > 0) {
    return Math.floor(valorNumerico);
  }

  const texto = String(solicitud?.validez || '');
  const coincidencia = texto.match(/\d+/);
  const valorTexto = coincidencia ? Number(coincidencia[0]) : 0;
  if (Number.isFinite(valorTexto) && valorTexto > 0) {
    return Math.floor(valorTexto);
  }

  return solicitud?.tipo === 'Pedido Manual'
    ? DIAS_VALIDEZ_DEFAULT_PEDIDO_MANUAL
    : DIAS_VALIDEZ_DEFAULT_RFQ;
}

export function esRolBloqueable(roleOrUser) {
  if (!roleOrUser) return false;
  let r = '';
  if (typeof roleOrUser === 'string') {
    r = roleOrUser;
  } else if (typeof roleOrUser === 'object') {
    r = roleOrUser.role || roleOrUser.rol || '';
  }
  return ROLES_CON_BLOQUEO.includes(String(r).trim().toLowerCase());
}

// Se crea una sola vez: construir un Intl.DateTimeFormat por llamada era el costo dominante del cálculo de seguimiento.
const FORMATEADOR_DIA_EL_SALVADOR = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA_EL_SALVADOR });

export function obtenerClaveDiaElSalvador(fecha) {
  if (!fecha) return null;
  let d = fecha;
  if (typeof fecha.toDate === 'function') {
    d = fecha.toDate();
  } else if (!(fecha instanceof Date)) {
    d = new Date(fecha);
  }
  if (isNaN(d.getTime())) return null;

  return FORMATEADOR_DIA_EL_SALVADOR.format(d);
}

export function esDomingoEnElSalvador(claveODate) {
  const clave = typeof claveODate === 'string' && claveODate.includes('-')
    ? claveODate
    : obtenerClaveDiaElSalvador(claveODate);
  if (!clave) return false;

  const [y, m, d] = clave.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay() === 0;
}

export function obtenerFechaRespuestaComprador(solicitud) {
  if (!solicitud) return null;

  if (solicitud.fechaCotizacion) {
    if (typeof solicitud.fechaCotizacion.toDate === 'function') return solicitud.fechaCotizacion.toDate();
    if (solicitud.fechaCotizacion instanceof Date) return solicitud.fechaCotizacion;
    const parsed = new Date(solicitud.fechaCotizacion);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  if (solicitud.fechaRespuestaComprador) {
    if (typeof solicitud.fechaRespuestaComprador.toDate === 'function') return solicitud.fechaRespuestaComprador.toDate();
    if (solicitud.fechaRespuestaComprador instanceof Date) return solicitud.fechaRespuestaComprador;
    const parsed = new Date(solicitud.fechaRespuestaComprador);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  if (solicitud.ultimaNotificacion?.en) {
    const un = solicitud.ultimaNotificacion.en;
    if (typeof un.toDate === 'function') return un.toDate();
    if (un instanceof Date) return un;
    const parsed = new Date(un);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const productos = Array.isArray(solicitud.productos) ? solicitud.productos : [];
  let fechaMasReciente = null;

  for (const p of productos) {
    let fItem = null;
    if (p?.fechaCotizacion) {
      fItem = typeof p.fechaCotizacion.toDate === 'function' ? p.fechaCotizacion.toDate() : new Date(p.fechaCotizacion);
    } else if (p?.negociacion?.ultimoCambio?.en) {
      const en = p.negociacion.ultimoCambio.en;
      fItem = typeof en.toDate === 'function' ? en.toDate() : new Date(en);
    } else if (p?.negociacion?.ofertaVigente?.creadaEn) {
      const cr = p.negociacion.ofertaVigente.creadaEn;
      fItem = typeof cr.toDate === 'function' ? cr.toDate() : new Date(cr);
    }

    if (fItem && !isNaN(fItem.getTime())) {
      if (!fechaMasReciente || fItem > fechaMasReciente) {
        fechaMasReciente = fItem;
      }
    }
  }

  if (fechaMasReciente) return fechaMasReciente;

  if (solicitud.fechaS) {
    if (typeof solicitud.fechaS.toDate === 'function') return solicitud.fechaS.toDate();
    const parsed = new Date(solicitud.fechaS);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function obtenerFechaProrrogaAprobada(solicitud, indice = null) {
  const prorrogaActual = solicitud?.prorrogaCliente;
  const historial = Array.isArray(prorrogaActual?.historial) ? prorrogaActual.historial : [];
  const registros = [prorrogaActual, ...historial.slice().reverse()].filter(Boolean);
  for (const prorroga of registros) {
    if (prorroga.estado !== 'aprobada') continue;
    if (indice !== null && Array.isArray(prorroga.indicesItems) && !prorroga.indicesItems.includes(indice)) continue;
    const fechas = prorroga.fechasVencimientoAprobadas || {};
    const individual = convertirFechaSeguimiento(fechas[indice] || fechas[String(indice)]);
    if (individual) return individual;
    const general = convertirFechaSeguimiento(prorroga.fechaVencimientoAprobada);
    if (general) return general;
    if (indice === null) {
      const fechasAprobadas = Object.values(fechas).map(convertirFechaSeguimiento).filter(Boolean).sort((a, b) => a - b);
      if (fechasAprobadas.length) return fechasAprobadas[0];
    }
  }
  return null;
}

/** Fecha límite efectiva: validez inicial, última revisión o prórroga aprobada. */
export function obtenerFechaLimiteSeguimientoItem(item, solicitud, indice = null, diasLimite = null) {
  const revision = item?.seguimientoCliente;
  let fechaBase = null;
  if (revision?.estado === 'en_revision') {
    fechaBase = convertirFechaSeguimiento(revision.fechaInicioRevision)
      || convertirFechaSeguimiento(revision.fechaRevision);
  }
  fechaBase ||= convertirFechaSeguimiento(item?.fechaCotizacion)
    || convertirFechaSeguimiento(item?.negociacion?.ultimoCambio?.en)
    || convertirFechaSeguimiento(item?.negociacion?.ofertaVigente?.creadaEn)
    || convertirFechaSeguimiento(obtenerFechaRespuestaComprador(solicitud));
  if (!fechaBase) return null;

  const validez = Number(diasLimite) > 0 ? Math.floor(Number(diasLimite)) : obtenerDiasValidez(solicitud);
  const fechaVencimientoInicial = sumarDiasHabiles(fechaBase, validez);
  const fechaVencimientoRevision = convertirFechaSeguimiento(revision?.fechaVencimientoRevision)
    || (revision?.estado === 'en_revision' && revision?.fechaRevision
      ? sumarDiasHabiles(
        convertirFechaSeguimiento(revision.fechaInicioRevision) || revision.fechaRevision,
        validez
      )
      : null);
  const fechaVencimientoProrroga = obtenerFechaProrrogaAprobada(solicitud, indice);
  return [fechaVencimientoInicial, fechaVencimientoRevision, fechaVencimientoProrroga]
    .filter(Boolean)
    .reduce((ultima, fecha) => !ultima || fecha > ultima ? fecha : ultima, null);
}

export function calcularDiasDesdeRespuesta(fecha, fechaReferencia = new Date()) {
  const claveInicio = obtenerClaveDiaElSalvador(fecha);
  const claveFin = obtenerClaveDiaElSalvador(fechaReferencia);

  if (!claveInicio || !claveFin || claveInicio >= claveFin) {
    return 0;
  }

  const [yIni, mIni, dIni] = claveInicio.split('-').map(Number);
  const [yFin, mFin, dFin] = claveFin.split('-').map(Number);

  let cursor = new Date(Date.UTC(yIni, mIni - 1, dIni + 1, 12, 0, 0));
  const fin = new Date(Date.UTC(yFin, mFin - 1, dFin, 12, 0, 0));

  let dias = 0;
  while (cursor <= fin) {
    if (cursor.getUTCDay() !== 0) {
      dias++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dias;
}

export function esItemEstancado(item, solicitud = null, { diasLimite = null, fechaReferencia = new Date(), indice = null } = {}) {
  if (!item) return false;

  // Si ya fue pedido, comprado, anulado o cerrado, nunca está estancado
  if (
    item.estadoItem === 'Pedido' ||
    item.estadoItem === 'Comprado' ||
    item.estadoItem === 'En Proceso' ||
    item.estadoItem === 'Anulado' ||
    item.estadoItem === 'Denegado' ||
    item.estadoItem === 'Cancelado' ||
    item.estadoItem === 'Venta Perdida' ||
    item.idPedidoRelacionado ||
    item.pedidoGenerado
  ) {
    return false;
  }

  const esPedidoManual = solicitud?.tipo === 'Pedido Manual';
  const tienePrecio = Number(item.fob || item.precio || item.negociacion?.ofertaVigente?.precio || 0) > 0;
  const estadoItem = item.estadoItem || (tienePrecio ? 'Cotizado' : 'Pendiente');

  if (esPedidoManual) {
    if (estadoItem !== 'Cotizado' && estadoItem !== 'Pendiente') return false;
  } else {
    if (estadoItem !== 'Cotizado') return false;
  }

  const fechaLimite = obtenerFechaLimiteSeguimientoItem(item, solicitud, indice, diasLimite);
  return Boolean(fechaLimite && fechaReferencia >= fechaLimite);
}

export function esCotizacionEstancada(solicitud, { diasLimite = null, fechaReferencia = new Date() } = {}) {
  if (!solicitud) return false;

  const estado = solicitud.estado || solicitud.estadoGlobal;
  if (!ESTADOS_SOLICITUD_EVALUABLES.includes(estado)) return false;

  const productos = Array.isArray(solicitud.productos) ? solicitud.productos : [];
  const limite = Number.isFinite(Number(diasLimite)) && Number(diasLimite) > 0
    ? Number(diasLimite)
    : obtenerDiasValidez(solicitud);
  if (productos.length > 0) {
    return productos.some((p, index) => esItemEstancado(p, solicitud, { diasLimite: limite, fechaReferencia, indice: index }));
  }

  // Solicitudes sin desglose de productos solo aplican en Cotizado puro
  if (estado !== 'Cotizado') return false;

  const fechaLimite = obtenerFechaLimiteSeguimientoItem(null, solicitud, null, limite);
  return Boolean(fechaLimite && fechaReferencia >= fechaLimite);
}
