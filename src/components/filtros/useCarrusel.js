import { useEffect, useRef, useState } from 'react';
import { recortePestanas } from './recortePestanas';

/**
 * Lógica compartida de los carruseles horizontales de filtros (FiltroPestanas y FiltroSegmentado `carrusel`). No pinta nada: devuelve lo
 * que necesita el componente para pintar su scroller.
 *   const { ref, bordes, estilo, desplazar } = useCarrusel({ recortar, fade, cantidad, valorActivo, enVista });
 * - `ref`: va en el elemento con `overflow-x-auto` (el scroller).
 * - `bordes`: { izq, der }; hay más contenido a ese lado (con 2 px de tolerancia). Se mide al desplazar y al cambiar el tamaño.
 * - `estilo`: `maskImage` de difuminado de `fade` px solo en los bordes con más contenido y, con `recortar`, el ancho acortado para que la
 *   última opción asome cortada a medias (ver `recortePestanas`; el recorte solo se ajusta con el scroll al inicio).
 * - `desplazar(sentido)`: mueve ~70 % del ancho visible (-1 izquierda, 1 derecha; instantáneo con prefers-reduced-motion).
 * - `medir(el)`: vuelve a medir los bordes (para el `onScroll` del scroller).
 * - `selectorItems`: qué elementos del scroller son opciones (por defecto `[role="tab"]`) para medir el recorte.
 * - `cantidad`: número de opciones; al cambiar se vuelve a medir.
 * - `valorActivo` + `enVista` (opt-in): al montar y cada vez que cambia `valorActivo`, la opción activa (`[aria-selected="true"]` o
 *   `[aria-pressed="true"]`) se centra con scrollIntoView({ inline: 'center' }). Las vistas que ya lo hacen por su cuenta no lo activan.
 */
export const useCarrusel = ({ recortar = false, fade = 24, cantidad = 0, selectorItems = '[role="tab"]', valorActivo, enVista = false } = {}) => {
  const ref = useRef(null);
  const [bordes, setBordes] = useState({ izq: false, der: false });
  const [recorte, setRecorte] = useState(0);
  const recorteRef = useRef(0);
  const primeraVez = useRef(true);

  const medir = (el) => setBordes((a) => {
    const izq = el.scrollLeft > 2;
    const der = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    return a.izq === izq && a.der === der ? a : { izq, der };
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    // Con `recortar`, al inicio del recorrido se ajusta el ancho visible para que la última opción asome cortada a medias.
    const ajustar = () => {
      if (!recortar || el.scrollLeft > 2) return;
      const base = el.getBoundingClientRect().left - el.scrollLeft;
      const items = Array.from(el.querySelectorAll(selectorItems)).map((t) => {
        const r = t.getBoundingClientRect();
        return { inicio: r.left - base, fin: r.right - base };
      });
      const nuevo = recortePestanas(el.clientWidth + recorteRef.current, items, el.scrollWidth);
      if (nuevo !== recorteRef.current) { recorteRef.current = nuevo; setRecorte(nuevo); }
    };
    const o = new ResizeObserver(() => { ajustar(); medir(el); });
    o.observe(el);
    return () => o.disconnect();
  }, [recortar, cantidad, selectorItems]);

  useEffect(() => {
    const el = ref.current;
    if (!enVista || !el) return;
    const activa = el.querySelector('[aria-selected="true"], [aria-pressed="true"]');
    if (activa && typeof activa.scrollIntoView === 'function') {
      activa.scrollIntoView({ behavior: primeraVez.current ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    }
    primeraVez.current = false;
  }, [enVista, valorActivo]);

  const mascara = bordes.izq || bordes.der
    ? `linear-gradient(to right, ${bordes.izq ? `transparent, #000 ${fade}px` : '#000, #000'}, ${bordes.der ? `#000 calc(100% - ${fade}px), transparent` : '#000, #000'})`
    : undefined;
  const estilo = { ...(mascara ? { maskImage: mascara, WebkitMaskImage: mascara } : {}), ...(recortar && recorte ? { width: `calc(100% - ${recorte}px)` } : {}) };

  const desplazar = (sentido) => {
    const el = ref.current;
    if (!el) return;
    const reducido = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: sentido * Math.round(el.clientWidth * 0.7), behavior: reducido ? 'auto' : 'smooth' });
  };

  return { ref, bordes, estilo, desplazar, medir };
};
