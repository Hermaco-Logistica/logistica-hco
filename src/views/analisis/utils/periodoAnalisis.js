import {
  getAnioActualElSalvador,
  parseInicioDiaElSalvador,
  parseFinDiaElSalvador
} from '../../../utils/dateValidation';

/** Determina si una fecha de solicitud pertenece al período activo del análisis. */
export const cumpleFiltroPeriodoAnalisis = ({ fecha, filtroPeriodo, rangoEsteMes, ahora = new Date() }) => {
  if (!fecha) return true;

  const { periodo, fechaInicio, fechaFin, anioHistorico } = filtroPeriodo;

  if (periodo === 'custom') {
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) return true;
    if (fechaInicio) {
      const inicio = parseInicioDiaElSalvador(fechaInicio);
      if (fecha < inicio) return false;
    }
    if (fechaFin) {
      const fin = parseFinDiaElSalvador(fechaFin);
      if (fecha > fin) return false;
    }
    return true;
  }

  if (periodo === 'historico') {
    return anioHistorico === 'todos' || fecha.getFullYear() === anioHistorico;
  }

  if (periodo === 'all') return true;

  const diffDias = (ahora.getTime() - fecha.getTime()) / (1000 * 3600 * 24);
  if (periodo === '7d' && diffDias > 7) return false;
  if (periodo === '30d' && diffDias > 30) return false;
  if (periodo === '90d' && diffDias > 90) return false;
  if (periodo === 'this_month' && (fecha < rangoEsteMes.inicio || fecha >= rangoEsteMes.fin)) return false;
  if (periodo === 'this_year' && fecha.getFullYear() !== getAnioActualElSalvador()) return false;
  return true;
};
