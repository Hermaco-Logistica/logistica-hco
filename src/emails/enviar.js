import { auth } from '../firebase';
import { construirCorreo } from './eventos';

const FUNCION_CORREO = '/.netlify/functions/send-email-notification';
const FUNCION_COTIZACION = '/.netlify/functions/send-quotation-background';

/** Persona que ejecuta la acción, tomada de la sesión. */
export const actorActual = () => ({
  email: auth.currentUser?.email || '',
  nombre: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || ''
});

/**
 * Envía un correo ya armado. Nunca lanza: devuelve { ok, estado, detalle } para que quien llama decida
 * qué hacer (marcar emailEnviado, mostrar una advertencia, reintentar...).
 */
export async function enviarCorreo({ from, replyTo, to, cc, subject, html, attachments }) {
  try {
    const respuesta = await fetch(FUNCION_CORREO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, replyTo, to, cc, subject, bodyHtml: html, ...(attachments?.length ? { attachments } : {}) })
    });
    if (respuesta.ok) return { ok: true, estado: respuesta.status };
    const detalle = await respuesta.json().catch(() => ({}));
    console.warn('[correo] No se envió:', respuesta.status, detalle);
    return { ok: false, estado: respuesta.status, detalle };
  } catch (error) {
    console.error('[correo] Error de red al enviar:', error);
    return { ok: false, estado: 0, detalle: { message: error?.message } };
  }
}

/**
 * Arma y envía el correo de un evento (ver EVENTOS en eventos.js).
 * @param {string} evento
 * @param {object} ctx datos de la plantilla; `actor` es opcional y por defecto sale de la sesión.
 * @param {{ attachments?: Array<{content: string, nombre: string}> }} [opciones]
 */
export async function enviarEvento(evento, ctx, { attachments } = {}) {
  try {
    const correo = await construirCorreo(evento, { actor: actorActual(), ...ctx });
    if (!correo.to.length) {
      console.warn(`[correo] ${evento}: sin destinatarios, no se envía.`);
      return { ok: false, estado: 0, detalle: { message: 'sin_destinatarios' } };
    }
    return await enviarCorreo({ ...correo, attachments });
  } catch (error) {
    console.error(`[correo] No se pudo armar ${evento}:`, error);
    return { ok: false, estado: 0, detalle: { message: error?.message } };
  }
}

/**
 * Envía la cotización con el PDF adjunto por la función en segundo plano (hasta 15 min, sin bloquear al usuario).
 * No espera respuesta.
 */
export async function enviarCotizacionConPdf({ solicitud, pdfBase64, nombreArchivo, ...ctx }) {
  try {
    const correo = await construirCorreo('cotizacion_enviada', { actor: actorActual(), solicitud, ...ctx });
    if (!correo.to.length || !pdfBase64) return { ok: false, estado: 0, detalle: { message: 'sin_destinatarios_o_pdf' } };
    fetch(FUNCION_COTIZACION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdf: pdfBase64,
        from: correo.from,
        to: correo.to,
        cc: correo.cc,
        subject: correo.subject,
        filename: nombreArchivo,
        bodyHtml: correo.html
      })
    }).catch((error) => console.error('[correo] cotización en segundo plano:', error));
    return { ok: true, estado: 202 };
  } catch (error) {
    console.error('[correo] No se pudo armar la cotización:', error);
    return { ok: false, estado: 0, detalle: { message: error?.message } };
  }
}
