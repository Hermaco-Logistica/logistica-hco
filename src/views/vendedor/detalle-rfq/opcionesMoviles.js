/**
 * Opciones que despliega el botón flotante de DetalleRFQ en móvil (< md):
 * - exportar la cotización, si la solicitud ya no está Pendiente;
 * - consultar los motivos de los ítems afectados, si hay decisiones en una cotización parcial;
 * - consultar las ventas perdidas, si las hay en una cotización parcial.
 * "Cotización parcial" y "Pedido ya generado" no cuentan: en ese menú están ocultas.
 * Si no hay ninguna, el botón flotante no se muestra (abriría un menú vacío).
 */
export const contarOpcionesMoviles = ({ estado, hayDecisionesEnParcial, hayVentaPerdidaEnParcial }) => (
  [estado !== 'Pendiente', hayDecisionesEnParcial, hayVentaPerdidaEnParcial].filter(Boolean).length
);
