const DSV_OAUTH_URL = process.env.DSV_OAUTH_URL || 'https://api.dsv.com/my/oauth/v1/token';
const DSV_TRACKING_URL = process.env.DSV_TRACKING_URL || 'https://api.dsv.com/my/tracking/v2/shipments/tmsId/';

let dsvTokenCache = {
  token: null,
  expiresAt: 0,
};

const getDsvAuthSubscriptionKey = () => (
  process.env.DSV_AUTH_SUBSCRIPTION_KEY
  || process.env['DSV-AUTH-Subscription-Key']
  || process.env.DSV_SUBSCRIPTION_KEY
  || process.env['DSV-Subscription-Key']
);

const getDsvTrackingSubscriptionKey = () => (
  process.env.DSV_TRACKING_SUBSCRIPTION_KEY
  || process.env['DSV-TRACKING-Subscription-Key']
  || process.env.DSV_SUBSCRIPTION_KEY
  || process.env['DSV-Subscription-Key']
);

const isDsvConfigured = () => {
  const authKey = getDsvAuthSubscriptionKey();
  const trackingKey = getDsvTrackingSubscriptionKey();
  return Boolean(authKey && trackingKey && process.env.DSV_CLIENT_ID && process.env.DSV_CLIENT_SECRET);
};

const normalizeEvent = (event) => {
  if (!event || typeof event !== 'object') return null;

  const rawLocation = event.location || event.eventLocation || event.place || {};
  const location = typeof rawLocation === 'string' ? { place: rawLocation } : rawLocation;
  const fallbackAddress = {
    addressLocality: event.city || event.locationCity || event.locationName || location.place,
    countryCode: event.countryCode || event.locationCountry || location.countryCode,
  };
  const sourceAddress = location.address || fallbackAddress;
  const locationAddress = sourceAddress
    ? {
      ...(sourceAddress.addressLocality ? { addressLocality: sourceAddress.addressLocality } : {}),
      ...(sourceAddress.countryCode ? { countryCode: sourceAddress.countryCode } : {}),
    }
    : null;
  const normalizedLocation = locationAddress && Object.keys(locationAddress).length
    ? { address: locationAddress }
    : null;

  return {
    status: event.status || event.statusCode || event.eventCode || event.eventType || event.milestone || event.activityCode,
    description: event.description || event.eventDescription || event.activityDescription || event.activity || event.eventType,
    timestamp: event.timestamp
      || event.eventLastModified
      || event.eventDateTime
      || event.eventTime
      || event.eventDate
      || event.dateTime
      || event.date
      || null,
    location: normalizedLocation || location || null,
    raw: event,
  };
};

const normalizeTrackingPayload = (data, trackingNumber) => {
  const rawEvents = Array.isArray(data?.events)
    ? data.events
    : Array.isArray(data?.checkpoints)
      ? data.checkpoints
      : Array.isArray(data?.shipments?.[0]?.events)
        ? data.shipments[0].events
        : Array.isArray(data?.shipments?.[0]?.trackingEvents)
          ? data.shipments[0].trackingEvents
          : Array.isArray(data?.trackingEvents)
            ? data.trackingEvents
            : [];

  const events = rawEvents
    .map(normalizeEvent)
    .filter(Boolean)
    .sort((a, b) => {
      const timeA = Date.parse(a?.timestamp || '') || 0;
      const timeB = Date.parse(b?.timestamp || '') || 0;
      return timeB - timeA;
    });

  const latestEvent = events[0] || null;

  return {
    trackingNumber,
    status: data?.status || data?.currentStatus || latestEvent?.status || 'UNKNOWN',
    description: data?.description || latestEvent?.description || latestEvent?.location || 'Sin detalle',
    updatedAt: data?.updatedAt || latestEvent?.timestamp || null,
    events,
    raw: data,
  };
};

function getMockTracking(trackingNumber) {
  return {
    trackingNumber,
    status: 'IN_TRANSIT',
    description: 'Mock local: envío en tránsito',
    updatedAt: new Date().toISOString(),
    events: [
      {
        status: 'PICKED_UP',
        description: 'Recolección confirmada',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        status: 'IN_TRANSIT',
        description: 'En tránsito hacia destino',
        timestamp: new Date().toISOString(),
      },
    ],
    source: 'MOCK',
    provider: 'MOCK',
  };
}

