/**
 * ÚNICA fuente del estilo, la animación y las capas de los modales del proyecto.
 *
 * Estilo: modal limpio y aireado. Tarjeta blanca de esquinas amplias, sin borde y con sombra difusa; encabezado y
 * pie en gris casi blanco; una sola idea de color por modal (el `tono`), que aparece en el ícono del encabezado,
 * la pestaña activa, el anillo de foco y el botón principal. Todo en sentence case y con pesos 400 a 600.
 *
 * - Para cambiar cómo se ve un modal (fondo, anchos, botones, campos): edita este archivo.
 * - Para cambiar la animación: edita .modal-fondo y .modal-panel en index.css y DURACION_SALIDA_MS (deben coincidir).
 * - Para pintarlos: usa <Modal /> y sus piezas (src/components/Modal.jsx). Ningún otro archivo debe definir un
 *   overlay `fixed inset-0`; ESLint lo impide (ver eslint.config.js).
 *
 * Los colores del tono salen de la misma paleta de las etiquetas (utils/etiquetas.js).
 */

/** Escala de capas. Un modal que se abre desde otro modal usa `anidado`; los avisos globales van encima de todo. */
export const CAPAS = {
  modal: 'z-[100]',
  anidado: 'z-[110]',
  aviso: 'z-[200]'
};

/** Debe coincidir con la duración de salida de .modal-fondo / .modal-panel en index.css. */
export const DURACION_SALIDA_MS = 180;

export const FONDO = 'bg-slate-950/40 backdrop-blur-[6px]';

export const ANCHOS = {
  sm: 'max-w-sm',
  md: 'max-w-[31rem]',
  lg: 'max-w-xl',
  xl: 'max-w-4xl',
  completo: 'max-w-6xl'
};

/**
 * Variantes de modal:
 * - centrado: tarjeta centrada en pantalla (diálogos, formularios, confirmaciones).
 * - hoja: hoja inferior en móvil que sube desde abajo y tarjeta centrada desde `sm`.
 * - pantallaCompleta: ocupa toda la pantalla en móvil y es tarjeta centrada desde `sm` (listados y detalles largos).
 */
export const VARIANTES = {
  centrado: {
    posicion: 'items-center justify-center p-4',
    panel: 'rounded-3xl max-h-[90vh]'
  },
  hoja: {
    posicion: 'items-end sm:items-center justify-center p-0 sm:p-4',
    panel: 'rounded-t-3xl sm:rounded-3xl max-h-[90vh]'
  },
  pantallaCompleta: {
    posicion: 'items-center justify-center p-0 sm:p-4',
    panel: 'h-[100dvh] rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-3xl'
  }
};

const BASE_FONDO = 'modal-fondo fixed inset-0 flex overflow-y-auto';
const BASE_PANEL = 'modal-panel flex w-full flex-col overflow-hidden bg-white shadow-[0_24px_64px_rgba(0,0,0,0.14)] outline-none';

export const clasesFondo = ({ variante = 'centrado', capa = 'modal' } = {}) => (
  `${BASE_FONDO} ${CAPAS[capa] || CAPAS.modal} ${FONDO} ${(VARIANTES[variante] || VARIANTES.centrado).posicion}`
);

export const clasesPanel = ({ variante = 'centrado', ancho = 'md' } = {}) => (
  `${BASE_PANEL} ${ANCHOS[ancho] || ANCHOS.md} ${(VARIANTES[variante] || VARIANTES.centrado).panel}`
);

/**
 * Color de cada tono dentro del modal. Las clases deben escribirse completas para que Tailwind las detecte.
 * - icono: caja del ícono del encabezado (pastel + texto oscuro, igual que las etiquetas)
 * - texto: color del texto/ícono de acento (pestaña activa)
 * - boton: relleno del botón principal (texto blanco)
 * - foco: borde y anillo de los campos al enfocar
 */
