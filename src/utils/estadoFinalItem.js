/**
 * Estado final de un ítem (F8a). Función única que decide si un ítem está ganado, perdido, rechazado, anulado o abierto.
 * Las reglas, su orden y los casos están en docs/metricas.md (sección 4). La usan Productos, los Historiales, la lista de solicitudes y el dashboard.
 *
 * Pedido confirmado (F8c, commit 8): un ítem con estadoItem Pedido o Pedido Parcial y con `negociacion` solo es Ganado si `pedidoGenerado === true`
 * (la misma definición de `itemPedidoConfirmado` en utils/itemHelpers.js: sin negociación, RFQ y documentos viejos, sigue siendo Ganado). Un ítem
 * aprobado pero aún sin notificar (`sinNotificar`, sin `pedidoGenerado`) es abierto. El turno de la negociación no se mira. "Comprado" no cambia.
 */

export const ESTADO_FINAL = {
  GANADO: 'Ganado',
  VENTA_PERDIDA: 'Venta perdida',
  RECHAZO: 'Rechazo',
  ANULADO: 'Anulado',
  COTIZADO: 'Cotizado',
  PENDIENTE: 'Pendiente'
};

/** Motivos de `datoARevisarItem` (para el contador de "datos a revisar"). */
export const DATO_A_REVISAR = {
  COTIZADO_EN_PEDIDO: 'cotizado_en_pedido',
  GANADO_CON_MOTIVO_DE_VENTA_PERDIDA: 'estado_ganado_con_motivo_de_venta_perdida',
  GANADO_CON_MOTIVO_DE_RECHAZO: 'estado_ganado_con_motivo_de_rechazo',
  GANADO_CON_MOTIVO_DE_ANULACION: 'estado_ganado_con_motivo_de_anulacion',
  ESTADO_ITEM_DESCONOCIDO: 'estado_item_desconocido',
  /** Ítem Pedido o Pedido Parcial con negociación y sin `pedidoGenerado` (aprobado y sin notificar): cuenta como abierto, no como Ganado. */
  PEDIDO_SIN_CONFIRMAR: 'pedido_sin_confirmar',
  /** Ítem Pedido, Pedido Parcial o Comprado con pedido generado pero con un turno de negociación todavía abierto: cuenta como Ganado. */
  PEDIDO_CON_NEGOCIACION_ABIERTA: 'pedido_con_negociacion_abierta'
};

const ESTADOS_GANADO_EXPLICITO = ['Pedido', 'Comprado'];
const ESTADOS_RECHAZO = ['Rechazado', 'Cancelado', 'Denegado'];
const ESTADOS_SOLICITUD_RECHAZO = ['Denegado', 'Rechazado', 'Cancelado'];
const ESTADOS_SOLICITUD_CON_PRECIO = ['Cotizado', 'Cotizado Parcial', 'Pedido Parcial'];
// 'Pedido Parcial' no figura aquí: datoARevisarItem lo resuelve antes, en el bloque de pedidos (F8c, commit 8), y nunca llega a esta comprobación.
const ESTADOS_ITEM_CONOCIDOS = [
  ...ESTADOS_GANADO_EXPLICITO, ...ESTADOS_RECHAZO, 'Venta Perdida', 'Anulado', 'Cotizado', 'Pendiente'
];

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/** Un motivo cuenta si trae contenido (un objeto o un texto no vacío). */
const hayMotivo = (valor) => (typeof valor === 'string' ? valor.trim().length > 0 : Boolean(valor));

const tienePrecio = (item) => Number(item.fob) > 0 || Number(item.precioUnitario) > 0;

const ESTADOS_PEDIDO_CONFIRMABLE = ['Pedido', 'Pedido Parcial'];

/** ¿Es un ítem Pedido o Pedido Parcial con negociación y sin pedido generado (aprobado y sin notificar)? Sin negociación nunca. Comprado nunca. */
export const pedidoSinConfirmar = (item) => (
  Boolean(item) && ESTADOS_PEDIDO_CONFIRMABLE.includes(texto(item.estadoItem)) && Boolean(item.negociacion) && item.pedidoGenerado !== true
);

/** Estado de un pedido sin confirmar: Cotizado si tiene precio y Pendiente si no, como el resto de la regla. */
export const estadoDePedidoSinConfirmar = (item) => (tienePrecio(item || {}) ? ESTADO_FINAL.COTIZADO : ESTADO_FINAL.PENDIENTE);

