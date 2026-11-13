/**
 * Resultado de una solicitud (F8a): se calcula una vez por solicitud a partir del estado final de todos sus ítems (`estadoFinalItem`).
 * Las reglas están en docs/metricas.md (sección 5). Todavía no la usa ninguna pantalla. No sustituye a `clasificarSolicitud`, que sigue
 * sirviendo al filtro de resultado del dashboard.
 */
import { ESTADO_FINAL, esEstadoCerrado, estadoFinalItem } from './estadoFinalItem';

export const RESULTADO_SOLICITUD = {
  GANADA: 'Ganada',
  GANADA_PARCIAL: 'Ganada parcial',
  PERDIDA: 'Perdida',
  ANULADA: 'Anulada',
  EN_CURSO: 'En curso',
  SIN_ITEMS: 'Sin ítems'
};

/**
 * Resultado de una solicitud y sus conteos por ítem.
 * - Ganada: todos los ítems están Ganado (y hay al menos uno).
 * - Ganada parcial: al menos un ítem Ganado y otro que no lo está (un Anulado cuenta como "no ganado").
 * - Perdida: ningún Ganado, ningún abierto y al menos un ítem en Venta perdida o Rechazo.
 * - Anulada: ningún Ganado, ningún abierto y todos los ítems cerrados son Anulado.
 * - En curso: ningún Ganado y al menos un ítem abierto (Cotizado o Pendiente).
 * - Sin ítems: la solicitud no tiene productos.
 */
export function resultadoSolicitud(solicitud) {
  const productos = Array.isArray(solicitud?.productos) ? solicitud.productos : [];
  const cuenta = { ganados: 0, ventasPerdidas: 0, rechazos: 0, anulados: 0, abiertos: 0 };

  productos.forEach((item) => {
    const estado = estadoFinalItem(solicitud, item);
    if (estado === ESTADO_FINAL.GANADO) cuenta.ganados += 1;
    else if (estado === ESTADO_FINAL.VENTA_PERDIDA) cuenta.ventasPerdidas += 1;
    else if (estado === ESTADO_FINAL.RECHAZO) cuenta.rechazos += 1;
    else if (estado === ESTADO_FINAL.ANULADO) cuenta.anulados += 1;
    if (!esEstadoCerrado(estado)) cuenta.abiertos += 1;
  });

  const total = productos.length;
  const cerrados = total - cuenta.abiertos;

  let resultado;
  if (total === 0) resultado = RESULTADO_SOLICITUD.SIN_ITEMS;
  else if (cuenta.ganados === total) resultado = RESULTADO_SOLICITUD.GANADA;
  else if (cuenta.ganados > 0) resultado = RESULTADO_SOLICITUD.GANADA_PARCIAL;
  else if (cuenta.abiertos > 0) resultado = RESULTADO_SOLICITUD.EN_CURSO;
  else if (cuenta.ventasPerdidas + cuenta.rechazos > 0) resultado = RESULTADO_SOLICITUD.PERDIDA;
  else resultado = RESULTADO_SOLICITUD.ANULADA;

  return { resultado, total, cerrados, ...cuenta };
}

/** Cuenta cuántas solicitudes son Ganada y cuántas Ganada parcial (una vez cada una). `total` es el número de solicitudes evaluadas. */
export function resumirGanadas(solicitudes) {
  const lista = Array.isArray(solicitudes) ? solicitudes : [];
  let ganadas = 0;
  let parciales = 0;
  lista.forEach((solicitud) => {
    const { resultado } = resultadoSolicitud(solicitud);
    if (resultado === RESULTADO_SOLICITUD.GANADA) ganadas += 1;
    else if (resultado === RESULTADO_SOLICITUD.GANADA_PARCIAL) parciales += 1;
  });
  return { ganadas, parciales, total: lista.length };
}

/** Texto "N (+M parc.)", o solo "N" si no hay parciales. */
export const formatoGanadas = ({ ganadas = 0, parciales = 0 } = {}) => (
  parciales > 0 ? `${ganadas} (+${parciales} parc.)` : String(ganadas)
);
