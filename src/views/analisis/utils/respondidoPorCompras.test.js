import { describe, expect, it } from 'vitest';
import { esRespondidaCompleta } from './respondidoPorCompras';

const it$ = (extra = {}) => ({ desc: 'X', cant: 1, fob: 10, ...extra });

describe('esRespondidaCompleta (reparto de "Respondido por Compras")', () => {
  it('completa: todos los ítems están Cotizado', () => {
    const s = { estado: 'Cotizado', productos: [it$({ estadoItem: 'Cotizado' }), it$({ estadoItem: 'Cotizado' })] };
    expect(esRespondidaCompleta(s)).toBe(true);
  });

  it('parcial: hay un ítem Pendiente', () => {
    const s = { estado: 'Cotizado Parcial', productos: [it$({ estadoItem: 'Cotizado' }), it$({ estadoItem: 'Pendiente' })] };
    expect(esRespondidaCompleta(s)).toBe(false);
  });

  it('un ítem sin estadoItem con precio cuenta como Cotizado: la solicitud es completa aunque el estado guardado sea parcial', () => {
    const s = { estado: 'Cotizado Parcial', productos: [it$({ estadoItem: 'Cotizado' }), it$({ fob: 25 })] };
    expect(esRespondidaCompleta(s)).toBe(true);
  });

  it('un ítem sin estadoItem y sin precio cuenta como Pendiente: parcial', () => {
    const s = { estado: 'Cotizado Parcial', productos: [it$({ estadoItem: 'Cotizado' }), { desc: 'Y', cant: 1 }] };
    expect(esRespondidaCompleta(s)).toBe(false);
  });

  it('un ítem Pendiente con motivo de rechazo suelto es Rechazo: ya no es Pendiente, pero tampoco Cotizado, así que es parcial', () => {
    const s = { estado: 'Cotizado Parcial', productos: [it$({ estadoItem: 'Cotizado' }), it$({ estadoItem: 'Pendiente', motivoRechazo: 'precio' })] };
    expect(esRespondidaCompleta(s)).toBe(false);
  });

  it('un ítem Cotizado con motivo de venta perdida suelto es Venta perdida: parcial', () => {
    const s = { estado: 'Cotizado', productos: [it$({ estadoItem: 'Cotizado' }), it$({ estadoItem: 'Cotizado', motivoVentaPerdida: { motivo: 'Precio' } })] };
    expect(esRespondidaCompleta(s)).toBe(false);
  });

  it('un ítem en Venta perdida, un Rechazo o un ganado vuelven parcial a la solicitud', () => {
    for (const estadoItem of ['Venta Perdida', 'Rechazado', 'Cancelado', 'Pedido', 'Comprado']) {
      const s = { estado: 'Cotizado Parcial', productos: [it$({ estadoItem: 'Cotizado' }), it$({ estadoItem })] };
      expect(esRespondidaCompleta(s), estadoItem).toBe(false);
    }
  });

  it('un ítem Anulado no cuenta: con el resto Cotizado la solicitud es completa', () => {
    const s = { estado: 'Cotizado', productos: [it$({ estadoItem: 'Cotizado' }), it$({ estadoItem: 'Anulado' })] };
    expect(esRespondidaCompleta(s)).toBe(true);
  });

  it('un Anulado más un Pendiente es parcial', () => {
    const s = { estado: 'Cotizado Parcial', productos: [it$({ estadoItem: 'Anulado' }), it$({ estadoItem: 'Pendiente' })] };
    expect(esRespondidaCompleta(s)).toBe(false);
  });

  it('con un ítem ganado y otro Cotizado es parcial (la solicitud ya no está en el conjunto, pero la función no lo decide)', () => {
    const s = { estado: 'Pedido Parcial', productos: [it$({ estadoItem: 'Pedido' }), it$({ estadoItem: 'Cotizado' })] };
    expect(esRespondidaCompleta(s)).toBe(false);
  });

  it('sin ítems o con valores nulos no lanza y da completa', () => {
    expect(esRespondidaCompleta({ estado: 'Cotizado', productos: [] })).toBe(true);
    expect(esRespondidaCompleta({ estado: 'Cotizado' })).toBe(true);
    expect(esRespondidaCompleta(null)).toBe(true);
    expect(esRespondidaCompleta({ estado: 'Cotizado', productos: 'no es una lista' })).toBe(true);
  });
});
