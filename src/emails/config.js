/**
 * Configuración de destinatarios de los correos del sistema.
 * Es el único lugar donde se editan las direcciones; ningún otro archivo debe escribirlas a mano.
 */

export const CORREO_COMPRAS = 'compras@hermaco.net';
export const CORREO_LOGISTICA = 'logisticahco@hermaco.net';

/** Remitentes cuando el correo no sale a nombre de una persona. */
export const REMITENTE_SISTEMA = `Sistema Logística Hermaco <${CORREO_COMPRAS}>`;
export const REMITENTE_COMPRAS = `Compras Hermaco <${CORREO_COMPRAS}>`;

/** En localhost TODO correo va solo a esta dirección (ver AGENTS.md). No usar destinatarios reales en pruebas. */
export const DESTINO_PRUEBAS = 'rvides@hermaco.net';

/** Direcciones que nunca deben recibir copia. */
export const CORREOS_EXCLUIDOS = ['oventura@hermaco.net', 'dhernandez@hermaco.net'];

/**
 * Destinatarios fijos por tipo de aviso. `to` y `cc` se combinan con las personas del evento
 * (vendedor o quien ejecuta la acción) en destinatarios.js.
 */
export const emailConfig = {
  // Compras termina una cotización (parcial o completa): sale al vendedor con el PDF.
  cotizacionFinalizada: { to: [CORREO_COMPRAS], cc: [CORREO_LOGISTICA] },
  // El vendedor crea una RFQ o un Pedido Manual.
  nuevaRFQ: { to: [CORREO_COMPRAS], cc: [CORREO_LOGISTICA] },
  // El vendedor genera un pedido.
  pedidoGenerado: { to: [CORREO_COMPRAS], cc: [CORREO_LOGISTICA] },
  // El vendedor registra una venta perdida.
  ventaPerdida: { to: [CORREO_COMPRAS], cc: [CORREO_LOGISTICA] },
  // El vendedor registra una revisión del cliente o pide una prórroga.
  seguimientoCliente: { to: [CORREO_COMPRAS], cc: [CORREO_LOGISTICA] },
  // Compras responde una prórroga o anula una solicitud: sale al vendedor.
  respuestaCompras: { to: [], cc: [CORREO_LOGISTICA] },
  // Conversación de negociación de un Pedido Manual (sin copias adicionales).
  negociacionCompras: { to: [], cc: [] },
  negociacionVendedor: { to: [CORREO_COMPRAS], cc: [] }
};
