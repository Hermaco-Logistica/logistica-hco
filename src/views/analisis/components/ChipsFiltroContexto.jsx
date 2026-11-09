import React from 'react';
import { User, Building, X } from 'lucide-react';

/**
 * Chip de un filtro de contexto: superficie de reposo del repo (`surface`: token de superficie + sombra del rol, sin borde; `plana` usa
 * `surface-plana` cuando el chip va dentro de otra superficie), texto con tokens de neutros, icono con el color del rol y una X como botón
 * accesible con área táctil de 32 px en móvil (24 px desde `md`).
 */
const Chip = ({ icono, etiqueta, valor, onQuitar, rotuloQuitar, plana }) => {
  const Icono = icono;
  return (
    <div className={`${plana ? 'surface-plana' : 'surface'} inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pl-3 pr-0.5 text-xs`}>
      <Icono size={12} aria-hidden="true" className="shrink-0 text-primary" />
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">{etiqueta}:</span>
      <span className="min-w-0 truncate font-semibold text-foreground">{valor}</span>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={rotuloQuitar}
        title={rotuloQuitar}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground-subtle transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary md:size-6"
      >
        <X size={12} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
};

/**
 * Chips de los filtros de contexto que llegan desde el dashboard (vendedor y cliente, guardados en sesión). Cada uno se puede quitar.
 * No tienen estado propio: `onQuitarVendedor` / `onQuitarCliente` los pone la vista (con su reinicio de paginación). No se pinta nada
 * si no hay chips.
 */
export const ChipsFiltroContexto = ({ vendedor, cliente, onQuitarVendedor, onQuitarCliente, plana = false, className = '' }) => {
  if (!vendedor && !cliente) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {vendedor && <Chip icono={User} etiqueta="Vendedor" valor={vendedor} onQuitar={onQuitarVendedor} rotuloQuitar="Quitar filtro de vendedor" plana={plana} />}
      {cliente && <Chip icono={Building} etiqueta="Cliente" valor={cliente} onQuitar={onQuitarCliente} rotuloQuitar="Quitar filtro de cliente" plana={plana} />}
    </div>
  );
};
