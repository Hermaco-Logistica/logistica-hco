/** Opciones del selector de período de Análisis (mismos valores y rótulos en escritorio y móvil) y el texto corto de las fechas del rango. */
export const OPCIONES_PERIODO = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'this_month', label: 'Este Mes' },
  { value: '90d', label: '90D' },
  { value: 'this_year', label: 'Este Año' },
  { value: 'custom', label: 'Rango' },
  { value: 'historico', label: 'Histórico' }
];

/** Fechas del rango en formato corto para la línea bajo el selector: "01/11 – 15/11" (con año si no es el actual) o "Desde 01/11" / "Hasta 15/11". */
const fechaCorta = (iso) => {
  const [a, m, d] = String(iso || '').split('-');
  if (!a || !m || !d) return '';
  return `${d}/${m}${Number(a) === new Date().getFullYear() ? '' : `/${a.slice(2)}`}`;
};
export const textoRangoCorto = (desde, hasta) => {
  const d = fechaCorta(desde);
  const h = fechaCorta(hasta);
  if (d && h) return `${d} – ${h}`;
  if (d) return `Desde ${d}`;
  if (h) return `Hasta ${h}`;
  return 'Sin fechas';
};
