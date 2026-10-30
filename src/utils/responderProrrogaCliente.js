import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { completarAnclasProrroga, obtenerFechaVencimientoProrroga, obtenerFechasVencimientoProrroga } from './prorrogasCliente';
import { esSolicitudCerrada, obtenerIndicesAlcanceProrroga, obtenerIndicesItemsActivos } from './cicloSeguimiento';

const obtenerHistorial = (solicitud) => {
  const historial = solicitud?.prorrogaCliente?.historial;
  if (Array.isArray(historial) && historial.length) return historial;
  return solicitud?.prorrogaCliente ? [solicitud.prorrogaCliente] : [];
};

export async function responderProrrogaCliente({ solicitud, prorroga, accion, comentario = '', respondidoPor = '' }) {
  if (!solicitud?.id || !prorroga || !['aprobada', 'rechazada'].includes(accion)) {
    throw new Error('Datos incompletos para responder la prórroga.');
  }
  if (accion === 'rechazada' && !comentario.trim()) {
    throw new Error('Debes indicar el motivo del rechazo.');
  }

  const solicitudRef = doc(db, 'solicitudes', solicitud.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(solicitudRef);
    if (!snapshot.exists()) throw new Error('La solicitud ya no existe.');

    const solicitudActual = { ...snapshot.data(), id: snapshot.id };
    if (esSolicitudCerrada(solicitudActual)) {
      throw new Error('La solicitud ya está cerrada; la prórroga queda sin efecto y no se puede responder.');
    }

    const prorrogaActual = solicitudActual.prorrogaCliente;
    const rondaActual = Number(prorrogaActual?.ronda || 0);
    if (!prorrogaActual || rondaActual !== Number(prorroga.ronda || 0)) {
      throw new Error('Esta ya no es la prórroga vigente. Actualiza la página para consultar el historial.');
    }
    if (prorrogaActual.estado !== 'pendiente') {
      throw new Error('Esta prórroga ya fue atendida. Actualiza la vista para ver el resultado.');
    }

    const indicesOriginales = obtenerIndicesAlcanceProrroga(solicitudActual, prorrogaActual);
    const indicesActivos = obtenerIndicesItemsActivos(solicitudActual, indicesOriginales);
    if (indicesActivos.length === 0) {
      throw new Error('Los ítems de esta prórroga ya se cerraron; no hay días que aprobar o rechazar.');
    }

    // En cierres parciales, calcular/aplicar fechas solo sobre los ítems que siguen abiertos.
    const prorrogaParaCalculo = completarAnclasProrroga(solicitudActual, {
      ...prorrogaActual,
      indicesItems: indicesActivos
    });
    const prorrogaAprobada = { ...prorrogaParaCalculo, diasAprobados: Number(prorrogaActual.diasSolicitados) };
    const fechasAprobadas = accion === 'aprobada'
      ? Object.fromEntries(obtenerFechasVencimientoProrroga(prorrogaAprobada)
        .map(({ index, fechaFin }) => [index, fechaFin]))
      : undefined;
    const respuesta = {
      estado: accion,
      respuestaComprador: comentario.trim(),
      respondidoPor,
      fechaRespuesta: Timestamp.now(),
      ...(accion === 'aprobada' ? {
        diasAprobados: Number(prorrogaActual.diasSolicitados),
        fechaVencimientoAprobada: obtenerFechaVencimientoProrroga(prorrogaAprobada),
        fechasVencimientoAprobadas: fechasAprobadas
      } : {})
    };
    const historialActualizado = obtenerHistorial(solicitudActual).map((entrada) => (
      Number(entrada.ronda || 0) === rondaActual
        ? { ...entrada, ...respuesta }
        : entrada
    ));

    transaction.update(solicitudRef, {
      prorrogaCliente: { ...prorrogaActual, ...respuesta, historial: historialActualizado }
    });
  });
}
