import * as XLSX from 'xlsx';
import { evaluarEstadoGanada } from '../views/analisis/theme';

const parseDate = (val) => {
  if (!val) return null;
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try { return val.toDate(); } catch { return null; }
    }
    if (typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const formatFecha = (val) => {
  const d = parseDate(val);
  if (!d) return '---';
  return new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'short',
    timeZone: 'America/El_Salvador'
  }).format(d);
};

const sanitizeFileName = (name) => {
  return (name || 'reporte')
    .toString()
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
};

/**
 * Aplana una lista de solicitudes en movimientos individuales por ítem/producto
 * @param {Array} solicitudes 
 * @param {Array} ordenesCompra 
 * @returns {Array} Lista plana de movimientos
 */
export function extraerTodosLosMovimientos(solicitudes = [], ordenesCompra = []) {
  const mapFechasOC = {};
  if (Array.isArray(ordenesCompra)) {
    ordenesCompra.forEach((oc) => {
      const num = oc.numeroOC || oc.numero || oc.ocRef;
      if (num && oc.fechaCreacion) {
        mapFechasOC[num.toString().trim()] = oc.fechaCreacion;
      }
    });
  }

  const list = [];
  const IVA_TASA = 0.13;

  solicitudes.forEach((s) => {
    const clienteNombre = (s.cliente || 'Consumidor Final').trim();
    const productosLista = Array.isArray(s.productos) && s.productos.length > 0
      ? s.productos
      : [{ desc: 'Sin productos detallados', cant: 1 }];

    productosLista.forEach((p, idx) => {
      const descProducto = (p.desc || p.descripcion || 'Sin descripción').trim().toUpperCase();
      const marcaProducto = (p.marca || '').trim();

      let modNormalizada = 'No asignada';
      const modRaw = (p.modalidad || s.modalidad || '').toString().trim();
      if (modRaw === 'A' || modRaw.toLowerCase().includes('aére') || modRaw.toLowerCase().includes('aere')) {
        modNormalizada = 'Aéreo';
      } else if (modRaw === 'M' || modRaw.toLowerCase().includes('marít') || modRaw.toLowerCase().includes('marit')) {
        modNormalizada = 'Marítimo';
      }

      const unidades = Number(p.cant || p.cantidad || 1);

      let precioUnitario = Number(p.precioUnitario || p.precio || 0);
      if (!precioUnitario && p.fob) {
        const fobVal = Number(p.fob || 0);
        if (modNormalizada === 'Aéreo') {
          const factorA = Number(p.factorA || s.factorA || 1);
          const fva = Number(p.fva || 1.25);
          precioUnitario = Number(p.ventaA || p.precioAereo || (fobVal * factorA * fva));
        } else if (modNormalizada === 'Marítimo') {
          const factorM = Number(p.factorM || s.factorM || 1);
          const fvm = Number(p.fvm || 1.25);
          precioUnitario = Number(p.ventaM || p.precioMaritimo || (fobVal * factorM * fvm));
        } else if (p.subtotal && unidades > 0) {
          precioUnitario = Number(p.subtotal) / unidades;
        } else {
          precioUnitario = fobVal;
        }
      }

      let valorNeto = Number(p.subtotal || 0);
      if (!valorNeto && precioUnitario > 0) {
        valorNeto = precioUnitario * unidades;
      }
      const totalConIva = valorNeto > 0 ? valorNeto * (1 + IVA_TASA) : 0;

      const ocRef = p.numOC || p.ocRef || p.numeroOC || s.numeroOC || s.linkOC || '';
      let estadoItem = p.estadoItem;
      if (estadoItem === 'Pedido Parcial' || estadoItem === 'Comprado') {
        estadoItem = 'Pedido';
      } else if (!estadoItem) {
        if (s.estado === 'Pedido' || s.estado === 'Comprado') {
          estadoItem = 'Pedido';
        } else if (s.estado === 'Pedido Parcial') {
          const tienePrecio = Number(p.fob || p.precioUnitario || 0) > 0;
          estadoItem = tienePrecio ? 'Cotizado' : 'Pendiente';
        } else {
          estadoItem = s.estado || 'Pendiente';
        }
      }

      const fechaSol = s.fechaS || s.fechaCreacion || null;
      const tienePrecio = Number(p.fob || p.precioUnitario || 0) > 0 || ['Cotizado', 'Cotizado Parcial', 'Pedido', 'Pedido Parcial', 'Comprado'].includes(estadoItem);
      const fechaResp = p.fechaCotizacion || (tienePrecio ? (s.fechaCotizacion || s.fechaS) : null);
      const fechaOC = p.fechaOC || (ocRef ? mapFechasOC[ocRef.toString().trim()] : null);

      list.push({
        idMov: `${s.id}-${idx}`,
        rfqId: s.id,
        correlativo: s.correlativo || 'S/N',
        producto: descProducto,
        marca: marcaProducto,
        cliente: clienteNombre,
        vendedor: s.vendedorNombre || 'Sin asignar',
        fechaSol,
        fechaResp,
        fechaOC,
        fechaPrincipal: fechaResp || fechaSol,
        unidades,
        modalidad: modNormalizada,
        precioUnitario,
        valorNeto,
        totalConIva,
        ocRef,
        estado: estadoItem,
        fob: Number(p.fob || 0),
        itemOriginal: p,
        solicitudOriginal: s
      });
    });
  });

  list.sort((a, b) => {
    const dateA = parseDate(a.fechaPrincipal)?.getTime() || 0;
    const dateB = parseDate(b.fechaPrincipal)?.getTime() || 0;
    return dateB - dateA;
  });

  return list;
}

