import React, { useEffect, useRef, useState } from 'react';

const FADE = 24;

/**
 * Pestañas planas de estado. `opciones`: [{ id, label, cantidad?, punto? }] (`punto` es una clase de fondo para el puntito de color).
 * `onChange(id)`. `prefijoId` (por defecto "tab-") da el id de cada pestaña (`${prefijoId}${id}`) por si la vista ya los usa.
 * `sticky` las deja pegadas arriba del contenedor de scroll con un fondo difuminado.
 * Si no caben, se desplazan en horizontal sin barra visible y los bordes con más contenido se difuminan (degradado de 24 px).
 */
export const FiltroPestanas = ({ opciones = [], value, onChange, ariaLabel, sticky = false, prefijoId = 'tab-', className = '' }) => {
  const ref = useRef(null);
  const [bordes, setBordes] = useState({ izq: false, der: false });
  const medir = (el) => setBordes((a) => {
    const izq = el.scrollLeft > 2;
    const der = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    return a.izq === izq && a.der === der ? a : { izq, der };
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const o = new ResizeObserver(() => medir(el));
    o.observe(el);
    return () => o.disconnect();
  }, []);
  const mascara = bordes.izq || bordes.der
    ? `linear-gradient(to right, ${bordes.izq ? `transparent, #000 ${FADE}px` : '#000, #000'}, ${bordes.der ? `#000 calc(100% - ${FADE}px), transparent` : '#000, #000'})`
    : undefined;
  const barra = (
    <div
      ref={ref}
      role="tablist"
      aria-label={ariaLabel}
      data-fade-izq={bordes.izq}
      data-fade-der={bordes.der}
      onScroll={(e) => medir(e.currentTarget)}
      style={mascara ? { maskImage: mascara, WebkitMaskImage: mascara } : undefined}
      className={`flex w-full gap-1 overflow-x-auto whitespace-nowrap rounded-xl bg-slate-100 p-1 [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {opciones.map((o) => {
        const activa = o.id === value;
        return (
          <button
            key={o.id}
            id={`${prefijoId}${o.id}`}
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
