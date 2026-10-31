/**
 * Helpers para cálculo de cotizaciones estancadas (>5 días sin seguimiento)
 * Zona horaria oficial: America/El_Salvador (UTC-6)
 */
import { convertirFechaSeguimiento, sumarDiasHabiles } from './diasHabiles';
import { claseEscalaUrgencia } from './etiquetas';

export const ZONA_HORARIA_EL_SALVADOR = 'America/El_Salvador';

/**
 * Roles sujetos a bloqueo por cotizaciones estancadas.
 * Administradores y compradores están formalmente exentos.
 */
export const ROLES_CON_BLOQUEO = ['vendedor', 'gerente'];

export const DIAS_VALIDEZ_DEFAULT_RFQ = 5;
export const DIAS_VALIDEZ_DEFAULT_PEDIDO_MANUAL = 10;

/**
 * Obtiene la cantidad de dias de validez configurada para una solicitud.
 * Las solicitudes nuevas guardan diasValidez; las antiguas se resuelven desde
 * el texto validez y, finalmente, usan el default de su tipo.
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

export function extraerDiasValidez(valor, tipo = 'RFQ') {
  const coincidencia = String(valor || '').match(/\d+/);
  const dias = coincidencia ? Number(coincidencia[0]) : 0;
  if (Number.isFinite(dias) && dias > 0) return Math.floor(dias);
  return tipo === 'Pedido Manual'
    ? DIAS_VALIDEZ_DEFAULT_PEDIDO_MANUAL
    : DIAS_VALIDEZ_DEFAULT_RFQ;
}

/**
 * Determina si un rol o usuario está sujeto a bloqueo.
 * Acepta string de rol o un objeto de usuario con propiedad `role` o `rol`.
 */
export function esRolBloqueable(roleOrUser) {
  if (!roleOrUser) return false;
  let r = '';
  if (typeof roleOrUser === 'string') {
    r = roleOrUser;
  } else if (typeof roleOrUser === 'object') {
    r = roleOrUser.role || roleOrUser.rol || '';
  }
  const norm = String(r).trim().toLowerCase();
  return ROLES_CON_BLOQUEO.includes(norm);
}

// Se crea una sola vez: construir un Intl.DateTimeFormat por llamada era el costo dominante del cálculo de seguimiento.
const FORMATEADOR_DIA_EL_SALVADOR = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA_EL_SALVADOR });

/**
 * Convierte cualquier fecha a clave de día YYYY-MM-DD en la zona horaria de El Salvador.
 * Soporta Date, Firestore Timestamp (.toDate()) y string ISO.
 */
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

/**
 * Determina si una clave de día YYYY-MM-DD (o fecha) corresponde a domingo en El Salvador.
 */
export function esDomingoEnElSalvador(claveODate) {
  const clave = typeof claveODate === 'string' && claveODate.includes('-')
    ? claveODate
    : obtenerClaveDiaElSalvador(claveODate);
  if (!clave) return false;

  const [y, m, d] = clave.split('-').map(Number);
  // Mediodía UTC garantiza estabilidad absoluta del día de la semana
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay() === 0;
}

/**
 * Extrae la fecha de respuesta de compras de una solicitud o ítem.
 */
