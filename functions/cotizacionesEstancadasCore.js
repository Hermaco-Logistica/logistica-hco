/**
 * LÓGICA COMPARTIDA DE COTIZACIONES ESTANCADAS (Backend Cloud Functions)
 * 
 * Enlace con frontend: Este archivo replica fielmente la lógica de:
 *   src/utils/cotizacionesEstancadasHelpers.js
 * Mantener sincronizados ambos archivos ante cualquier cambio en reglas de negocio.
 * 
 * Criterios:
 *   - Zona horaria: America/El_Salvador (UTC-6)
 *   - Excluye domingos del cómputo
 *   - Umbral: >= 5 días hábiles sin domingos
 *   - Roles sujetos a bloqueo: 'vendedor', 'gerente'
 */

export const ZONA_HORARIA_EL_SALVADOR = 'America/El_Salvador';
export const ROLES_CON_BLOQUEO = ['vendedor', 'gerente'];

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

export function obtenerClaveDiaElSalvador(fecha) {
  if (!fecha) return null;
  let d = fecha;
  if (typeof fecha.toDate === 'function') {
    d = fecha.toDate();
  } else if (!(fecha instanceof Date)) {
    d = new Date(fecha);
  }
  if (isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA_EL_SALVADOR }).format(d);
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

  const productos = Array.isArray(solicitud.productos) ? solicitud.productos : [];
  let fechaMasReciente = null;

  for (const p of productos) {
    let fItem = null;
    if (p?.fechaCotizacion) {
      fItem = typeof p.fechaCotizacion.toDate === 'function' ? p.fechaCotizacion.toDate() : new Date(p.fechaCotizacion);
    } else if (p?.negociacion?.ultimoCambio?.en) {
      const en = p.negociacion.ultimoCambio.en;
      fItem = typeof en.toDate === 'function' ? en.toDate() : new Date(en);
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

export function esItemEstancado(item, solicitud = null, { diasLimite = 5, fechaReferencia = new Date() } = {}) {
  if (!item) return false;

  const estadoItem = item.estadoItem || (Number(item.fob || 0) > 0 ? 'Cotizado' : 'Pendiente');
  if (estadoItem !== 'Cotizado') return false;

  let fechaResp = null;
  if (item.fechaCotizacion) {
    fechaResp = typeof item.fechaCotizacion.toDate === 'function' ? item.fechaCotizacion.toDate() : new Date(item.fechaCotizacion);
  } else if (item.negociacion?.ultimoCambio?.en) {
    const en = item.negociacion.ultimoCambio.en;
    fechaResp = typeof en.toDate === 'function' ? en.toDate() : new Date(en);
  }

  if (!fechaResp || isNaN(fechaResp.getTime())) {
    fechaResp = obtenerFechaRespuestaComprador(solicitud);
  }

  if (!fechaResp) return false;

  const dias = calcularDiasDesdeRespuesta(fechaResp, fechaReferencia);
  return dias >= diasLimite;
}

export function esCotizacionEstancada(solicitud, { diasLimite = 5, fechaReferencia = new Date() } = {}) {
  if (!solicitud) return false;

  const estado = solicitud.estado || solicitud.estadoGlobal;
  if (estado !== 'Cotizado') return false;

  const productos = Array.isArray(solicitud.productos) ? solicitud.productos : [];
  if (productos.length > 0) {
    return productos.some(p => esItemEstancado(p, solicitud, { diasLimite, fechaReferencia }));
  }

  const fechaResp = obtenerFechaRespuestaComprador(solicitud);
  if (!fechaResp) return false;

  const dias = calcularDiasDesdeRespuesta(fechaResp, fechaReferencia);
  return dias >= diasLimite;
}