/** Ítem sin `estadoItem` (o con uno desconocido): lo decide el estado de la solicitud. */
const estadoPorSolicitud = (solicitud, item) => {
  const estado = texto(solicitud.estado);
  if (ESTADOS_GANADO_EXPLICITO.includes(estado)) return ESTADO_FINAL.GANADO;
  if (estado === 'Venta Perdida') return ESTADO_FINAL.VENTA_PERDIDA;
  if (estado === 'Anulado') return ESTADO_FINAL.ANULADO;
  if (ESTADOS_SOLICITUD_RECHAZO.includes(estado)) return ESTADO_FINAL.RECHAZO;
  if (ESTADOS_SOLICITUD_CON_PRECIO.includes(estado)) return tienePrecio(item) ? ESTADO_FINAL.COTIZADO : ESTADO_FINAL.PENDIENTE;
  return ESTADO_FINAL.PENDIENTE;
};

/**
 * Estado final de un ítem de una solicitud: uno de los seis valores de `ESTADO_FINAL`.
 * La primera regla que coincide gana. Un `estadoItem` explícito Pedido o Comprado gana a los motivos sueltos (rechazo, anulación y venta
 * perdida del ítem): el conflicto se informa en `datoARevisarItem`. La bandera `motivoVentaPerdida` de la raíz de la solicitud no decide
 * nada sobre un ítem que tiene estado propio. Nunca lanza: una solicitud o un ítem nulos se tratan como objetos vacíos.
 */
export function estadoFinalItem(solicitud, item) {
  const sol = solicitud || {};
  const it = item || {};
  const estadoItem = texto(it.estadoItem);

  if (ESTADOS_GANADO_EXPLICITO.includes(estadoItem)) return pedidoSinConfirmar(it) ? estadoDePedidoSinConfirmar(it) : ESTADO_FINAL.GANADO;
  if (estadoItem === 'Venta Perdida' || hayMotivo(it.motivoVentaPerdida)) return ESTADO_FINAL.VENTA_PERDIDA;
  if (ESTADOS_RECHAZO.includes(estadoItem) || hayMotivo(it.motivoRechazo)) return ESTADO_FINAL.RECHAZO;
  if (estadoItem === 'Anulado' || hayMotivo(it.motivoAnulacion)) return ESTADO_FINAL.ANULADO;
  if (estadoItem === 'Pedido Parcial') return pedidoSinConfirmar(it) ? estadoDePedidoSinConfirmar(it) : ESTADO_FINAL.GANADO;
  if (estadoItem === 'Cotizado') return ESTADO_FINAL.COTIZADO;
  if (estadoItem === 'Pendiente') return ESTADO_FINAL.PENDIENTE;
  return estadoPorSolicitud(sol, it);
}

/**
 * Motivo por el que el dato de un ítem merece una revisión, o `null`. No cambia el estado del ítem: sirve al contador de "datos a revisar".
 * Con varios motivos sueltos sobre un ítem Pedido o Comprado se informa uno solo: venta perdida, rechazo y anulación, en ese orden.
 * Un pedido sin confirmar (aprobado y sin notificar) se informa antes que los motivos; un pedido con pedido generado y un turno de negociación
 * abierto se informa después de ellos.
 */
export function datoARevisarItem(solicitud, item) {
  const sol = solicitud || {};
  const it = item || {};
  const estadoItem = texto(it.estadoItem);

  if (ESTADOS_GANADO_EXPLICITO.includes(estadoItem) || estadoItem === 'Pedido Parcial') {
    if (pedidoSinConfirmar(it)) return DATO_A_REVISAR.PEDIDO_SIN_CONFIRMAR;
    if (ESTADOS_GANADO_EXPLICITO.includes(estadoItem)) {
      if (hayMotivo(it.motivoVentaPerdida)) return DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_VENTA_PERDIDA;
      if (hayMotivo(it.motivoRechazo)) return DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_RECHAZO;
      if (hayMotivo(it.motivoAnulacion)) return DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_ANULACION;
    }
    if (it.negociacion && it.negociacion.turno) return DATO_A_REVISAR.PEDIDO_CON_NEGOCIACION_ABIERTA;
    return null;
  }
  if (estadoItem === 'Cotizado' && ESTADOS_GANADO_EXPLICITO.includes(texto(sol.estado))) return DATO_A_REVISAR.COTIZADO_EN_PEDIDO;
  if (estadoItem && !ESTADOS_ITEM_CONOCIDOS.includes(estadoItem)) return DATO_A_REVISAR.ESTADO_ITEM_DESCONOCIDO;
  return null;
}

/** Un ítem está cerrado si su estado final es Ganado, Venta perdida, Rechazo o Anulado; abierto si es Cotizado o Pendiente. */
export const esEstadoCerrado = (estado) => (
  estado === ESTADO_FINAL.GANADO ||
  estado === ESTADO_FINAL.VENTA_PERDIDA ||
  estado === ESTADO_FINAL.RECHAZO ||
  estado === ESTADO_FINAL.ANULADO
);
