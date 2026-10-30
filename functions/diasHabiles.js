/**
 * Copia de src/utils/diasHabiles.js para las Cloud Functions (no pueden importar desde src/).
 * Mantener sincronizados ambos archivos ante cualquier cambio.
 */
const ZONA_HORARIA = 'America/El_Salvador';
const FORMATEADOR_FECHA_HORA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

export function convertirFechaSeguimiento(fecha) {
  if (!fecha) return null;
  const fechaConvertida = typeof fecha.toDate === 'function'
    ? fecha.toDate()
    : fecha instanceof Date ? fecha : new Date(fecha);
  return Number.isNaN(fechaConvertida.getTime()) ? null : fechaConvertida;
}

function obtenerPartesFecha(fecha) {
  const fechaConvertida = convertirFechaSeguimiento(fecha);
  if (!fechaConvertida) return null;
  const partes = Object.fromEntries(FORMATEADOR_FECHA_HORA
    .formatToParts(fechaConvertida)
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, Number(value)]));
  return { ...partes, millisecond: fechaConvertida.getUTCMilliseconds() };
}

function convertirPartesAFecha(parts) {
  if (!parts) return null;
  // El Salvador usa UTC-6; sumar seis horas reconstruye el mismo instante.
  return new Date(Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour + 6,
    parts.minute,
    parts.second,
    parts.millisecond
  ));
}

function claveDia(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

/** Suma días hábiles de Hermaco: lunes a sábado; domingo no cuenta. */
export function sumarDiasHabiles(fecha, cantidad) {
  const partes = obtenerPartesFecha(fecha);
  const dias = Math.max(0, Math.floor(Number(cantidad) || 0));
  if (!partes) return null;

  const cursor = new Date(Date.UTC(partes.year, partes.month - 1, partes.day, 12));
  let sumados = 0;
  while (sumados < dias) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor.getUTCDay() !== 0) sumados += 1;
  }

  return convertirPartesAFecha({
    ...partes,
    year: cursor.getUTCFullYear(),
    month: cursor.getUTCMonth() + 1,
    day: cursor.getUTCDate()
  });
}

/** Cuenta días hábiles transcurridos: excluye la fecha inicial e incluye la final. */
export function calcularDiasHabilesEntre(fechaInicio, fechaFin) {
  const inicio = obtenerPartesFecha(fechaInicio);
  const fin = obtenerPartesFecha(fechaFin);
  if (!inicio || !fin || claveDia(inicio) >= claveDia(fin)) return 0;

  const cursor = new Date(Date.UTC(inicio.year, inicio.month - 1, inicio.day + 1, 12));
  const limite = new Date(Date.UTC(fin.year, fin.month - 1, fin.day, 12));
  let dias = 0;
  while (cursor <= limite) {
    if (cursor.getUTCDay() !== 0) dias += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

export function mismaFechaCalendario(a, b) {
  const partesA = obtenerPartesFecha(a);
  const partesB = obtenerPartesFecha(b);
  return Boolean(partesA && partesB && claveDia(partesA) === claveDia(partesB));
}
