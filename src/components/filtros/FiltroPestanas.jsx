import React, { useEffect, useRef, useState } from 'react';

const FADE = 24;

/** Franja de fondo de las pestañas pegadas (solo con `sticky`): opaca, del tono de la página. Entra al pegarse y sale al volver. */
const FRANJA = 'pointer-events-none absolute inset-0 -z-10 bg-background opacity-0 [transform:translateY(-6px)] transition-[opacity,transform] duration-[var(--anim-cerrar)] ease-[var(--ease-cerrar)] data-[pegada=true]:opacity-100 data-[pegada=true]:duration-[var(--anim-abrir)] data-[pegada=true]:ease-[var(--ease-abrir)] data-[pegada=true]:[transform:translateY(0)] motion-reduce:[transform:none]';

/**
 * Pestañas planas de estado. `opciones`: [{ id, label, cantidad?, punto? }] (`punto` es una clase de fondo para el puntito de color).
 * `onChange(id)`. `prefijoId` (por defecto "tab-") da el id de cada pestaña (`${prefijoId}${id}`) por si la vista ya los usa.
 * `sticky` las deja pegadas arriba del contenedor de scroll (`main`), a ras del borde inferior de la barra superior móvil. En reposo no
 * hay franja ni fondo: solo las pestañas sobre el fondo de la página. Al pegarse aparece una franja de ancho completo (`-mx-[var(--tf-pad-x)]`:
 * solo vale dentro de `main`, con gutter `tf-gutter-x`) con fondo OPACO del token `bg-background` (el mismo tono que la página, sin
 * transparencia, desenfoque, sombra ni borde). La franja es una capa detrás de las pestañas que entra con opacity y translateY(-6px → 0)
 * (--anim-abrir / --ease-abrir) y sale con --anim-cerrar / --ease-cerrar; solo opacity y transform; con prefers-reduced-motion no hay
 * desplazamiento. En sticky las pestañas son más compactas (h-8 con esquinas de 12 px, py-1 de la franja: 40 px en total) y la altura del contenedor es la misma
 * en reposo y pegado. El estado "pegada" (`data-pegada`) solo afecta a esa capa, no al layout. Se detecta con un IntersectionObserver sobre un
 * centinela de altura 0 justo antes de la barra (raíz: `main`, con su relleno superior sumado al margen de la raíz y restado de `top`:
 * `sticky` se pega al borde del relleno y no del contenedor).
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
      className={`flex w-full overflow-x-auto whitespace-nowrap [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden ${sticky ? 'gap-1' : 'gap-1 rounded-xl bg-slate-100 p-1'} ${className}`}
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
            className={`inline-flex ${sticky ? 'h-8 rounded-xl' : 'h-9 rounded-lg'} shrink-0 cursor-pointer items-center gap-1.5 px-3 text-xs font-medium transition-colors ${activa ? 'bg-slate-900 font-semibold text-white' : `text-slate-600 hover:text-slate-900 ${sticky ? '' : 'hover:bg-white'}`}`}
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
      <div data-pegada={pegada} style={{ top: -relleno }} className="sticky z-20 -mx-[var(--tf-pad-x)] px-[var(--tf-pad-x)] py-1">
        <div aria-hidden="true" data-franja data-pegada={pegada} className={FRANJA} />
        {barra}
      </div>
    </>
  );
};
