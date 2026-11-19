import { describe, expect, it } from 'vitest';
import { DATO_A_REVISAR, ESTADO_FINAL as E, datoARevisarItem, estadoDePedidoSinConfirmar, estadoFinalItem, pedidoSinConfirmar } from './estadoFinalItem';
import { clasificarSolicitud } from './clasificarSolicitud';
import { resultadoSolicitud } from './resultadoSolicitud';
import { PED_0020, PED_0030 } from './casosMetricas.fixtures';

/**
 * Regla de pedido confirmado (F8c, commit 8): un ítem Pedido o Pedido Parcial CON negociación es Ganado solo si `pedidoGenerado === true`;
 * sin negociación (RFQ y documentos viejos) sigue siendo Ganado; "Comprado" no cambia; el turno de la negociación no se mira. Si es abierto,
 * Cotizado con precio y Pendiente sin precio. Es la misma definición que `itemPedidoConfirmado` (utils/itemHelpers.js).
 */
const neg = (extra = {}) => ({ turno: null, resultado: 'acordado', version: 1, ...extra });
const item = (estadoItem, extra = {}) => ({ desc: 'bomba', cant: 1, fob: 10, estadoItem, ...extra });
const sol = (estado = 'Pedido') => ({ estado });

describe('estadoFinalItem: ítem Pedido con y sin negociación', () => {
  it.each([
    ['sin negociación (RFQ, documento viejo)', {}, E.GANADO],
    ['con negociación y pedidoGenerado true', { negociacion: neg(), pedidoGenerado: true }, E.GANADO],
    ['con negociación y pedidoGenerado false', { negociacion: neg(), pedidoGenerado: false }, E.COTIZADO],
    ['con negociación y pedidoGenerado ausente', { negociacion: neg() }, E.COTIZADO],
    ['sin negociación aunque pedidoGenerado sea false', { pedidoGenerado: false }, E.GANADO],
    ['con negociación vacía ({}), que es "con negociación"', { negociacion: {} }, E.COTIZADO],
    ['con negociación y pedidoGenerado que no es el booleano true ("true")', { negociacion: neg(), pedidoGenerado: 'true' }, E.COTIZADO],
    ['con negociación y pedidoGenerado 1', { negociacion: neg(), pedidoGenerado: 1 }, E.COTIZADO],
    ['negociación null (documento viejo)', { negociacion: null }, E.GANADO]
  ])('Pedido %s → %s', (_nombre, extra, esperado) => {
    expect(estadoFinalItem(sol(), item('Pedido', extra))).toBe(esperado);
  });

  it('el turno no cambia el resultado: con pedido generado, turno compras o vendedor siguen siendo Ganado; sin él, abierto con cualquier turno', () => {
    ['compras', 'vendedor', null].forEach((turno) => {
      expect(estadoFinalItem(sol(), item('Pedido', { negociacion: neg({ turno }), pedidoGenerado: true }))).toBe(E.GANADO);
      expect(estadoFinalItem(sol(), item('Pedido', { negociacion: neg({ turno }) }))).toBe(E.COTIZADO);
    });
  });

  it('sinNotificar no cambia el resultado si hay pedido generado; sin pedido generado es abierto con o sin la bandera', () => {
    expect(estadoFinalItem(sol(), item('Pedido', { negociacion: neg({ sinNotificar: true }), pedidoGenerado: true }))).toBe(E.GANADO);
    expect(estadoFinalItem(sol(), item('Pedido', { negociacion: neg({ sinNotificar: true }) }))).toBe(E.COTIZADO);
    expect(estadoFinalItem(sol(), item('Pedido', { negociacion: neg({ sinNotificar: false }) }))).toBe(E.COTIZADO);
  });

  it('un pedido sin confirmar es Cotizado con precio (fob o precioUnitario) y Pendiente sin precio', () => {
    const conNegociacion = { negociacion: neg() };
    expect(estadoFinalItem(sol(), item('Pedido', { ...conNegociacion, fob: 5 }))).toBe(E.COTIZADO);
    expect(estadoFinalItem(sol(), item('Pedido', { ...conNegociacion, fob: 0, precioUnitario: 7 }))).toBe(E.COTIZADO);
    expect(estadoFinalItem(sol(), item('Pedido', { ...conNegociacion, fob: 0 }))).toBe(E.PENDIENTE);
    expect(estadoFinalItem(sol(), { estadoItem: 'Pedido', negociacion: neg() })).toBe(E.PENDIENTE);
  });

  it('la solicitud no influye: el mismo ítem sin confirmar es abierto en una solicitud Pedido, Pendiente o Cotizado Parcial', () => {
    ['Pedido', 'Pendiente', 'Cotizado Parcial', 'Pedido Parcial', 'Comprado'].forEach((estado) => {
      expect(estadoFinalItem(sol(estado), item('Pedido', { negociacion: neg() }))).toBe(E.COTIZADO);
    });
  });

  it('un motivo suelto en un pedido sin confirmar no lo cierra: sigue abierto (la regla 1 manda sobre los motivos)', () => {
    expect(estadoFinalItem(sol(), item('Pedido', { negociacion: neg(), motivoRechazo: 'x' }))).toBe(E.COTIZADO);
    expect(estadoFinalItem(sol(), item('Pedido', { negociacion: neg(), pedidoGenerado: true, motivoRechazo: 'x' }))).toBe(E.GANADO);
  });
});

