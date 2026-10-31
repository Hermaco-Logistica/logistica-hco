import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
export { esItemCerrado } from './estadoItem';

/**
 * Helpers para gestión y consulta de decisiones operativas sobre ítems
 * (Rechazo de oferta de Compras, Denegación de Compras, Anulación de Ítem).
 * Separado de la lógica comercial de Venta Perdida.
 */

export function parseDateMs(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val instanceof Date) return val.getTime();
  if (typeof val.toDate === 'function') {
    try { return val.toDate().getTime(); } catch { return 0; }
  }
  if (typeof val.seconds === 'number') {
    return val.seconds * 1000 + (val.nanoseconds ? Math.floor(val.nanoseconds / 1000000) : 0);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export function formatearFechaDecision(f) {
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
 * Determina si un texto de motivo corresponde a un placeholder genérico del sistema.
 */
export function esMotivoGenerico(motivo) {
  if (!motivo) return true;
  const m = String(motivo).trim().toLowerCase();
  if (!m) return true;
  if (m === 'ítem denegado por compras' || m === 'item denegado por compras') return true;
  if (m === 'oferta rechazada por vendedor') return true;
  if (m === 'ítem anulado' || m === 'item anulado') return true;
  if (m === 'sin motivo registrado') return true;
  if (m === 'no se registró un motivo.' || m === 'no se registro un motivo.') return true;
  return false;
}

/**
 * Determina si un producto/ítem posee una decisión operativa negativa registrada.
 */
export function esDecisionItem(item) {
  if (!item) return false;
  if (item.estadoItem === 'Cancelado' || item.estadoItem === 'Rechazado' || Boolean(item.motivoRechazo)) return true;
  if (item.estadoItem === 'Denegado' || Boolean(item.motivoDenegacion)) return true;
  if (item.estadoItem === 'Anulado') return true;
  return false;
}

/**
 * Obtiene el tipo de decisión ('rechazo', 'denegacion', 'anulacion') o null.
 */
export function obtenerTipoDecisionItem(item) {
  if (!item) return null;
  if (item.estadoItem === 'Cancelado' || item.estadoItem === 'Rechazado' || Boolean(item.motivoRechazo)) {
    return 'rechazo';
  }
  if (item.estadoItem === 'Denegado' || Boolean(item.motivoDenegacion)) {
    return 'denegacion';
  }
  if (item.estadoItem === 'Anulado' || Boolean(item.motivoAnulacion)) {
    return 'anulacion';
  }
  return null;
}

/**
 * Prepara los datos canónicos necesarios para el modal `ModalConsultaDecisionItem`.
 */
export function prepararDatosDecisionItem({ solicitud = null, item = null, fallbackIndex = 0 } = {}) {
  const correlativo = solicitud?.correlativo || item?.correlativo || 'S/N';
  const cliente = solicitud?.cliente || item?.cliente || '';
  const solicitudId = solicitud?.id || item?.solicitudId || item?.rfqId || '';
  const itemId = item?.idx !== undefined ? item.idx : (item?.itemId !== undefined ? item.itemId : fallbackIndex);
  const producto = item?.descripcion || item?.desc || item?.producto || `Ítem #${fallbackIndex + 1}`;
  const marca = item?.marca || 'N/A';
  const sku = String(item?.sku || item?.codigoProducto || item?.codigo || '').trim();
  const tipoDecision = obtenerTipoDecisionItem(item) || 'rechazo';

  let tituloModal = 'Motivo de la Decisión';
  let headerTag = 'Negociación';
  let badgeLabel = 'Decisión Registrada';
  let labelMotivo = 'Motivo';
  let motivo = 'Sin motivo registrado';
  let registradoPor = 'Usuario';
  let fecha = null;

  const ultimoCambio = item?.negociacion?.ultimoCambio || null;
  const mensajeEventoId = ultimoCambio?.mensajeEventoId || null;

  if (tipoDecision === 'rechazo') {
    tituloModal = 'Motivo de Rechazo de Oferta';
    headerTag = 'Negociación de Oferta';
    badgeLabel = 'Oferta Rechazada';
    labelMotivo = 'Motivo del Rechazo';
    motivo = item?.motivoRechazo || item?.motivoEstadoItem || 'Oferta rechazada por vendedor';

    const autorNombre = ultimoCambio?.nombre || solicitud?.vendedorNombre || 'Vendedor';
    registradoPor = `${autorNombre} (Vendedor)`;
    fecha = ultimoCambio?.en || item?.fechaRechazo || null;
  } else if (tipoDecision === 'denegacion') {
    tituloModal = 'Motivo de Denegación';
    headerTag = 'Revisión de Compras';
    badgeLabel = 'Ítem Denegado';
    labelMotivo = 'Motivo de la Denegación';
    motivo = item?.motivoDenegacion || item?.motivoEstadoItem || 'Ítem denegado por Compras';

    const autorNombre = ultimoCambio?.nombre || 'Comprador';
    registradoPor = `${autorNombre} (Compras)`;
    fecha = ultimoCambio?.en || item?.fechaDenegacion || null;
  } else if (tipoDecision === 'anulacion') {
    tituloModal = 'Motivo de Anulación';
    headerTag = 'Anulación de Ítem';
    badgeLabel = 'Ítem Anulado';
    labelMotivo = 'Motivo de la Anulación';
    motivo = item?.motivoAnulacion || 'Ítem anulado';
    registradoPor = item?.anuladoPor ? `${item.anuladoPor} (Compras)` : 'Compras';
    fecha = item?.fechaAnulacion || null;
  }

  return {
    solicitudId,
    itemId,
    correlativo,
    cliente,
    producto,
    sku,
    marca,
    tipoDecision,
    tituloModal,
    headerTag,
    badgeLabel,
    labelMotivo,
    motivo,
    registradoPor,
    fecha,
    mensajeEventoId,
    fechaEvento: ultimoCambio?.en || fecha || null,
    ultimoCambio
  };
}

/**
 * Determina si una solicitud (completa o por ítems) tiene decisiones operativas registradas.
 */
export function tieneDecisionSolicitud(solicitud) {
  if (!solicitud) return false;
  if (solicitud.estado === 'Anulado' || Boolean(solicitud.motivoAnulacion)) return true;
  if (solicitud.estado === 'Denegado' || Boolean(solicitud.motivoDenegacion)) return true;
  if (Array.isArray(solicitud.productos) && solicitud.productos.some(p => esDecisionItem(p))) return true;
  return false;
}

/**
 * Prepara los datos de todas las decisiones operativas presentes en una solicitud para el modal.
 */
export function prepararDatosDecisionSolicitud(solicitud) {
  if (!solicitud) return null;
  const correlativo = solicitud.correlativo || 'S/N';
  const cliente = solicitud.cliente || '';
  const solicitudId = solicitud.id || '';
  const productos = Array.isArray(solicitud.productos) ? solicitud.productos : [];

  const itemsConDecision = productos
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => esDecisionItem(p));

  // Si tiene ítems con decisión individual
  if (itemsConDecision.length > 0) {
    const items = itemsConDecision.map(({ p, idx }) =>
      prepararDatosDecisionItem({ solicitud, item: { ...p, idx }, fallbackIndex: idx })
    );
    return {
      solicitudId,
      correlativo,
      cliente,
      items
    };
  }

  // Si no tiene ítems individuales pero la solicitud completa está denegada
  if (solicitud.estado === 'Denegado' || Boolean(solicitud.motivoDenegacion)) {
    const itemDenegadoGlobal = {
      solicitudId,
      correlativo,
      cliente,
      producto: 'Solicitud completa',
      marca: 'N/A',
      tipoDecision: 'denegacion',
      tituloModal: 'Motivo de Denegación',
      headerTag: 'Revisión de Compras',
      badgeLabel: 'Solicitud Denegada',
      labelMotivo: 'Motivo de la Denegación',
      motivo: solicitud.motivoDenegacion || 'Ítem denegado por Compras',
      registradoPor: solicitud.denegadoPor ? `${solicitud.denegadoPor} (Compras)` : 'Compras',
      fecha: solicitud.fechaDenegacion || null
    };

    return {
      solicitudId,
      correlativo,
      cliente,
      items: [itemDenegadoGlobal]
    };
  }

  // Si no tiene ítems individuales pero la solicitud completa está anulada
  if (solicitud.estado === 'Anulado' || Boolean(solicitud.motivoAnulacion)) {
    const itemAnuladoGlobal = {
      solicitudId,
      correlativo,
      cliente,
      producto: 'Solicitud completa',
      marca: 'N/A',
      tipoDecision: 'anulacion',
      tituloModal: 'Motivo de Anulación',
      headerTag: 'Anulación de Solicitud',
      badgeLabel: 'Solicitud Anulada',
      labelMotivo: 'Motivo de la Anulación',
      motivo: solicitud.motivoAnulacion || 'Sin motivo registrado',
      registradoPor: solicitud.anuladoPor ? `${solicitud.anuladoPor} (Compras)` : 'Compras',
      fecha: solicitud.fechaAnulacion || null
    };

    return {
      solicitudId,
      correlativo,
      cliente,
      items: [itemAnuladoGlobal]
    };
  }

  return null;
}

// Caché en memoria para evitar llamadas redundantes a Firestore durante la sesión
const cacheMotivos = new Map();

/**
 * Busca en la subcolección `solicitudes/{solicitudId}/mensajes` el comentario de texto
 * que acompaña a la acción del evento de denegación o rechazo.
 */
export async function buscarMotivoDecisionMensajes({
  solicitudId,
  itemId = null,
  tipoDecision = null,
  mensajeEventoId = null,
  fechaEvento = null
} = {}) {
  if (!solicitudId) return null;

  const cacheKey = `${solicitudId}_${itemId ?? 'all'}_${tipoDecision ?? ''}_${mensajeEventoId ?? ''}`;
  if (cacheMotivos.has(cacheKey)) {
    return cacheMotivos.get(cacheKey);
  }

  try {
    const mensajesRef = collection(db, `solicitudes/${solicitudId}/mensajes`);
    const snap = await getDocs(mensajesRef);
    if (!snap || snap.empty) return null;

    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filtrar mensajes que correspondan a este ítem si se proporcionó itemId
    const delItem = (itemId !== null && itemId !== undefined)
      ? todos.filter(m => (
          m.itemId === itemId ||
          Number(m.itemId) === Number(itemId) ||
          String(m.itemId) === String(itemId)
        ))
      : todos;

    // 1. Si tenemos mensajeEventoId, buscar el evento exacto
    let eventoDoc = null;
    if (mensajeEventoId) {
      eventoDoc = todos.find(m => m.id === mensajeEventoId) || null;
    }

    // 2. Si no encontramos el evento por ID, buscar evento por acción y fecha
    if (!eventoDoc) {
      const accionEsperada = tipoDecision === 'denegacion'
        ? 'denegar'
        : (tipoDecision === 'rechazo' ? 'rechazar' : null);

      if (accionEsperada) {
        const eventosAccion = delItem.filter(m => m.tipo === 'evento' && m.accion === accionEsperada);
        if (eventosAccion.length === 1) {
          eventoDoc = eventosAccion[0];
        } else if (eventosAccion.length > 1 && fechaEvento) {
          const tRef = parseDateMs(fechaEvento);
          eventosAccion.sort((a, b) => Math.abs(parseDateMs(a.createdAt) - tRef) - Math.abs(parseDateMs(b.createdAt) - tRef));
          eventoDoc = eventosAccion[0];
        }
      }
    }

    // 3. Buscar mensajes de texto válidos
    const poolTextos = delItem.length > 0 ? delItem : todos;
    const textos = poolTextos.filter(m => m.tipo === 'texto' && m.texto && String(m.texto).trim().length > 0);
    if (textos.length === 0) return null;

    let resultado = null;

    // 4. Si encontramos el evento, buscar el texto creado en la misma transacción / timestamp
    if (eventoDoc && eventoDoc.createdAt) {
      const tEvento = parseDateMs(eventoDoc.createdAt);
      const coincidentes = textos
        .map(t => ({ ...t, diff: Math.abs(parseDateMs(t.createdAt) - tEvento) }))
        .sort((a, b) => a.diff - b.diff);

      // Si el más cercano está dentro de 60 segundos (en Firebase transacciones usualmente < 1 segundo)
      if (coincidentes[0] && coincidentes[0].diff <= 60000) {
        resultado = {
          texto: coincidentes[0].texto.trim(),
          autor: coincidentes[0].autor?.nombre || eventoDoc.autor?.nombre,
          rol: coincidentes[0].autor?.rol || eventoDoc.autor?.rol,
          fecha: coincidentes[0].createdAt || eventoDoc.createdAt,
          mensajeTextoId: coincidentes[0].id,
          mensajeEventoId: eventoDoc.id
        };
      }
    }

    // 5. Si no hay evento o no coincidió pero tenemos fechaEvento
    if (!resultado && fechaEvento) {
      const tRef = parseDateMs(fechaEvento);
      const coincidentes = textos
        .map(t => ({ ...t, diff: Math.abs(parseDateMs(t.createdAt) - tRef) }))
        .sort((a, b) => a.diff - b.diff);

      if (coincidentes[0] && coincidentes[0].diff <= 60000) {
        resultado = {
          texto: coincidentes[0].texto.trim(),
          autor: coincidentes[0].autor?.nombre,
          rol: coincidentes[0].autor?.rol,
          fecha: coincidentes[0].createdAt,
          mensajeTextoId: coincidentes[0].id
        };
      }
    }

    // 6. Fallback por rol y última fecha
    if (!resultado && tipoDecision === 'denegacion') {
      const deCompras = textos.filter(t => t.autor?.rol === 'comprador' || t.autor?.rol === 'compras');
      if (deCompras.length > 0) {
        deCompras.sort((a, b) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt));
        resultado = {
          texto: deCompras[0].texto.trim(),
          autor: deCompras[0].autor?.nombre,
          rol: deCompras[0].autor?.rol,
          fecha: deCompras[0].createdAt,
          mensajeTextoId: deCompras[0].id
        };
      }
    }

    if (!resultado && tipoDecision === 'rechazo') {
      const deVendedor = textos.filter(t => t.autor?.rol === 'vendedor');
      if (deVendedor.length > 0) {
        deVendedor.sort((a, b) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt));
        resultado = {
          texto: deVendedor[0].texto.trim(),
          autor: deVendedor[0].autor?.nombre,
          rol: deVendedor[0].autor?.rol,
          fecha: deVendedor[0].createdAt,
          mensajeTextoId: deVendedor[0].id
        };
      }
    }

    // Último recurso: el mensaje de texto más reciente del ítem
    if (!resultado) {
      textos.sort((a, b) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt));
      resultado = {
        texto: textos[0].texto.trim(),
        autor: textos[0].autor?.nombre,
        rol: textos[0].autor?.rol,
        fecha: textos[0].createdAt,
        mensajeTextoId: textos[0].id
      };
    }

    if (resultado) {
      cacheMotivos.set(cacheKey, resultado);
    }
    return resultado;
  } catch (err) {
    console.error('Error buscando motivo de decisión en mensajes:', err);
    return null;
  }
}
