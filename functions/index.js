/**
 * Cloud Functions para mantenimiento automático de flag `users/{uid}.bloqueoCreacion`.
 * 
 * Reglas de Firestore:
 *   function estaBloqueado() {
 *     let d = getUserData();
 *     return ('bloqueoCreacion' in d) && d.bloqueoCreacion == true;
 *   }
 * 
 * Este módulo mantiene sincronizado dicho flag ante:
 * 1. Eventos de escritura en solicitudes/{id} (trigger reactivo)
 * 2. Paso del tiempo (función programada cada hora)
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import {
  esRolBloqueable,
  esCotizacionEstancada,
  ESTADOS_SOLICITUD_EVALUABLES,
  ZONA_HORARIA_EL_SALVADOR
} from './cotizacionesEstancadasCore.js';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * Recalcula el flag `bloqueoCreacion` para un usuario específico.
 * Escribe únicamente si el valor actual difiere del valor calculado.
 */
export async function recalcularBloqueoUsuario(uid, userData = null) {
  if (!uid) return;

  let uData = userData;
  const userRef = db.collection('users').doc(uid);

  if (!uData) {
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;
    uData = userSnap.data();
  }

  const role = uData.role || uData.rol || '';
  const valorActual = Boolean(uData.bloqueoCreacion);

  // 1. Roles exentos (comprador, administrador, etc.) siempre deben tener false
  if (!esRolBloqueable(role)) {
    if (valorActual !== false) {
      console.log(`[Bloqueo] Usuario ${uid} (${role}) es exento. Removiendo bloqueo.`);
      await userRef.update({
        bloqueoCreacion: false,
        bloqueoActualizadoEn: FieldValue.serverTimestamp()
      });
    }
    return;
  }

  // 2. Para vendedores y gerentes, verificar cotizaciones estancadas en Firestore
  const emailNorm = (uData.email || '').trim().toLowerCase();

  // Buscar solicitudes cotizadas (total o parcialmente) ligadas al vendedor (por vendedorId o vendedorEmail)
  const [snapPorId, snapPorEmail] = await Promise.all([
    db.collection('solicitudes')
      .where('vendedorId', '==', uid)
      .where('estado', 'in', ESTADOS_SOLICITUD_EVALUABLES)
      .get(),
    emailNorm
      ? db.collection('solicitudes')
          .where('vendedorEmail', '==', uData.email)
          .where('estado', 'in', ESTADOS_SOLICITUD_EVALUABLES)
          .get()
      : { docs: [] }
  ]);

  // Unificar documentos sin duplicados
  const docsMap = new Map();
  for (const doc of [...snapPorId.docs, ...snapPorEmail.docs]) {
    docsMap.set(doc.id, doc.data());
  }

  let tieneEstancadas = false;
  for (const [, solData] of docsMap) {
    if (esCotizacionEstancada(solData)) {
      tieneEstancadas = true;
      break;
    }
  }

  // 3. Escribir únicamente si el valor cambió
  if (valorActual !== tieneEstancadas) {
    console.log(`[Bloqueo] Actualizando bloqueoCreacion para ${uid} (${uData.email}): ${valorActual} -> ${tieneEstancadas}`);
    await userRef.update({
      bloqueoCreacion: tieneEstancadas,
      bloqueoActualizadoEn: FieldValue.serverTimestamp()
    });
  }
}

/**
 * TRIGGER 1: Al crear, actualizar o eliminar una solicitud
 */
export const onSolicitudEscrita = onDocumentWritten('solicitudes/{solicitudId}', async (event) => {
  const afterData = event.data?.after?.data();
  const beforeData = event.data?.before?.data();

  const vendedorId = afterData?.vendedorId || beforeData?.vendedorId;
  const vendedorEmail = afterData?.vendedorEmail || beforeData?.vendedorEmail;

  if (vendedorId) {
    await recalcularBloqueoUsuario(vendedorId);
    return;
  }

  if (vendedorEmail) {
    const userQuery = await db.collection('users').where('email', '==', vendedorEmail).limit(1).get();
    if (!userQuery.empty) {
      await recalcularBloqueoUsuario(userQuery.docs[0].id, userQuery.docs[0].data());
    }
  }
});

/**
 * TRIGGER 2: Tarea programada cada hora (zona America/El_Salvador)
 * Recalcula el flag de todos los usuarios con roles 'vendedor' y 'gerente',
 * ya que las cotizaciones se estancan por el simple paso del tiempo.
 */
export const revisarCotizacionesEstancadasCron = onSchedule({
  schedule: '0 * * * *',
  timeZone: ZONA_HORARIA_EL_SALVADOR
}, async () => {
  console.log('[Cron] Iniciando revisión horaria de cotizaciones estancadas...');

  // Consultar todos los usuarios
  const usersSnap = await db.collection('users').get();
  let evaluados = 0;

  for (const doc of usersSnap.docs) {
    const uData = doc.data();
    const role = uData.role || uData.rol || '';
    if (esRolBloqueable(role)) {
      await recalcularBloqueoUsuario(doc.id, uData);
      evaluados++;
    } else if (uData.bloqueoCreacion === true) {
      // Limpiar bloqueo erróneo en roles exentos
      await recalcularBloqueoUsuario(doc.id, uData);
    }
  }

  console.log(`[Cron] Finalizada revisión horaria. Usuarios evaluados: ${evaluados}`);
});
