import { consultarTrackingDhl, dhlTrackingEnabled } from './dhlTrackingProvider';

const providers = [
  {
    id: 'DHL',
    enabled: dhlTrackingEnabled,
    lookup: consultarTrackingDhl,
  },
];

const activeProvider = () => providers.find((p) => p.enabled);

export const trackingStatusEnabled = Boolean(activeProvider());

export const trackingStatusProvider = activeProvider()?.id || 'NONE';

export async function consultarTrackingStatus(trackingNumber) {
  const provider = activeProvider();
  if (!provider) {
    throw new Error('TRACKING_PROVIDER_NOT_CONFIGURED');
  }

  const result = await provider.lookup(trackingNumber);
  const latestMovement = buildLatestMovement(provider.id, result);
  return {
    provider: provider.id,
    latestMovement,
    ...result,
  };
}

const DHL_STATUS_LABELS = {
  PU: 'Recogido por DHL',
  PL: 'Procesado en instalacion',
  AF: 'Llego a instalacion',
  DF: 'Salio de instalacion',
  TR: 'En transito',
  WC: 'En camino al destinatario',
  OH: 'Envio retenido',
  RR: 'Aduana iniciada',
  IC: 'En proceso de aduana',
  UD: 'Evento de aduana',
  CR: 'Aduana liberada',
  delivered: 'Entregado',
  failure: 'Fallo en entrega',
};

const DHL_STATUS_FALLBACK = 'Actualizacion de envio';

const buildLatestMovement = (providerId, payload) => {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  if (!events.length) {
    return null;
  }

  const latestEvent = [...events].sort((a, b) => {
    const timeA = Date.parse(a?.timestamp || '') || 0;
    const timeB = Date.parse(b?.timestamp || '') || 0;
    return timeB - timeA;
  })[0];

  if (!latestEvent) return null;

  const statusValue = latestEvent.status || latestEvent.statusCode || 'UNKNOWN';
  const statusKey = String(statusValue).toLowerCase();
  const estado = providerId === 'DHL'
    ? (DHL_STATUS_LABELS[statusValue] || DHL_STATUS_LABELS[statusKey] || latestEvent.description || DHL_STATUS_FALLBACK)
    : statusValue;

  const location = latestEvent.location?.address?.addressLocality;
  const country = latestEvent.location?.address?.countryCode;
  const locacion = [location, country].filter(Boolean).join(' - ') || 'Sin ubicacion';

  return {
    estado,
    codigo: statusValue,
    descripcion: latestEvent.description || 'Sin descripcion',
    locacion,
    fecha: latestEvent.timestamp || null,
  };
};
