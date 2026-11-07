import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { useModoFiltro } from './contexto';

/**
 * Botón "Exportar" de una barra de filtros. La exportación en sí la hace la vista en `onClick`. En la hoja móvil es una fila más
 * (44 px, ancho completo, texto a la izquierda e icono a la derecha).
 */
export const BotonExportar = ({ onClick, etiqueta = 'Exportar', titulo, disabled = false, className = '' }) => {
  if (useModoFiltro() === 'hoja') {
    return (
      <button type="button" onClick={onClick} disabled={disabled} title={titulo} className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 text-left text-sm font-medium text-slate-700 outline-none focus-visible:bg-surface-muted disabled:cursor-not-allowed disabled:text-slate-400 ${className}`}>
        <span>{etiqueta}</span>
        <Download size={16} aria-hidden="true" className="shrink-0 text-slate-400" />
      </button>
    );
  }
  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled} title={titulo} className={`h-11 md:h-9 ${className}`}>
      <Download size={14} aria-hidden="true" />
      <span>{etiqueta}</span>
    </Button>
  );
};
