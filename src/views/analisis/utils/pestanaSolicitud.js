import { clasificarSolicitud } from '../../../utils/clasificarSolicitud';

/**
 * Pestañas de la lista de solicitudes que se deciden por el estado de la solicitud (F8c, commit 5). Con el estado RECALCULADO desde los ítems
 * (`clasificarSolicitud`, el mismo que usan las filas del dashboard), no con el estado guardado. Así la pestaña y la fila del dashboard del
 * mismo nombre dan el mismo número con el mismo período, vendedor y cliente.
 *
 * Cada pestaña agrupa los estados que ya agrupaba: "Cotizadas" junta Cotizado y Cotizado Parcial; "Pedidos", Pedido y Comprado (clasificarSolicitud
 * solo devuelve Comprado si la solicitud no tiene ítems y así venía guardada). Las demás pestañas (Todas, En seguimiento, Anuladas, Con ítems
 * anulados y Ventas perdidas / rechazos) no usan este ayudante.
 */
export const ESTADOS_DE_PESTANA = {
  pendiente: ['Pendiente'],
  cotizadas: ['Cotizado', 'Cotizado Parcial'],
  pedidos: ['Pedido', 'Comprado'],
  parciales: ['Pedido Parcial']
};

/** ¿Esta pestaña se decide por el estado recalculado? */
export const esPestanaPorEstado = (pestana) => Object.prototype.hasOwnProperty.call(ESTADOS_DE_PESTANA, pestana);

/** Estado de la solicitud recalculado desde sus ítems (el del dashboard). Una solicitud sin lista de ítems conserva el guardado, o Pendiente. */
export const estadoRecalculado = (solicitud) => clasificarSolicitud(solicitud?.productos, solicitud?.estado).estado;

/** ¿Pertenece la solicitud a la pestaña según su estado recalculado? Una pestaña que no se decide por estado nunca la contiene. */
export const perteneceAPestanaPorEstado = (solicitud, pestana) => (
  esPestanaPorEstado(pestana) && ESTADOS_DE_PESTANA[pestana].includes(estadoRecalculado(solicitud))
);
