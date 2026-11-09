import React from 'react';
import { User, Building, X } from 'lucide-react';

/**
 * Chip de un filtro de contexto (compacto, 28 px de alto): superficie de reposo del repo (`surface`: token de superficie + sombra del rol,
 * sin borde; `plana` usa `surface-plana` cuando el chip va dentro de otra superficie), texto con tokens de neutros, icono con el color del
 * rol y una X como botón accesible. La X se ve de 24 px y su área táctil es de 32 px (un pseudo-elemento la amplía 4 px por lado sin
 * ensanchar el chip). En móvil los chips comparten una sola fila y el valor se trunca si no caben (desde `md` pueden pasar a otra fila).
 */
const Chip = ({ icono, etiqueta, valor, onQuitar, rotuloQuitar, plana }) => {
  const Icono = icono;
  return (
    <div className={`${plana ? 'surface-plana' : 'surface'} inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full pl-2.5 pr-0.5 text-xs`}>
      <Icono size={12} aria-hidden="true" className="shrink-0 text-primary" />
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">{etiqueta}:</span>
      <span title={valor} className="min-w-0 truncate font-semibold text-foreground">{valor}</span>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={rotuloQuitar}
        title={rotuloQuitar}
        className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground-subtle transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
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
    <div className={`flex w-full min-w-0 flex-nowrap items-center gap-1.5 md:flex-wrap ${className}`}>
      {vendedor && <Chip icono={User} etiqueta="Vendedor" valor={vendedor} onQuitar={onQuitarVendedor} rotuloQuitar="Quitar filtro de vendedor" plana={plana} />}
      {cliente && <Chip icono={Building} etiqueta="Cliente" valor={cliente} onQuitar={onQuitarCliente} rotuloQuitar="Quitar filtro de cliente" plana={plana} />}
    </div>
  );
};
