/**
 * Compatibilidad: los reportes de Excel viven en src/utils/excel/ (un archivo por reporte).
 * Este archivo solo reexporta para no romper los imports existentes.
 */
export * from './excel/index.js';
