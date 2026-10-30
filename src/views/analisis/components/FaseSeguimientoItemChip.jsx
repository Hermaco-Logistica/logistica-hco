import React from 'react';
import { obtenerFaseItemCacheada } from '../../../utils/faseSeguimiento';
import { FaseSeguimientoChip } from './FaseSeguimientoChip';

/** Chip de fase para una fila de movimiento (un ítem de una solicitud). No muestra nada si el ítem no está en seguimiento. */
export const FaseSeguimientoItemChip = ({ movimiento, className = '' }) => (
  <FaseSeguimientoChip
    fase={obtenerFaseItemCacheada(movimiento?.solicitudOriginal, movimiento?.idxProducto)}
    className={className}
  />
);
