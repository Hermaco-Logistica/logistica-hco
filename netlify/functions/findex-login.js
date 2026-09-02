import https from "https";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";

// Producción por defecto; se puede sobreescribir con REMOTE_BASE en Netlify
const REMOTE_BASE = process.env.REMOTE_BASE || 'https://hermaco.findexbusiness.com';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const httpsAgent = new https.Agent({ rejectUnauthorized: false }); // Solo dev

export const handler = async (event) => {
  // Soporte para preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: 'Method Not Allowed',
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    
    // Llamar al login de Hermaco
    const response = await fetch(`${REMOTE_BASE}/api/login`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify(body),
      agent: httpsAgent
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
        body: text
      };
    }

  // Parsear respuesta
  const json = contentType.includes('application/json') ? JSON.parse(text) : {};
  const accessToken = json?.accessToken ?? json?.token ?? null;
  const refreshToken = json?.refreshToken ?? json?.refresh_token ?? null;

    if (!accessToken) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'No access token received' })
      };
    }

    // Unificar/normalizar el objeto de usuario. Puede venir en json.user o a nivel raíz.
    const apiUser = (json && typeof json.user === 'object') ? json.user : null;
    const normalizedUser = (() => {
      const firstName = apiUser?.firstName ?? json?.firstName ?? apiUser?.nombre ?? json?.nombre ?? null;
      const lastName = apiUser?.lastName ?? json?.lastName ?? apiUser?.apellido ?? json?.apellido ?? null;
      const email = apiUser?.email ?? json?.email ?? null;
      const usernameCandidate = apiUser?.username ?? json?.username ?? (email ? (email.split('@')[0] || null) : null) ?? body?.username ?? (body?.email ? (body.email.split('@')[0] || null) : null) ?? null;
      // Mezclar preservando campos originales si existen
      return {
        ...(apiUser || {}),
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        email: email ?? undefined,
        username: usernameCandidate ?? undefined,
      };
    })();

    // Crear JWT con los tokens dentro (firmado, no encriptado)
    const sessionData = {
      accessToken,
      refreshToken,
      user: Object.keys(normalizedUser).length ? normalizedUser : null,
      accessExpiresAt: Date.now() + (json?.access_expires_in ?? 900) * 1000,
      refreshExpiresAt: Date.now() + (json?.refresh_expires_in ?? 7 * 24 * 3600) * 1000
    };

    const sessionToken = jwt.sign(sessionData, JWT_SECRET, { expiresIn: '7d' });

    // Crear cookie httpOnly
    const cookieHeader = cookie.serialize('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true en prod
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: '/'
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ user: sessionData.user })
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 502,
      body: JSON.stringify({ 
        message: 'BFF error', 
        detail: error.message 
      })
    };
  }
};
