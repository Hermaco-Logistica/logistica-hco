import { describe, expect, it } from 'vitest';
import { clasificarSolicitud, RESULTADOS_SOLICITUD as R } from './clasificarSolicitud';
import { PED_0020, PED_0030 } from './casosMetricas.fixtures';

/**
 * `clasificarSolicitud` adopta la regla de pedido confirmado de `estadoFinalItem` (F8c, commit 8): un ítem "Pedido" con negociación y sin
 * `pedidoGenerado === true` no cuenta como pedido; cuenta como Cotizado si tiene precio y como Pendiente si no. La clasificación es la que usan
 * las filas del dashboard, las pestañas por estado y el indicador "Según ítems".
 */
const neg = (extra = {}) => ({ turno: null, resultado: 'acordado', version: 1, ...extra });
const pedido = (extra = {}) => ({ desc: 'bomba', cant: 1, fob: 10, estadoItem: 'Pedido', ...extra });
const sinConfirmar = (extra = {}) => pedido({ negociacion: neg({ sinNotificar: true }), ...extra });
const confirmado = (extra = {}) => pedido({ negociacion: neg(), pedidoGenerado: true, ...extra });
const otro = (estadoItem, extra = {}) => ({ desc: 'tubo', cant: 1, fob: 10, estadoItem, ...extra });
const estado = (productos, guardado = 'Pendiente') => clasificarSolicitud(productos, guardado);

describe('clasificarSolicitud: pedidos sin confirmar', () => {
  it('todos los ítems Pedido sin confirmar y con precio: la solicitud es Cotizado y no Pedido (PED-0020)', () => {
    const r = estado([sinConfirmar(), sinConfirmar()]);
    expect([r.estado, r.resultado]).toEqual(['Cotizado', R.COMPLETO]);
    expect(r.conteoItems).toMatchObject({ total: 2, activos: 2, pedidos: 0, cotizados: 2, pendientes: 0 });
  });

  it('sin precio los ítems cuentan como Pendiente', () => {
    const r = estado([sinConfirmar({ fob: 0 }), sinConfirmar({ fob: 0 })]);
    expect([r.estado, r.conteoItems.pendientes, r.conteoItems.pedidos]).toEqual(['Pendiente', 2, 0]);
  });

  it('con pedidoGenerado true siguen siendo pedidos: la solicitud es Pedido', () => {
    const r = estado([confirmado(), confirmado()]);
    expect([r.estado, r.resultado, r.conteoItems.pedidos]).toEqual(['Pedido', R.COMPLETO, 2]);
  });

  it('con pedidoGenerado false o ausente, y con turno compras o vendedor, no es pedido; con pedidoGenerado true y cualquier turno sí', () => {
    [false, undefined].forEach((pedidoGenerado) => {
      ['compras', 'vendedor', null].forEach((turno) => {
        expect(estado([pedido({ negociacion: neg({ turno }), pedidoGenerado })]).estado).toBe('Cotizado');
      });
    });
    ['compras', 'vendedor', null].forEach((turno) => {
      expect(estado([pedido({ negociacion: neg({ turno }), pedidoGenerado: true })]).estado).toBe('Pedido');
    });
  });

  it('uno confirmado y otro sin confirmar: Pedido Parcial; uno sin confirmar y otro Cotizado: Cotizado; con otro Pendiente: Cotizado Parcial', () => {
    expect(estado([confirmado(), sinConfirmar()]).estado).toBe('Pedido Parcial');
    expect(estado([sinConfirmar(), otro('Cotizado')]).estado).toBe('Cotizado');
    expect(estado([sinConfirmar(), otro('Pendiente', { fob: 0 })]).estado).toBe('Cotizado Parcial');
    expect(estado([sinConfirmar(), otro('Pendiente', { fob: 0 })]).resultado).toBe(R.PARCIAL);
  });

  it('un pedido sin confirmar con otro ítem anulado conserva las anulaciones', () => {
    const r = estado([sinConfirmar(), otro('Anulado')]);
    expect([r.estado, r.resultado, r.tieneAnulaciones]).toEqual(['Cotizado', R.COTIZACION_COMPLETA_CON_ANULACIONES, true]);
  });
});

describe('clasificarSolicitud: lo que no cambia', () => {
  it('sin negociación (RFQ y documentos viejos) el ítem Pedido sigue siendo pedido, con o sin pedidoGenerado', () => {
    expect(estado([pedido(), pedido()]).estado).toBe('Pedido');
    expect(estado([pedido({ pedidoGenerado: false })]).estado).toBe('Pedido');
    expect(estado([pedido({ negociacion: null })]).estado).toBe('Pedido');
  });

  it('"Comprado" sigue siendo pedido aunque tenga negociación y no tenga pedidoGenerado', () => {
    expect(estado([pedido({ estadoItem: 'Comprado', negociacion: neg() })]).estado).toBe('Pedido');
  });

  it('un Pedido Parcial a nivel de ítem sigue como estaba (no era pedido para esta función): no cambia con la regla', () => {
    const conNegociacion = estado([pedido({ estadoItem: 'Pedido Parcial', negociacion: neg() })]);
    const sinNegociacion = estado([pedido({ estadoItem: 'Pedido Parcial' })]);
    expect(conNegociacion.estado).toBe(sinNegociacion.estado);
    expect(conNegociacion.conteoItems.pedidos).toBe(0);
  });

  it('la rama de la solicitud Venta Perdida no cambia', () => {
    const r = estado([sinConfirmar(), otro('Venta Perdida')], 'Venta Perdida');
    expect([r.estado, r.conteoItems.pedidos, r.conteoItems.denegados]).toEqual(['Venta Perdida', 0, 2]);
  });

  it('sin ítems o con una lista que no es lista conserva el estado guardado', () => {
    expect(clasificarSolicitud([], 'Pedido').estado).toBe('Pedido');
    expect(clasificarSolicitud(undefined, 'Cotizado').estado).toBe('Cotizado');
    expect(clasificarSolicitud(null, 'Pendiente').estado).toBe('Pendiente');
  });

  it('PED-0030: el ítem acordado con pedidoGenerado sigue contando; PED-0020 son dos Cotizado', () => {
    expect(estado(PED_0030.productos, PED_0030.estado).conteoItems.pedidos).toBe(1);
    const r = estado(PED_0020.productos, PED_0020.estado);
    expect([r.estado, r.conteoItems.cotizados, r.conteoItems.pedidos]).toEqual(['Cotizado', 2, 0]);
  });

  it('no modifica los ítems que recibe', () => {
    const productos = [sinConfirmar(), confirmado()];
    const copia = JSON.parse(JSON.stringify(productos));
    estado(productos);
    expect(JSON.parse(JSON.stringify(productos))).toEqual(copia);
    expect(productos[0].estadoItem).toBe('Pedido');
  });
});
