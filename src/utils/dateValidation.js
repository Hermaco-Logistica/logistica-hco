/**
 * Utilidades de validación y manejo de fechas y rangos
 * Zona horaria de referencia: El Salvador (America/El_Salvador, UTC-6 sin DST)
 */

export const STORAGE_KEY_PERIODO = 'analisis_filtro_periodo';

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Retorna la fecha actual en El Salvador (UTC-6) formateada como YYYY-MM-DD
 * @returns {string} Fecha en formato "YYYY-MM-DD"
 */
export const getHoyElSalvador = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/El_Salvador',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
};

/**
 * Retorna el año actual en El Salvador como entero
 * @returns {number}
 */
export const getAnioActualElSalvador = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/El_Salvador',
    year: 'numeric'
  });
  return parseInt(formatter.format(new Date()), 10);
};

/**
 * Determina si un año es bisiesto
 * @param {number} anio 
 * @returns {boolean}
 */
export const esBisiesto = (anio) => {
  return (anio % 4 === 0 && anio % 100 !== 0) || (anio % 400 === 0);
};

/**
 * Retorna el número máximo de días reales para un año y mes dados
 * @param {number} anio 
 * @param {number} mes (1 a 12)
 * @returns {number}
 */
export const getDiasEnMes = (anio, mes) => {
  return new Date(anio, mes, 0).getDate();
};

/**
 * Convierte un string YYYY-MM-DD a objeto Date a las 00:00:00 hora de El Salvador (UTC-6)
 * @param {string} fechaStr 
 * @returns {Date|null}
 */
