import React from 'react';
import { FASES_SEGUIMIENTO } from '../../../utils/faseSeguimiento';

/** Pastilla "N en seguimiento" para filas agregadas; el detalle por fase va en el tooltip. */
export const FaseSeguimientoConteo = ({ conteo = 0, porFase = {}, unidad = 'en seguimiento', className = '' }) => {
  if (!conteo) return null;
  const detalle = Object.entries(FASES_SEGUIMIENTO)
    .filter(([fase]) => porFase[fase])
    .map(([fase, datos]) => `${porFase[fase]} ${datos.etiqueta.toLowerCase()}`)
    .join(' · ');
  return (
    <span
      title={detalle}
      className={`inline-flex items-center text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full whitespace-nowrap ${className}`}
    >
      {conteo} {unidad}
    </span>
  );
};
