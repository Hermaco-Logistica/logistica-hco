import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { completarAnclasProrroga, obtenerFechaVencimientoProrroga, obtenerFechasVencimientoProrroga } from './prorrogasCliente';

const obtenerHistorial = (solicitud) => {
  const historial = solicitud?.prorrogaCliente?.historial;
  if (Array.isArray(historial) && historial.length) return historial;
  return solicitud?.prorrogaCliente ? [solicitud.prorrogaCliente] : [];
};

export async function responderProrrogaCliente({ solicitud, prorroga, accion, comentario = '', respondidoPor = '' }) {
  if (!solicitud?.id || !prorroga || !['aprobada', 'rechazada'].includes(accion)) {
    throw new Error('Datos incompletos para responder la prórroga.');
  }
  if (prorroga.estado !== 'pendiente') {
    throw new Error('Esta prórroga ya fue atendida. Actualiza la vista para ver el resultado.');
  }
  if (accion === 'rechazada' && !comentario.trim()) {
    throw new Error('Debes indicar el motivo del rechazo.');
  }

  const prorrogaConAnclas = completarAnclasProrroga(solicitud, prorroga);
  const prorrogaAprobada = { ...prorrogaConAnclas, diasAprobados: Number(prorroga.diasSolicitados) };
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
      diasAprobados: Number(prorroga.diasSolicitados),
      fechaVencimientoAprobada: obtenerFechaVencimientoProrroga(prorrogaAprobada),
      fechasVencimientoAprobadas: fechasAprobadas
    } : {})
  };
  const historialActualizado = obtenerHistorial(solicitud).map((entrada) => (
    Number(entrada.ronda || 0) === Number(prorroga.ronda || 0)
      ? { ...entrada, ...prorrogaConAnclas, ...respuesta }
      : entrada
  ));

  await updateDoc(doc(db, 'solicitudes', solicitud.id), {
    prorrogaCliente: { ...solicitud.prorrogaCliente, ...prorrogaConAnclas, ...respuesta, historial: historialActualizado }
  });
}
