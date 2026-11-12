/**
 * Estados visuales de un campo de filtro de la barra (escritorio): reposo, hover, foco visible, abierto y seleccionado.
 *   reposo:       fondo tenue (surface-muted) y borde suave.
 *   hover:        fondo de superficie (blanco).
 *   foco visible: anillo del rol (solo con teclado: has-[:focus-visible]).
 *   abierto:      tinte suave del rol (--color-filtro-abierto, igual que su menú), sin borde y sin el radio del lado que toca el menú (se lee como una pieza con él).
 *   seleccionado: valor distinto de "Todos": fondo --color-filtro-activo (sigue al rol), texto primary-strong e icono primary.
 */
const BASE = 'relative flex h-11 min-w-0 items-center rounded-xl border text-xs font-medium transition-colors md:h-9 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50';

export const claseCampo = ({ abierto = false, seleccionado = false, dir = 'abajo' } = {}) => {
  if (abierto) return `${BASE} border-transparent bg-filtro-abierto text-slate-700 has-[:focus-visible]:ring-0 ${dir === 'arriba' ? 'rounded-t-none' : 'rounded-b-none'}`;
  if (seleccionado) return `${BASE} border-transparent bg-filtro-activo text-filtro-texto`;
  return `${BASE} border-border bg-surface-muted text-slate-700 hover:bg-surface`;
};

/** Color del icono (chevron, lupa, calendario) según el estado. */
export const claseIcono = (seleccionado) => (seleccionado ? 'text-primary' : 'text-slate-400');

/** Fila de la hoja móvil: con valor lleva el mismo fondo de filtro activo. */
export const claseFila = (seleccionado) => (seleccionado ? 'bg-filtro-activo' : '');
