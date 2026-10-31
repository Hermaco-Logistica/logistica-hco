import { resolverEnvio } from './destinatarios';
import { anulacion } from './plantillas/anulacion';
import { cotizacionEnviada } from './plantillas/cotizacionEnviada';
import { negociacionPedidoManual } from './plantillas/negociacionPedidoManual';
import { ocAsignada } from './plantillas/ocAsignada';
import { pedidoConfirmado } from './plantillas/pedidoConfirmado';
import { prorrogaRespondida, prorrogaSolicitada, revisionRegistrada } from './plantillas/seguimientoCliente';
import { solicitudCreada } from './plantillas/solicitudCreada';
import { ventaPerdida } from './plantillas/ventaPerdida';

const referencia = ({ solicitud }) => `${solicitud.correlativo} - ${solicitud.cliente}`;

/**
 * Catálogo de correos del sistema. Cada evento define su asunto y su plantilla; quién lo envía y a quién llega
 * está en destinatarios.js (REGLAS_ENVIO). Para agregar un aviso nuevo: plantilla + regla + entrada aquí.
 */
export const EVENTOS = {
  solicitud_creada: {
    asunto: (ctx) => `${ctx.solicitud.tipo === 'Pedido Manual' ? 'Nuevo Pedido Manual' : 'Nueva RFQ'}: ${referencia(ctx)}`,
    html: solicitudCreada
  },
  cotizacion_enviada: {
    asunto: (ctx) => `${ctx.esParcial ? 'Avance de cotización' : 'Cotización'} #${ctx.solicitud.correlativo}`,
    html: cotizacionEnviada
  },
  pedido_confirmado: {
    asunto: (ctx) => `Nuevo Pedido ${ctx.pedido.esPedidoParcial ? 'Parcial' : 'Completo'}: ${ctx.pedido.correlativoRFQ} - ${ctx.pedido.cliente}`,
    html: pedidoConfirmado
  },
  venta_perdida: {
    asunto: (ctx) => `Venta perdida: ${referencia(ctx)}`,
    html: ventaPerdida
  },
  anulacion: {
    asunto: (ctx) => `${ctx.esParcial ? 'Anulación Parcial' : 'Anulación'}: ${referencia(ctx)}`,
    html: anulacion
  },
  oc_asignada: {
    asunto: (ctx) => `OC Asignada ${ctx.numOC} — Tus productos ya tienen orden de compra`,
    html: ocAsignada
  },
  revision_registrada: {
    asunto: (ctx) => `Solicitud en revisión con el cliente: ${referencia(ctx)}`,
    html: revisionRegistrada
  },
  prorroga_solicitada: {
    asunto: (ctx) => `Prórroga solicitada: ${referencia(ctx)}`,
    html: prorrogaSolicitada
  },
  prorroga_respondida: {
    asunto: (ctx) => `Prórroga ${ctx.accion === 'aprobada' ? 'aprobada' : 'rechazada'}: ${referencia(ctx)}`,
    html: prorrogaRespondida
  },
  negociacion_compras: {
    asunto: (ctx) => `Actualización Pedido Manual: ${referencia({ solicitud: ctx.pedido })}`,
    html: negociacionPedidoManual
  },
  negociacion_vendedor: {
    asunto: (ctx) => `${['Pedido', 'Pedido Parcial'].includes(ctx.pedido.estado) ? 'Pedido Manual Confirmado' : 'Actualización Pedido Manual'}: ${referencia({ solicitud: ctx.pedido })}`,
    html: negociacionPedidoManual
  }
};

/**
 * Arma el correo completo de un evento: remitente, destinatarios, asunto y HTML.
 * ctx: datos de la plantilla + `actor` ({ email, nombre }) y `solicitud` (o `pedido`) para resolver destinatarios.
 */
export async function construirCorreo(evento, ctx) {
  const definicion = EVENTOS[evento];
  if (!definicion) throw new Error(`Evento de correo desconocido: ${evento}`);
  const base = ctx.solicitud || ctx.pedido || null;
  const envio = resolverEnvio(evento, { solicitud: base, actor: ctx.actor });
  return {
    ...envio,
    subject: definicion.asunto(ctx),
    html: await definicion.html(ctx)
  };
}
