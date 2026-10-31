/**
 * Correos del sistema. Punto de entrada único:
 *
 *   import { enviarEvento } from '../emails';
 *   await enviarEvento('prorroga_solicitada', { solicitud, prorroga, items });
 *
 * - eventos.js       catálogo de correos (asunto + plantilla)
 * - destinatarios.js remitente, destinatarios y copias por evento (y desvío a pruebas en localhost)
 * - config.js        direcciones fijas
 * - plantillas/      un archivo por correo
 * - html/            bloques compartidos (etiquetas con la paleta de la app, tablas, citas, botones)
 */
export { enviarCorreo, enviarCotizacionConPdf, enviarEvento } from './enviar';
export { EVENTOS, construirCorreo } from './eventos';
export { REGLAS_ENVIO, resolverEnvio } from './destinatarios';
