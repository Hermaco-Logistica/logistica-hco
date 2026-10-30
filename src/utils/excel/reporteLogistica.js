import * as XLSX from 'xlsx';
import { crearHojaHermaco, descargarLibro, formatFecha } from './comun';

/**
 * Exporta órdenes de compra de logística con detalle de tracking e ítems
 */
export function exportarLogisticaExcel(ordenes = [], nombreArchivo = 'reporte_logistica', {
  titulo = 'CONTROL DE LOGÍSTICA - ÓRDENES DE COMPRA Y TRACKING',
  periodoLabel = ''
} = {}) {
  if (!Array.isArray(ordenes) || ordenes.length === 0) {
    alert('No hay órdenes de compra para exportar.');
    return;
  }

  const headers = [
    '# OC',
    'Proveedor',
    'Tracking',
    'Carrier',
    'Estado',
    'Fecha Creación',
    'Producto',
    'Marca',
    'Cantidad',
    'FOB Unitario ($)'
  ];

  const rows = [];
  ordenes.forEach((oc) => {
    const numOC = oc.numeroOC || oc.numero || oc.ocRef || 'S/N';
    const proveedor = oc.proveedor || 'Sin proveedor';
    const tracking = oc.tracking || '---';
    const carrier = oc.carrier || oc.proveedorTracking || '---';
    const estado = oc.estado || 'Pendiente';
    const fecha = formatFecha(oc.fechaCreacion);

    if (Array.isArray(oc.items) && oc.items.length > 0) {
      oc.items.forEach((item) => {
        rows.push({
          '# OC': numOC,
          'Proveedor': proveedor,
          'Tracking': tracking,
          'Carrier': carrier,
          'Estado': estado,
          'Fecha Creación': fecha,
          'Producto': item.descripcion || item.desc || '---',
          'Marca': item.marca || '---',
          'Cantidad': Number(item.cant || item.cantidad || 1),
          'FOB Unitario ($)': Number(item.fob || 0)
        });
      });
    } else {
      rows.push({
        '# OC': numOC,
        'Proveedor': proveedor,
        'Tracking': tracking,
        'Carrier': carrier,
        'Estado': estado,
        'Fecha Creación': fecha,
        'Producto': '---',
        'Marca': '---',
        'Cantidad': 0,
        'FOB Unitario ($)': 0
      });
    }
  });

  const colsWidths = [
    { wch: 16 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 36 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 }
  ];

  const ws = crearHojaHermaco({
    titulo,
    periodoLabel,
    headers,
    rows,
    colsWidths,
    moneyColIndexes: [9],
    intColIndexes: [8]
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Logística');
  descargarLibro(wb, nombreArchivo);
}
