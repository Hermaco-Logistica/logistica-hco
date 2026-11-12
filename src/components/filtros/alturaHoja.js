/**
 * Altura de la hoja de filtros: al desplegar una fila (opciones o calendario) la hoja crece con animación hasta la altura completa
 * disponible (100dvh menos el margen superior seguro, con las esquinas superiores redondeadas del Modal) y vuelve a su altura al
 * cerrar la fila. Se anima la altura de la hoja (CSS transition con --anim-abrir / --anim-cerrar), no el contenido. Con
 * prefers-reduced-motion no hay animación de altura.
 */
export const OBJETIVO_CSS = 'calc(100dvh - max(env(safe-area-inset-top, 0px), 1rem))';

/** Margen superior seguro en px (la sonda lee env(safe-area-inset-top); en escritorio y sin muesca es 0). */
const margenSuperior = () => {
  const sonda = document.createElement('div');
  sonda.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top, 0px)';
  document.body.appendChild(sonda);
  const seguro = parseFloat(getComputedStyle(sonda).paddingTop) || 0;
  sonda.remove();
  const unRem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return Math.max(seguro, unRem);
};

/** Altura (px) que tendrá la hoja ampliada. */
export const alturaAmpliadaPx = () => window.innerHeight - margenSuperior();
