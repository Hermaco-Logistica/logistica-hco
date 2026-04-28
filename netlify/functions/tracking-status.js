function normalizeTrackingPayload(data, trackingNumber) {
  const events = Array.isArray(data?.events)
    ? data.events
    : Array.isArray(data?.checkpoints)
      ? data.checkpoints
      : Array.isArray(data?.shipments?.[0]?.events)
        ? data.shipments[0].events
        : [];

  const latestEvent = events[0] || null;

  return {
    trackingNumber,
    status: data?.status || data?.currentStatus || latestEvent?.status || 'UNKNOWN',
    description: data?.description || latestEvent?.description || latestEvent?.location || 'Sin detalle',
    updatedAt: data?.updatedAt || latestEvent?.timestamp || null,
    events,
    raw: data,
  };
}

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
  };
}

async function fetchTrackingFromDhl(trackingNumber) {
  const upstreamUrl = process.env.DHL_TRACKING_API_URL;
  const apiKey = process.env.DHL_API_KEY;
  const apiSecret = process.env.DHL_API_SECRET;

  if (!upstreamUrl) {
    return getMockTracking(trackingNumber);
  }

  const trimmedUrl = upstreamUrl.trim();
  if (!trimmedUrl || /^(undefined|null)$/i.test(trimmedUrl)) {
    return getMockTracking(trackingNumber);
  }

  const normalizedUrl = /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  let url;
  try {
    url = new URL(normalizedUrl);
  } catch (error) {
    throw new Error('DHL_TRACKING_API_URL_INVALID');
  }
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
  };
}

export const handler = async (event) => {
  try {
    const trackingNumber = (event.queryStringParameters?.trackingNumber || '').toString().trim();
    if (trackingNumber.length < 6) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'trackingNumber es requerido (min 6 caracteres)' }),
      };
    }

    const result = await fetchTrackingFromDhl(trackingNumber);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error consultando tracking en DHL',
        detail: error?.message || 'unknown_error',
      }),
    };
  }
};
