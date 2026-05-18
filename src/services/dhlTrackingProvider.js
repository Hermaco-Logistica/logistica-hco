import { auth } from '../firebase';

const TRACKING_STATUS_URL = import.meta.env.VITE_TRACKING_STATUS_URL || '/api/tracking-status';

export const dhlTrackingEnabled = Boolean(TRACKING_STATUS_URL);

export async function consultarTrackingDhl(trackingNumber, providerHint) {
  const number = String(trackingNumber || '').trim();
  if (!dhlTrackingEnabled || number.length < 6) {
    throw new Error('INVALID_TRACKING_NUMBER');
  }

  const token = await auth.currentUser?.getIdToken?.();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const url = new URL(TRACKING_STATUS_URL, window.location.origin);
  url.searchParams.set('trackingNumber', number);
  if (providerHint) {
    url.searchParams.set('provider', providerHint);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`DHL_TRACKING_ERROR_${response.status}`);
  }

  return response.json();
}
