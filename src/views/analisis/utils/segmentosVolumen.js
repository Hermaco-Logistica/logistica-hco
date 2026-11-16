import { CLAVE_ESTADO } from './resumenProductos';

/**
 * Los estados de la barra de volumen, en un orden fijo que deja a los vecinos con ΔE de 25 o más (normal, deuteranopía y protanopía), con su
 * rótulo y el tono de su relleno. Los tonos son los que el catálogo de etiquetas (ESTADOS_ITEM en utils/etiquetas.js) da a cada estado de ítem.
 * Venta perdida y Rechazo comparten el tono `peligro` en ese catálogo: la barra los distingue por el orden, por un separador blanco de 1 px
 * (BarraApilada) y por el desglose del popover (PopoverBarra), que los muestra por separado.
 */
export const SEGMENTOS_VOLUMEN = [
  { clave: CLAVE_ESTADO.GANADO, tono: 'exito', texto: 'Ganado' },
  { clave: 'pendiente', tono: 'info', texto: 'Pendiente' },
  { clave: 'cotizado', tono: 'aviso', texto: 'Cotizado' },
  { clave: CLAVE_ESTADO.ANULADO, tono: 'apagado', texto: 'Anulado' },
  { clave: CLAVE_ESTADO.VENTA_PERDIDA, tono: 'peligro', texto: 'Venta perdida' },
  { clave: CLAVE_ESTADO.RECHAZO, tono: 'peligro', texto: 'Rechazo' }
];

/** Del resumen de `resumirProductos` a las unidades de los seis estados de la barra (las abiertas, separadas en Cotizado y Pendiente). */
export const volumenPorEstado = (resumen) => ({
  [CLAVE_ESTADO.GANADO]: resumen?.unidades?.[CLAVE_ESTADO.GANADO],
  pendiente: resumen?.unidadesAbiertas?.pendiente,
  cotizado: resumen?.unidadesAbiertas?.cotizado,
  [CLAVE_ESTADO.ANULADO]: resumen?.unidades?.[CLAVE_ESTADO.ANULADO],
  [CLAVE_ESTADO.VENTA_PERDIDA]: resumen?.unidades?.[CLAVE_ESTADO.VENTA_PERDIDA],
  [CLAVE_ESTADO.RECHAZO]: resumen?.unidades?.[CLAVE_ESTADO.RECHAZO]
});

const numero = (valor) => Number(valor) || 0;

/** De las unidades por estado (`volumenPorEstado`) a los segmentos de `BarraApilada` (los seis, también los de valor 0: el popover los lista todos). */
export const segmentosDeVolumen = (unidades) =>
  SEGMENTOS_VOLUMEN.map((s) => ({ ...s, valor: numero(unidades?.[s.clave]) }));
