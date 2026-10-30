import * as XLSX from 'xlsx';
import { crearHojaHermaco, descargarLibro, formatFecha } from './comun';
import { crearCalculadorSeguimiento, ENCABEZADOS_SEGUIMIENTO_SOLICITUD, ANCHOS_SEGUIMIENTO_SOLICITUD } from './seguimientoExcel';

/**
 * Exporta el listado de solicitudes (usado en DetalleSolicitudesAnalisis)
 */
export function exportarSolicitudesExcel(solicitudes, nombreArchivo = 'solicitudes_analisis', {
  titulo = 'CONTROL DE LOGÍSTICA - SOLICITUDES (RFQS)',
  periodoLabel = ''
} = {}) {
  if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const headers = [
    'RFQ',
    'Fecha Solicitud',
    'Fecha Cotización',
    'Cliente',
    'Vendedor',
    'Modalidad',
    'Estado',
    'Cantidad Productos',
    'Monto Estimado ($)',
    'OCs Asociadas',
    ...ENCABEZADOS_SEGUIMIENTO_SOLICITUD
  ];

  const seguimiento = crearCalculadorSeguimiento();

  const rows = solicitudes.map(s => {
    let cantItems = 0;
    let montoEstimado = 0;
    if (Array.isArray(s.productos)) {
      cantItems = s.productos.length;
      s.productos.forEach(p => {
        const cant = Number(p.cant || 1);
        const pu = Number(p.precioUnitario || p.fob || 0);
        montoEstimado += (pu * cant);
      });
    }

    const ocs = [];
    if (s.numeroOC) ocs.push(s.numeroOC);
    if (Array.isArray(s.productos)) {
      s.productos.forEach(p => {
        if (p.numOC || p.ocRef) ocs.push(p.numOC || p.ocRef);
      });
    }

    return {
      'RFQ': s.correlativo || 'S/N',
      'Fecha Solicitud': formatFecha(s.fechaS || s.fechaCreacion),
      'Fecha Cotización': formatFecha(s.fechaCotizacion),
      'Cliente': s.cliente || 'Consumidor Final',
      'Vendedor': s.vendedorNombre || 'Sin asignar',
      'Modalidad': s.modalidad || '---',
      'Estado': s.estado || 'Pendiente',
      'Cantidad Productos': cantItems,
      'Monto Estimado ($)': montoEstimado,
      'OCs Asociadas': [...new Set(ocs)].join(', ') || '---',
      ...seguimiento.columnasSolicitud(s)
    };
  });

  const colsWidths = [
    { wch: 14 },
    { wch: 15 },
    { wch: 15 },
    { wch: 30 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    ...ANCHOS_SEGUIMIENTO_SOLICITUD
  ];

  const ws = crearHojaHermaco({
    titulo,
    periodoLabel,
    headers,
    rows,
    colsWidths,
    moneyColIndexes: [8],
    intColIndexes: [7]
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');
  descargarLibro(wb, nombreArchivo);
}
