import { describe, expect, it } from 'vitest';
import { contarOpcionesMoviles } from './opcionesMoviles';

const sinDecisiones = { hayDecisionesEnParcial: false, hayVentaPerdidaEnParcial: false };

describe('contarOpcionesMoviles (opciones del botón flotante de DetalleRFQ)', () => {
  it('una solicitud Pendiente sin decisiones no tiene opciones: el botón flotante no debe mostrarse', () => {
    expect(contarOpcionesMoviles({ estado: 'Pendiente', ...sinDecisiones })).toBe(0);
  });

  it('cualquier estado distinto de Pendiente ofrece al menos exportar la cotización', () => {
    ['Cotizado', 'Cotizado Parcial', 'Pedido', 'Pedido Parcial', 'Anulado', 'Venta Perdida', 'Denegado'].forEach((estado) => {
      expect(contarOpcionesMoviles({ estado, ...sinDecisiones })).toBe(1);
    });
  });

  it('suma la consulta de motivos y la de ventas perdidas cuando existen', () => {
    expect(contarOpcionesMoviles({ estado: 'Cotizado Parcial', hayDecisionesEnParcial: true, hayVentaPerdidaEnParcial: false })).toBe(2);
    expect(contarOpcionesMoviles({ estado: 'Cotizado Parcial', hayDecisionesEnParcial: false, hayVentaPerdidaEnParcial: true })).toBe(2);
    expect(contarOpcionesMoviles({ estado: 'Cotizado Parcial', hayDecisionesEnParcial: true, hayVentaPerdidaEnParcial: true })).toBe(3);
  });

  it('sin estado conserva el comportamiento anterior: cuenta la exportación (solo "Pendiente" la quita)', () => {
    expect(contarOpcionesMoviles({ estado: undefined, ...sinDecisiones })).toBe(1);
  });
});
