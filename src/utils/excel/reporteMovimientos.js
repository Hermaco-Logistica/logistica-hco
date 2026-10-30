import * as XLSX from 'xlsx';
import { evaluarEstadoGanada } from '../../views/analisis/theme';
import { crearHojaHermaco, descargarLibro, formatFecha } from './comun';
import { obtenerDetalleDecisionExportable } from './decisionExportable';
import { extraerTodosLosMovimientos } from './extraerMovimientos';
import { crearCalculadorSeguimiento, ENCABEZADOS_SEGUIMIENTO_ITEM, ANCHOS_SEGUIMIENTO_ITEM } from './seguimientoExcel';

/**
 * Exporta el historial de movimientos de productos (usado en Cliente, Producto, Vendedor Historial y Análisis)
 */
export function exportarMovimientosExcel(movimientos, nombreArchivo = 'historial_movimientos', {
  titulo = 'CONTROL DE LOGÍSTICA - MOVIMIENTOS HISTÓRICOS',
  periodoLabel = '',
  sheetName = 'Movimientos'
} = {}) {
  if (!Array.isArray(movimientos) || movimientos.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const headers = [
    'RFQ',
    'Fecha Solicitud',
    'Fecha Respuesta',
    'Fecha OC',
    'Cliente',
    'Vendedor',
    'Producto',
    'Marca',
    'Modalidad',
    'Unidades',
    'FOB Unitario ($)',
    'Precio Unitario ($)',
    'Valor Neto ($)',
    'Total con IVA ($)',
    'OC Ref',
    'Estado',
    'Motivo Predefinido',
    'Comentario del Vendedor',
    'Registrado Por',
    'Resultado',
    ...ENCABEZADOS_SEGUIMIENTO_ITEM
  ];

  const seguimiento = crearCalculadorSeguimiento();

  const rows = movimientos.map(m => {
    const pu = Number(m.precioUnitario || 0);
    const fob = Number(m.fob ?? m.itemOriginal?.fob ?? 0);
    const vn = Number(m.valorNeto || 0);
    const totIva = Number(m.totalConIva || 0);
    const unids = Number(m.unidades || 0);
    const res = evaluarEstadoGanada(m);
    const solicitudOriginal = m.solicitudOriginal || {};
    const productosOriginales = Array.isArray(solicitudOriginal.productos) ? solicitudOriginal.productos : [];
    const hayVentaPerdidaPorItem = productosOriginales.some((producto) => (
      producto?.estadoItem === 'Venta Perdida' || Boolean(producto?.motivoVentaPerdida)
    ));
    const aplicaMotivoGlobal = !hayVentaPerdidaPorItem && (
      solicitudOriginal.estado === 'Venta Perdida' || Boolean(solicitudOriginal.motivoVentaPerdida)
    );
    const detalle = m.detalleDecision || obtenerDetalleDecisionExportable(
      m.itemOriginal || {},
      solicitudOriginal,
      m.idxProducto || 0,
      { aplicarMotivoGlobal: aplicaMotivoGlobal }
    );

    return {
      'RFQ': m.correlativo || 'S/N',
      'Fecha Solicitud': formatFecha(m.fechaSol),
      'Fecha Respuesta': formatFecha(m.fechaResp),
      'Fecha OC': formatFecha(m.fechaOC),
      'Cliente': m.cliente || 'Consumidor Final',
      'Vendedor': m.vendedor || 'Sin asignar',
      'Producto': m.producto || '---',
      'Marca': m.marca || '---',
      'Modalidad': m.modalidad || '---',
      'Unidades': unids,
      'FOB Unitario ($)': fob,
      'Precio Unitario ($)': pu,
      'Valor Neto ($)': vn,
      'Total con IVA ($)': totIva,
      'OC Ref': m.ocRef || '---',
      'Estado': m.estado || '---',
      'Motivo Predefinido': detalle.motivo,
      'Comentario del Vendedor': detalle.comentario,
      'Registrado Por': detalle.registradoPor,
      'Resultado': res?.label || m.estado || '---',
      ...seguimiento.columnasItem(solicitudOriginal, m.idxProducto ?? 0)
    };
  });

  const colsWidths = [
    { wch: 14 }, // RFQ
    { wch: 15 }, // Fecha Solicitud
    { wch: 15 }, // Fecha Respuesta
    { wch: 14 }, // Fecha OC
    { wch: 30 }, // Cliente
    { wch: 22 }, // Vendedor
    { wch: 36 }, // Producto
    { wch: 18 }, // Marca
    { wch: 14 }, // Modalidad
    { wch: 12 }, // Unidades
    { wch: 16 }, // FOB Unitario ($)
    { wch: 18 }, // Precio Unitario ($)
    { wch: 18 }, // Valor Neto ($)
    { wch: 18 }, // Total con IVA ($)
    { wch: 18 }, // OC Ref
    { wch: 16 }, // Estado
    { wch: 34 }, // Motivo Predefinido
    { wch: 48 }, // Comentario del Vendedor
    { wch: 28 }, // Registrado Por
    { wch: 16 }, // Resultado
    ...ANCHOS_SEGUIMIENTO_ITEM
  ];

  const ws = crearHojaHermaco({
    titulo,
    periodoLabel,
    headers,
    rows,
    colsWidths,
    moneyColIndexes: [10, 11, 12, 13],
    intColIndexes: [9]
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  descargarLibro(wb, nombreArchivo);
}

/**
 * Exporta todos los movimientos de una lista de solicitudes en formato Excel
 */
export function exportarTodosLosMovimientosExcel(solicitudes, ordenesCompra = [], nombreArchivo = 'todos_los_movimientos', {
  titulo = 'CONTROL DE LOGÍSTICA - REPORTE COMPLETO DE MOVIMIENTOS',
  periodoLabel = ''
} = {}) {
  const movs = extraerTodosLosMovimientos(solicitudes, ordenesCompra);
  exportarMovimientosExcel(movs, nombreArchivo, { titulo, periodoLabel, sheetName: 'Movimientos' });
}
