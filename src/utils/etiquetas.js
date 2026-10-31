import {
  AlarmClock,
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Hourglass,
  MinusCircle,
  Package,
  PieChart,
  Plane,
  ShieldCheck,
  Ship,
  TrendingDown,
  Truck,
  XCircle
} from 'lucide-react';

/**
 * ÚNICA fuente de estilo, texto e ícono de las etiquetas (badges, chips) del proyecto.
 *
 * Estilo: chips planos (sin borde ni sombra), fondo pastel, texto e ícono en un tono oscuro de la misma
 * familia, texto con solo la primera letra en mayúscula e ícono outline.
 *
 * - Para cambiar cómo se ve una etiqueta: edita TONOS (color) o TAMANOS (medidas).
 * - Para cambiar el texto, color o ícono de un estado concreto: edita su catálogo (CATALOGOS y tablas de abajo).
 * - Para pintarlas: usa <Etiqueta /> (src/components/Etiqueta.jsx). Ningún otro archivo debe
 *   definir clases de color/redondeo para etiquetas; ESLint lo impide (ver eslint.config.js).
 */

/** Paleta semántica: fondo pastel + texto oscuro de la misma familia. Sin borde. */
export const TONOS = {
  neutral: 'bg-slate-100 text-slate-600',
  suave: 'bg-slate-50 text-slate-500',
  apagado: 'bg-slate-100 text-slate-500',
  oscuro: 'bg-slate-800 text-slate-300',
  exito: 'bg-emerald-100 text-emerald-800',
  info: 'bg-sky-100 text-sky-700',
  azul: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  aviso: 'bg-amber-100 text-amber-800',
  peligro: 'bg-rose-100 text-rose-700',
  naranja: 'bg-orange-100 text-orange-700',
  violeta: 'bg-violet-100 text-violet-700',
  morado: 'bg-purple-100 text-purple-700',
  turquesa: 'bg-teal-100 text-teal-800',
  amarillo: 'bg-yellow-100 text-yellow-800'
};

/** Solo el color de texto de cada tono (para valores que acompañan a una etiqueta pero no son una etiqueta). */
export const TEXTO_TONO = {
  neutral: 'text-slate-700',
  suave: 'text-slate-600',
  apagado: 'text-slate-500',
  oscuro: 'text-slate-300',
  exito: 'text-emerald-700',
  info: 'text-sky-700',
  azul: 'text-blue-700',
  indigo: 'text-indigo-800',
  aviso: 'text-amber-700',
  peligro: 'text-rose-600',
  naranja: 'text-orange-700',
  violeta: 'text-violet-700',
  morado: 'text-purple-700',
  turquesa: 'text-teal-700',
  amarillo: 'text-yellow-800'
};

/**
 * Mismos tonos en hexadecimal para los correos (el correo no admite clases de Tailwind).
 * Debe mantenerse alineado con TONOS: fondo pastel y texto oscuro de la misma familia.
 */
export const PALETA_CORREO = {
  neutral: { fondo: '#f1f5f9', texto: '#475569' },
  suave: { fondo: '#f8fafc', texto: '#64748b' },
  apagado: { fondo: '#f1f5f9', texto: '#64748b' },
  oscuro: { fondo: '#1e293b', texto: '#cbd5e1' },
  exito: { fondo: '#d1fae5', texto: '#065f46' },
  info: { fondo: '#e0f2fe', texto: '#0369a1' },
  azul: { fondo: '#dbeafe', texto: '#1d4ed8' },
  indigo: { fondo: '#e0e7ff', texto: '#4338ca' },
  aviso: { fondo: '#fef3c7', texto: '#92400e' },
  peligro: { fondo: '#ffe4e6', texto: '#be123c' },
  naranja: { fondo: '#ffedd5', texto: '#c2410c' },
  violeta: { fondo: '#ede9fe', texto: '#6d28d9' },
  morado: { fondo: '#f3e8ff', texto: '#7e22ce' },
  turquesa: { fondo: '#ccfbf1', texto: '#115e59' },
  amarillo: { fondo: '#fef9c3', texto: '#854d0e' }
};

