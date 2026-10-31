import { clasificarSolicitud } from './clasificarSolicitud';
import { ETIQUETAS_FASE_SEGUIMIENTO } from './etiquetas';
import { ESTADOS_SEGUIMIENTO_CLIENTE, obtenerResumenSeguimientoCliente } from './seguimientoCliente';

/**
 * Fase de seguimiento de cliente (revisión / prórroga) derivada de los datos de la solicitud.
 * No se guarda en `estado` ni en `resultado`: se calcula al vuelo para análisis y listados.
 * Mayor `prioridad` = fase más urgente; la solicitud toma la fase más urgente de sus ítems.
 */
const PRIORIDAD_FASE = { cierre_requerido: 5, vencida: 4, prorroga_pendiente: 3, en_prorroga: 2, en_revision: 1 };

export const FASES_SEGUIMIENTO = Object.fromEntries(Object.entries(ETIQUETAS_FASE_SEGUIMIENTO).map(([fase, datos]) => [
  fase,
  { etiqueta: datos.texto, titulo: datos.titulo, tono: datos.tono, prioridad: PRIORIDAD_FASE[fase] }
]));

/** Texto de desglose por fase para tooltips: "2 vencidas · 1 en revisión". */
export function describirFasesSeguimiento(porFase = {}) {
  return Object.entries(FASES_SEGUIMIENTO)
    .filter(([fase]) => porFase[fase])
    .map(([fase, datos]) => `${porFase[fase]} ${datos.etiqueta.toLowerCase()}`)
    .join(' · ');
}

const ESTADOS_EVALUABLES = ['Cotizado', 'Cotizado Parcial', 'Pedido Parcial'];

function obtenerFaseItem(detalle, solicitud, resumen) {
  if (detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO) return 'cierre_requerido';
  if (detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL
    || detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE) {
    const indicesPendientes = solicitud?.prorrogaCliente?.indicesItems;
    return resumen.prorrogaPendiente && Array.isArray(indicesPendientes) && indicesPendientes.includes(detalle.index)
      ? 'prorroga_pendiente'
      : 'vencida';
  }
  if (detalle.tieneProrrogaFormal) return 'en_prorroga';
  if (detalle.estado === ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION) return 'en_revision';
  return null;
}

function analizarSolicitud(solicitud, fechaReferencia) {
  const productos = Array.isArray(solicitud?.productos) ? solicitud.productos : [];
  if (productos.length === 0) return null;
  if (!ESTADOS_EVALUABLES.includes(clasificarSolicitud(productos, solicitud.estado).estado)) return null;

  const resumen = obtenerResumenSeguimientoCliente(solicitud, productos, fechaReferencia);
  if (resumen.solicitudCerrada) return null;

  const items = new Map(resumen.detalles.map((detalle) => {
    const fase = obtenerFaseItem(detalle, solicitud, resumen);
    return [detalle.index, {
      index: detalle.index,
      fase,
      etiqueta: fase ? FASES_SEGUIMIENTO[fase].etiqueta : '',
      revisiones: detalle.cantidadRevisiones,
      fechaLimite: detalle.fechaAlertaInicial,
      vencida: detalle.vencida
    }];
  }));
  return { resumen, items };
}

/**
 * Seguimiento por ítem activo de una solicitud evaluable (aunque no tenga fase): fase, revisiones usadas y fecha límite.
 * Devuelve null si la solicitud no es evaluable (cerrada, anulada, pendiente de cotizar...).
 */
export function obtenerSeguimientoItemsSolicitud(solicitud, fechaReferencia = new Date()) {
  const analisis = analizarSolicitud(solicitud, fechaReferencia);
  return analisis ? { items: analisis.items, resumen: analisis.resumen } : null;
}

/**
 * Devuelve null si la solicitud no está en seguimiento; si lo está:
 * { fase, ...datos de la fase, indicesPorFase, indicesEnSeguimiento }.
 */
export function obtenerFaseSeguimientoSolicitud(solicitud, fechaReferencia = new Date()) {
  const analisis = analizarSolicitud(solicitud, fechaReferencia);
  if (!analisis) return null;

  const indicesPorFase = {};
  let fase = null;
  for (const item of analisis.items.values()) {
    if (!item.fase) continue;
    (indicesPorFase[item.fase] ||= []).push(item.index);
    if (!fase || FASES_SEGUIMIENTO[item.fase].prioridad > FASES_SEGUIMIENTO[fase].prioridad) fase = item.fase;
  }
  if (!fase) return null;

  return {
    fase,
    ...FASES_SEGUIMIENTO[fase],
    indicesPorFase,
    indicesEnSeguimiento: Object.values(indicesPorFase).flat().sort((a, b) => a - b)
  };
}

/** Monto (precio unitario por cantidad) de los ítems indicados, con la misma regla que las métricas de análisis. */
export function calcularMontoItemsSeguimiento(solicitud, indices = []) {
  const productos = Array.isArray(solicitud?.productos) ? solicitud.productos : [];
  return indices.reduce((total, indice) => {
    const producto = productos[indice];
    if (!producto) return total;
    const cantidad = Number(producto.cant || 1);
    const fob = Number(producto.fob || 0);
    let unitario = Number(producto.precioUnitario || producto.precio || 0);
    if (!unitario && producto.subtotal && cantidad > 0) unitario = Number(producto.subtotal) / cantidad;
    if (!unitario && fob > 0) unitario = fob;
    return unitario > 0 ? total + unitario * cantidad : total;
  }, 0);
}

/* Versiones con caché para vistas que consultan la misma solicitud muchas veces (una fila por ítem).
 * La caché vive mientras viva el objeto de la solicitud y se renueva cada hora, porque el vencimiento depende de la fecha. */
const cacheFases = new WeakMap();
const MS_HORA = 60 * 60 * 1000;

function obtenerCacheada(solicitud, clave, calcular) {
  if (!solicitud || typeof solicitud !== 'object') return null;
  const hora = Math.floor(Date.now() / MS_HORA);
  let entrada = cacheFases.get(solicitud);
  if (!entrada || entrada.hora !== hora) {
    entrada = { hora, valores: {} };
    cacheFases.set(solicitud, entrada);
  }
  if (!(clave in entrada.valores)) entrada.valores[clave] = calcular();
  return entrada.valores[clave];
}

/** Igual que obtenerFaseSeguimientoSolicitud, con caché por solicitud. */
export function obtenerFaseSolicitudCacheada(solicitud) {
  return obtenerCacheada(solicitud, 'solicitud', () => obtenerFaseSeguimientoSolicitud(solicitud));
}

/** Clave de fase ('en_revision', 'vencida'...) de un ítem, o null si no está en seguimiento. */
export function obtenerFaseItemCacheada(solicitud, indice) {
  const analisis = obtenerCacheada(solicitud, 'items', () => obtenerSeguimientoItemsSolicitud(solicitud));
  return analisis?.items.get(indice)?.fase || null;
}

/** Suma una fase al acumulador { enSeguimiento, fasesSeguimiento } de una fila agregada (cliente, vendedor, producto). */
export function acumularFaseSeguimiento(acumulador, fase) {
  if (!fase) return;
  acumulador.enSeguimiento = (acumulador.enSeguimiento || 0) + 1;
  acumulador.fasesSeguimiento ||= {};
  acumulador.fasesSeguimiento[fase] = (acumulador.fasesSeguimiento[fase] || 0) + 1;
}
