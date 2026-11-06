import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui/Button';

/** Botón "Exportar" de una barra de filtros. La exportación en sí la hace la vista en `onClick`. */
export const BotonExportar = ({ onClick, etiqueta = 'Exportar', titulo, disabled = false, className = '' }) => (
  <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled} title={titulo} className={`h-11 md:h-9 ${className}`}>
    <Download size={14} aria-hidden="true" />
    <span>{etiqueta}</span>
  </Button>
);
