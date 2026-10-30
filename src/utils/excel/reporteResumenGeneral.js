import * as XLSX from 'xlsx';
import { FASES_SEGUIMIENTO } from '../faseSeguimiento';
import { crearHojaHermaco, descargarLibro } from './comun';

/** Filas de KPI del seguimiento de cliente: totales y desglose por fase. */
function crearFilasSeguimiento(enSeguimiento) {
  if (!enSeguimiento) return [];
  return [
    { Métrica: 'En Seguimiento de Cliente (solicitudes)', Valor: enSeguimiento.solicitudes || 0 },
    { Métrica: 'En Seguimiento de Cliente (ítems)', Valor: enSeguimiento.items || 0 },
    { Métrica: 'Monto en Seguimiento ($)', Valor: Number(enSeguimiento.monto || 0) },
    ...Object.entries(FASES_SEGUIMIENTO).map(([fase, datos]) => ({
      Métrica: `Seguimiento: ${datos.etiqueta}`,
      Valor: enSeguimiento.porFase?.[fase] || 0
    }))
  ];
}

/**
 * Exporta el resumen general de análisis y estadísticas
 */
export function exportarResumenGeneralExcel({ metricas, topProductos, statsVendedores, topClientes, periodoLabel = '' }, nombreArchivo = 'analisis_estadisticas') {
  const wb = XLSX.utils.book_new();

  // Hoja 1: KPIs
  if (metricas) {
    const kpis = [
      { Métrica: 'Período', Valor: periodoLabel || 'Seleccionado' },
      { Métrica: 'Total Solicitudes', Valor: metricas.total || 0 },
      { Métrica: 'Pendientes', Valor: metricas.pendientes || 0 },
      { Métrica: 'Cotizadas (Total)', Valor: metricas.cotizadas || 0 },
      { Métrica: 'Cotizadas Completas', Valor: metricas.cotizadasCompletas || 0 },
      { Métrica: 'Cotizadas Parciales', Valor: metricas.cotizadasParciales || 0 },
      { Métrica: 'Pedidos Ganados (Total)', Valor: metricas.pedidos || 0 },
      { Métrica: 'Pedidos Completos', Valor: metricas.pedidosCompletos || 0 },
      { Métrica: 'Pedidos Parciales', Valor: metricas.pedidosParciales || 0 },
      { Métrica: 'Tasa de Conversión (%)', Valor: `${metricas.tasaConversion || 0}%` },
      { Métrica: 'Monto Cotizado Total ($)', Valor: Number(metricas.montoCotizadoTotal || 0) },
      { Métrica: 'Monto en Pedidos ($)', Valor: Number(metricas.montoPedidoTotal || 0) },
      { Métrica: 'Tiempo Promedio de Cierre (Vendedor)', Valor: metricas.tiempoCierreInfo?.textoCorto || '---' },
      { Métrica: 'Tiempo Promedio de Respuesta (Comprador)', Valor: metricas.tiempoRespuestaInfo?.textoCorto || '---' },
      ...crearFilasSeguimiento(metricas.enSeguimiento)
    ];
    const wsKpis = crearHojaHermaco({
      titulo: 'CONTROL DE LOGÍSTICA - RESUMEN DE KPIS',
      periodoLabel,
      headers: ['Métrica', 'Valor'],
      rows: kpis,
      colsWidths: [{ wch: 32 }, { wch: 24 }]
    });
    XLSX.utils.book_append_sheet(wb, wsKpis, 'Resumen General');
  }

  // Hoja 2: Top Productos
  if (Array.isArray(topProductos) && topProductos.length > 0) {
    const filasProd = topProductos.map((p, i) => ({
      '#': i + 1,
      'Descripción': p.desc || '---',
      'Marca': p.marca || '---',
      'Cotizado (veces)': Number(p.veces || 0),
      'Unidades Solicitadas': Number(p.unidades || 0),
      'Pedidos Ganados': Number(p.ganadas || 0),
      'Unidades Ganadas': Number(p.unidadesGanadas || 0)
    }));
    const wsProd = crearHojaHermaco({
      titulo: 'CONTROL DE LOGÍSTICA - TOP PRODUCTOS',
      periodoLabel,
      headers: ['#', 'Descripción', 'Marca', 'Cotizado (veces)', 'Unidades Solicitadas', 'Pedidos Ganados', 'Unidades Ganadas'],
      rows: filasProd,
      colsWidths: [{ wch: 6 }, { wch: 36 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 18 }],
      intColIndexes: [3, 4, 5, 6]
    });
    XLSX.utils.book_append_sheet(wb, wsProd, 'Top Productos');
  }

  // Hoja 3: Vendedores
  if (Array.isArray(statsVendedores) && statsVendedores.length > 0) {
    const filasVend = statsVendedores.map((v, i) => ({
      '#': i + 1,
      'Vendedor': v.nombre || '---',
      'Total Solicitudes': Number(v.total || 0),
      'Cotizadas': Number(v.cotizadas || 0),
      'Pedidos Ganados': Number(v.pedidos || 0),
      'Pedidos Parciales': Number(v.pedidosParciales || 0),
      'Tasa Éxito (%)': v.total > 0 ? `${((v.pedidos / v.total) * 100).toFixed(1)}%` : '0%'
    }));
    const wsVend = crearHojaHermaco({
      titulo: 'CONTROL DE LOGÍSTICA - RENDIMIENTO VENDEDORES',
      periodoLabel,
      headers: ['#', 'Vendedor', 'Total Solicitudes', 'Cotizadas', 'Pedidos Ganados', 'Pedidos Parciales', 'Tasa Éxito (%)'],
      rows: filasVend,
      colsWidths: [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }],
      intColIndexes: [2, 3, 4, 5]
    });
    XLSX.utils.book_append_sheet(wb, wsVend, 'Rendimiento Vendedores');
  }

  // Hoja 4: Top Clientes
  if (Array.isArray(topClientes) && topClientes.length > 0) {
    const filasCli = topClientes.map((c, i) => ({
      '#': i + 1,
      'Cliente': c.cliente || '---',
      'Total Solicitudes': Number(c.total || 0),
      'Pedidos Ganados': Number(c.pedidos || 0),
      'Pedidos Parciales': Number(c.pedidosParciales || 0)
    }));
    const wsCli = crearHojaHermaco({
      titulo: 'CONTROL DE LOGÍSTICA - TOP CLIENTES',
      periodoLabel,
      headers: ['#', 'Cliente', 'Total Solicitudes', 'Pedidos Ganados', 'Pedidos Parciales'],
      rows: filasCli,
      colsWidths: [{ wch: 6 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }],
      intColIndexes: [2, 3, 4]
    });
    XLSX.utils.book_append_sheet(wb, wsCli, 'Top Clientes');
  }

  descargarLibro(wb, nombreArchivo);
}