/**
 * Tres densidades con el mismo lenguaje visual:
 * compacta (celdas de tabla), normal (tarjetas y listas), grande (cabeceras de detalle).
 * `icono` es el tamaño en px del ícono dentro de la etiqueta.
 */
export const TAMANOS = {
  compacta: { clases: 'h-6 gap-1 px-2 text-[11px] rounded-lg', icono: 12 },
  normal: { clases: 'h-8 gap-1.5 px-3 text-[13px] rounded-xl', icono: 16 },
  grande: { clases: 'h-11 gap-2 px-3.5 text-base rounded-xl', icono: 20 }
};

const BASE = 'inline-flex items-center font-medium whitespace-nowrap';

/** Clases finales de una etiqueta. Todo componente que necesite el aspecto de una etiqueta debe pasar por aquí. */
export function clasesEtiqueta({ tono = 'neutral', tamano = 'compacta', mono = false } = {}) {
  return [
    BASE,
    TONOS[tono] || TONOS.neutral,
    (TAMANOS[tamano] || TAMANOS.compacta).clases,
    mono ? 'font-mono' : ''
  ].filter(Boolean).join(' ');
}

export const tamanoIcono = (tamano) => (TAMANOS[tamano] || TAMANOS.compacta).icono;

export const textoDeTono = (tono) => TEXTO_TONO[tono] || TEXTO_TONO.neutral;

/** Color de texto de un rol (comprador azul, vendedor morado, gerente verde, administrador rojo). */
export const textoDeRol = (rol) => textoDeTono(TONO_POR_ROL[rol] || TONO_POR_ROL.default);

/* ───────────────────────── Catálogos ───────────────────────── */

/** Tono del estado "cotizado" según el rol que mira la pantalla (se conserva la identidad visual de cada rol). */
const TONO_COTIZADO_POR_ROL = {
  comprador: 'azul',
  vendedor: 'morado',
  gerente: 'turquesa',
  administrador: 'peligro',
  default: 'neutral'
};

/** Tono de la etiqueta que identifica a un rol (cabeceras de módulo). */
export const TONO_POR_ROL = {
  comprador: 'azul',
  vendedor: 'morado',
  gerente: 'exito',
  administrador: 'peligro',
  default: 'neutral'
};

const ESTADOS_SOLICITUD = {
  Pendiente: { tono: 'peligro', icono: Clock },
  Cotizado: { tono: 'exito', icono: FileText },
  'Cotizado Parcial': { tono: 'azul', icono: PieChart },
  Parcial: { tono: 'azul', icono: PieChart },
  'Pedido Parcial': { tono: 'info', icono: PieChart },
  Pedido: { tono: 'indigo', icono: CheckCircle2 },
  Comprado: { tono: 'exito', icono: CheckCircle2 },
  'Venta Perdida': { tono: 'peligro', icono: XCircle }
};

const ESTADOS_ITEM = {
  Pedido: { tono: 'exito', icono: CheckCircle2 },
  Comprado: { tono: 'exito', icono: CheckCircle2 },
  Cotizado: { tono: 'aviso', icono: FileText },
  Pendiente: { tono: 'info', icono: Clock },
  Denegado: { tono: 'peligro', icono: XCircle },
  Cancelado: { tono: 'peligro', icono: XCircle },
  Rechazado: { tono: 'peligro', icono: XCircle },
  'Venta Perdida': { tono: 'peligro', icono: XCircle },
  Anulado: { tono: 'apagado', icono: Ban }
};

