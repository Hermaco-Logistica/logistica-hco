import { consultarTrackingDhl, dhlTrackingEnabled } from './dhlTrackingProvider';
import { DHL_STATUS_LABELS, DSV_STATUS_LABELS } from '../utils/trackingMappings';

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

  const providerHint = getProviderHint(trackingNumber);
  const result = await provider.lookup(trackingNumber, providerHint);
  const providerId = String(result?.provider || result?.source || provider.id || 'UNKNOWN').toUpperCase();
  const latestMovement = buildLatestMovement(providerId, result);
  return {
    provider: providerId,
    latestMovement,
    ...result,
  };
}

const getProviderHint = (trackingNumber) => {
  const raw = String(trackingNumber || '').trim().toUpperCase();
  if (!raw) return null;

  if (/\b(ANR|SJO)\b/.test(raw) || raw.includes('ANR') || raw.includes('SJO')) {
    return 'DSV';
  }

  if (/^\d+$/.test(raw)) {
    return 'DHL';
  }

  return null;
};

const DHL_STATUS_FALLBACK = 'Actualizacion de envio';

const getDsvEventTimestamp = (event) => (
  event?.raw?.eventLastModified
  || event?.raw?.eventDateTime
  || event?.raw?.eventTime
  || event?.raw?.eventDate
  || event?.timestamp
  || null
);

const buildLatestMovement = (providerId, payload) => {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  if (!events.length) {
    return null;
  }

  const latestEvent = [...events].sort((a, b) => {
    const timeA = Date.parse(providerId === 'DSV' ? getDsvEventTimestamp(a) : a?.timestamp || '') || 0;
    const timeB = Date.parse(providerId === 'DSV' ? getDsvEventTimestamp(b) : b?.timestamp || '') || 0;
    return timeB - timeA;
  })[0];

  if (!latestEvent) return null;

  const statusRaw = latestEvent.status || latestEvent.statusCode || 'UNKNOWN';
  const statusValue = String(statusRaw || '').trim() || 'UNKNOWN';
  const statusKey = statusValue.toLowerCase();
  const statusLookup = statusValue.toUpperCase();
  const estado = providerId === 'DHL'
    ? (DHL_STATUS_LABELS[statusValue] || DHL_STATUS_LABELS[statusKey] || latestEvent.description || DHL_STATUS_FALLBACK)
    : providerId === 'DSV'
      ? (DSV_STATUS_LABELS[statusLookup] || latestEvent.description || statusValue || DHL_STATUS_FALLBACK)
      : statusValue;

  const location = latestEvent.location?.address?.addressLocality;
  const country = latestEvent.location?.address?.countryCode;
  const locacion = [location, country].filter(Boolean).join(' - ') || 'Sin ubicacion';

  return {
    estado,
    codigo: statusValue,
    descripcion: latestEvent.description || 'Sin descripcion',
    locacion,
    fecha: providerId === 'DSV' ? getDsvEventTimestamp(latestEvent) : latestEvent.timestamp || null,
    grupo: latestEvent.raw?.eventGroup || latestEvent.raw?.eventType || null,
  };
};
