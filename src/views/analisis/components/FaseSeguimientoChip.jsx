import React from 'react';
import { FASES_SEGUIMIENTO } from '../../../utils/faseSeguimiento';

const TONOS = {
  danger: 'text-rose-700 bg-rose-50 border-rose-200',
  warning: 'text-amber-800 bg-amber-50 border-amber-200',
  info: 'text-sky-700 bg-sky-50 border-sky-200',
  violet: 'text-violet-700 bg-violet-50 border-violet-200'
};

/** Chip de la fase de seguimiento (revisión / prórroga). Acepta la fase o el objeto devuelto por el selector. */
export const FaseSeguimientoChip = ({ fase, className = '' }) => {
  const clave = typeof fase === 'string' ? fase : fase?.fase;
  const datos = FASES_SEGUIMIENTO[clave];
  if (!datos) return null;
  return (
    <span
      title={datos.titulo}
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full whitespace-nowrap ${TONOS[datos.tono]} ${className}`}
    >
      {datos.etiqueta}
    </span>
  );
};
