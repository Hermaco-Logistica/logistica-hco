import React from 'react';
import { pluralizar } from '../../utils/pluralizar';
import { FilterX } from 'lucide-react';
import { Button } from '../ui/Button';
import { useModoFiltro } from './contexto';

/**
 * "Limpiar filtros (N)": solo se pinta si hay filtros activos (`activos` > 0). La acción de restablecer la pone la vista.
 * En la cabecera de la hoja móvil es un texto "Limpiar (N)" (sin botón con sombra). En la tarjeta móvil con búsqueda (modo `icono`) es un
 * botón de icono de 44 px con el número como distintivo y aria-label "Limpiar filtros (N)".
 */
export const BotonLimpiar = ({ activos = 0, onClick, etiqueta = 'Limpiar filtros', className = '' }) => {
  const modo = useModoFiltro();
  const enHoja = modo === 'hoja';
  if (!(activos > 0)) return null;
  if (modo === 'icono') {
    return (
      <button type="button" onClick={onClick} aria-label={`${etiqueta} (${activos})`} className={`relative flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}>
        <FilterX size={18} aria-hidden="true" />
        <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-primary-foreground">{activos}</span>
      </button>
    );
  }
  if (enHoja) {
    return (
      <button type="button" onClick={onClick} aria-label={`${etiqueta} (${activos} ${pluralizar(activos, 'activo', 'activos')})`} className={`h-11 cursor-pointer px-2 text-sm font-semibold text-primary-strong ${className}`}>
        Limpiar ({activos})
      </button>
    );
  }
  return (
    <Button variant="secondary" size="sm" onClick={onClick} aria-label={`${etiqueta} (${activos} ${pluralizar(activos, 'activo', 'activos')})`} className={`h-11 md:h-9 ${className}`}>
      <FilterX size={14} aria-hidden="true" />
      <span>{etiqueta} ({activos})</span>
    </Button>
  );
};
