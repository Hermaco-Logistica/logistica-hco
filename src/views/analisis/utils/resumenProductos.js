/**
 * Resumen por producto (F8b): el único cálculo de "Veces solicitadas", "Mayor volumen", ganadas, ventas perdidas, rechazos, anulaciones,
 * conversión y "Clientes distintos" que usan el Directorio de productos y la tarjeta "Top Productos" del dashboard, a través de
 * `resumirProductos`. El Historial de producto (F8c) no usa `resumirProductos` sino `resumirLineas`, el mismo cálculo sobre las líneas ya
 * filtradas de su tabla. Las definiciones están en docs/metricas.md (secciones 3 y 4). El estado de cada ítem sale de `estadoFinalItem` (F8a).
 *
 * El llamador filtra las solicitudes o las líneas (período, vendedor, cliente, resultado...) y estas funciones solo agrupan y cuentan.
 *
 * PENDIENTE CONOCIDO: el Directorio aplica el filtro de resultado del dashboard (`analisis_resultado_filter`) y el Historial de producto no lo
 * aplica, y el Historial además tiene sus propios filtros (estado, modalidad, búsqueda, decisión y seguimiento). Con alguno de esos filtros
 * activos, el mismo producto puede dar dos cifras aunque compartan este cálculo. No se resuelve en F8c (docs/metricas.md, sección 10).
 */
import { ESTADO_FINAL, datoARevisarItem, estadoFinalItem } from '../../../utils/estadoFinalItem';
import { normalizarBusqueda } from '../../../utils/normalizers';

/** Claves de los cinco estados finales que reparte la barra de volumen (Cotizado y Pendiente forman "abierto"). */
export const CLAVE_ESTADO = {
  GANADO: 'ganado',
  VENTA_PERDIDA: 'ventaPerdida',
  RECHAZO: 'rechazo',
  ANULADO: 'anulado',
  ABIERTO: 'abierto'
};

/** Orden en que se muestran los cinco estados (la barra y su leyenda). */
export const ORDEN_CLAVES_ESTADO = [CLAVE_ESTADO.GANADO, CLAVE_ESTADO.ABIERTO, CLAVE_ESTADO.ANULADO, CLAVE_ESTADO.VENTA_PERDIDA, CLAVE_ESTADO.RECHAZO];

/** Del estado final de F8a a una de las cinco claves: Cotizado y Pendiente son "abierto". */
export const claveEstadoFinal = (estado) => {
  if (estado === ESTADO_FINAL.GANADO) return CLAVE_ESTADO.GANADO;
  if (estado === ESTADO_FINAL.VENTA_PERDIDA) return CLAVE_ESTADO.VENTA_PERDIDA;
  if (estado === ESTADO_FINAL.RECHAZO) return CLAVE_ESTADO.RECHAZO;
  if (estado === ESTADO_FINAL.ANULADO) return CLAVE_ESTADO.ANULADO;
  return CLAVE_ESTADO.ABIERTO;
};

/** Clave del producto: la descripción sin espacios sobrantes y en mayúsculas (la misma de las pantallas desde antes de F8b). */
export const claveProducto = (item) => String(item?.desc || item?.descripcion || '').trim().toUpperCase();

const hayTexto = (valor) => valor !== undefined && valor !== null && String(valor).trim() !== '';

/**
 * Clave de una solicitud para contarla una sola vez: el `id` y, si falta, el correlativo. Si faltan los dos, su posición en la lista
 * (así dos solicitudes sin identificar no se funden en una). Lleva un prefijo para que un id "5" y un correlativo "5" no choquen.
 */
export const claveSolicitud = (solicitud, indice = 0) => {
  if (hayTexto(solicitud?.id)) return `id:${solicitud.id}`;
  if (hayTexto(solicitud?.correlativo)) return `correlativo:${solicitud.correlativo}`;
  return `posicion:${indice}`;
};

/** Unidades de una línea: `cant` o 1 si falta, como hasta ahora; un valor que no es un número cuenta 0 en lugar de dejar la suma en NaN. */
const unidadesDe = (item) => {
  const n = Number(item?.cant || 1);
  return Number.isFinite(n) ? n : 0;
};

const ceros = () => ({
  [CLAVE_ESTADO.GANADO]: 0,
  [CLAVE_ESTADO.VENTA_PERDIDA]: 0,
  [CLAVE_ESTADO.RECHAZO]: 0,
  [CLAVE_ESTADO.ANULADO]: 0,
  [CLAVE_ESTADO.ABIERTO]: 0
});