async function fetchDsvAccessToken() {
  const subscriptionKey = getDsvAuthSubscriptionKey();
  if (!subscriptionKey) {
    throw new Error('DSV_SUBSCRIPTION_KEY_MISSING');
  }

  const now = Date.now();
  if (dsvTokenCache.token && dsvTokenCache.expiresAt > now) {
    return dsvTokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.DSV_CLIENT_ID || '',
    client_secret: process.env.DSV_CLIENT_SECRET || '',
  });

  const response = await fetch(DSV_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'DSV-Subscription-Key': subscriptionKey,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`DSV_TOKEN_ERROR_${response.status}`);
  }

  const data = await response.json();
  const token = data?.access_token;
  const expiresIn = Number(data?.expires_in || 0);
  if (!token) {
    throw new Error('DSV_TOKEN_MISSING');
  }

  dsvTokenCache = {
    token,
    expiresAt: now + Math.max(0, (expiresIn - 30) * 1000),
  };

  return token;
}

async function fetchTrackingFromDsv(trackingNumber) {
  if (!isDsvConfigured()) {
    throw new Error('DSV_NOT_CONFIGURED');
  }

  const subscriptionKey = getDsvTrackingSubscriptionKey();
  if (!subscriptionKey) {
    throw new Error('DSV_TRACKING_SUBSCRIPTION_KEY_MISSING');
  }
  const token = await fetchDsvAccessToken();
  const baseUrl = DSV_TRACKING_URL.endsWith('/') ? DSV_TRACKING_URL : `${DSV_TRACKING_URL}/`;
  const url = new URL(`${baseUrl}${encodeURIComponent(trackingNumber)}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'DSV-Subscription-Key': subscriptionKey,
    },
  });

  if (!response.ok) {
    throw new Error(`DSV_TRACKING_ERROR_${response.status}`);
  }

  const data = await response.json();
  return {
    ...normalizeTrackingPayload(data, trackingNumber),
    source: 'DSV',
    provider: 'DSV',
  };
}

async function fetchTrackingFromDhl(trackingNumber) {
  const upstreamUrl = process.env.DHL_TRACKING_API_URL;
  const apiKey = process.env.DHL_API_KEY;
  const apiSecret = process.env.DHL_API_SECRET;

  if (!upstreamUrl) {
    return getMockTracking(trackingNumber);
  }

  const url = new URL(upstreamUrl);
  url.searchParams.set('trackingNumber', trackingNumber);

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['DHL-API-Key'] = apiKey;
    headers['x-api-key'] = apiKey;
  }
  if (apiKey && apiSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
  }

  const response = await fetch(url.toString(), { method: 'GET', headers });
  if (!response.ok) {
    throw new Error(`DHL tracking error: ${response.status}`);
  }

  const data = await response.json();
  return {
    ...normalizeTrackingPayload(data, trackingNumber),
    source: 'DHL',
    provider: 'DHL',
  };
}

async function fetchTrackingWithFallback(trackingNumber, preferredProvider) {
  const normalizedPreferred = (preferredProvider || '').toString().trim().toUpperCase();
  const providers = [];

  if (normalizedPreferred) {
    providers.push(normalizedPreferred);
  } else if (isDsvConfigured()) {
    providers.push('DSV', 'DHL');
  } else {
    providers.push('DHL');
  }

  let lastError;
  for (const provider of providers) {
    try {
      if (provider === 'DSV') {
        return await fetchTrackingFromDsv(trackingNumber);
      }
      if (provider === 'DHL') {
        return await fetchTrackingFromDhl(trackingNumber);
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('TRACKING_PROVIDER_NOT_AVAILABLE');
}

export default async function handler(req, res) {
  try {
    const trackingNumber = (req.query?.trackingNumber || '').toString().trim();
    if (trackingNumber.length < 6) {
      return res.status(400).json({ message: 'trackingNumber es requerido (min 6 caracteres)' });
    }

    const providerOverride = req.query?.provider;
    const result = await fetchTrackingWithFallback(trackingNumber, providerOverride);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: 'Error consultando tracking',
      detail: error?.message || 'unknown_error',
    });
  }
}
