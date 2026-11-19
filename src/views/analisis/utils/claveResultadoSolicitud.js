import { RESULTADO_SOLICITUD } from '../../../utils/resultadoSolicitud';

/**
 * Clave del catálogo de etiquetas (dominio "resultado", utils/etiquetas.js) para cada resultado de una solicitud de `resultadoSolicitud` (F8c).
 * "Ganada" y "Anulada" ya existían en el catálogo; "Ganada parcial", "Venta perdida", "Rechazada", "En curso" y "Sin ítems" son nuevas. Un valor desconocido cae en "En curso".
 */
const CLAVES = {
  [RESULTADO_SOLICITUD.GANADA]: 'ganada',
  [RESULTADO_SOLICITUD.GANADA_PARCIAL]: 'ganada_parcial',
  [RESULTADO_SOLICITUD.VENTA_PERDIDA]: 'venta_perdida',
  [RESULTADO_SOLICITUD.RECHAZADA]: 'rechazada',
  [RESULTADO_SOLICITUD.ANULADA]: 'anulada',
  [RESULTADO_SOLICITUD.EN_CURSO]: 'en_curso',
  [RESULTADO_SOLICITUD.SIN_ITEMS]: 'sin_items'
};

export const claveResultadoSolicitud = (resultado) => CLAVES[resultado] || 'en_curso';
