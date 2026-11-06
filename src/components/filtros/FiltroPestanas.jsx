import React from 'react';

/**
 * Pestañas planas de estado. `opciones`: [{ id, label, cantidad?, punto? }] (`punto` es una clase de fondo para el puntito de color).
 * `sticky` las deja pegadas arriba del contenedor de scroll con un fondo difuminado. `onChange(id)`.
 */
export const FiltroPestanas = ({ opciones = [], value, onChange, ariaLabel, sticky = false, className = '' }) => {
  const barra = (
    <div role="tablist" aria-label={ariaLabel} className={`flex w-full gap-1 overflow-x-auto whitespace-nowrap rounded-xl bg-slate-100 p-1 [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden ${className}`}>
      {opciones.map((o) => {
        const activa = o.id === value;
        return (
          <button
            key={o.id}
            id={`tab-${o.id}`}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onChange(o.id)}
            className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${activa ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}
          >
            {o.punto && <span aria-hidden="true" className={`size-2 rounded-full ${o.punto}`} />}
            {o.label}
            {o.cantidad !== undefined && <span className="font-mono text-[10px] opacity-70">{o.cantidad}</span>}
          </button>
        );
      })}
    </div>
  );
  if (!sticky) return barra;
  return <div className="sticky top-0 z-20 bg-background/80 pb-2 backdrop-blur-md">{barra}</div>;
};
