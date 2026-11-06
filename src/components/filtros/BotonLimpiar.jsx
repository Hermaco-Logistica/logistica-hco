import React from 'react';
import { FilterX } from 'lucide-react';
import { Button } from '../ui/Button';

/** "Limpiar filtros (N)": solo se pinta si hay filtros activos (`activos` > 0). La acción de restablecer la pone la vista. */
export const BotonLimpiar = ({ activos = 0, onClick, etiqueta = 'Limpiar filtros', className = '' }) => {
  if (!(activos > 0)) return null;
  return (
    <Button variant="secondary" size="sm" onClick={onClick} aria-label={`${etiqueta} (${activos} activos)`} className={`h-11 md:h-9 ${className}`}>
      <FilterX size={14} aria-hidden="true" />
      <span>{etiqueta} ({activos})</span>
    </Button>
  );
};
