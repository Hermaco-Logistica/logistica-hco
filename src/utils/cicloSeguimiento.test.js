import { describe, expect, it } from 'vitest';
import { esSolicitudCerrada, obtenerCierreEventoSeguimiento } from './cicloSeguimiento';

const itemAbierto = { estadoItem: 'Cotizado' };
const itemVentaPerdida = { estadoItem: 'Venta Perdida' };

describe('ciclo de seguimiento', () => {
  it.each(['Pedido', 'Comprado', 'Venta Perdida', 'Anulado', 'Rechazado', 'Denegado', 'Cancelado'])(
    'reconoce la solicitud terminal %s',
    (estado) => {
      expect(esSolicitudCerrada({ estado, productos: [itemAbierto] })).toBe(true);
    }
  );

  it('considera cerrada una solicitud si todos sus ítems están cerrados', () => {
    expect(esSolicitudCerrada({ estado: 'Cotizado Parcial', productos: [itemVentaPerdida, { estadoItem: 'Pedido' }] })).toBe(true);
  });

  it('mantiene abierta una solicitud parcialmente resuelta si queda un ítem activo', () => {
    expect(esSolicitudCerrada({ estado: 'Cotizado Parcial', productos: [itemVentaPerdida, itemAbierto] })).toBe(false);
  });

  it('marca sin efecto una prórroga cuyos ítems ya se cerraron, aunque la solicitud siga abierta', () => {
    const solicitud = { estado: 'Cotizado Parcial', productos: [itemVentaPerdida, itemAbierto] };
    const cierre = obtenerCierreEventoSeguimiento(solicitud, { tipo: 'prorroga', prorroga: { indicesItems: [0] } });
    expect(cierre.cerrado).toBe(true);
    expect(cierre.indicesActivos).toEqual([]);
  });

  it('conserva la prórroga activa para los ítems abiertos cuando el cierre es parcial', () => {
    const solicitud = { estado: 'Cotizado Parcial', productos: [itemVentaPerdida, itemAbierto] };
    const cierre = obtenerCierreEventoSeguimiento(solicitud, { tipo: 'prorroga', prorroga: { indicesItems: [0, 1] } });
    expect(cierre.cerrado).toBe(false);
    expect(cierre.indicesActivos).toEqual([1]);
    expect(cierre.indicesCerrados).toEqual([0]);
  });
});