const MONEY_FMT = '"$"#,##0.00;-"$"#,##0.00';
const INT_FMT = '#,##0';

/**
 * Crea una hoja de cálculo con el encabezado institucional predefinido de Hermaco
 */
function crearHojaHermaco({
  titulo = 'REPORTE DE CONTROL',
  periodoLabel = '',
  headers = [],
  rows = [],
  colsWidths = [],
  moneyColIndexes = [],
  intColIndexes = []
}) {
  const fechaGenerado = new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/El_Salvador'
  }).format(new Date());

  // 1) Metadatos institucionales en las primeras 4 filas
  const metaRows = [
    ['CENTRO INDUSTRIAL HERMACO, S.A. DE C.V.'],
    [titulo.toUpperCase()],
    [`GENERADO: ${fechaGenerado}${periodoLabel ? ` | PERÍODO: ${periodoLabel}` : ''} | TOTAL REGISTROS: ${rows.length}`],
    []
  ];

  const ws = XLSX.utils.aoa_to_sheet(metaRows);

  // 2) Añadir encabezados en fila 5 (origin A5)
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A5' });

  // 3) Añadir filas de datos a partir de fila 6 (origin A6)
  if (rows.length > 0) {
    XLSX.utils.sheet_add_json(ws, rows, { origin: 'A6', skipHeader: true });
  }

  // 4) Auto-filtro activo en la fila de encabezados
  const full = XLSX.utils.decode_range(ws['!ref'] || 'A1:A5');
  const tableStart = { r: 4, c: 0 }; // fila 5 (0-index 4)
  const tableEnd = { r: Math.max(4, full.e.r), c: Math.max(headers.length - 1, full.e.c) };
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(tableStart, tableEnd) };

  // 5) Anchos de columnas
  if (colsWidths.length > 0) {
    ws['!cols'] = colsWidths;
  }

  // 6) Alturas de fila
  ws['!rows'] = ws['!rows'] || [];
  ws['!rows'][0] = { hpx: 24 }; // Título Hermaco
  ws['!rows'][1] = { hpx: 20 }; // Subtítulo reporte
  ws['!rows'][4] = { hpx: 26 }; // Fila encabezados

  // 7) Formato numérico de celdas
  for (let R = 5; R <= tableEnd.r; R++) {
    moneyColIndexes.forEach(colIdx => {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: colIdx })];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        cell.t = 'n';
        cell.z = MONEY_FMT;
      }
    });

    intColIndexes.forEach(colIdx => {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: colIdx })];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        cell.t = 'n';
        cell.z = INT_FMT;
      }
    });
  }

  return ws;
}

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
    'Precio Unitario ($)',
    'Valor Neto ($)',
    'Total con IVA ($)',
    'OC Ref',
    'Estado',
    'Resultado'
  ];

  const rows = movimientos.map(m => {
    const pu = Number(m.precioUnitario || 0);
    const vn = Number(m.valorNeto || 0);
    const totIva = Number(m.totalConIva || 0);
    const unids = Number(m.unidades || 0);
    const res = evaluarEstadoGanada(m);

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
      'Precio Unitario ($)': pu,
      'Valor Neto ($)': vn,
      'Total con IVA ($)': totIva,
      'OC Ref': m.ocRef || '---',
      'Estado': m.estado || '---',
      'Resultado': res?.label || m.estado || '---'
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
    { wch: 18 }, // Precio Unitario ($)
    { wch: 18 }, // Valor Neto ($)
    { wch: 18 }, // Total con IVA ($)
    { wch: 18 }, // OC Ref
    { wch: 16 }, // Estado
    { wch: 16 }  // Resultado
  ];

  const ws = crearHojaHermaco({
    titulo,
    periodoLabel,
    headers,
    rows,
    colsWidths,
    moneyColIndexes: [10, 11, 12],
    intColIndexes: [9]
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${sanitizeFileName(nombreArchivo)}.xlsx`);
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
      { Métrica: 'Tiempo Promedio de Respuesta (Comprador)', Valor: metricas.tiempoRespuestaInfo?.textoCorto || '---' }
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

  XLSX.writeFile(wb, `${sanitizeFileName(nombreArchivo)}.xlsx`);
}

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
    'OCs Asociadas'
  ];

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
      'OCs Asociadas': [...new Set(ocs)].join(', ') || '---'
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
    { wch: 24 }
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
  XLSX.writeFile(wb, `${sanitizeFileName(nombreArchivo)}.xlsx`);
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
  XLSX.writeFile(wb, `${sanitizeFileName(nombreArchivo)}.xlsx`);
}

