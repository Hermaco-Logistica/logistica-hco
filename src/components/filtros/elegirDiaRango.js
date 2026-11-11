/**
 * Lógica pura del calendario de rango (la misma que repiten a mano DashboardVendedor, DashboardCompras, DashboardPedidos y GestionOC):
 *   elegirDiaRango(inicio, fin, dia) → { inicio, fin, cerrar }
 * - sin inicio, o con el rango ya completo: el toque empieza un rango nuevo (inicio = día, fin = null; un solo toque equivale a un día);
 * - con inicio y sin fin: un día anterior al inicio lo reemplaza y no cierra; en otro caso es el fin y `cerrar` pasa a true
 *   (el mismo día cuenta como fin: rango de un día).
 * `inicio`, `fin` y `dia` son Date a las 00:00 locales (o null).
 */
export const elegirDiaRango = (inicio, fin, dia) => {
  if (!inicio || fin) return { inicio: dia, fin: null, cerrar: false };
  if (dia < inicio) return { inicio: dia, fin: null, cerrar: false };
  return { inicio, fin: dia, cerrar: true };
};