describe('estadoFinalItem: Comprado y Pedido Parcial a nivel de ítem', () => {
  it('"Comprado" no cambia: con negociación y sin pedido generado sigue siendo Ganado', () => {
    expect(estadoFinalItem(sol(), item('Comprado', { negociacion: neg() }))).toBe(E.GANADO);
    expect(estadoFinalItem(sol(), item('Comprado', { negociacion: neg({ turno: 'vendedor' }), pedidoGenerado: false }))).toBe(E.GANADO);
    expect(estadoFinalItem(sol(), item('Comprado'))).toBe(E.GANADO);
  });

  it.each([
    ['sin negociación', {}, E.GANADO],
    ['con negociación y pedido generado', { negociacion: neg(), pedidoGenerado: true }, E.GANADO],
    ['con negociación sin pedido generado', { negociacion: neg() }, E.COTIZADO],
    ['con negociación, sin pedido generado y sin precio', { negociacion: neg(), fob: 0 }, E.PENDIENTE]
  ])('"Pedido Parcial" a nivel de ítem %s → %s', (_nombre, extra, esperado) => {
    expect(estadoFinalItem(sol(), item('Pedido Parcial', extra))).toBe(esperado);
  });

  it('"Pedido Parcial" con un motivo de venta perdida propio sigue siendo venta perdida (las reglas 2 a 4 van antes)', () => {
    expect(estadoFinalItem(sol(), item('Pedido Parcial', { negociacion: neg(), motivoVentaPerdida: { motivo: 'x' } }))).toBe(E.VENTA_PERDIDA);
  });
});

describe('pedidoSinConfirmar y estadoDePedidoSinConfirmar', () => {
  it('solo Pedido y Pedido Parcial con negociación y sin pedidoGenerado === true', () => {
    expect(pedidoSinConfirmar(item('Pedido', { negociacion: neg() }))).toBe(true);
    expect(pedidoSinConfirmar(item('Pedido Parcial', { negociacion: neg() }))).toBe(true);
    expect(pedidoSinConfirmar(item('Pedido', { negociacion: neg(), pedidoGenerado: true }))).toBe(false);
    expect(pedidoSinConfirmar(item('Pedido'))).toBe(false);
    expect(pedidoSinConfirmar(item('Comprado', { negociacion: neg() }))).toBe(false);
    ['Cotizado', 'Pendiente', 'Anulado', 'Venta Perdida', 'Cancelado', undefined].forEach((e) => expect(pedidoSinConfirmar(item(e, { negociacion: neg() }))).toBe(false));
  });

  it('un ítem nulo o vacío no es un pedido sin confirmar y no rompe', () => {
    expect(pedidoSinConfirmar(null)).toBe(false);
    expect(pedidoSinConfirmar(undefined)).toBe(false);
    expect(pedidoSinConfirmar({})).toBe(false);
    expect(estadoDePedidoSinConfirmar(undefined)).toBe(E.PENDIENTE);
    expect(estadoDePedidoSinConfirmar(null)).toBe(E.PENDIENTE);
  });

  it('el estado de un pedido sin confirmar sale del precio', () => {
    expect(estadoDePedidoSinConfirmar({ fob: 3 })).toBe(E.COTIZADO);
    expect(estadoDePedidoSinConfirmar({ precioUnitario: 3 })).toBe(E.COTIZADO);
    expect(estadoDePedidoSinConfirmar({ fob: 0, precioUnitario: 0 })).toBe(E.PENDIENTE);
  });
});

