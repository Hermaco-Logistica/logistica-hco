import { MOTIVOS_VENTA_PERDIDA_SEED } from '../constants/motivosVentaPerdidaData';
import { esDecisionItem } from './decisionItemHelpers';

/**
 * Filtra valores provisionales o textos genéricos de fallback.
 */
function esTextoValido(val, textosProhibidos = []) {
  if (!val || typeof val !== 'string') return false;
  const limpio = val.trim().toLowerCase();
  if (!limpio || limpio === 'undefined' || limpio === 'null') return false;
  return !textosProhibidos.some(p => limpio === p.toLowerCase());
}

export function formatearFechaVentaPerdida(f) {
  if (!f) return 'No registrada';
  try {
    const d = f instanceof Date
      ? f
      : (typeof f?.toDate === 'function'
          ? f.toDate()
          : (typeof f?.seconds === 'number'
              ? new Date(f.seconds * 1000)
              : new Date(f)));
    if (!d || isNaN(d.getTime())) return 'No registrada';
    return d.toLocaleString('es-SV', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch {
    return 'No registrada';
  }
}

/**
 * Normaliza y estandariza los datos de venta perdida de un ítem o de una solicitud global.
 * Garantiza que siempre se retorne un contrato uniforme sin importar si los datos
 * se guardaron a nivel de ítem, a nivel global o si se encuentran en memoria (staged).
 * Es IDEMPOTENTE: si recibe un objeto ya normalizado, no degrada ni pierde información.
 *
 * @param {Object} params
 * @param {Object} [params.item] - Producto individual (opcional si es cierre global).
 * @param {Object} [params.solicitud] - Solicitud padre (RFQ o Pedido Manual).
 * @param {Object} [params.staged] - Objeto en memoria si la venta perdida está pendiente de envío.
 * @param {number} [params.fallbackIndex=0] - Índice de respaldo para numeración.
 * @param {string} [params.currentUserEmail] - Email del usuario actual (opcional para staged).
 * @returns {Object} Objeto canónico y limpio listo para ser presentado en la UI.
 */
export function normalizarItemVentaPerdida({ item = null, solicitud = null, staged = null, fallbackIndex = 0, currentUserEmail = '' } = {}) {
  // Si ya es un objeto normalizado, respetarlo de inmediato (evita re-normalizaciones degradadas)
  if (item && item.tipoDecision && item.motivoNombre) {
    return item;
  }

  const prodNombre = item?.descripcion || item?.desc || item?.producto || (item ? `Ítem #${fallbackIndex + 1}` : 'Solicitud completa');
  const prodMarca = item?.marca || 'N/A';

  // 1. Caso: Venta perdida en memoria (staged / pendiente de confirmación por el vendedor)
  if (staged) {
    const motivoObj = staged.motivo || {};
    const codigo = motivoObj.codigo || '';
    const seed = codigo ? MOTIVOS_VENTA_PERDIDA_SEED.find(s => s.codigo === codigo) : null;

    return {
      id: item?.id ?? fallbackIndex,
      producto: prodNombre,
      marca: prodMarca,
      tipoDecision: 'venta_perdida',
      tituloModal: 'Motivo de Venta Perdida',
      badgeLabel: 'Venta Perdida',
      codigo,
      categoria: motivoObj.categoria || seed?.categoria || 'General',
      motivoNombre: motivoObj.nombre || seed?.nombre || 'Venta Perdida',
      comentario: String(staged.comentario || '').trim(),
      registradoPor: staged.registradoPor || currentUserEmail || solicitud?.vendedorEmail || 'Vendedor',
      fecha: staged.fecha || new Date(),
      esPendiente: true
    };
  }

  // 2. Caso: Venta perdida persistida en base de datos
  const globalM = (solicitud?.motivoVentaPerdida && typeof solicitud.motivoVentaPerdida === 'object')
    ? solicitud.motivoVentaPerdida
    : {};
  const itemM = (item?.motivoVentaPerdida && typeof item.motivoVentaPerdida === 'object')
    ? item.motivoVentaPerdida
    : {};

  // Código del motivo
  const codigo = item?.codigo || itemM.codigo || globalM.codigo || item?.motivoCodigo || solicitud?.motivoCodigo || '';
  const seed = codigo ? MOTIVOS_VENTA_PERDIDA_SEED.find(s => s.codigo === codigo) : null;

  // Categoría
  const categoria = item?.categoria || itemM.categoria || globalM.categoria || itemM.categoriaMotivo || globalM.categoriaMotivo || seed?.categoria || 'General';

  // Nombre del motivo (con descarte de placeholders y limpieza de prefijo)
  const prohibidosMotivo = ['venta perdida', 'no especificado', 's/n'];
  const candidatosMotivo = [
    item?.motivoNombre,
    itemM.nombre,
    itemM.motivoNombre,
    globalM.nombre,
    globalM.motivoNombre,
    seed?.nombre,
    itemM.motivoEstadoItem,
    globalM.motivoEstadoItem,
    item?.motivoEstadoItem,
    solicitud?.motivoEstadoItem,
    itemM.motivo,
    globalM.motivo,
    item?.razon
  ].filter(c => esTextoValido(c, prohibidosMotivo));

  let rawMotivo = candidatosMotivo.length > 0 ? candidatosMotivo[0] : (seed?.nombre || 'Venta Perdida');
  if (typeof rawMotivo === 'string' && /^Venta Perdida:\s*/i.test(rawMotivo)) {
    rawMotivo = rawMotivo.replace(/^Venta Perdida:\s*/i, '');
  }
  const motivoNombre = (typeof rawMotivo === 'string' && rawMotivo.trim()) ? rawMotivo.trim() : 'Venta Perdida';

  // Comentario explicativo (con descarte de placeholders genéricos)
  const prohibidosComentario = [
    'sin comentario adicional registrado.',
    'sin observaciones adicionales.'
  ];
  const candidatosComentario = [
    item?.comentario,
    itemM.comentario,
    globalM.comentario,
    itemM.observaciones,
    globalM.observaciones,
    itemM.nota,
    globalM.nota
  ].filter(c => esTextoValido(c, prohibidosComentario));

  const comentario = candidatosComentario.length > 0 ? candidatosComentario[0].trim() : '';

  // Registrado por
  const registradoPor = item?.registradoPor || itemM.registradoPor || globalM.registradoPor || currentUserEmail || solicitud?.vendedorEmail || item?.vendedorEmail || '';

  // Fecha
  const fecha = item?.fecha || itemM.fecha || globalM.fecha || item?.fechaVentaPerdida || solicitud?.fechaVentaPerdida || null;

  return {
    id: item?.id ?? fallbackIndex,
    producto: prodNombre,
    marca: prodMarca,
    tipoDecision: 'venta_perdida',
    tituloModal: 'Motivo de Venta Perdida',
    badgeLabel: 'Venta Perdida',
    codigo,
    categoria,
    motivoNombre,
    comentario,
    registradoPor,
    fecha,
    esPendiente: Boolean(item?.esPendiente)
  };
}

export function tieneMotivoConsultaItem(item) {
  if (!item) return false;
  if (item.estadoItem === 'Venta Perdida') return true;
  return esDecisionItem(item);
}

/**
 * Determina si una solicitud (completa o por ítems) tiene venta perdida registrada.
 */
export function tieneVentaPerdidaSolicitud(solicitud) {
  if (!solicitud) return false;
  if (solicitud.estado === 'Venta Perdida' || Boolean(solicitud.motivoVentaPerdida)) return true;
  if (Array.isArray(solicitud.productos) && solicitud.productos.some(p => p.estadoItem === 'Venta Perdida' || Boolean(p.motivoVentaPerdida))) return true;
  return false;
}

/**
 * Prepara el paquete completo de datos que espera el modal `ModalConsultaVentaPerdida`.
 * Se invoca de manera idéntica desde Compras o Ventas en una sola línea.
 *
 * @param {Object} params
 * @param {Object} params.solicitud - Documento de la solicitud.
 * @param {Object} [params.item] - Ítem individual específico (si se pulsó Consulta en su fila/tarjeta).
 * @param {Object} [params.staged] - Datos en memoria si este ítem está pendiente de confirmación.
 * @param {Array} [params.items] - Lista explícita de productos/ítems (opcional, ej. itemsServer).
 * @param {string} [params.currentUserEmail] - Email del usuario actual.
 * @returns {Object} Estructura canónica { correlativo, cliente, items } para ModalConsultaVentaPerdida.
 */
export function prepararDatosConsultaVentaPerdida({ solicitud, item = null, staged = null, items = null, fallbackIndex = 0, currentUserEmail = '' } = {}) {
  const correlativo = solicitud?.correlativo || 'S/N';
  const cliente = solicitud?.cliente || '';

  // Si se solicitó la consulta de un ítem individual específico
  if (item) {
    const itemNorm = normalizarItemVentaPerdida({ item, solicitud, staged, fallbackIndex, currentUserEmail });
    return {
      correlativo,
      cliente,
      esPendiente: Boolean(staged),
      items: [itemNorm]
    };
  }

  // Si es consulta global (banner de cotización cerrada o fila del dashboard)
  const productos = Array.isArray(items)
    ? items
    : (Array.isArray(solicitud?.productos) ? solicitud.productos : (Array.isArray(solicitud?.items) ? solicitud.items : []));

  const itemsVentaPerdida = productos.filter(p => p.estadoItem === 'Venta Perdida');

  if (itemsVentaPerdida.length > 0) {
    return {
      correlativo,
      cliente,
      esPendiente: false,
      items: itemsVentaPerdida.map((p, idx) => normalizarItemVentaPerdida({
        item: p,
        solicitud,
        fallbackIndex: idx,
        currentUserEmail
      }))
    };
  }

  // Si no hay ítems marcados individualmente pero la solicitud entera está en Venta Perdida
  return {
    correlativo,
    cliente,
    esPendiente: false,
    items: [normalizarItemVentaPerdida({ item: null, solicitud, fallbackIndex: 0, currentUserEmail })]
  };
}
