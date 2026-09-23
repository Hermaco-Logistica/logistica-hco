import { describe, it, expect } from 'vitest';
import { itemPedidoConfirmado } from './itemHelpers';

describe('itemPedidoConfirmado', () => {
  it('falso si el item es nulo', () => {
    expect(itemPedidoConfirmado(null)).toBe(false);
    expect(itemPedidoConfirmado(undefined)).toBe(false);
  });

  it('falso si no es Pedido ni Comprado', () => {
    expect(itemPedidoConfirmado({ estadoItem: 'Cotizado' })).toBe(false);
    expect(itemPedidoConfirmado({ estadoItem: 'Pendiente' })).toBe(false);
    expect(itemPedidoConfirmado({ estadoItem: 'Denegado' })).toBe(false);
  });

  it('verdadero si es legado (sin negociacion) y estado Pedido/Comprado', () => {
    expect(itemPedidoConfirmado({ estadoItem: 'Pedido' })).toBe(true);
    expect(itemPedidoConfirmado({ estadoItem: 'Comprado' })).toBe(true);
  });

  it('falso si tiene negociacion pero no tiene pedidoGenerado en true', () => {
    expect(itemPedidoConfirmado({ estadoItem: 'Pedido', negociacion: { version: 1 } })).toBe(false);
    expect(itemPedidoConfirmado({ estadoItem: 'Pedido', negociacion: { version: 1 }, pedidoGenerado: false })).toBe(false);
  });

  it('verdadero si tiene negociacion y pedidoGenerado es true', () => {
    expect(itemPedidoConfirmado({ estadoItem: 'Pedido', negociacion: { version: 1 }, pedidoGenerado: true })).toBe(true);
    expect(itemPedidoConfirmado({ estadoItem: 'Comprado', negociacion: { version: 1 }, pedidoGenerado: true })).toBe(true);
  });
});
