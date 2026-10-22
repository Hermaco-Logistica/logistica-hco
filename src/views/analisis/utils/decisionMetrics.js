const ESTADOS_RECHAZO = new Set(['Rechazado', 'Cancelado', 'Denegado']);

export const esVentaPerdida = (solicitud, item) => (
  item?.estadoItem === 'Venta Perdida' ||
  Boolean(item?.motivoVentaPerdida) ||
  solicitud?.estado === 'Venta Perdida' ||
  Boolean(solicitud?.motivoVentaPerdida)
);

export const esRechazo = (solicitud, item = null) => (
  ESTADOS_RECHAZO.has(item?.estadoItem) ||
  Boolean(item?.motivoRechazo) ||
  ESTADOS_RECHAZO.has(solicitud?.estado) ||
  Boolean(solicitud?.motivoRechazo)
);

export const obtenerDecisionItem = (solicitud, item) => {
  if (esVentaPerdida(solicitud, item)) return 'Venta Perdida';
  if (esRechazo(solicitud, item)) return 'Rechazo';
  if (item?.estadoItem === 'Anulado') return 'Anulado';
  return null;
};

export const contarDecisiones = (solicitud) => {
  const productos = Array.isArray(solicitud?.productos) ? solicitud.productos : [];
  return productos.reduce((acc, item) => {
    const decision = obtenerDecisionItem(solicitud, item);
    if (decision === 'Venta Perdida') acc.ventasPerdidas += 1;
    if (decision === 'Rechazo') acc.rechazos += 1;
    if (decision === 'Anulado') acc.anulaciones += 1;
    return acc;
  }, { ventasPerdidas: 0, rechazos: 0, anulaciones: 0 });
};

export const tieneVentaPerdida = (solicitud) => (
  esVentaPerdida(solicitud) || contarDecisiones(solicitud).ventasPerdidas > 0
);

export const tieneRechazo = (solicitud) => (
  contarDecisiones(solicitud).rechazos > 0
);
