const CONFIGURACION_DECISIONES = {
  anulados: {
    titulo: 'Anulaciones',
    sustantivo: 'anulaciones',
    etiqueta: 'Ítem Anulado',
    estado: 'Anulado'
  },
  'ventas-perdidas': {
    titulo: 'Ventas perdidas',
    sustantivo: 'ventas perdidas',
    etiqueta: 'Venta perdida',
    estado: 'Venta Perdida'
  },
  rechazos: {
    titulo: 'Rechazos',
    sustantivo: 'rechazos',
    etiqueta: 'Rechazo',
    estado: 'Rechazo'
  }
};

export const normalizarDecisionFilter = (value) => (
  CONFIGURACION_DECISIONES[value] ? value : 'anulados'
);

export const obtenerConfiguracionDecision = (value) => (
  CONFIGURACION_DECISIONES[normalizarDecisionFilter(value)]
);

export const obtenerEstadoDecision = (value) => (
  obtenerConfiguracionDecision(value).estado
);

export const obtenerEtiquetaDecision = (value) => (
  obtenerConfiguracionDecision(value).etiqueta
);