/** Resultado comercial (Ganada, Ganado parcial...). Lo calcula evaluarEstadoGanada en views/analisis/theme.js. */
const RESULTADOS = {
  ganada: { texto: 'Ganada', tono: 'exito', icono: CheckCircle2 },
  ganado_parcial: { texto: 'Ganado parcial', tono: 'info', icono: PieChart },
  no_comprado: { texto: 'No comprado', tono: 'apagado', icono: MinusCircle },
  cotizada: { texto: 'Cotizada', tono: 'azul', icono: FileText },
  anulada: { texto: 'Anulada', tono: 'peligro', icono: Ban },
  pendiente: { texto: 'Pendiente', tono: 'aviso', icono: Clock }
};

/** Decisiones que cierran un ítem sin pedido (claves = tipoDecision de los ítems). */
const DECISIONES = {
  anulacion: { texto: 'Anulado', tono: 'apagado', icono: Ban },
  denegacion: { texto: 'Denegado', tono: 'aviso', icono: XCircle },
  rechazo: { texto: 'Rechazo', tono: 'peligro', icono: XCircle },
  venta_perdida: { texto: 'Venta perdida', tono: 'peligro', icono: TrendingDown }
};

/** Fases del seguimiento de cliente (revisión / prórroga), derivadas en utils/faseSeguimiento.js. */
export const ETIQUETAS_FASE_SEGUIMIENTO = {
  cierre_requerido: { texto: 'Cierre requerido', titulo: 'Agotó revisiones y prórroga: debe cerrarse como pedido o venta perdida.', tono: 'peligro', icono: AlertTriangle },
  vencida: { texto: 'Vencida', titulo: 'Venció y aún no tiene revisión ni prórroga.', tono: 'peligro', icono: AlarmClock },
  prorroga_pendiente: { texto: 'Prórroga pendiente', titulo: 'Compras aún no responde la prórroga solicitada.', tono: 'info', icono: Hourglass },
  en_prorroga: { texto: 'En prórroga', titulo: 'Tiene una prórroga aprobada vigente.', tono: 'violeta', icono: CalendarClock },
  en_revision: { texto: 'En revisión', titulo: 'Revisión activa con el cliente.', tono: 'aviso', icono: Eye }
};

/** Estado de vigencia de un ítem dentro de la sección "Condiciones". */
const VIGENCIA_ITEM = {
  prorroga_pendiente: { texto: 'Prórroga pendiente', titulo: 'Compras aún no responde la prórroga solicitada.', tono: 'info', icono: Hourglass },
  sin_extensiones: { texto: 'Sin extensiones', titulo: 'Agotó revisiones y prórroga. Ciérralo como pedido o venta perdida.', tono: 'peligro', icono: AlertTriangle },
  solo_prorroga: { texto: 'Solo prórroga', titulo: 'Ya usó todas sus revisiones. Solo puede pedir prórroga formal.', tono: 'aviso', icono: CalendarClock },
  vencido: { texto: 'Vencido', titulo: 'Puede mantenerse en revisión o pedir prórroga.', tono: 'peligro', icono: AlarmClock },
  por_vencer: { texto: 'Por vencer', titulo: 'Vence en 2 días hábiles o menos.', tono: 'aviso', icono: Clock },
  en_revision: { texto: 'En revisión', titulo: 'Revisión activa con el cliente.', tono: 'info', icono: Eye }
};

/** Ritmo de respuesta / cierre (ver formatearTiempoRespuesta y formatearTiempoCierre). */
const RITMO_TIEMPO = {
  inmediato: { tono: 'exito' },
  rapido: { tono: 'azul' },
  agil: { tono: 'exito' },
  normal: { tono: 'neutral' }
};

const MODALIDADES = {
  Aéreo: { texto: 'Aéreo', tono: 'exito', icono: Plane },
  Marítimo: { texto: 'Marítimo', tono: 'azul', icono: Ship }
};

const EVENTOS_HILO = {
  aceptacion: { tono: 'exito' },
  rechazo: { tono: 'peligro' },
  evento: { tono: 'suave' }
};

