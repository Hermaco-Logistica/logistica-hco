export const ESTADOS_SISTEMA = {
  PEDIDO: 'Pedido',
  TRANSITO: 'Tránsito',
  ADUANA: 'Aduana',
  RECIBIDO: 'Recibido',
};

const JERARQUIA_ESTADOS = {
  [ESTADOS_SISTEMA.PEDIDO]: 1,
  [ESTADOS_SISTEMA.TRANSITO]: 2,
  [ESTADOS_SISTEMA.ADUANA]: 3,
  [ESTADOS_SISTEMA.RECIBIDO]: 4,
};

const DHL_RECIBIDO_CODES = new Set(['OK', 'DELIVERED']);
const DHL_ADUANA_CODES = new Set(['RR', 'IC', 'UD', 'CR']);
const DHL_TRANSITO_CODES = new Set(['PU', 'PL', 'AF', 'DF', 'TR', 'WC', 'OH']);

export function interpretarEstadoLogistico(trackingPayload, estadoActual = ESTADOS_SISTEMA.PEDIDO) {
  if (!trackingPayload || trackingPayload.status === 'NOT_FOUND') return estadoActual;

  const provider = String(trackingPayload.provider || trackingPayload.source || '').toUpperCase();
  let nuevoEstado = estadoActual;

  if (provider === 'DSV') {
    const hasActivity = (trackingPayload.events?.length > 0) || (trackingPayload.status && trackingPayload.status !== 'UNKNOWN');
    if (hasActivity) nuevoEstado = ESTADOS_SISTEMA.TRANSITO;
  } else if (provider === 'DHL') {
    const rawStatus = String(
      trackingPayload.status ||
      trackingPayload.raw?.shipments?.[0]?.status?.statusCode ||
      trackingPayload.events?.[0]?.status ||
      ''
    ).trim().toUpperCase();

    const latestEvent = trackingPayload.events?.[0];
    const latestCode = String(latestEvent?.status || latestEvent?.statusCode || '').trim().toUpperCase();
    const latestDesc = String(latestEvent?.description || trackingPayload.description || '').toLowerCase();

    if (DHL_RECIBIDO_CODES.has(rawStatus) || DHL_RECIBIDO_CODES.has(latestCode)) {
      nuevoEstado = ESTADOS_SISTEMA.RECIBIDO;
    } else if (
      DHL_ADUANA_CODES.has(rawStatus) ||
      DHL_ADUANA_CODES.has(latestCode) ||
      /aduana|customs|clearance/i.test(latestDesc)
    ) {
      nuevoEstado = ESTADOS_SISTEMA.ADUANA;
    } else if (
      DHL_TRANSITO_CODES.has(rawStatus) ||
      DHL_TRANSITO_CODES.has(latestCode) ||
      (trackingPayload.events?.length > 0)
    ) {
      nuevoEstado = ESTADOS_SISTEMA.TRANSITO;
    }
  }

  const pesoActual = JERARQUIA_ESTADOS[estadoActual] || 1;
  const pesoNuevo = JERARQUIA_ESTADOS[nuevoEstado] || 1;
  return pesoNuevo > pesoActual ? nuevoEstado : estadoActual;
}