export const TONOS_MODAL = {
  neutral: { icono: 'bg-slate-100 text-slate-600', texto: 'text-slate-700', boton: 'bg-slate-900 hover:bg-slate-800', foco: 'focus:border-slate-500 focus:ring-slate-500/20' },
  peligro: { icono: 'bg-rose-100 text-rose-700', texto: 'text-rose-700', boton: 'bg-rose-700 hover:bg-rose-800', foco: 'focus:border-rose-500 focus:ring-rose-500/20' },
  aviso: { icono: 'bg-amber-100 text-amber-800', texto: 'text-amber-800', boton: 'bg-amber-700 hover:bg-amber-800', foco: 'focus:border-amber-500 focus:ring-amber-500/20' },
  naranja: { icono: 'bg-orange-100 text-orange-700', texto: 'text-orange-700', boton: 'bg-orange-700 hover:bg-orange-800', foco: 'focus:border-orange-500 focus:ring-orange-500/20' },
  azul: { icono: 'bg-blue-100 text-blue-700', texto: 'text-blue-700', boton: 'bg-blue-700 hover:bg-blue-800', foco: 'focus:border-blue-500 focus:ring-blue-500/20' },
  info: { icono: 'bg-sky-100 text-sky-700', texto: 'text-sky-700', boton: 'bg-sky-700 hover:bg-sky-800', foco: 'focus:border-sky-500 focus:ring-sky-500/20' },
  exito: { icono: 'bg-emerald-100 text-emerald-800', texto: 'text-emerald-800', boton: 'bg-emerald-700 hover:bg-emerald-800', foco: 'focus:border-emerald-500 focus:ring-emerald-500/20' },
  violeta: { icono: 'bg-violet-100 text-violet-700', texto: 'text-violet-700', boton: 'bg-violet-700 hover:bg-violet-800', foco: 'focus:border-violet-500 focus:ring-violet-500/20' }
};
export const tonoModal = (tono) => TONOS_MODAL[tono] || TONOS_MODAL.neutral;

/** Partes internas del modal. */
export const ENCABEZADO = {
  claro: 'flex items-start justify-between gap-4 border-b border-neutral-200 bg-neutral-100 p-6',
  oscuro: 'flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900 p-6 text-white'
};
export const CAJA_ICONO = 'flex size-11 shrink-0 items-center justify-center rounded-[14px]';
export const TITULO = 'text-[19px] font-semibold leading-[1.2] text-neutral-900';
export const SUBTITULO = 'mt-1 text-[13.5px] leading-[1.45] text-neutral-500';
export const BOTON_CERRAR = 'flex size-8 shrink-0 items-center justify-center rounded-[10px] text-neutral-400 transition-colors duration-150 hover:bg-neutral-200/70 hover:text-neutral-600 disabled:opacity-50';
export const CUERPO = 'min-h-0 flex-1 space-y-5 overflow-y-auto p-6';
export const PIE = 'flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-neutral-200 bg-neutral-100 px-6 py-4';

/** Etiqueta de sección y textos de ayuda. */
export const ETIQUETA_SECCION = 'mb-2 block text-[13px] font-medium text-neutral-500';
export const AYUDA = 'mt-1.5 text-[12.5px] leading-snug text-neutral-500';
export const AYUDA_ERROR = 'mt-1.5 text-[12.5px] leading-snug text-rose-700';

/** Botones del pie. `primario` toma el color del tono del modal; `peligro` es siempre rojo (acción destructiva). */
export const BOTON_BASE = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14.5px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed';
export const BOTONES = {
  secundario: 'bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200 disabled:bg-neutral-200/60 disabled:text-neutral-400',
  primario: 'text-white disabled:!bg-neutral-200 disabled:text-neutral-400',
  peligro: 'bg-rose-700 text-white hover:bg-rose-800 disabled:!bg-neutral-200 disabled:text-neutral-400'
};

/** Campos de texto del modal. */
export const CAMPO = 'w-full rounded-xl border border-neutral-200 bg-neutral-100 px-3.5 text-[15px] text-neutral-900 outline-none transition-colors duration-150 placeholder:text-[#8A8A8A] focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60';
export const CAMPO_ERROR = '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500/20';
export const CAMPO_ALTURA = { texto: 'h-12', area: 'min-h-[110px] resize-none py-3 leading-[1.45]' };
export const BOTON_PASO = 'flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-neutral-200/70 text-neutral-600 transition-colors duration-150 hover:bg-neutral-200 disabled:opacity-40';

/** Control segmentado (pestañas): pista gris y pastilla blanca que se desliza. */
export const PESTANAS = {
  pista: 'relative grid h-11 rounded-[14px] bg-neutral-200/60 p-1',
  pastilla: 'pointer-events-none absolute bottom-1 left-1 top-1 rounded-[10px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-out',
  boton: 'relative z-10 flex items-center justify-center gap-2 rounded-[10px] px-3 text-[13.5px] font-semibold transition-colors duration-150 disabled:cursor-default',
  inactiva: 'text-neutral-500'
};

/** Bloques de contenido. */
export const TARJETA_ITEM = 'flex flex-col gap-2 rounded-[14px] bg-neutral-100 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3';
export const CALLOUT = 'flex items-start gap-3 rounded-[14px] p-3.5 text-[13.5px] leading-[1.45]';
