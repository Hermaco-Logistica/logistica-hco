import { esItemCerrado } from './estadoItem';

const ESTADOS_SOLICITUD_CERRADOS = new Set([
  'pedido',
  'comprado',
  'venta perdida',
  'anulado',
  'anulada',
  'rechazado',
  'rechazada',
  'denegado',
  'denegada',
  'cancelado',
  'cancelada',
  'cerrado',
  'cerrada'
]);

const normalizarEstado = (estado) => String(estado || '').trim().toLocaleLowerCase('es');

/** Indica si la solicitud completa llegó a un estado terminal, por estado o por todos sus ítems. */
export function esSolicitudCerrada(solicitud) {
  if (!solicitud) return false;

  if (ESTADOS_SOLICITUD_CERRADOS.has(normalizarEstado(solicitud.estado))) return true;
  if (solicitud.motivoVentaPerdida || solicitud.motivoAnulacion || solicitud.motivoDenegacion) return true;

  const items = Array.isArray(solicitud.productos) ? solicitud.productos : [];
  return items.length > 0 && items.every(esItemCerrado);
}

/** Devuelve los índices que todavía pueden recibir una revisión o prórroga. */
export function obtenerIndicesItemsActivos(solicitud, indices = []) {
  const items = Array.isArray(solicitud?.productos) ? solicitud.productos : [];
  return [...new Set(indices.map(Number))]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < items.length)
    .filter((index) => !esItemCerrado(items[index]));
}

/** Compatibilidad: registros antiguos sin índices se interpretan como alcance de la solicitud completa. */
export function obtenerIndicesAlcanceProrroga(solicitud, prorroga) {
  const indices = prorroga?.indicesItems;
  if (Array.isArray(indices) && indices.length > 0) return indices;
  return (Array.isArray(solicitud?.productos) ? solicitud.productos : []).map((_, index) => index);
}

/** Describe el cierre efectivo de un evento sin borrar ni reescribir el historial original. */
export function obtenerCierreEventoSeguimiento(solicitud, evento) {
  if (esSolicitudCerrada(solicitud)) {
    const estado = normalizarEstado(solicitud.estado);
    const motivo = ESTADOS_SOLICITUD_CERRADOS.has(estado)
      ? `Solicitud cerrada · ${solicitud.estado}`
      : 'Solicitud cerrada · todos sus ítems están cerrados';
    return {
      cerrado: true,
      solicitudCompleta: true,
      motivo
    };
  }

  const indicesEvento = evento?.tipo === 'revision'
    ? [evento.indiceItem]
    : obtenerIndicesAlcanceProrroga(solicitud, evento?.prorroga);
  if (indicesEvento.length === 0) return { cerrado: false, solicitudCompleta: false, motivo: '' };

  const indicesActivos = obtenerIndicesItemsActivos(solicitud, indicesEvento);
  const indicesCerrados = indicesEvento.map(Number).filter((index) => !indicesActivos.includes(index));
  const cerrado = indicesActivos.length === 0;

  return {
    cerrado,
    solicitudCompleta: false,
    motivo: cerrado
      ? `Sin efecto · ${evento?.tipo === 'revision' ? 'el ítem de esta revisión ya está cerrado' : 'los ítems de esta prórroga ya están cerrados'}`
      : indicesCerrados.length > 0
        ? 'Aplicable solo a los ítems que siguen abiertos'
        : '',
    indicesActivos,
    indicesCerrados
  };
}