export const CATALOGOS = {
  faseSeguimiento: ETIQUETAS_FASE_SEGUIMIENTO,
  vigenciaItem: VIGENCIA_ITEM,
  resultado: RESULTADOS,
  decision: DECISIONES,
  ritmo: RITMO_TIEMPO,
  modalidad: MODALIDADES,
  eventoHilo: EVENTOS_HILO
};

/** Estado de una orden de compra en logística (acepta textos libres: "Recibido", "Entregado", "En tránsito"...). */
function resolverEstadoOC(estado) {
  const texto = String(estado || '').toLowerCase();
  if (texto.includes('recibid') || texto.includes('entregad') || texto.includes('delivered')) return { tono: 'exito', icono: CheckCircle2 };
  if (texto.includes('aduana')) return { tono: 'aviso', icono: ShieldCheck };
  if (texto.includes('transito') || texto.includes('tránsito')) return { tono: 'azul', icono: Truck };
  return { tono: 'neutral', icono: Package };
}

/**
 * Resuelve texto, tono, título e ícono de una etiqueta de dominio.
 * Dominios con tabla simple (valor → estilo): estadoSolicitud, estadoItem, rol, estadoOC y rendimiento (porcentaje).
 * Dominios con catálogo (valor → { texto, tono, titulo, icono }): ver CATALOGOS.
 */
export function resolverEtiqueta(dominio, valor, { rol } = {}) {
  if (dominio === 'estadoSolicitud') {
    const entrada = ESTADOS_SOLICITUD[valor] || {};
    let tono = entrada.tono;
    if (rol) {
      if (valor === 'Pendiente') tono = 'aviso';
      else if (valor === 'Cotizado' || valor === 'Cotizado Parcial' || valor === 'Parcial') tono = TONO_COTIZADO_POR_ROL[rol] || TONO_COTIZADO_POR_ROL.default;
      else if (valor === 'Pedido' || valor === 'Pedido Parcial' || valor === 'Comprado') tono = 'exito';
    }
    return { texto: valor, tono: tono || 'neutral', icono: entrada.icono };
  }
  if (dominio === 'estadoItem') {
    const entrada = ESTADOS_ITEM[valor] || {};
    return { texto: valor, tono: entrada.tono || 'neutral', icono: entrada.icono };
  }
  if (dominio === 'rol') return { texto: valor, tono: TONO_POR_ROL[valor] || TONO_POR_ROL.default };
  if (dominio === 'estadoOC') return { texto: valor, ...resolverEstadoOC(valor) };
  if (dominio === 'rendimiento') return { texto: `${valor}%`, tono: Number(valor) > 50 ? 'exito' : Number(valor) > 0 ? 'azul' : 'suave' };

  const entrada = CATALOGOS[dominio]?.[valor];
  return entrada
    ? { texto: entrada.texto, tono: entrada.tono, titulo: entrada.titulo, icono: entrada.icono }
    : { texto: valor, tono: 'neutral' };
}

/** Tono de una entrada de catálogo (para componentes que necesitan el color sin pintar una etiqueta completa). */
export const tonoDe = (dominio, clave) => CATALOGOS[dominio]?.[clave]?.tono || 'neutral';

/**
 * Escala de urgencia por días transcurridos (de neutro a rojo intenso). Devuelve clases de etiqueta,
 * por eso vive aquí; utils/cotizacionesEstancadasHelpers la reexporta como obtenerEscalaRojoTiempo.
 */
export function claseEscalaUrgencia(dias, limite = 5) {
  const umbral = Math.max(1, Number(limite) || 5);
  if (dias < umbral) return 'bg-slate-100 text-slate-700';
  if (dias === umbral) return 'bg-rose-50 text-rose-700';
  if (dias <= umbral + 2) return 'bg-rose-100 text-rose-800 font-bold';
  if (dias <= umbral + 4) return 'bg-rose-200 text-rose-900 font-bold';
  return 'bg-rose-600 text-white font-bold';
}
