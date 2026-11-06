import React from 'react';
import { FilterX } from 'lucide-react';
import { Button } from '../ui/Button';
import { useModoFiltro } from './contexto';

/**
 * "Limpiar filtros (N)": solo se pinta si hay filtros activos (`activos` > 0). La acción de restablecer la pone la vista.
 * En la cabecera de la hoja móvil es un texto "Limpiar (N)" (sin botón con sombra).
 */
export const BotonLimpiar = ({ activos = 0, onClick, etiqueta = 'Limpiar filtros', className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  if (!(activos > 0)) return null;
  if (enHoja) {
    return (
      <button type="button" onClick={onClick} aria-label={`${etiqueta} (${activos} activos)`} className={`h-11 cursor-pointer px-2 text-sm font-semibold text-primary-strong ${className}`}>
        Limpiar ({activos})
      </button>
    );
  }
  return (
    <Button variant="secondary" size="sm" onClick={onClick} aria-label={`${etiqueta} (${activos} activos)`} className={`h-11 md:h-9 ${className}`}>
      <FilterX size={14} aria-hidden="true" />
      <span>{etiqueta} ({activos})</span>
    </Button>
  );
};
