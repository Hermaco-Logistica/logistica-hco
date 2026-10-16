import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  writeBatch,
  serverTimestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { 
  MOTIVOS_VENTA_PERDIDA_SEED,
  COMENTARIO_VENTA_PERDIDA_MIN 
} from '../constants/motivosVentaPerdidaData';
import { clasificarSolicitud } from '../utils/clasificarSolicitud';

const COLECCION_VENTAS_PERDIDAS = 'ventasPerdidas';
const COLECCION_MOTIVOS = 'motivosVentaPerdida';

/**
 * Obtiene los motivos de venta perdida desde Firestore (o respaldo local si está vacía).
 */
export async function obtenerMotivosVentaPerdida() {
  try {
    const q = query(collection(db, COLECCION_MOTIVOS), where('activo', '==', true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docs = snap.docs.map(d => ({ codigo: d.id, ...d.data() }));
      docs.sort((a, b) => (a.orden || 999) - (b.orden || 999));
      return docs;
    }
  } catch (err) {
    console.info('[ventasPerdidasService] Usando catálogo semilla local:', err?.message || err);
  }
  return MOTIVOS_VENTA_PERDIDA_SEED.filter(m => m.activo);
}

/**
 * Registra una venta perdida en un solo batch atómico:
 * 1. Crea documento en `ventasPerdidas` (validado por Firestore rules).
 * 2. Actualiza la solicitud (estado global e ítems afectados).
 * 
 * @param {Object} params
 * @param {Object} params.solicitud - Documento de la solicitud.
 * @param {Object} params.motivo - Motivo seleccionado ({ codigo, nombre, categoria }).
 * @param {string} params.comentario - Comentario explicativo (mínimo 15 caracteres tras trim).
 * @param {Object} [params.usuario] - Usuario autenticado.
 * @param {Array<number|string|Object>} [params.itemsSeleccionados] - Índices o ítems específicos a marcar. Si es null/undefined, aplica a todos los no pedidos.
 */
export async function registrarVentaPerdida({
  solicitud,
  motivo,
  comentario = '',
  usuario = null,
  itemsSeleccionados = null
}) {
  if (!solicitud?.id) throw new Error('Solicitud inválida');
  if (!motivo?.codigo) throw new Error('Motivo de venta perdida requerido');

  const comentarioLimpio = String(comentario || '').trim();
  if (comentarioLimpio.length < COMENTARIO_VENTA_PERDIDA_MIN) {
    throw new Error(`El comentario explicativo debe tener al menos ${COMENTARIO_VENTA_PERDIDA_MIN} caracteres.`);
  }

  const vendedorUid = usuario?.uid || auth.currentUser?.uid;
  if (!vendedorUid) {
    throw new Error('Usuario autenticado no identificado.');
  }

  const productosOriginales = Array.isArray(solicitud.productos) ? solicitud.productos : [];

  // Determinar los índices afectados
  let indicesAfectados = [];
  if (Array.isArray(itemsSeleccionados) && itemsSeleccionados.length > 0) {
    indicesAfectados = itemsSeleccionados.map((it) => {
      if (typeof it === 'number') return it;
      if (typeof it?._idxOriginal === 'number') return it._idxOriginal;
      const idx = productosOriginales.findIndex(p => p === it || (p.descripcion && p.descripcion === it.descripcion));
      return idx >= 0 ? idx : null;
    }).filter(idx => idx !== null && idx >= 0 && idx < productosOriginales.length);
  } else {
    // Si no se especifican ítems, afecta a todos los no pedidos ni anulados
    indicesAfectados = productosOriginales
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p.estadoItem !== 'Pedido' && p.estadoItem !== 'Comprado' && p.estadoItem !== 'Anulado')
      .map(({ idx }) => idx);
  }

  if (indicesAfectados.length === 0) {
    throw new Error('No hay ítems elegibles para marcar como venta perdida.');
  }

  // Actualizar ítems en memoria y calcular totales de los ítems afectados
  let montoAereoAfectado = 0;
  let montoMaritimoAfectado = 0;
  const factorA = Number(solicitud.factorA || 1);
  const factorM = Number(solicitud.factorM || 1.08);

  const productosActualizados = productosOriginales.map((p, idx) => {
    if (!indicesAfectados.includes(idx)) {
      return p;
    }

    const cant = Number(p.cant || 1);
    const fob = Number(p.fob || p.precio || 0);

    if (solicitud.tipo === 'Pedido Manual') {
      const subtotal = Number(p.subtotal || (fob * cant));
      if (p.modalidad === 'Marítimo') {
        montoMaritimoAfectado += subtotal;
      } else {
        montoAereoAfectado += subtotal;
      }
    } else {
      if (fob > 0) {
        const itemFactorA = Number(p.factorA || factorA);
        const itemFactorM = Number(p.factorM || factorM);
        const fva = Number(p.fva || 1.3);
        const fvm = Number(p.fvm || 1.25);
        montoAereoAfectado += fob * itemFactorA * fva * cant;
        montoMaritimoAfectado += fob * itemFactorM * fvm * cant;
      }
    }

    return {
      ...p,
      estadoItem: 'Venta Perdida',
      motivoEstadoItem: `Venta Perdida: ${motivo.nombre}`,
      motivoVentaPerdida: {
        codigo: motivo.codigo,
        nombre: motivo.nombre,
        categoria: motivo.categoria || 'Otros',
        comentario: comentarioLimpio,
        fecha: new Date(),
        registradoPor: usuario?.email || auth.currentUser?.email || ''
      }
    };
  });

  // Determinar nuevo estado global de la solicitud
  const noPedidosNiAnulados = productosActualizados.filter(
    p => p.estadoItem !== 'Pedido' && p.estadoItem !== 'Comprado' && p.estadoItem !== 'Anulado'
  );
  const todosEnVentaPerdida = noPedidosNiAnulados.length > 0 && noPedidosNiAnulados.every(p => p.estadoItem === 'Venta Perdida');
  const hayPedidos = productosActualizados.some(p => p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado');

  let nuevoEstado = solicitud.estado;
  let nuevoEstadoGlobal = solicitud.estadoGlobal || solicitud.estado;

  if (todosEnVentaPerdida && !hayPedidos) {
    nuevoEstado = 'Venta Perdida';
    nuevoEstadoGlobal = 'Venta Perdida';
  } else {
    const clasif = clasificarSolicitud(productosActualizados, solicitud.estado);
    nuevoEstado = clasif.estado;
    nuevoEstadoGlobal = clasif.estado;
  }

  const itemsIdsAfectados = indicesAfectados.map(i => {
    const prod = productosOriginales[i];
    return prod?.id || prod?.codigo || String(i);
  });

  // Operación atómica en writeBatch
  const batch = writeBatch(db);

  // 1. Documento de venta perdida en la colección ventasPerdidas
  const ventaPerdidaRef = doc(collection(db, COLECCION_VENTAS_PERDIDAS));
  const registroVentaPerdida = {
    solicitudId: solicitud.id,
    motivoCodigo: motivo.codigo,
    comentario: comentarioLimpio,
    vendedorId: vendedorUid,
    fecha: serverTimestamp(),
    tipoSolicitud: solicitud.tipo || 'RFQ',
    correlativo: solicitud.correlativo || 'N/A',
    cliente: solicitud.cliente || 'Desconocido',
    montoAereo: Math.round(montoAereoAfectado * 100) / 100,
    montoMaritimo: Math.round(montoMaritimoAfectado * 100) / 100,
    itemsIds: itemsIdsAfectados,
    motivoNombre: motivo.nombre,
    categoriaMotivo: motivo.categoria || 'Otros'
  };
  batch.set(ventaPerdidaRef, registroVentaPerdida);

  // 2. Actualización de la solicitud
  const solicitudRef = doc(db, 'solicitudes', solicitud.id);
  batch.update(solicitudRef, {
    estado: nuevoEstado,
    estadoGlobal: nuevoEstadoGlobal,
    productos: productosActualizados,
    motivoVentaPerdida: {
      codigo: motivo.codigo,
      nombre: motivo.nombre,
      categoria: motivo.categoria || 'Otros',
      comentario: comentarioLimpio,
      montoAereo: Math.round(montoAereoAfectado * 100) / 100,
      montoMaritimo: Math.round(montoMaritimoAfectado * 100) / 100,
      registradoPor: usuario?.email || auth.currentUser?.email || '',
      registradoPorId: vendedorUid,
      fecha: new Date(),
      itemsAfectados: itemsIdsAfectados
    }
  });

  await batch.commit();

  return {
    id: ventaPerdidaRef.id,
    ...registroVentaPerdida,
    nuevoEstado,
    indicesAfectados
  };
}
