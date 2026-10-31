/** La librería xlsx pesa mucho: se descarga solo cuando el usuario exporta. */
export const cargarXLSX = () => import('xlsx');

export const parseDate = (val) => {
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

export const formatFecha = (val) => {
  const d = parseDate(val);
  if (!d) return '---';
  return new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'short',
    timeZone: 'America/El_Salvador'
  }).format(d);
};

export const sanitizeFileName = (name) => {
  return (name || 'reporte')
    .toString()
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
};

export const MONEY_FMT = '"$"#,##0.00;-"$"#,##0.00';
export const INT_FMT = '#,##0';

/**
 * Crea una hoja de cálculo con el encabezado institucional predefinido de Hermaco
 */
export function crearHojaHermaco({
  XLSX,
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

/** Escribe el libro en disco con el nombre de archivo saneado y extensión .xlsx. */
export function descargarLibro(XLSX, wb, nombreArchivo) {
  XLSX.writeFile(wb, `${sanitizeFileName(nombreArchivo)}.xlsx`);
}
