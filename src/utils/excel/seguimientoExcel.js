import { obtenerFaseSeguimientoSolicitud, obtenerSeguimientoItemsSolicitud } from '../faseSeguimiento';
import { MAX_REVISIONES_CLIENTE } from '../seguimientoCliente';
import { formatFecha } from './comun';

/** Columnas de seguimiento de cliente (revisión / prórroga) que se agregan al final de los reportes. */
export const ENCABEZADOS_SEGUIMIENTO_ITEM = ['Seguimiento', 'Revisiones', 'Prórroga', 'Vence'];
export const ANCHOS_SEGUIMIENTO_ITEM = [{ wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];

export const ENCABEZADOS_SEGUIMIENTO_SOLICITUD = ['Seguimiento', 'Ítems en seguimiento', 'Revisiones (máx.)', 'Prórroga', 'Próximo vencimiento'];
export const ANCHOS_SEGUIMIENTO_SOLICITUD = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 20 }];

const SIN_DATO = '---';

const etiquetaProrroga = (prorroga, indice = null) => {
  if (!prorroga?.estado) return SIN_DATO;
  const indices = prorroga.indicesItems;
  if (indice !== null && Array.isArray(indices) && !indices.includes(indice)) return SIN_DATO;
  return prorroga.estado.charAt(0).toUpperCase() + prorroga.estado.slice(1);
};

/**
 * Crea un calculador con caché: cada solicitud se evalúa una sola vez aunque el reporte
 * tenga varias filas (una por ítem) de la misma solicitud.
 */
export function crearCalculadorSeguimiento(fechaReferencia = new Date()) {
  const cacheItems = new Map();
  const cacheFase = new Map();
  const seguimientoItems = (solicitud) => {
    if (!cacheItems.has(solicitud)) cacheItems.set(solicitud, obtenerSeguimientoItemsSolicitud(solicitud, fechaReferencia));
    return cacheItems.get(solicitud);
  };
  const faseSolicitud = (solicitud) => {
    if (!cacheFase.has(solicitud)) cacheFase.set(solicitud, obtenerFaseSeguimientoSolicitud(solicitud, fechaReferencia));
    return cacheFase.get(solicitud);
  };

  return {
    /** Columnas de seguimiento para una fila por ítem. */
    columnasItem(solicitud, indice) {
      const item = seguimientoItems(solicitud)?.items.get(indice);
      return {
        'Seguimiento': item ? (item.etiqueta || 'Vigente') : SIN_DATO,
        'Revisiones': item ? `${item.revisiones}/${MAX_REVISIONES_CLIENTE}` : SIN_DATO,
        'Prórroga': item ? etiquetaProrroga(solicitud?.prorrogaCliente, indice) : SIN_DATO,
        'Vence': item?.fechaLimite ? formatFecha(item.fechaLimite) : SIN_DATO
      };
    },
    /** Columnas de seguimiento para una fila por solicitud. */
    columnasSolicitud(solicitud) {
      const analisis = seguimientoItems(solicitud);
      if (!analisis) {
        return {
          'Seguimiento': SIN_DATO,
          'Ítems en seguimiento': 0,
          'Revisiones (máx.)': SIN_DATO,
          'Prórroga': SIN_DATO,
          'Próximo vencimiento': SIN_DATO
        };
      }
      const fase = faseSolicitud(solicitud);
      const { resumen } = analisis;
      return {
        'Seguimiento': fase?.etiqueta || 'Vigente',
        'Ítems en seguimiento': fase?.indicesEnSeguimiento.length || 0,
        'Revisiones (máx.)': `${resumen.revisionesUsadas}/${MAX_REVISIONES_CLIENTE}`,
        'Prórroga': etiquetaProrroga(solicitud?.prorrogaCliente),
        'Próximo vencimiento': resumen.fechaAlertaInicial ? formatFecha(resumen.fechaAlertaInicial) : SIN_DATO
      };
    }
  };
}
