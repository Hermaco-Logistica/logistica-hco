import { estadoFinalItem, ESTADO_FINAL } from '../../../utils/estadoFinalItem';

/**
 * Reparto completas · parciales de la fila "Respondido por Compras" del dashboard (F8b).
 *
 * El conjunto de solicitudes de la fila no se decide aquí: lo fija `clasificarSolicitud` (estado Cotizado o Cotizado Parcial).
 * Aquí solo se reparte ese conjunto, con el estado final de cada ítem (`estadoFinalItem`) y no con el estado guardado de la solicitud:
 *  - Completa: todos los ítems, salvo los Anulados, tienen estado final Cotizado. Los Anulados no cuentan, igual que en `clasificarSolicitud`.
 *  - Parcial: al menos un ítem no anulado tiene otro estado final (Pendiente, Ganado, Venta perdida o Rechazo): la cotización no cubre
 *    toda la solicitud.
 * Un ítem sin `estadoItem` lo resuelve `estadoFinalItem` con el estado de la solicitud: con precio es Cotizado y sin precio, Pendiente.
 * Sin ítems, o con todos anulados, la solicitud es completa.
 */
export function esRespondidaCompleta(solicitud) {
  const productos = Array.isArray(solicitud?.productos) ? solicitud.productos : [];
  return productos.every((p) => {
    const estado = estadoFinalItem(solicitud, p);
    return estado === ESTADO_FINAL.COTIZADO || estado === ESTADO_FINAL.ANULADO;
  });
}
