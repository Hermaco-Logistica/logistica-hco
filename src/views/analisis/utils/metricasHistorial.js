/**
 * Cifras de las tarjetas de los tres Historiales (F8c) a partir de sus movimientos ya filtrados (búsqueda, estado, modalidad, seguimiento,
 * vista de decisión). Cada movimiento es una fila por ítem con `estadoFinal` (de `estadoFinalItem`), `unidades`, `valorNeto`, `totalConIva`,
 * `solicitudOriginal`, `itemOriginal` e `idxProducto`. Las definiciones están en docs/metricas.md.
 *
 *  - Conversión: ganados ÷ cerrados por ítems, con `resumirLineas` (el mismo cálculo que el Directorio de productos). Sin filas o sin ítems
 *    cerrados es `null` y la pantalla muestra un guion.
 *  - Unidades en pedido y monto en pedidos (neto y con IVA): las filas cuyo estado final es Ganado.
 *  - Las filas de relleno (`esRelleno`, una solicitud sin productos) no cuentan en nada de lo anterior.
 *  - `tituloConversion`: el texto del `title` de la tarjeta, con las solicitudes ganadas y parciales de esas filas. Cada solicitud se evalúa
 *    con SOLO los ítems de las filas filtradas (no con los demás ítems que tenga la solicitud).
 */
import { ESTADO_FINAL } from '../../../utils/estadoFinalItem';
import { resumirGanadas } from '../../../utils/resultadoSolicitud';
import { describirConversion, resumirLineas } from './resumenProductos';

/**
 * Línea de relleno que los Historiales de Cliente y de Vendedor ponen para mostrar una solicitud que no tiene productos. Se sigue mostrando
 * en la tabla, pero no es un ítem: no cuenta en la conversión, las unidades ni el monto (el Directorio de productos ignora esas solicitudes).
 * Sus filas llevan `esRelleno: true`.
 */
export const PRODUCTO_RELLENO = { desc: 'Sin productos detallados', cant: 1 };

export function resumirMovimientosHistorial(movimientos) {
  const filas = (Array.isArray(movimientos) ? movimientos : []).filter((m) => !m.esRelleno);
  let unidadesEnPedido = 0;
  let montoPedidosNeto = 0;
  let montoPedidosConIva = 0;
  const solicitudesDeLasFilas = new Map();

  filas.forEach((m) => {
    const clave = m.rfqId || m.correlativo || m.idMov;
    if (clave) {
      if (!solicitudesDeLasFilas.has(clave)) solicitudesDeLasFilas.set(clave, { ...m.solicitudOriginal, productos: [] });
      solicitudesDeLasFilas.get(clave).productos.push(m.itemOriginal);
    }
    if (m.estadoFinal === ESTADO_FINAL.GANADO) {
      unidadesEnPedido += Number(m.unidades || 0);
      montoPedidosNeto += Number(m.valorNeto || 0);
      montoPedidosConIva += Number(m.totalConIva || 0);
    }
  });

  const resumen = resumirLineas(
    filas.map((m, indice) => ({ solicitud: m.solicitudOriginal, item: m.itemOriginal, indiceSolicitud: indice, indiceItem: m.idxProducto })),
    { clave: () => 'historial' }
  )[0];
  const { ganadas, parciales } = resumirGanadas([...solicitudesDeLasFilas.values()]);

  return {
    conversion: resumen?.conversion ?? null,
    itemsGanados: resumen?.ganadas ?? 0,
    itemsCerrados: resumen?.cerrados ?? 0,
    tituloConversion: `${describirConversion(resumen)} (${ganadas} ${ganadas === 1 ? 'solicitud ganada' : 'solicitudes ganadas'} + ${parciales} ${parciales === 1 ? 'parcial' : 'parciales'})`,
    unidadesEnPedido,
    montoPedidosNeto,
    montoPedidosConIva
  };
}
