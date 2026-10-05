const ESTADOS_PEDIDO = ['Pedido', 'Comprado'];
const ESTADOS_DENEGADOS = ['Denegado', 'Rechazado', 'Cancelado'];

export const RESULTADOS_SOLICITUD = {
  COMPLETO: 'completo',
  CERRADO_CON_ANULACIONES: 'cerrado_con_anulaciones',
  PARCIAL: 'parcial',
  PARCIAL_CON_ANULACIONES: 'parcial_con_anulaciones',
  COTIZACION_COMPLETA_CON_ANULACIONES: 'cotizacion_completa_con_anulaciones',
  TOTALMENTE_ANULADO: 'totalmente_anulado',
  DENEGADO: 'denegado',
  EN_PROCESO: 'en_proceso'
};

export const clasificarSolicitud = (productos = [], estadoActual = 'Pendiente') => {
  const lista = Array.isArray(productos) ? productos : [];
  const anulados = lista.filter((p) => p?.estadoItem === 'Anulado');
  const activos = lista.filter((p) => p?.estadoItem !== 'Anulado');
  const pedidos = activos.filter((p) => ESTADOS_PEDIDO.includes(p?.estadoItem));
  const cotizados = activos.filter((p) => p?.estadoItem === 'Cotizado');
  const pendientes = activos.filter((p) => !ESTADOS_PEDIDO.includes(p?.estadoItem) && !ESTADOS_DENEGADOS.includes(p?.estadoItem) && p?.estadoItem !== 'Cotizado');
  const denegados = activos.filter((p) => ESTADOS_DENEGADOS.includes(p?.estadoItem));
  const tieneAnulaciones = anulados.length > 0;

  let estado = estadoActual || 'Pendiente';
  let resultado = RESULTADOS_SOLICITUD.EN_PROCESO;

  if (lista.length > 0 && activos.length === 0) {
    estado = 'Anulado';
    resultado = RESULTADOS_SOLICITUD.TOTALMENTE_ANULADO;
  } else if (activos.length > 0 && pedidos.length === activos.length) {
    estado = 'Pedido';
    resultado = tieneAnulaciones
      ? RESULTADOS_SOLICITUD.CERRADO_CON_ANULACIONES
      : RESULTADOS_SOLICITUD.COMPLETO;
  } else if (pedidos.length > 0) {
    estado = 'Pedido Parcial';
    resultado = tieneAnulaciones
      ? RESULTADOS_SOLICITUD.PARCIAL_CON_ANULACIONES
      : RESULTADOS_SOLICITUD.PARCIAL;
  } else if (cotizados.length === activos.length && activos.length > 0) {
    estado = 'Cotizado';
    resultado = tieneAnulaciones
      ? RESULTADOS_SOLICITUD.COTIZACION_COMPLETA_CON_ANULACIONES
      : RESULTADOS_SOLICITUD.COMPLETO;
  } else if (cotizados.length > 0) {
    estado = 'Cotizado Parcial';
    resultado = tieneAnulaciones
      ? RESULTADOS_SOLICITUD.PARCIAL_CON_ANULACIONES
      : RESULTADOS_SOLICITUD.PARCIAL;
  } else if (denegados.length === activos.length && activos.length > 0) {
    estado = 'Denegado';
    resultado = tieneAnulaciones
      ? RESULTADOS_SOLICITUD.PARCIAL_CON_ANULACIONES
      : RESULTADOS_SOLICITUD.DENEGADO;
  } else if (pendientes.length > 0) {
    estado = 'Pendiente';
    resultado = tieneAnulaciones
      ? RESULTADOS_SOLICITUD.PARCIAL_CON_ANULACIONES
      : RESULTADOS_SOLICITUD.EN_PROCESO;
  }

  return {
    estado,
    resultado,
    conteoItems: {
      total: lista.length,
      activos: activos.length,
      pedidos: pedidos.length,
      cotizados: cotizados.length,
      pendientes: pendientes.length,
      denegados: denegados.length,
      anulados: anulados.length
    },
    tieneAnulaciones
  };
};

export const etiquetaResultadoSolicitud = (resultado) => ({
  [RESULTADOS_SOLICITUD.COMPLETO]: 'Completo',
  [RESULTADOS_SOLICITUD.CERRADO_CON_ANULACIONES]: 'Cerrado con anulaciones',
  [RESULTADOS_SOLICITUD.PARCIAL]: 'Parcial',
  [RESULTADOS_SOLICITUD.PARCIAL_CON_ANULACIONES]: 'Parcial con anulaciones',
  [RESULTADOS_SOLICITUD.COTIZACION_COMPLETA_CON_ANULACIONES]: 'Cotización con anulaciones',
  [RESULTADOS_SOLICITUD.TOTALMENTE_ANULADO]: 'Totalmente anulado',
  [RESULTADOS_SOLICITUD.DENEGADO]: 'Denegado',
  [RESULTADOS_SOLICITUD.EN_PROCESO]: 'En proceso'
}[resultado] || 'En proceso');
