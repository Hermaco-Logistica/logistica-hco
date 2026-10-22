export const normalizarModalidadMovimiento = (item = {}, solicitud = {}) => {
  let modalidad = 'No asignada';
  const modalidadRaw = (item.modalidad || solicitud.modalidad || '').toString().trim();
  const modalidadLower = modalidadRaw.toLowerCase();

  if (modalidadRaw === 'A' || modalidadLower.includes('aéreo') || modalidadLower.includes('aere')) {
    modalidad = 'Aéreo';
  } else if (modalidadRaw === 'M' || modalidadLower.includes('marí') || modalidadLower.includes('marit')) {
    modalidad = 'Marítimo';
  }

  return modalidad;
};

export const normalizarEstadoItemMovimiento = (item = {}, solicitud = {}) => {
  let estadoItem = item.estadoItem;

  if (estadoItem === 'Pedido Parcial' || estadoItem === 'Comprado') {
    return 'Pedido';
  }

  if (estadoItem) return estadoItem;

  if (solicitud.estado === 'Pedido' || solicitud.estado === 'Comprado') {
    return 'Pedido';
  }

  if (solicitud.estado === 'Pedido Parcial') {
    const tienePrecio = Number(item.fob || item.precioUnitario || 0) > 0;
    return tienePrecio ? 'Cotizado' : 'Pendiente';
  }

  return solicitud.estado || 'Pendiente';
};

export const obtenerOcRefMovimiento = (item = {}, solicitud = {}) => (
  item.numOC || item.ocRef || item.numeroOC || solicitud.numeroOC || solicitud.linkOC || ''
);

export const obtenerMotivoMovimiento = (item = {}) => (
  item.motivoAnulacion || item.motivoEstadoItem || item.motivoDenegacion || item.motivoRechazo || ''
);

export const obtenerOpcionesMovimiento = (movimientos = [], campo) => (
  Array.from(new Set(movimientos.map((movimiento) => movimiento?.[campo]).filter(Boolean))).sort()
);
