import admin from 'firebase-admin';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Asegurar inicialización de Firebase Admin (similar a tracking-status)
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

// Clave secreta (debe tener exactamente 32 caracteres para AES-256)
// Usar variable de entorno FINDEX_ENCRYPTION_KEY (o fallback seguro sólo para prevenir crashes)
const ENCRYPTION_KEY = process.env.FINDEX_ENCRYPTION_KEY || 'llave-super-secreta-de-respaldo-'; 
const ALGORITHM = 'aes-256-gcm';

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
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const { username, password } = JSON.parse(event.body || '{}');
    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Usuario y contraseña son requeridos' }) };
    }

    // Encriptar contraseña
    const iv = crypto.randomBytes(12); // Vector de inicialización de 12 bytes
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex'); // Para GCM

    // Guardar en Firestore (colección users)
    await db.collection('users').doc(uid).set({
      findexCredentials: {
        username,
        encryptedPassword: encrypted,
        iv: iv.toString('hex'),
        authTag,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Credenciales guardadas y encriptadas correctamente.' })
    };
  } catch (error) {
    console.error('Error guardando credenciales:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error interno guardando credenciales', error: error.message })
    };
  }
};
