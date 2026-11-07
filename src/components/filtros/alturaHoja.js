/**
 * Altura de la hoja de filtros: al desplegar una fila (opciones o calendario) la hoja crece con animación hasta la altura completa
 * disponible (100dvh menos el margen superior seguro, con las esquinas superiores redondeadas del Modal) y vuelve a su altura al
 * cerrar la fila. Se anima la altura de la hoja (CSS transition con --anim-abrir / --anim-cerrar), no el contenido. Con
 * prefers-reduced-motion no hay animación de altura.
 */
export const OBJETIVO_CSS = 'calc(100dvh - max(env(safe-area-inset-top, 0px), 1rem))';

/** Margen superior seguro en px (la sonda lee env(safe-area-inset-top); en escritorio y sin muesca es 0). */
export const margenSuperior = () => {
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

const reducirMovimiento = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Anima la altura del `panel` de `desde` px a `hasta` (px o CSS). `tipo`: 'abrir' | 'cerrar'. Al terminar de cerrar quita los estilos
 * en línea (la hoja vuelve a su altura natural); al terminar de abrir deja la altura ampliada (calc con dvh) y quita la transición.
 */
export const animarAlturaHoja = (panel, desde, hasta, tipo) => {
  const abrir = tipo === 'abrir';
  panel.style.transition = 'none';
  panel.style.height = `${desde}px`;
  panel.style.maxHeight = abrir ? OBJETIVO_CSS : `${Math.max(desde, parseFloat(hasta) || 0)}px`;
  const terminar = () => {
    panel.style.transition = '';
    if (!abrir) { panel.style.height = ''; panel.style.maxHeight = ''; }
  };
  if (reducirMovimiento()) { panel.style.height = typeof hasta === 'number' ? `${hasta}px` : hasta; terminar(); return () => {}; }
  void panel.offsetHeight;
  panel.style.transition = `height var(${abrir ? '--anim-abrir' : '--anim-cerrar'}) var(${abrir ? '--ease-abrir' : '--ease-cerrar'})`;
  panel.style.height = typeof hasta === 'number' ? `${hasta}px` : hasta;
  const t = setTimeout(terminar, (abrir ? 220 : 140) + 60);
  return () => clearTimeout(t);
};
