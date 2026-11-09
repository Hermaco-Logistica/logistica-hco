import React, { useEffect, useRef, useState } from 'react';

const FADE = 24;

/**
 * Pestañas planas de estado. `opciones`: [{ id, label, cantidad?, punto? }] (`punto` es una clase de fondo para el puntito de color).
 * `onChange(id)`. `prefijoId` (por defecto "tab-") da el id de cada pestaña (`${prefijoId}${id}`) por si la vista ya los usa.
 * `sticky` las deja pegadas arriba del contenedor de scroll (`main`), a ras del borde inferior de la barra superior móvil. En reposo no tienen
 * fondo, borde ni sombra (solo las pestañas sobre el fondo de la página). Al pegarse aparece una capa de vidrio de ancho completo
 * (`bg-background` translúcido + desenfoque, sin borde, con `shadow-menu`: sombra tintada con el rol y solo hacia abajo) que entra con
 * opacity y un pequeño translateY (--anim-abrir / --ease-abrir) y sale con --anim-cerrar / --ease-cerrar. Sin `backdrop-filter` el fondo
 * es casi opaco. Con prefers-reduced-motion no hay desplazamiento. El estado "pegada" (`data-pegada`) solo afecta a esa capa visual, no al
 * layout. Se detecta con un IntersectionObserver sobre un centinela de altura 0 justo antes de la barra (raíz: `main`, con su relleno
 * superior sumado al margen de la raíz y restado de `top`: `sticky` se pega al borde del relleno y no del contenedor). El ancho completo usa `-mx-[var(--tf-pad-x)]`: solo vale
 * dentro de `main` (gutter `tf-gutter-x`).
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
  const centinela = useRef(null);
  const [pegada, setPegada] = useState(false);
  const [relleno, setRelleno] = useState(0);
  // Relleno superior de `main` (cambia por breakpoint). `sticky` se pega al borde del relleno, no al del contenedor: con `top: -relleno`
  // las pestañas quedan a ras del borde del contenedor, pegadas a la barra superior sin una franja de contenido por encima.
  useEffect(() => {
    const raiz = centinela.current?.closest('main');
    if (!sticky || !raiz) return undefined;
    const medir = () => setRelleno(parseFloat(getComputedStyle(raiz).paddingTop) || 0);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [sticky]);
  useEffect(() => {
    const el = centinela.current;
    if (!sticky || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const raiz = el.closest('main');
    const o = new IntersectionObserver(([e]) => {
      const tope = raiz ? raiz.getBoundingClientRect().top : 0;
      setPegada(!e.isIntersecting && e.boundingClientRect.top < tope);
    }, { root: raiz || null, rootMargin: `${relleno}px 0px 0px 0px` });
    o.observe(el);
    return () => o.disconnect();
  }, [sticky, relleno]);
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
      className={`flex w-full gap-1 overflow-x-auto whitespace-nowrap rounded-xl ${sticky ? '' : 'bg-slate-100'} p-1 [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden ${className}`}
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
  return (
    <>
      {/* Centinela: altura 0 y sin margen propio (m-0 gana al espaciado `space-y` del padre), así el layout no cambia. */}
      <div ref={centinela} aria-hidden="true" data-centinela className="m-0 h-0" />
      <div data-pegada={pegada} style={{ top: -relleno }} className="sticky z-20 -mx-[var(--tf-pad-x)] px-[var(--tf-pad-x)] pb-2">
        <div
          aria-hidden="true"
          data-vidrio
          data-pegada={pegada}
          className="pointer-events-none absolute inset-0 -z-10 bg-background/95 opacity-0 shadow-menu backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-background/65 [transform:translateY(-6px)] transition-[opacity,transform] duration-[var(--anim-cerrar)] ease-[var(--ease-cerrar)] data-[pegada=true]:opacity-100 data-[pegada=true]:duration-[var(--anim-abrir)] data-[pegada=true]:ease-[var(--ease-abrir)] data-[pegada=true]:[transform:translateY(0)] motion-reduce:[transform:none]"
        />
        {barra}
      </div>
    </>
  );
};
