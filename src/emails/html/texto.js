/** Utilidades de texto para los correos. Todo dato escrito por una persona debe pasar por `esc`. */

export const esc = (valor) => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

/** Texto escrito por una persona, con saltos de línea respetados. */
export const escMultilinea = (valor) => esc(valor).replace(/\n/g, '<br/>');

const aFecha = (valor) => {
  if (!valor) return null;
  if (typeof valor.toDate === 'function') return valor.toDate();
  if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000);
  if (valor instanceof Date) return valor;
  const ms = Date.parse(valor);
  return Number.isNaN(ms) ? null : new Date(ms);
};

const ZONA = 'America/El_Salvador';

/** "30 oct 2026" (sin hora). */
export const fechaCorta = (valor) => {
  const fecha = aFecha(valor);
  return fecha ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: ZONA }).format(fecha) : '---';
};

/** "30/10/26 14:05:09". */
export const fechaHora = (valor) => {
  const fecha = aFecha(valor);
  return fecha
    ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'short', timeStyle: 'medium', hour12: false, timeZone: ZONA }).format(fecha)
    : '---';
};

export const moneda = (valor) => `$${Number(valor || 0).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const descripcionItem = (item) => String(item?.descripcion || item?.desc || item?.producto || 'Ítem sin descripción');

export const cantidadItem = (item) => Number(item?.cantidad ?? item?.cant ?? 0) || 0;
