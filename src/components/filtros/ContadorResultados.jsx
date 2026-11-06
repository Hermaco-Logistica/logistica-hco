import React from 'react';

/** Contador de resultados: "N unidad" o, si hay filtros, "N de M unidad". */
export const ContadorResultados = ({ total, filtrados, unidad = 'resultados', className = '' }) => {
  const hayFiltro = filtrados !== undefined && filtrados !== total;
  return (
    <span aria-live="polite" className={`whitespace-nowrap font-mono text-[11px] font-medium text-slate-500 ${className}`}>
      <strong className="font-semibold text-slate-700">{hayFiltro ? filtrados : total}</strong>
      {hayFiltro ? ` de ${total}` : ''} {unidad}
    </span>
  );
};
