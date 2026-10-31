import { CORREO_COMPRAS, CORREOS_EXCLUIDOS, DESTINO_PRUEBAS, REMITENTE_COMPRAS, REMITENTE_SISTEMA, emailConfig } from './config';

/** True cuando la app corre en localhost: ahí los correos se desvían a DESTINO_PRUEBAS. */
export const esEntornoLocal = () => (
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
);

const normalizar = (correo) => String(correo || '').trim().toLowerCase();

/** Quita vacíos, duplicados y direcciones excluidas. */
export const limpiarCorreos = (lista = []) => {
  const vistos = new Set();
  return lista.filter((correo) => {
    const clave = normalizar(correo);
    if (!clave || vistos.has(clave) || CORREOS_EXCLUIDOS.includes(clave)) return false;
    vistos.add(clave);
    return true;
  });
};

const nombreDe = (persona) => persona?.nombre || String(persona?.email || '').split('@')[0] || 'Usuario';

/**
 * Reglas de envío por evento. `remitente`: 'actor' sale a nombre de quien ejecuta la acción, 'sistema' sale
 * desde Compras. `para`: 'compras' usa los destinatarios fijos, 'vendedor' usa el correo del vendedor de la solicitud.
 */
export const REGLAS_ENVIO = {
  solicitud_creada: { remitente: 'actor', para: 'compras', config: 'nuevaRFQ', copiaActor: true },
  cotizacion_enviada: { remitente: 'sistema', para: 'vendedor', config: 'cotizacionFinalizada' },
  pedido_confirmado: { remitente: 'actor', para: 'compras', config: 'pedidoGenerado', copiaActor: true },
  venta_perdida: { remitente: 'actor', para: 'compras', config: 'ventaPerdida', copiaActor: true },
  anulacion: { remitente: 'actor', para: 'vendedor', config: 'respuestaCompras', copiaActor: true },
  oc_asignada: { remitente: 'sistema', para: 'vendedor', config: 'respuestaCompras' },
  revision_registrada: { remitente: 'actor', para: 'compras', config: 'seguimientoCliente', copiaActor: true },
  prorroga_solicitada: { remitente: 'actor', para: 'compras', config: 'seguimientoCliente', copiaActor: true },
  prorroga_respondida: { remitente: 'actor', para: 'vendedor', config: 'respuestaCompras', copiaActor: true },
  // La negociación del pedido manual depende de quién escribe: compras responde al vendedor y viceversa.
  negociacion_compras: { remitente: 'compras', para: 'vendedor', config: 'negociacionCompras', copiaCompras: true },
  negociacion_vendedor: { remitente: 'actor', para: 'compras', config: 'negociacionVendedor' }
};

/**
 * Calcula remitente, respuesta, destinatarios y copias de un evento.
 * - solicitud: documento de la solicitud (aporta el vendedor).
 * - actor: { email, nombre } de quien ejecuta la acción.
 */
export function resolverEnvio(evento, { solicitud = null, actor = null, local = esEntornoLocal() } = {}) {
  const regla = REGLAS_ENVIO[evento];
  if (!regla) throw new Error(`Evento de correo desconocido: ${evento}`);
  const config = emailConfig[regla.config] || { to: [], cc: [] };

  if (local) {
    return {
      from: `${DESTINO_PRUEBAS} <${DESTINO_PRUEBAS}>`,
      replyTo: DESTINO_PRUEBAS,
      to: [DESTINO_PRUEBAS],
      cc: []
    };
  }

  const vendedor = { email: solicitud?.vendedorEmail || '', nombre: solicitud?.vendedorNombre };
  const emisor = regla.remitente === 'actor' ? (actor?.email ? actor : vendedor) : null;

  const from = emisor ? `${nombreDe(emisor)} <${emisor.email}>` : (regla.remitente === 'compras' ? REMITENTE_COMPRAS : REMITENTE_SISTEMA);
  const replyTo = emisor ? emisor.email : CORREO_COMPRAS;
  const to = limpiarCorreos(regla.para === 'vendedor' ? [vendedor.email] : config.to);
  const cc = limpiarCorreos([
    ...(regla.copiaActor ? [actor?.email] : []),
    ...(regla.copiaCompras ? [CORREO_COMPRAS] : []),
    ...(config.cc || [])
  ]).filter((correo) => !to.map(normalizar).includes(normalizar(correo)));

  return { from, replyTo, to, cc };
}
