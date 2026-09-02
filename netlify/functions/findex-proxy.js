//.netlify/functions/findex-proxy.js
import https from "https";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";

const REMOTE_BASE = process.env.REMOTE_BASE || 'https://hermaco.findexbusiness.com';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const httpsAgent = new https.Agent({ rejectUnauthorized: false }); // Solo dev

export const handler = async (event) => {
  try {
    // Parsear cookies
    const cookies = cookie.parse(event.headers.cookie || '');
    const sessionToken = cookies.session;

    let sessionData = null;
    if (sessionToken) {
      try {
        sessionData = jwt.verify(sessionToken, JWT_SECRET);
      } catch (err) {
        console.error('[SESSION] Token inválido:', err.message);
      }
    }

    // Construir URL objetivo
    // Si los redirects pasan "/.netlify/functions/findex-proxy/api/:splat",
    // entonces extraemos la parte desde "/api/" para reenviarla tal cual.
    let path = event.path.replace('/.netlify/functions/findex-proxy', '');
    const apiIndex = path.indexOf('/api/');
    if (apiIndex >= 0) {
      path = path.substring(apiIndex); // conserva "/api/..."
    }
    const queryString = event.rawQuery ? `?${event.rawQuery}` : '';
    const targetUrl = `${REMOTE_BASE}${path}${queryString}`; console.log("[PROXY] Fetching:", targetUrl);
    // logs de diagnóstico eliminados

    // Headers a reenviar (filtrar hop-by-hop)
    const hopByHop = new Set([
      'host', 'connection', 'keep-alive', 'cookie', 
      'authorization', 'content-length', 'transfer-encoding'
    ]);
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    for (const [key, value] of Object.entries(event.headers)) {
      if (!hopByHop.has(key.toLowerCase())) {
        headers[key] = value;
      }
    }

    // ⚠️ CRÍTICO: Inyectar Authorization con mayúscula
    if (sessionData?.accessToken) {
      headers['Authorization'] = `Bearer ${sessionData.accessToken}`;
    }

    // Configurar request
    const options = {
      method: event.httpMethod,
      headers,
      agent: httpsAgent
    };

    if (!['GET', 'HEAD', 'OPTIONS'].includes(event.httpMethod) && event.body) {
      options.body = event.body;
    }

    // Hacer request al backend
    const response = await fetch(targetUrl, options);
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': contentType || 'application/json'
      },
      body: text
    };

  } catch (error) {
    console.error('[PROXY ERROR]:', error);
    return {
      statusCode: 502,
      body: JSON.stringify({ 
        message: 'BFF error', 
        detail: error.message 
      })
    };
  }
};
