import React from 'react';
import { pluralizar } from '../../utils/pluralizar';

/**
 * Contador de resultados: "N unidad" o, si hay filtros, "N de M unidad". Recibe el singular y el plural ("registro" / "registros"):
 * "1 registro", "0 registros", "N registros". Con "N de M" el sustantivo concuerda con el total M. `unidad` se mantiene como plural
 * (compatibilidad); `prefijo` ("Mostrando") antecede al número; sin `singular` se quita la "s" final de `unidad`.
 */
export const ContadorResultados = ({ total, filtrados, singular, plural, unidad = 'resultados', prefijo, className = '' }) => {
  const hayFiltro = filtrados !== undefined && filtrados !== total;
  const pl = plural || unidad;
  const sing = singular || pl.replace(/s$/, '');
  const mostrado = hayFiltro ? filtrados : total;
  const concuerda = hayFiltro ? total : mostrado;
  return (
    <span aria-live="polite" className={`whitespace-nowrap font-mono text-[11px] font-medium text-slate-500 ${className}`}>
      {prefijo ? `${prefijo} ` : ''}<strong className="font-semibold text-slate-700">{mostrado}</strong>
      {hayFiltro ? ` de ${total}` : ''} {pluralizar(concuerda, sing, pl)}
    </span>
  );
};
