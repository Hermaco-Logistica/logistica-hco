import { describe, expect, it } from 'vitest';
import { PRODUCTO_RELLENO, resumirMovimientosHistorial } from './metricasHistorial';
import { ESTADO_FINAL } from '../../../utils/estadoFinalItem';

/**
 * Cifras de las tarjetas de los Historiales (F8c) a partir de movimientos (una fila por ítem). Cada fila lleva su `estadoFinal`; la
 * solicitud y el ítem originales se usan para la conversión y el `title`.
 */
const solicitud = (id, estado, productos) => ({ id, correlativo: `RFQ-${id}`, estado, cliente: 'C', productos });
const item = (desc, estadoItem, cant = 1) => ({ desc, cant, estadoItem });
const fila = (s, i, estadoFinal, extra = {}) => ({
  idMov: `${s.id}-${i}`, rfqId: s.id, correlativo: s.correlativo, idxProducto: i, solicitudOriginal: s, itemOriginal: s.productos[i], estadoFinal,
  unidades: s.productos[i].cant, valorNeto: s.productos[i].cant * 10, totalConIva: s.productos[i].cant * 11.3, ...extra
});
const G = ESTADO_FINAL.GANADO;
const VP = ESTADO_FINAL.VENTA_PERDIDA;
const CO = ESTADO_FINAL.COTIZADO;

describe('resumirMovimientosHistorial', () => {
  const s1 = solicitud('1', 'Pedido', [item('a', 'Pedido', 5), item('b', 'Pedido', 3)]);
  const s2 = solicitud('2', 'Venta Perdida', [item('c', 'Venta Perdida', 2)]);
  const s3 = solicitud('3', 'Pedido', [item('d', 'Cotizado', 4)]);
  const filas = [fila(s1, 0, G), fila(s1, 1, G), fila(s2, 0, VP), fila(s3, 0, CO)];

  it('conversión por ítems, ganados y cerrados; el abierto no cuenta', () => {
    const r = resumirMovimientosHistorial(filas);
    expect([r.itemsGanados, r.itemsCerrados]).toEqual([2, 3]);
    expect(r.conversion).toBeCloseTo(66.666, 2);
  });

  it('unidades y monto en pedidos: solo las filas con estado final Ganado (el Cotizado de un Pedido no cuenta)', () => {
    const r = resumirMovimientosHistorial(filas);
    expect(r.unidadesEnPedido).toBe(8);
    expect(r.montoPedidosNeto).toBe(80);
    expect(r.montoPedidosConIva).toBeCloseTo(90.4, 5);
  });

  it('el title cuenta las solicitudes con solo las filas dadas: una solicitud con otro ítem perdido es ganada si la fila ganada es la única', () => {
    const s = solicitud('9', 'Pedido Parcial', [item('a', 'Pedido'), item('z', 'Venta Perdida')]);
    expect(resumirMovimientosHistorial([fila(s, 0, G)]).tituloConversion).toBe('Conversión 100 %: 1 ítem ganado de 1 cerrado (1 solicitud ganada + 0 parciales)');
    expect(resumirMovimientosHistorial([fila(s, 0, G), fila(s, 1, VP)]).tituloConversion).toBe('Conversión 50 %: 1 ítem ganado de 2 cerrados (0 solicitudes ganadas + 1 parcial)');
  });

  it('el title cuenta una solicitud una sola vez aunque tenga varias filas, y pluraliza', () => {
    expect(resumirMovimientosHistorial(filas).tituloConversion).toBe('Conversión 66,7 %: 2 ítems ganados de 3 cerrados (1 solicitud ganada + 0 parciales)');
    const dos = [fila(s1, 0, G), fila(s1, 1, G), fila(solicitud('5', 'Pedido', [item('q', 'Pedido')]), 0, G)];
    dos[2] = fila(dos[2].solicitudOriginal, 0, G);
    expect(resumirMovimientosHistorial(dos).tituloConversion).toContain('(2 solicitudes ganadas + 0 parciales)');
  });

  it('sin filas o con filas no válidas: conversión null, ceros y el texto sin conversión', () => {
    [undefined, null, []].forEach((entrada) => {
      const r = resumirMovimientosHistorial(entrada);
      expect([r.conversion, r.itemsGanados, r.itemsCerrados, r.unidadesEnPedido, r.montoPedidosNeto, r.montoPedidosConIva]).toEqual([null, 0, 0, 0, 0, 0]);
      expect(r.tituloConversion).toBe('Sin ítems cerrados: no hay conversión (0 solicitudes ganadas + 0 parciales)');
    });
  });

  it('solo abiertas: conversión null y 0 cerrados', () => {
    const r = resumirMovimientosHistorial([fila(s3, 0, CO)]);
    expect([r.conversion, r.itemsCerrados]).toEqual([null, 0]);
  });

  it('una fila sin identificador de solicitud usa el correlativo o el de la fila: dos filas sin id son dos solicitudes', () => {
    const a = solicitud(undefined, 'Pedido', [item('a', 'Pedido')]);
    const b = solicitud(undefined, 'Pedido', [item('b', 'Pedido')]);
    const f = [fila(a, 0, G, { rfqId: undefined, correlativo: undefined, idMov: 'x-0' }), fila(b, 0, G, { rfqId: undefined, correlativo: undefined, idMov: 'y-0' })];
    expect(resumirMovimientosHistorial(f).tituloConversion).toContain('(2 solicitudes ganadas + 0 parciales)');
  });

  it('la fila de relleno (solicitud sin productos) no cuenta en la conversión, las unidades, el monto ni el title', () => {
    const vacia = solicitud('v', 'Pedido', []);
    const relleno = { idMov: 'v-0', rfqId: 'v', correlativo: 'RFQ-v', idxProducto: 0, solicitudOriginal: vacia, itemOriginal: PRODUCTO_RELLENO, estadoFinal: G, esRelleno: true, unidades: 1, valorNeto: 10, totalConIva: 11.3 };
    const con = resumirMovimientosHistorial([...filas, relleno]);
    const sin = resumirMovimientosHistorial(filas);
    expect(con).toEqual(sin);
    const solo = resumirMovimientosHistorial([relleno]);
    expect([solo.conversion, solo.itemsGanados, solo.itemsCerrados, solo.unidadesEnPedido, solo.montoPedidosNeto]).toEqual([null, 0, 0, 0, 0]);
  });

  it('la fila de relleno es un objeto propio: una fila con el mismo texto pero sin la marca sí cuenta', () => {
    const real = solicitud('r', 'Pedido', [item('Sin productos detallados', 'Pedido')]);
    expect(resumirMovimientosHistorial([fila(real, 0, G)]).itemsGanados).toBe(1);
  });
});
