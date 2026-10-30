/** Determina si un ítem concluyó su ciclo comercial u operativo. */
export function esItemCerrado(item) {
  if (!item) return false;
  const estado = String(item.estadoItem || item.estado || '').trim().toLocaleLowerCase('es');
  if ([
    'pedido', 'comprado', 'anulado', 'anulada', 'venta perdida',
    'cancelado', 'cancelada', 'rechazado', 'rechazada', 'denegado', 'denegada'
  ].includes(estado)) {
    return true;
  }
  if (item.motivoVentaPerdida || item.motivoAnulacion || item.motivoDenegacion || item.motivoRechazo) {
    return true;
  }
  if (item.negociacion?.resultado && item.negociacion.resultado !== 'pendiente') {
    return true;
  }
  return Boolean(item.pedidoGenerado || item.idPedidoRelacionado);
}