describe('datoARevisarItem: pedido sin confirmar y pedido con negociación abierta', () => {
  it('"pedido sin confirmar": Pedido o Pedido Parcial con negociación sin pedidoGenerado (los aprobados sin notificar)', () => {
    expect(datoARevisarItem(sol(), item('Pedido', { negociacion: neg({ sinNotificar: true }) }))).toBe(DATO_A_REVISAR.PEDIDO_SIN_CONFIRMAR);
    expect(datoARevisarItem(sol(), item('Pedido', { negociacion: neg(), pedidoGenerado: false }))).toBe('pedido_sin_confirmar');
    expect(datoARevisarItem(sol(), item('Pedido Parcial', { negociacion: neg() }))).toBe('pedido_sin_confirmar');
  });

  it('"pedido con negociación abierta": con pedido generado y un turno abierto (los de turno vendedor)', () => {
    expect(datoARevisarItem(sol(), item('Pedido', { negociacion: neg({ turno: 'vendedor', resultado: 'pendiente' }), pedidoGenerado: true }))).toBe(DATO_A_REVISAR.PEDIDO_CON_NEGOCIACION_ABIERTA);
    expect(datoARevisarItem(sol(), item('Pedido', { negociacion: neg({ turno: 'compras' }), pedidoGenerado: true }))).toBe('pedido_con_negociacion_abierta');
    expect(datoARevisarItem(sol(), item('Comprado', { negociacion: neg({ turno: 'vendedor' }), pedidoGenerado: true }))).toBe('pedido_con_negociacion_abierta');
    expect(datoARevisarItem(sol(), item('Pedido Parcial', { negociacion: neg({ turno: 'vendedor' }), pedidoGenerado: true }))).toBe('pedido_con_negociacion_abierta');
  });

  it('un pedido confirmado y cerrado (turno null) o sin negociación no se avisa', () => {
    expect(datoARevisarItem(sol(), item('Pedido', { negociacion: neg(), pedidoGenerado: true }))).toBeNull();
    expect(datoARevisarItem(sol(), item('Pedido'))).toBeNull();
    expect(datoARevisarItem(sol(), item('Pedido Parcial'))).toBeNull();
    expect(datoARevisarItem(sol(), item('Comprado', { negociacion: neg() }))).toBeNull();
  });

  it('un pedido sin confirmar se informa antes que un motivo suelto; un pedido confirmado informa el motivo antes que el turno abierto', () => {
    expect(datoARevisarItem(sol(), item('Pedido', { negociacion: neg(), motivoRechazo: 'x' }))).toBe('pedido_sin_confirmar');
    expect(datoARevisarItem(sol(), item('Pedido', { negociacion: neg({ turno: 'vendedor' }), pedidoGenerado: true, motivoRechazo: 'x' }))).toBe('estado_ganado_con_motivo_de_rechazo');
  });

  it('Pedido Parcial a nivel de ítem no informa motivos sueltos (límite conocido), solo los dos motivos nuevos', () => {
    expect(datoARevisarItem(sol(), item('Pedido Parcial', { motivoRechazo: 'x' }))).toBeNull();
    expect(datoARevisarItem(sol(), item('Pedido Parcial', { negociacion: neg(), pedidoGenerado: true, motivoRechazo: 'x' }))).toBeNull();
  });

  it('los dos motivos solo se calculan: no cambian el estado del ítem confirmado con turno abierto', () => {
    const it = item('Pedido', { negociacion: neg({ turno: 'vendedor' }), pedidoGenerado: true });
    expect(estadoFinalItem(sol(), it)).toBe(E.GANADO);
    expect(datoARevisarItem(sol(), it)).toBe('pedido_con_negociacion_abierta');
  });
});

describe('PED-0020 y PED-0030', () => {
  it('PED-0020 (aprobados sin notificar): los dos ítems son Cotizado, la solicitud "En curso" y la clasificación del dashboard Cotizado', () => {
    PED_0020.productos.forEach((p) => {
      expect(estadoFinalItem(PED_0020, p)).toBe(E.COTIZADO);
      expect(datoARevisarItem(PED_0020, p)).toBe('pedido_sin_confirmar');
    });
    expect(resultadoSolicitud(PED_0020).resultado).toBe('En curso');
    expect(clasificarSolicitud(PED_0020.productos, PED_0020.estado).estado).toBe('Cotizado');
  });

  it('PED-0030, ítem 2 (acordado y con pedidoGenerado): sigue siendo Ganado y la solicitud "Ganada parcial"', () => {
    expect(estadoFinalItem(PED_0030, PED_0030.productos[2])).toBe(E.GANADO);
    expect(datoARevisarItem(PED_0030, PED_0030.productos[2])).toBeNull();
    expect(resultadoSolicitud(PED_0030).resultado).toBe('Ganada parcial');
  });
});
