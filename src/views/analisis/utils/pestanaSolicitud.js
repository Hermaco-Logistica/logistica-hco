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

/** Texto del indicador de la columna "Estado" (F8c, commit 6) y su `title`: una sola frase que explica por qué difiere. */
export const textoEstadoSegunItems = (recalculado) => `Según ítems: ${recalculado}`;
export const TITULO_ESTADO_SEGUN_ITEMS = 'El estado guardado no coincide con el que resulta de los ítems de la solicitud; las pestañas por estado usan el que resulta de los ítems.';

/** Pestaña por estado a la que pertenece un estado (cotizadas, pedidos...) o `null` si ninguna pestaña por estado lo agrupa (Denegado, Venta Perdida, Anulado). */
const grupoDeEstado = (estado) => Object.keys(ESTADOS_DE_PESTANA).find((pestana) => ESTADOS_DE_PESTANA[pestana].includes(estado)) ?? null;

/**
 * Estado recalculado de la solicitud SOLO si difiere del guardado POR GRUPO DE PESTAÑA y la lista está en una pestaña por estado o en "Todas";
 * si no, `null`. Una diferencia dentro del mismo grupo (Cotizado ↔ Cotizado Parcial, Pedido ↔ Comprado) no se avisa: la solicitud está en la
 * misma pestaña con cualquiera de los dos.
 * Las demás pestañas (En seguimiento, Anuladas, Con ítems anulados, Ventas perdidas) nunca lo llevan. El Excel no lo incluye.
 */
export const estadoRecalculadoSiDifiere = (solicitud, pestana) => {
  if (!esPestanaPorEstado(pestana) && pestana !== 'todas') return null;
  const guardado = solicitud?.estado || 'Pendiente';
  const recalculado = estadoRecalculado(solicitud);
  if (recalculado === guardado) return null;
  const grupo = grupoDeEstado(guardado);
  return grupo !== null && grupo === grupoDeEstado(recalculado) ? null : recalculado;
};

/** ¿Pertenece la solicitud a la pestaña según su estado recalculado? Una pestaña que no se decide por estado nunca la contiene. */
export const perteneceAPestanaPorEstado = (solicitud, pestana) => (
  esPestanaPorEstado(pestana) && ESTADOS_DE_PESTANA[pestana].includes(estadoRecalculado(solicitud))
);
