import React, { useEffect, useRef, useState } from 'react';

const FADE = 24;

/** Capa de la cápsula de una pestaña inactiva (solo con `sticky`). Entra al pegarse (grupo con data-pegada=true) y sale al volver. */
const CAPSULA = 'pointer-events-none absolute inset-0 rounded-lg bg-background/95 opacity-0 shadow-boton backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-background/70 [transform:translateY(-6px)] transition-[opacity,transform] duration-[var(--anim-cerrar)] ease-[var(--ease-cerrar)] group-data-[pegada=true]:opacity-100 group-data-[pegada=true]:duration-[var(--anim-abrir)] group-data-[pegada=true]:ease-[var(--ease-abrir)] group-data-[pegada=true]:[transform:translateY(0)] motion-reduce:[transform:none]';

/**
 * Pestañas planas de estado. `opciones`: [{ id, label, cantidad?, punto? }] (`punto` es una clase de fondo para el puntito de color).
 * `onChange(id)`. `prefijoId` (por defecto "tab-") da el id de cada pestaña (`${prefijoId}${id}`) por si la vista ya los usa.
 * `sticky` las deja pegadas arriba del contenedor de scroll (`main`), a ras del borde inferior de la barra superior móvil. El contenedor
 * sticky es transparente (no pinta fondo, sombra ni capa de ancho completo) y ocupa todo el ancho (`-mx-[var(--tf-pad-x)]`: solo vale dentro
 * de `main`, con gutter `tf-gutter-x`). En reposo no hay pastilla: solo las pestañas sobre el fondo de la página. Al pegarse, cada pestaña
 * inactiva se vuelve su propia cápsula flotante (`bg-background` translúcido, `backdrop-blur-md`, sin borde, sombra mínima `shadow-boton`
 * tintada con el rol; sin `backdrop-filter`, fondo casi opaco). La capa de la cápsula entra con opacity y translateY(-6px → 0)
 * (--anim-abrir / --ease-abrir) y sale con --anim-cerrar / --ease-cerrar; solo opacity y transform; con prefers-reduced-motion no hay
 * desplazamiento. La pestaña activa conserva su estilo. El estado "pegada" (`data-pegada`) solo afecta a las cápsulas, no al layout. Se
 * detecta con un IntersectionObserver sobre un centinela de altura 0 justo antes de la barra (raíz: `main`, con su relleno superior sumado al
 * margen de la raíz y restado de `top`: `sticky` se pega al borde del relleno y no del contenedor).
 * Si no caben, se desplazan en horizontal sin barra visible y los bordes con más contenido se difuminan (degradado de 24 px).
 * Excepción: con `sticky` y pegada se quita la máscara de difuminado, porque una máscara convierte a la barra en «raíz de fondo» y el
 * `backdrop-filter` de las cápsulas dejaría de ver el contenido que pasa por detrás (sin desenfoque). Con las cápsulas visibles, la última
 * cortada en el borde ya indica que hay más pestañas.
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
  const contenido = (o) => {
    const interior = (
      <>
        {o.punto && <span aria-hidden="true" className={`size-2 rounded-full ${o.punto}`} />}
        {o.label}
        {o.cantidad !== undefined && <span className="font-mono text-[10px] opacity-70">{o.cantidad}</span>}
      </>
    );
    return sticky ? <span className="relative inline-flex items-center gap-1.5">{interior}</span> : interior;
  };
  const barra = (
    <div
      ref={ref}
      role="tablist"
      aria-label={ariaLabel}
      data-fade-izq={bordes.izq}
      data-fade-der={bordes.der}
      data-pegada={sticky ? pegada : undefined}
      onScroll={(e) => medir(e.currentTarget)}
      data-mascara={Boolean(mascara) && !(sticky && pegada)}
      style={mascara && !(sticky && pegada) ? { maskImage: mascara, WebkitMaskImage: mascara } : undefined}
      className={`flex w-full overflow-x-auto whitespace-nowrap [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden ${sticky ? 'group gap-1.5 pb-3' : 'gap-1 rounded-xl bg-slate-100 p-1'} ${className}`}
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
            className={`${sticky ? 'relative ' : ''}inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${activa ? 'bg-slate-900 font-semibold text-white' : `text-slate-600 hover:text-slate-900 ${sticky ? '' : 'hover:bg-white'}`}`}
          >
            {sticky && !activa && <span aria-hidden="true" data-capsula className={CAPSULA} />}
            {contenido(o)}
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
      <div data-pegada={pegada} style={{ top: -relleno }} className="sticky z-20 -mx-[var(--tf-pad-x)] px-[var(--tf-pad-x)]">
        {barra}
      </div>
    </>
  );
};
