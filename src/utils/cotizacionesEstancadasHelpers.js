/**
 * Helpers para cálculo de cotizaciones estancadas (>5 días sin seguimiento)
 * Zona horaria oficial: America/El_Salvador (UTC-6)
 */

export const ZONA_HORARIA_EL_SALVADOR = 'America/El_Salvador';

/**
 * Roles sujetos a bloqueo por cotizaciones estancadas.
 * Administradores y compradores están formalmente exentos.
 */
export const ROLES_CON_BLOQUEO = ['vendedor', 'gerente'];

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

  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA_EL_SALVADOR }).format(d);
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

export function obtenerEscalaRojoTiempo(dias) {
  if (dias < 5) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (dias === 5) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (dias <= 7) return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
  if (dias <= 9) return 'bg-rose-200 text-rose-900 border-rose-400 font-black';
  return 'bg-rose-600 text-white border-rose-700 font-black';
}

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
export function esItemEstancado(item, solicitud = null, { diasLimite = 5, fechaReferencia = new Date() } = {}) {
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

  // Fecha de cotización del ítem o fallback a la de la solicitud
  let fechaResp = null;
  if (item.fechaCotizacion) {
    fechaResp = typeof item.fechaCotizacion.toDate === 'function' ? item.fechaCotizacion.toDate() : new Date(item.fechaCotizacion);
  } else if (item.negociacion?.ultimoCambio?.en) {
    const en = item.negociacion.ultimoCambio.en;
    fechaResp = typeof en.toDate === 'function' ? en.toDate() : new Date(en);
  } else if (item.negociacion?.ofertaVigente?.creadaEn) {
    const cr = item.negociacion.ofertaVigente.creadaEn;
    fechaResp = typeof cr.toDate === 'function' ? cr.toDate() : new Date(cr);
  }

  if (!fechaResp || isNaN(fechaResp.getTime())) {
    fechaResp = obtenerFechaRespuestaComprador(solicitud);
  }

  if (!fechaResp) return false;

  const dias = calcularDiasDesdeRespuesta(fechaResp, fechaReferencia);
  return dias >= diasLimite;
}

/**
 * Evalúa si una cotización está estancada.
 * Aplica para estados 'Cotizado', 'Pedido Parcial' y 'Cotizado Parcial'.
 * Si tiene al menos un ítem estancado, o si no tiene array de productos pero el doc está en Cotizado con >= diasLimite.
 */
export function esCotizacionEstancada(solicitud, { diasLimite = 5, fechaReferencia = new Date() } = {}) {
  if (!solicitud) return false;

  const estado = solicitud.estado || solicitud.estadoGlobal;
  const estadosPermitidos = ['Cotizado', 'Pedido Parcial', 'Cotizado Parcial'];
  if (!estadosPermitidos.includes(estado)) return false;

  const productos = Array.isArray(solicitud.productos) ? solicitud.productos : [];
  if (productos.length > 0) {
    return productos.some(p => esItemEstancado(p, solicitud, { diasLimite, fechaReferencia }));
  }

  // Solicitudes sin desglose de productos solo aplican en Cotizado puro
  if (estado !== 'Cotizado') return false;

  const fechaResp = obtenerFechaRespuestaComprador(solicitud);
  if (!fechaResp) return false;

  const dias = calcularDiasDesdeRespuesta(fechaResp, fechaReferencia);
  return dias >= diasLimite;
}

export function filtrarCotizacionesEstancadas(solicitudes = [], usuarioEmail = '', { diasLimite = 5, fechaReferencia = new Date() } = {}) {
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
        if (p.fechaCotizacion) {
          fItem = typeof p.fechaCotizacion.toDate === 'function' ? p.fechaCotizacion.toDate() : new Date(p.fechaCotizacion);
        } else if (p.negociacion?.ultimoCambio?.en) {
          const en = p.negociacion.ultimoCambio.en;
          fItem = typeof en.toDate === 'function' ? en.toDate() : new Date(en);
        } else {
          fItem = fechaResp;
        }

        const diasItem = fItem ? calcularDiasDesdeRespuesta(fItem, fechaReferencia) : diasTranscurridos;
        const estancado = esItemEstancado(p, s, { diasLimite, fechaReferencia });

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
