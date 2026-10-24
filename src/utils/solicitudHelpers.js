import { RESULTADOS_SOLICITUD } from './clasificarSolicitud';

export const esSolicitudDenegada = (solicitud) => {
  if (!solicitud) return false;
  if (solicitud.estado === 'Denegado' || solicitud.estado === 'Rechazado') return true;
  if (solicitud.resultado === RESULTADOS_SOLICITUD?.DENEGADO || solicitud.resultado === 'denegado') return true;
  if (Array.isArray(solicitud.productos) && solicitud.productos.length > 0) {
    const activos = solicitud.productos.filter(p => p.estadoItem !== 'Anulado' && p.estadoItem !== 'Venta Perdida');
    if (activos.length > 0 && activos.every(p => ['Denegado', 'Rechazado', 'Cancelado'].includes(p.estadoItem))) {
      return true;
    }
  }
  return false;
};