export const parseInicioDiaElSalvador = (fechaStr) => {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  const match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(`${fechaStr}T00:00:00-06:00`);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Convierte un string YYYY-MM-DD a objeto Date al final del día 23:59:59.999 hora de El Salvador (UTC-6)
 * @param {string} fechaStr 
 * @returns {Date|null}
 */
export const parseFinDiaElSalvador = (fechaStr) => {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  const match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(`${fechaStr}T23:59:59.999-06:00`);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Valida un string de fecha (YYYY-MM-DD) detectando:
 * - Formato incompleto o mal escrito
 * - Mes inexistente (<1 o >12)
 * - Días imposibles en ese mes (e.g. 30 de febrero, 31 de abril, 29 de febrero en no bisiesto)
 * - Fechas futuras respecto a hoy en El Salvador
 * 
 * @param {string} fechaStr
 * @param {object} opciones { label, maxDate, minDate }
 * @returns {{ esValida: boolean, vacia?: boolean, error: string|null, dia: number, mes: number, anio: number }}
 */
export const validarFechaStr = (fechaStr, { label = 'Fecha', maxDate = null, minDate = null } = {}) => {
  if (!fechaStr || typeof fechaStr !== 'string' || !fechaStr.trim()) {
    return { esValida: true, vacia: true, error: null, dia: 0, mes: 0, anio: 0 };
  }

  const str = fechaStr.trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return {
      esValida: false,
      vacia: false,
      error: `${label}: Formato incompleto o inválido (debe ser AAAA-MM-DD)`,
      dia: 0,
      mes: 0,
      anio: 0
    };
  }

  const anio = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  const dia = parseInt(match[3], 10);
  const hoyStr = getHoyElSalvador();

  // 1. Rango de año razonable
  if (anio < 2000 || anio > 2099) {
    return {
      esValida: false,
      vacia: false,
      error: `${label}: El año (${anio}) debe estar entre 2000 y 2099`,
      dia, mes, anio
    };
  }

  // 2. Mes válido
  if (mes < 1 || mes > 12) {
    return {
      esValida: false,
      vacia: false,
      error: `${label}: El mes (${mes}) es inválido (debe ser 01 a 12)`,
      dia, mes, anio
    };
  }

  // 3. Días imposibles en el mes correspondiente
  const maxDias = getDiasEnMes(anio, mes);
  const nombreMes = NOMBRES_MESES[mes - 1];

  if (dia < 1 || dia > maxDias) {
    let motivo = '';
    if (mes === 2) {
      if (esBisiesto(anio)) {
        motivo = `Febrero de ${anio} tiene 29 días (ingresaste día ${dia})`;
      } else {
        motivo = `${anio} no es año bisiesto, Febrero solo tiene 28 días (ingresaste día ${dia})`;
      }
    } else {
      motivo = `${nombreMes} solo tiene ${maxDias} días (ingresaste día ${dia})`;
    }

    return {
      esValida: false,
      vacia: false,
      error: `${label}: Fecha imposible. ${motivo}`,
      dia, mes, anio
    };
  }

  // 4. Bloqueo estricto de fechas futuras en El Salvador
  if (str > hoyStr) {
    return {
      esValida: false,
      vacia: false,
      error: `${label}: No se permiten fechas futuras (máximo hoy: ${hoyStr})`,
      dia, mes, anio
    };
  }

  // 5. Verificación de límites opcionales
  if (minDate && str < minDate) {
    return {
      esValida: false,
      vacia: false,
      error: `${label} no puede ser anterior a ${minDate}`,
      dia, mes, anio
    };
  }

  if (maxDate && str > maxDate) {
    return {
      esValida: false,
      vacia: false,
      error: `${label} no puede ser posterior a ${maxDate}`,
      dia, mes, anio
    };
  }

  return { esValida: true, vacia: false, error: null, dia, mes, anio };
};

/**
 * Valida un rango de fechas (Desde - Hasta)
 * Comprueba fechas individuales, que no sean futuras y que Desde <= Hasta
 * 
 * @param {string} fechaInicio 
 * @param {string} fechaFin 
 * @returns {{ esValido: boolean, errorInicio: string|null, errorFin: string|null, errorGeneral: string|null }}
 */
export const validarRangoFechas = (fechaInicio, fechaFin) => {
  const hoyStr = getHoyElSalvador();
  let errorInicio = null;
  let errorFin = null;
  let errorGeneral = null;

  if (fechaInicio) {
    const valInicio = validarFechaStr(fechaInicio, { label: 'Fecha "Desde"', maxDate: hoyStr });
    if (!valInicio.esValida) {
      errorInicio = valInicio.error;
    }
  }

  if (fechaFin) {
    const valFin = validarFechaStr(fechaFin, { label: 'Fecha "Hasta"', maxDate: hoyStr });
    if (!valFin.esValida) {
      errorFin = valFin.error;
    }
  }

  // Comprobar coherencia entre fechas si ambas están ingresadas y válidas individualmente
  if (fechaInicio && fechaFin && !errorInicio && !errorFin) {
    if (fechaInicio > fechaFin) {
      errorGeneral = 'Incoherencia entre fechas: la fecha "Desde" no puede ser posterior a la fecha "Hasta".';
    }
  }

  const esValido = !errorInicio && !errorFin && !errorGeneral;
  return {
    esValido,
    errorInicio,
    errorFin,
    errorGeneral: errorGeneral || errorInicio || errorFin
  };
};

/**
 * Recupera la última selección de período/rango desde sessionStorage
 * @returns {{ periodo: string, fechaInicio: string, fechaFin: string }}
 */
export const cargarFiltroPeriodoStorage = () => {
  const fallback = { periodo: '30d', fechaInicio: '', fechaFin: '', anioHistorico: null };
  try {
    const dataRaw = sessionStorage.getItem(STORAGE_KEY_PERIODO);
    if (!dataRaw) return fallback;
    const data = JSON.parse(dataRaw);
    if (!data || typeof data !== 'object') return fallback;

    const periodosValidos = ['7d', '30d', '90d', 'this_year', 'custom', 'historico'];
    // Migrar 'all' legacy → 'historico' con año 'todos' para mantener el comportamiento original
    let periodo = data.periodo;
    if (periodo === 'all') {
      periodo = 'historico';
      if (!data.anioHistorico) data.anioHistorico = 'todos';
    }
    periodo = periodosValidos.includes(periodo) ? periodo : '30d';

    let fechaInicio = typeof data.fechaInicio === 'string' ? data.fechaInicio : '';
    let fechaFin = typeof data.fechaFin === 'string' ? data.fechaFin : '';

    if (periodo === 'custom') {
      const hoyStr = getHoyElSalvador();
      // Si la fecha guardada quedó en el futuro por cambio de día o inconsistencia, sanitizar
      if (fechaInicio > hoyStr) fechaInicio = hoyStr;
      if (fechaFin > hoyStr) fechaFin = hoyStr;
      if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        fechaFin = fechaInicio;
      }
    }

    // Recuperar año histórico: número de año o 'todos'
    const anioHistorico = data.anioHistorico || null;

    return { periodo, fechaInicio, fechaFin, anioHistorico };
  } catch {
    return fallback;
  }
};

/**
 * Guarda la selección de período/rango en sessionStorage
 * @param {{ periodo: string, fechaInicio?: string, fechaFin?: string }} datos 
 */
export const guardarFiltroPeriodoStorage = ({ periodo, fechaInicio = '', fechaFin = '', anioHistorico = null }) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY_PERIODO,
      JSON.stringify({
        periodo: periodo || '30d',
        fechaInicio: fechaInicio || '',
        fechaFin: fechaFin || '',
        anioHistorico: anioHistorico || null
      })
    );
  } catch (e) {
    console.warn('No se pudo guardar filtro de fecha en sessionStorage:', e);
  }
};

/**
 * Limpia la persistencia del filtro de período en sessionStorage
 */
export const limpiarFiltroPeriodoStorage = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY_PERIODO);
  } catch (e) {
    console.warn('No se pudo limpiar sessionStorage:', e);
  }
};
