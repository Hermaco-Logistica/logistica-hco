/**
 * Aviso de éxito del modal global (GlobalAlertModal). `window.alert` solo recibe texto, así que no distingue un
 * éxito de un error: esta función lo marca con un tercer argumento. Cualquier otro valor (o ninguno) deja el
 * aspecto de siempre del aviso.
 *
 *   avisarExito('Solicitud anulada correctamente');
 *   avisarExito('Solicitud Creada', () => navigate('/vendedor'));   // el callback corre al pulsar OK
 */
export const TONO_AVISO_EXITO = 'exito';

export const avisarExito = (mensaje, alCerrar) => window.alert(mensaje, alCerrar, TONO_AVISO_EXITO);
