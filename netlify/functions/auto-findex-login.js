import admin from 'firebase-admin';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as cookie from "cookie";
import jwt from 'jsonwebtoken';
import https from 'https';

// Asegurar inicialización de Firebase Admin
const initAdmin = () => {
  if (admin.apps?.length) return admin.app();
  
  const devAccountPath = path.resolve(process.cwd(), 'service_account_dev.json');
  const prodAccountPath = path.resolve(process.cwd(), 'service_account.json');

  let serviceAccount = null;

  if (fs.existsSync(devAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(devAccountPath, 'utf8'));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (fs.existsSync(prodAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(prodAccountPath, 'utf8'));
  }

  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  return admin.initializeApp();
};

const app = initAdmin();
const db = admin.firestore(app);
const auth = admin.auth(app);

const ENCRYPTION_KEY = process.env.FINDEX_ENCRYPTION_KEY || 'llave-super-secreta-de-respaldo-'; 
const ALGORITHM = 'aes-256-gcm';

const REMOTE_BASE = process.env.REMOTE_BASE || 'https://hermaco.findexbusiness.com';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const authHeader = event.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ message: 'No se proporcionó token de Firebase' }) };
    }
    const firebaseToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    const uid = decodedToken.uid;

    // Obtener credenciales de Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    const creds = userDoc.data()?.findexCredentials;
    
    if (!creds || !creds.username || !creds.encryptedPassword) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Credenciales de Findex no configuradas' }) };
    }

    // Desencriptar
    const iv = Buffer.from(creds.iv, 'hex');
    const authTag = Buffer.from(creds.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    decipher.setAuthTag(authTag);
    
    let password = decipher.update(creds.encryptedPassword, 'hex', 'utf8');
    password += decipher.final('utf8');

    // Autenticar con Findex
    const isEmail = typeof creds.username === 'string' && creds.username.includes('@');
    const loginPayload = isEmail 
      ? { email: creds.username, password, business_id: 3 }
      : { username: creds.username, password, business_id: 3 };

    const response = await fetch(`${REMOTE_BASE}/api/login`, {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(loginPayload),
      agent: httpsAgent
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' },
        body: text
      };
    }

    const json = contentType.includes('application/json') ? JSON.parse(text) : {};
    const accessToken = json?.accessToken ?? json?.token ?? null;
    const refreshToken = json?.refreshToken ?? json?.refresh_token ?? null;

    if (!accessToken) {
      return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ message: 'No access token received from Findex' }) };
    }

    const apiUser = (json && typeof json.user === 'object') ? json.user : null;
    
    const sessionData = {
      accessToken,
      refreshToken,
      user: apiUser,
      accessExpiresAt: Date.now() + (json?.access_expires_in ?? 900) * 1000,
      refreshExpiresAt: Date.now() + (json?.refresh_expires_in ?? 7 * 24 * 3600) * 1000
    };

    const sessionToken = jwt.sign(sessionData, JWT_SECRET, { expiresIn: '7d' });

    const cookieHeader = cookie.serialize('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: true, user: sessionData.user })
    };

  } catch (error) {
    console.error('Auto-login error:', error);
    return {
      statusCode: 502,
      body: JSON.stringify({ message: 'Error durante auto-login', detail: error.message })
    };
  }
};
