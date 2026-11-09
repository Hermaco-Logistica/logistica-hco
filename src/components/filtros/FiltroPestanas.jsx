import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { recortePestanas } from './recortePestanas';

const FADE = 24;
const FADE_STICKY = 36;

/** Capas de fondo de las pestañas sticky, detrás de la barra. Animan solo opacity y transform; el estado lo da data-pegada de la capa. */
const TRANSICION = 'transition-[opacity,transform] duration-[var(--anim-cerrar)] ease-[var(--ease-cerrar)] data-[pegada=true]:duration-[var(--anim-abrir)] data-[pegada=true]:ease-[var(--ease-abrir)] motion-reduce:[transform:none]';
/** Reposo: tarjeta blanca (surface: token de superficie + sombra de reposo del rol), alineada con el ancho del contenido. Se va al pegarse. */
const TARJETA = `surface pointer-events-none absolute inset-y-0 inset-x-[var(--tf-pad-x)] -z-10 rounded-xl opacity-100 [transform:translateY(0)] data-[pegada=true]:opacity-0 data-[pegada=true]:[transform:translateY(-6px)] ${TRANSICION}`;
/** Pegada: franja de ancho completo, blanca opaca (token de superficie), sin sombra ni borde. Entra al pegarse y sale al volver. */
const FRANJA = `pointer-events-none absolute inset-0 -z-10 bg-surface opacity-0 [transform:translateY(-6px)] data-[pegada=true]:opacity-100 data-[pegada=true]:[transform:translateY(0)] ${TRANSICION}`;

/** Flecha de apoyo del carrusel (solo ayuda visual: las pestañas ya se manejan con teclado). */
const Flecha = ({ lado, visible, onClick }) => {
  const Icono = lado === 'izq' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      data-flecha={lado}
      data-visible={visible}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-surface text-slate-600 shadow-boton transition-opacity duration-[var(--anim-abrir)] ${lado === 'izq' ? 'left-[calc(var(--tf-pad-x)+6px)]' : 'right-[calc(var(--tf-pad-x)+6px)]'} ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <Icono size={14} strokeWidth={2.25} />
    </button>
  );
};

/**
 * Pestañas planas de estado. `opciones`: [{ id, label, cantidad?, punto? }] (`punto` es una clase de fondo para el puntito de color).
 * `onChange(id)`. `prefijoId` (por defecto "tab-") da el id de cada pestaña (`${prefijoId}${id}`) por si la vista ya los usa.
 * `sticky` las deja pegadas arriba del contenedor de scroll (`main`), a ras del borde inferior de la barra superior móvil. Ancho completo
 * (`-mx-[var(--tf-pad-x)]`: solo vale dentro de `main`, con gutter `tf-gutter-x`) y 40 px de alto en reposo y pegadas (sin salto de layout).
 *   - Reposo: las pestañas van dentro de una tarjeta `surface` (blanca, sombra de reposo del rol, esquinas de 12 px) alineada con el contenido.
 *   - Pegada: la tarjeta se desvanece y entra una franja de ancho completo, blanca opaca (`bg-surface`), con esquinas rectas, sin sombra ni
 *     borde, a ras del header. Las dos son capas detrás de las pestañas que animan solo opacity y translateY(-6px ↔ 0) con
 *     --anim-abrir / --ease-abrir al pegarse y --anim-cerrar / --ease-cerrar al volver (sin desplazamiento con prefers-reduced-motion).
 *   - Pestañas compactas (h-8, esquinas de 12 px): inactivas en texto plano con su punto; activa con la píldora oscura del rol.
 *   - Carrusel: si no caben, difuminado de 36 px hacia el blanco en los bordes con más contenido (derecha al inicio, izquierda solo tras
 *     desplazar), la última pestaña asoma cortada a medias (`recortePestanas`: se acorta el ancho visible solo si el corte cae casi en un borde),
 *     y una flecha circular por lado (aria-hidden, tabIndex -1) que desplaza ~70 % del ancho visible (instantáneo con reduced motion).
 *     Sin desbordamiento no hay difuminado ni flechas.
 * El estado "pegada" se detecta con un IntersectionObserver sobre un centinela de altura 0 justo antes de la barra (raíz: `main`, con su
 * relleno superior sumado al margen de la raíz y restado de `top`: `sticky` se pega al borde del relleno y no del contenedor).
 * Sin `sticky`: tira con pastilla gris y degradado de 24 px, sin cambios.
 */
export const FiltroPestanas = ({ opciones = [], value, onChange, ariaLabel, sticky = false, prefijoId = 'tab-', className = '' }) => {
  const ref = useRef(null);
  const [bordes, setBordes] = useState({ izq: false, der: false });
  const [recorte, setRecorte] = useState(0);
  const recorteRef = useRef(0);
  const medir = (el) => setBordes((a) => {
    const izq = el.scrollLeft > 2;
    const der = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    return a.izq === izq && a.der === der ? a : { izq, der };
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    // Con sticky, al inicio del recorrido se ajusta el ancho visible para que la última pestaña asome cortada a medias.
    const ajustar = () => {
      if (!sticky || el.scrollLeft > 2) return;
      const base = el.getBoundingClientRect().left - el.scrollLeft;
      const tabs = Array.from(el.querySelectorAll('[role="tab"]')).map((t) => {
        const r = t.getBoundingClientRect();
        return { inicio: r.left - base, fin: r.right - base };
      });
      const nuevo = recortePestanas(el.clientWidth + recorteRef.current, tabs, el.scrollWidth);
      if (nuevo !== recorteRef.current) { recorteRef.current = nuevo; setRecorte(nuevo); }
    };
    const o = new ResizeObserver(() => { ajustar(); medir(el); });
    o.observe(el);
    return () => o.disconnect();
  }, [sticky, opciones.length]);
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
  const fade = sticky ? FADE_STICKY : FADE;
  const mascara = bordes.izq || bordes.der
    ? `linear-gradient(to right, ${bordes.izq ? `transparent, #000 ${fade}px` : '#000, #000'}, ${bordes.der ? `#000 calc(100% - ${fade}px), transparent` : '#000, #000'})`
    : undefined;
  const desplazar = (sentido) => {
    const el = ref.current;
    if (!el) return;
    const reducido = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: sentido * Math.round(el.clientWidth * 0.7), behavior: reducido ? 'auto' : 'smooth' });
  };
  const barra = (
    <div
      ref={ref}
      role="tablist"
      aria-label={ariaLabel}
      data-fade-izq={bordes.izq}
      data-fade-der={bordes.der}
      onScroll={(e) => medir(e.currentTarget)}
      style={{ ...(mascara ? { maskImage: mascara, WebkitMaskImage: mascara } : {}), ...(sticky && recorte ? { width: `calc(100% - ${recorte}px)` } : {}) }}
      className={`flex w-full overflow-x-auto whitespace-nowrap [scrollbar-width:none] ${sticky ? '' : 'sm:w-auto'} [&::-webkit-scrollbar]:hidden ${sticky ? 'gap-1 px-1' : 'gap-1 rounded-xl bg-slate-100 p-1'} ${className}`}
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
        <div aria-hidden="true" data-tarjeta data-pegada={pegada} className={TARJETA} />
        <div aria-hidden="true" data-franja data-pegada={pegada} className={FRANJA} />
        {barra}
        <Flecha lado="izq" visible={bordes.izq} onClick={() => desplazar(-1)} />
        <Flecha lado="der" visible={bordes.der} onClick={() => desplazar(1)} />
      </div>
    </>
  );
};
