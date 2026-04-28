import admin from 'firebase-admin';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 1;
const CACHE_COLLECTION = 'tracking_cache';
const RATE_COLLECTION = 'tracking_rate_limits';

const isValidTrackingNumber = (value) => /^[A-Z0-9-]{6,}$/i.test(value);

const getLatestEventTimestamp = (events = []) => {
  const latest = [...events].sort((a, b) => {
    const timeA = Date.parse(a?.timestamp || '') || 0;
    const timeB = Date.parse(b?.timestamp || '') || 0;
    return timeB - timeA;
  })[0];
  return latest?.timestamp || null;
};

const initAdmin = () => {
  if (admin.apps?.length) return admin.app();

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawServiceAccount) {
    const serviceAccount = JSON.parse(rawServiceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin.app();
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
    return admin.app();
  }

  throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
};

const getAuthToken = (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

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
    const trackingNumber = (event.queryStringParameters?.trackingNumber || '').toString().trim().toUpperCase();
    if (!isValidTrackingNumber(trackingNumber)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'trackingNumber invalido' }),
      };
    }

    const token = getAuthToken(event);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'auth_required' }),
      };
    }

    const adminApp = initAdmin();
    const auth = adminApp.auth();
    const db = adminApp.firestore();

    const decoded = await auth.verifyIdToken(token);
    const uid = decoded?.uid;
    if (!uid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'auth_invalid' }),
      };
    }

    const cacheRef = db.collection(CACHE_COLLECTION).doc(trackingNumber);
    const cacheSnap = await cacheRef.get();
    const cacheData = cacheSnap.exists ? cacheSnap.data() : null;
    const nowMs = Date.now();

    if (cacheData?.payload && cacheData?.lastCheckedAt?.toMillis) {
      const lastCheckedAtMs = cacheData.lastCheckedAt.toMillis();
      if (nowMs - lastCheckedAtMs < RATE_LIMIT_WINDOW_MS) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            ...cacheData.payload,
            cached: true,
            rateLimited: false,
          }),
        };
      }
    }

    const rateKey = `${uid}_${trackingNumber}`;
    const rateRef = db.collection(RATE_COLLECTION).doc(rateKey);
    const rateSnap = await rateRef.get();
    const rateData = rateSnap.exists ? rateSnap.data() : {};
    let windowStartMs = rateData?.windowStart?.toMillis ? rateData.windowStart.toMillis() : 0;
    let count = Number(rateData?.count || 0);

    if (!windowStartMs || nowMs - windowStartMs >= RATE_LIMIT_WINDOW_MS) {
      windowStartMs = nowMs;
      count = 0;
    }

    if (count >= RATE_LIMIT_MAX) {
      if (cacheData?.payload) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            ...cacheData.payload,
            cached: true,
            rateLimited: true,
          }),
        };
      }

      return {
        statusCode: 429,
        body: JSON.stringify({ message: 'rate_limited' }),
      };
    }

    await rateRef.set({
      windowStart: admin.firestore.Timestamp.fromMillis(windowStartMs),
      count: count + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const result = await fetchTrackingFromDhl(trackingNumber);
    const latestEventTimestamp = getLatestEventTimestamp(result.events);

    await cacheRef.set({
      trackingNumber,
      payload: result,
      lastCheckedAt: admin.firestore.Timestamp.fromMillis(nowMs),
      latestEventTimestamp,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...result,
        cached: false,
        rateLimited: false,
      }),
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