/** `desc` guarda la clave del grupo: para los productos es su descripción; para un grupo único del Historial, la que se le dé. */
const nuevoResumen = (desc) => ({
  desc,
  marcas: [],
  volumen: 0,
  unidades: ceros(),
  unidadesAbiertas: { cotizado: 0, pendiente: 0 },
  items: ceros(),
  datosARevisar: { total: 0, porMotivo: {} },
  // Conjuntos de trabajo: se sustituyen por sus conteos al cerrar el resumen.
  _solicitudes: new Set(),
  _clientes: new Set()
});

/** Rellena las cifras derivadas y quita los conjuntos de trabajo. Conserva lo que `porLinea` haya añadido. */
const cerrarResumen = (r) => {
  const { items, unidades } = r;
  r.vecesSolicitadas = r._solicitudes.size;
  r.clientesDistintos = r._clientes.size;
  r.ganadas = items.ganado;
  r.unidadesGanadas = unidades.ganado;
  r.ventasPerdidas = items.ventaPerdida;
  r.rechazos = items.rechazo;
  r.anulaciones = items.anulado;
  r.abiertos = items.abierto;
  r.cerrados = items.ganado + items.ventaPerdida + items.rechazo + items.anulado;
  r.conversion = r.cerrados > 0 ? (items.ganado / r.cerrados) * 100 : null;
  delete r._solicitudes;
  delete r._clientes;
  return r;
};

/**
 * Agrupa líneas (un ítem de una solicitud cada una) por la clave que dé `clave(item, solicitud)`; una clave vacía descarta la línea.
 * Cada línea es `{ solicitud, item, indiceSolicitud, indiceItem }` (los dos índices son opcionales; `indiceSolicitud` solo sirve para
 * identificar una solicitud que no trae `id` ni correlativo). Devuelve un resumen por grupo, sin ordenar y con las cifras descritas en
 * `resumirProductos`, que es esta función con el producto como clave. El Historial de producto la usa con las líneas ya filtradas de su tabla.
 * `porLinea(resumen, solicitud, item, indiceDelItem, estadoFinal)` permite sumar datos propios de una pantalla.
 */
export function resumirLineas(lineas, { clave, porLinea } = {}) {
  const mapa = new Map();
  (Array.isArray(lineas) ? lineas : []).forEach((linea) => {
    const { solicitud, item, indiceSolicitud = 0, indiceItem = 0 } = linea || {};
    const desc = typeof clave === 'function' ? clave(item, solicitud) : '';
    if (!desc) return;
    let r = mapa.get(desc);
    if (!r) { r = nuevoResumen(desc); mapa.set(desc, r); }

    const estado = estadoFinalItem(solicitud, item);
    const claveEstado = claveEstadoFinal(estado);
    const cant = unidadesDe(item);
    r._solicitudes.add(claveSolicitud(solicitud, indiceSolicitud));
    r.volumen += cant;
    r.unidades[claveEstado] += cant;
    if (claveEstado === CLAVE_ESTADO.ABIERTO) r.unidadesAbiertas[estado === ESTADO_FINAL.PENDIENTE ? 'pendiente' : 'cotizado'] += cant;
    r.items[claveEstado] += 1;

    const cliente = normalizarBusqueda(solicitud?.cliente);
    if (cliente) r._clientes.add(cliente);
    const marca = typeof item?.marca === 'string' ? item.marca.trim() : '';
    if (marca && !r.marcas.includes(marca)) r.marcas.push(marca);

    const motivo = datoARevisarItem(solicitud, item);
    if (motivo) {
      r.datosARevisar.total += 1;
      r.datosARevisar.porMotivo[motivo] = (r.datosARevisar.porMotivo[motivo] || 0) + 1;
    }
    if (porLinea) porLinea(r, solicitud, item, indiceItem, estado);
  });
  return [...mapa.values()].map(cerrarResumen);
}

