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
  return {
    provider: provider.id,
    ...result,
  };
}
