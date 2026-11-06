/**
 * Color de las acciones de decisión de un ítem (aceptar, contraofertar, rechazar, venta perdida).
 * ÚNICO lugar donde se definen: AccionItemButton las toma por `variant` y los botones sueltos de las tarjetas
 * y tablas las importan. Tokens de estado, sin borde (relleno hasta el borde) y con anillo de foco visible
 * para teclado. No siguen al rol. Clases completas: Tailwind no ve las construidas por partes.
 */
export const VARIANTES_ACCION = {
  approve: 'border-transparent bg-success text-white hover:bg-success-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-success shadow-boton hover:shadow-boton-hover active:shadow-boton-activo disabled:shadow-none',
  counter: 'border-transparent bg-amber-200 text-warning hover:bg-amber-300 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-warning shadow-boton hover:shadow-boton-hover active:shadow-boton-activo disabled:shadow-none',
  reject: 'border-transparent bg-slate-200 text-slate-600 hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500 shadow-boton hover:shadow-boton-hover active:shadow-boton-activo disabled:shadow-none',
  lost: 'border-transparent bg-danger text-white hover:bg-danger-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-danger shadow-boton hover:shadow-boton-hover active:shadow-boton-activo disabled:shadow-none'
};