/**
 * Agrupa las líneas de las solicitudes por producto. Devuelve un resumen por producto, sin ordenar:
 *  - `vecesSolicitadas`: solicitudes distintas en las que aparece (cualquier estado, con pendientes y decisiones; un producto repetido
 *    dentro de una solicitud cuenta una vez).
 *  - `volumen`: unidades de todas las líneas en cualquier estado; `unidades[clave]` las reparte por estado final (la barra) y
 *    `unidadesAbiertas` separa las abiertas en Cotizado y Pendiente.
 *  - `items[clave]`, `ganadas`, `unidadesGanadas`, `ventasPerdidas`, `rechazos`, `anulaciones`, `abiertos` y `cerrados`: líneas por estado final.
 *  - `conversion`: ganadas ÷ cerradas × 100 (sin redondear), o `null` si no hay ninguna cerrada.
 *  - `clientesDistintos`: clientes con el nombre normalizado como `normalizarBusqueda`.
 *  - `marcas`: marcas distintas, en orden de aparición.
 *  - `datosARevisar`: líneas que `datoARevisarItem` señala, en total y por motivo (solo se calculan; ninguna pantalla los muestra en F8b).
 * `porLinea(resumen, solicitud, item, indiceDelItem, estadoFinal)` permite sumar datos propios de una pantalla (por ejemplo el seguimiento).
 */
export function resumirProductos(solicitudes, { porLinea } = {}) {
  const lineas = [];
  (Array.isArray(solicitudes) ? solicitudes : []).forEach((solicitud, indiceSolicitud) => {
    if (!solicitud || !Array.isArray(solicitud.productos)) return;
    solicitud.productos.forEach((item, indiceItem) => lineas.push({ solicitud, item, indiceSolicitud, indiceItem }));
  });
  return resumirLineas(lineas, { clave: claveProducto, porLinea });
}

/** Claves de orden que acepta `?orden=` y el selector. "ganadas" es un alias de "pedidos" (así lo manda el dashboard). */
export const CLAVES_ORDEN = ['veces', 'unidades', 'pedidos', 'anulaciones', 'decisiones', 'ventasPerdidas', 'rechazos'];

/** Clave de orden válida a partir de lo que llegue por URL o sesión: "ganadas" pasa a "pedidos" y lo desconocido cae en "veces". */
export const normalizarClaveOrden = (valor) => {
  if (valor === 'ganadas') return 'pedidos';
  return CLAVES_ORDEN.includes(valor) ? valor : 'veces';
};

const porVeces = (a, b) => b.vecesSolicitadas - a.vecesSolicitadas;

/** Comparador para `Array.prototype.sort`: de mayor a menor por la clave, con los mismos desempates de antes. */
export const compararProductos = (clave) => {
  switch (normalizarClaveOrden(clave)) {
    case 'unidades':
      return (a, b) => b.volumen - a.volumen || porVeces(a, b);
    case 'pedidos':
      return (a, b) => b.ganadas - a.ganadas || b.unidadesGanadas - a.unidadesGanadas || porVeces(a, b);
    case 'anulaciones':
      return (a, b) => b.anulaciones - a.anulaciones || porVeces(a, b);
    case 'ventasPerdidas':
      return (a, b) => b.ventasPerdidas - a.ventasPerdidas || porVeces(a, b);
    case 'rechazos':
      return (a, b) => b.rechazos - a.rechazos || porVeces(a, b);
    case 'decisiones':
      return (a, b) => (b.ventasPerdidas + b.rechazos + b.anulaciones) - (a.ventasPerdidas + a.rechazos + a.anulaciones) || porVeces(a, b);
    default:
      return (a, b) => porVeces(a, b) || b.volumen - a.volumen;
  }
};

/** Conversión para mostrar en una celda: "—" si el producto no tiene ítems cerrados y, si no, el porcentaje redondeado ("24%"). */
export const formatearConversion = (conversion) => (conversion === null || conversion === undefined ? '—' : `${Math.round(conversion)}%`);

const decimalEs = (n) => String(Math.round(n * 10) / 10).replace('.', ',');

/** Texto largo de la conversión (para un `title`): "Conversión 23,8 %: 10 ítems ganados de 42 cerrados". Sin cerrados no hay porcentaje. */
export const describirConversion = (resumen) => {
  const { ganadas = 0, cerrados = 0, conversion = null } = resumen || {};
  if (conversion === null || conversion === undefined || cerrados <= 0) return 'Sin ítems cerrados: no hay conversión';
  return `Conversión ${decimalEs(conversion)} %: ${ganadas} ${ganadas === 1 ? 'ítem ganado' : 'ítems ganados'} de ${cerrados} ${cerrados === 1 ? 'cerrado' : 'cerrados'}`;
};