export function obtenerFechaRespuestaComprador(solicitud) {
  if (!solicitud) return null;

  // 1. Prioridad: fechaCotizacion directa en raíz
  if (solicitud.fechaCotizacion) {
    if (typeof solicitud.fechaCotizacion.toDate === 'function') return solicitud.fechaCotizacion.toDate();
    if (solicitud.fechaCotizacion instanceof Date) return solicitud.fechaCotizacion;
    const parsed = new Date(solicitud.fechaCotizacion);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // 2. fechaRespuestaComprador o ultimaNotificacion.en
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

  // 3. Buscar en productos si alguno tiene fechaCotizacion o ultimoCambio
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

  // 4. Fallback a fecha de creación (fechaS)
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

/**
 * Calcula días hábiles transcurridos sin domingos en la zona horaria de El Salvador.
 * Permite inyectar fechaReferencia para tests deterministas.
 */
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

/** Escala de color por días transcurridos; el estilo vive en utils/etiquetas.js. */
export const obtenerEscalaRojoTiempo = claseEscalaUrgencia;

export function calcularTotalesCotizados(solicitud, { soloEstancados = false } = {}) {
  const productos = Array.isArray(solicitud?.productos) ? solicitud.productos : [];
  let totalAereo = 0;
  let totalMaritimo = 0;

  const esPedidoManual = solicitud?.tipo === 'Pedido Manual';

  if (esPedidoManual) {
    for (const p of productos) {
      if (
        p.estadoItem === 'Anulado' ||
        p.estadoItem === 'Denegado' ||
        p.estadoItem === 'Cancelado' ||
        p.estadoItem === 'Venta Perdida' ||
        p.estadoItem === 'Pedido' ||
        p.pedidoGenerado ||
        p.idPedidoRelacionado
      ) continue;
      if (soloEstancados && !p._esEstancado) continue;

      const cant = Number(p.cant || 1);
      const fob = Number(p.fob || p.precio || 0);
      const subtotal = Number(p.subtotal || (fob * cant));

      if (p.modalidad === 'Marítimo') {
        totalMaritimo += subtotal;
      } else {
        totalAereo += subtotal;
      }
    }
  } else {
    const factorARfq = Number(solicitud?.factorA || 1);
    const factorMRfq = Number(solicitud?.factorM || 1.08);

    for (const p of productos) {
      if (
        p.estadoItem === 'Anulado' ||
        p.estadoItem === 'Denegado' ||
        p.estadoItem === 'Cancelado' ||
        p.estadoItem === 'Venta Perdida' ||
        p.estadoItem === 'Pedido' ||
        p.estadoItem === 'Comprado' ||
        p.pedidoGenerado ||
        p.idPedidoRelacionado
      ) continue;
      if (soloEstancados && !p._esEstancado) continue;

      const fob = Number(p.fob || 0);
      if (fob <= 0) continue;

      const cant = Number(p.cant || 1);
      const factorA = Number(p.factorA || factorARfq || 1);
      const factorM = Number(p.factorM || factorMRfq || 1.08);
      const fva = Number(p.fva || 1.3);
      const fvm = Number(p.fvm || 1.25);

      totalAereo += fob * factorA * fva * cant;
      totalMaritimo += fob * factorM * fvm * cant;
    }
  }

  return {
    totalAereo: Math.round(totalAereo * 100) / 100,
    totalMaritimo: Math.round(totalMaritimo * 100) / 100
  };
}

/**
 * Determina si un ítem individual está estancado (>= 5 días hábiles sin domingo en El Salvador).
 */
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

/**
 * Evalúa si una cotización está estancada.
 * Aplica para estados 'Cotizado', 'Pedido Parcial' y 'Cotizado Parcial'.
 * Si tiene al menos un ítem estancado, o si no tiene array de productos pero el doc está en Cotizado con >= diasLimite.
 */
export function esCotizacionEstancada(solicitud, { diasLimite = null, fechaReferencia = new Date() } = {}) {
  if (!solicitud) return false;

  const estado = solicitud.estado || solicitud.estadoGlobal;
  const estadosPermitidos = ['Cotizado', 'Pedido Parcial', 'Cotizado Parcial'];
  if (!estadosPermitidos.includes(estado)) return false;

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

export function filtrarCotizacionesEstancadas(solicitudes = [], usuarioEmail = '', { diasLimite = null, fechaReferencia = new Date() } = {}) {
  const emailNorm = (usuarioEmail || '').trim().toLowerCase();

  return (solicitudes || [])
    .filter((s) => {
      if (!s) return false;
      if (emailNorm) {
        const vEmail = (s.vendedorEmail || '').trim().toLowerCase();
        if (vEmail !== emailNorm) return false;
      }
      return esCotizacionEstancada(s, { diasLimite, fechaReferencia });
    })
    .map((s) => {
      const fechaResp = obtenerFechaRespuestaComprador(s);
      const diasTranscurridos = calcularDiasDesdeRespuesta(fechaResp, fechaReferencia);

      // Mapear productos marcando cuáles están estancados individualmente y sus días
      const productosAnotados = (s.productos || []).map((p, idx) => {
        let fItem = null;
        if (p.seguimientoCliente?.estado === 'en_revision' && p.seguimientoCliente?.fechaRevision) {
          fItem = typeof p.seguimientoCliente.fechaRevision.toDate === 'function'
            ? p.seguimientoCliente.fechaRevision.toDate()
            : new Date(p.seguimientoCliente.fechaRevision);
        } else if (p.fechaCotizacion) {
          fItem = typeof p.fechaCotizacion.toDate === 'function' ? p.fechaCotizacion.toDate() : new Date(p.fechaCotizacion);
        } else if (p.negociacion?.ultimoCambio?.en) {
          const en = p.negociacion.ultimoCambio.en;
          fItem = typeof en.toDate === 'function' ? en.toDate() : new Date(en);
        } else {
          fItem = fechaResp;
        }

        const diasItem = fItem ? calcularDiasDesdeRespuesta(fItem, fechaReferencia) : diasTranscurridos;
        const estancado = esItemEstancado(p, s, { diasLimite, fechaReferencia, indice: idx });

        return {
          ...p,
          _idxOriginal: idx,
          _esEstancado: estancado,
          _diasItem: diasItem
        };
      });

      const itemsEstancados = productosAnotados.filter(p => p._esEstancado);
      const { totalAereo, totalMaritimo } = calcularTotalesCotizados({ ...s, productos: productosAnotados });
      const totalesEstancados = calcularTotalesCotizados({ ...s, productos: productosAnotados }, { soloEstancados: true });

      const diasCalculados = itemsEstancados.length > 0
        ? Math.max(...itemsEstancados.map(it => it._diasItem || 0))
        : diasTranscurridos;

      return {
        ...s,
        fechaRespuestaCompradorParsed: fechaResp,
        diasTranscurridos: diasCalculados,
        totalAereo,
        totalMaritimo,
        totalesEstancados,
        itemsEstancados,
        productosAnotados
      };
    })
    .sort((a, b) => b.diasTranscurridos - a.diasTranscurridos);
}
