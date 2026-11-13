import { describe, expect, it } from 'vitest';
import { DATO_A_REVISAR, ESTADO_FINAL as E, datoARevisarItem, esEstadoCerrado, estadoFinalItem } from './estadoFinalItem';
import { CASO_TIPO, CLIENTE_K, PED_0030 } from './casosMetricas.fixtures';

/**
 * Pruebas por tabla de la regla de estado del ítem (docs/metricas.md, sección 4): cada fila es [estadoItem, solicitud.estado,
 * motivoVentaPerdida de la raíz, campos extra del ítem, resultado esperado].
 */
const item = (estadoItem, extra = {}) => ({ desc: 'Producto', cant: 1, ...(estadoItem === undefined ? {} : { estadoItem }), ...extra });
const solicitud = (estado, raiz = false) => ({ estado, ...(raiz ? { motivoVentaPerdida: { motivo: 'Precio' } } : {}) });

describe('estadoFinalItem: tabla de casos del documento', () => {
  it.each([
    ['Pedido', 'Pedido Parcial', true, {}, E.GANADO],
    ['Venta Perdida', 'Pedido Parcial', true, {}, E.VENTA_PERDIDA],
    ['Cancelado', 'Cotizado Parcial', true, {}, E.RECHAZO],
    ['Denegado', 'Denegado', false, {}, E.RECHAZO],
    ['Anulado', 'Pedido', true, {}, E.ANULADO],
    ['Cotizado', 'Pedido', false, {}, E.COTIZADO],
    ['Pedido', 'Pedido', false, { motivoRechazo: 'x' }, E.GANADO],
    ['Comprado', 'Pedido', false, { motivoAnulacion: 'x' }, E.GANADO],
    ['Pedido', 'Pedido', false, { motivoVentaPerdida: { motivo: 'x' } }, E.GANADO],
    ['Venta Perdida', 'Pedido', false, { motivoVentaPerdida: { motivo: 'x' } }, E.VENTA_PERDIDA],
    [undefined, 'Pedido', false, {}, E.GANADO],
    [undefined, 'Cotizado', false, { fob: 10 }, E.COTIZADO],
    [undefined, 'Cotizado', false, {}, E.PENDIENTE],
    [undefined, 'Venta Perdida', true, {}, E.VENTA_PERDIDA],
    [undefined, 'Pendiente', true, {}, E.PENDIENTE]
  ])('estadoItem %s, solicitud %s, bandera de la raíz %s, extra %j → %s', (estadoItem, estadoSolicitud, raiz, extra, esperado) => {
    expect(estadoFinalItem(solicitud(estadoSolicitud, raiz), item(estadoItem, extra))).toBe(esperado);
  });
});

describe('estadoFinalItem: estado propio del ítem', () => {
  it.each([
    ['Pedido', E.GANADO], ['Comprado', E.GANADO], ['Pedido Parcial', E.GANADO],
    ['Venta Perdida', E.VENTA_PERDIDA], ['Rechazado', E.RECHAZO], ['Cancelado', E.RECHAZO], ['Denegado', E.RECHAZO],
    ['Anulado', E.ANULADO], ['Cotizado', E.COTIZADO], ['Pendiente', E.PENDIENTE]
  ])('"%s" → %s, aunque la solicitud diga otra cosa', (estadoItem, esperado) => {
    // Una solicitud Cotizado Parcial no pisa el estado propio del ítem (excepto los que ya coinciden con él).
    expect(estadoFinalItem(solicitud('Cotizado Parcial'), item(estadoItem))).toBe(esperado);
    expect(estadoFinalItem(solicitud('Anulado'), item(estadoItem))).toBe(esperado);
  });

  it('ignora los espacios sobrantes del estado', () => {
    expect(estadoFinalItem(solicitud('Pendiente'), item('  Pedido '))).toBe(E.GANADO);
  });

  it('Cancelado y Denegado son rechazo y nunca venta perdida, aunque la raíz lleve la bandera', () => {
    expect(estadoFinalItem(solicitud('Pedido', true), item('Cancelado'))).toBe(E.RECHAZO);
    expect(estadoFinalItem(solicitud('Pedido', true), item('Denegado'))).toBe(E.RECHAZO);
  });
});

describe('estadoFinalItem: motivos del propio ítem', () => {
  it('el motivo de venta perdida, de rechazo o de anulación decide cuando no hay un estado propio explícito', () => {
    expect(estadoFinalItem(solicitud('Pedido'), item(undefined, { motivoVentaPerdida: { motivo: 'x' } }))).toBe(E.VENTA_PERDIDA);
    expect(estadoFinalItem(solicitud('Pedido'), item(undefined, { motivoRechazo: 'x' }))).toBe(E.RECHAZO);
    expect(estadoFinalItem(solicitud('Pedido'), item(undefined, { motivoAnulacion: 'x' }))).toBe(E.ANULADO);
  });

  it('también decide sobre un estado abierto del ítem (Cotizado o Pendiente)', () => {
    expect(estadoFinalItem(solicitud('Cotizado'), item('Cotizado', { motivoRechazo: 'x' }))).toBe(E.RECHAZO);
    expect(estadoFinalItem(solicitud('Cotizado'), item('Pendiente', { motivoAnulacion: 'x' }))).toBe(E.ANULADO);
    expect(estadoFinalItem(solicitud('Cotizado'), item('Cotizado', { motivoVentaPerdida: { motivo: 'x' } }))).toBe(E.VENTA_PERDIDA);
  });

  it('un motivo vacío o de solo espacios no cuenta', () => {
    expect(estadoFinalItem(solicitud('Pendiente'), item(undefined, { motivoRechazo: '   ', motivoAnulacion: '', motivoVentaPerdida: null }))).toBe(E.PENDIENTE);
  });

  it('un estado propio de rechazo gana a un motivo de anulación suelto, y la venta perdida gana a ambos', () => {
    expect(estadoFinalItem(solicitud('Pedido'), item('Cancelado', { motivoAnulacion: 'x' }))).toBe(E.RECHAZO);
    expect(estadoFinalItem(solicitud('Pedido'), item('Anulado', { motivoRechazo: 'x' }))).toBe(E.RECHAZO);
    expect(estadoFinalItem(solicitud('Pedido'), item(undefined, { motivoRechazo: 'x', motivoVentaPerdida: { motivo: 'x' } }))).toBe(E.VENTA_PERDIDA);
  });
});

describe('estadoFinalItem: conflicto entre un estado ganado explícito y un motivo suelto', () => {
  it.each([
    ['Pedido', 'motivoVentaPerdida', { motivo: 'x' }, DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_VENTA_PERDIDA],
    ['Pedido', 'motivoRechazo', 'x', DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_RECHAZO],
    ['Pedido', 'motivoAnulacion', 'x', DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_ANULACION],
    ['Comprado', 'motivoVentaPerdida', { motivo: 'x' }, DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_VENTA_PERDIDA],
    ['Comprado', 'motivoRechazo', 'x', DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_RECHAZO],
    ['Comprado', 'motivoAnulacion', 'x', DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_ANULACION]
  ])('estadoItem %s con %s suelto → Ganado y se anota %s', (estadoItem, campo, valor, motivo) => {
    const it = item(estadoItem, { [campo]: valor });
    expect(estadoFinalItem(solicitud('Pedido'), it)).toBe(E.GANADO);
    expect(datoARevisarItem(solicitud('Pedido'), it)).toBe(motivo);
  });

  it('con varios motivos sueltos informa uno: venta perdida, luego rechazo, luego anulación', () => {
    const todos = item('Pedido', { motivoVentaPerdida: { motivo: 'x' }, motivoRechazo: 'x', motivoAnulacion: 'x' });
    expect(datoARevisarItem(solicitud('Pedido'), todos)).toBe(DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_VENTA_PERDIDA);
    expect(datoARevisarItem(solicitud('Pedido'), item('Pedido', { motivoRechazo: 'x', motivoAnulacion: 'x' }))).toBe(DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_RECHAZO);
    expect(estadoFinalItem(solicitud('Pedido'), todos)).toBe(E.GANADO);
  });

  it('límite conocido: "Pedido Parcial" del ítem no tiene la protección ni el aviso', () => {
    expect(estadoFinalItem(solicitud('Pedido'), item('Pedido Parcial'))).toBe(E.GANADO);
    expect(datoARevisarItem(solicitud('Pedido'), item('Pedido Parcial'))).toBeNull();
    expect(estadoFinalItem(solicitud('Pedido'), item('Pedido Parcial', { motivoRechazo: 'x' }))).toBe(E.RECHAZO);
    expect(estadoFinalItem(solicitud('Pedido'), item('Pedido Parcial', { motivoAnulacion: 'x' }))).toBe(E.ANULADO);
    expect(estadoFinalItem(solicitud('Pedido'), item('Pedido Parcial', { motivoVentaPerdida: { motivo: 'x' } }))).toBe(E.VENTA_PERDIDA);
    expect(datoARevisarItem(solicitud('Pedido'), item('Pedido Parcial', { motivoRechazo: 'x' }))).toBeNull();
  });
});

describe('estadoFinalItem: ítems sin estado propio (los decide la solicitud)', () => {
  it.each([
    ['Pedido', E.GANADO], ['Comprado', E.GANADO],
    ['Venta Perdida', E.VENTA_PERDIDA], ['Anulado', E.ANULADO],
    ['Denegado', E.RECHAZO], ['Rechazado', E.RECHAZO], ['Cancelado', E.RECHAZO],
    ['Pendiente', E.PENDIENTE], ['En revisión', E.PENDIENTE], ['', E.PENDIENTE], [undefined, E.PENDIENTE]
  ])('solicitud "%s" → %s', (estadoSolicitud, esperado) => {
    expect(estadoFinalItem(solicitud(estadoSolicitud), item(undefined, { fob: 10 }))).toBe(esperado);
  });

  it.each(['Cotizado', 'Cotizado Parcial', 'Pedido Parcial'])('solicitud "%s": Cotizado si el ítem tiene precio y Pendiente si no', (estadoSolicitud) => {
    expect(estadoFinalItem(solicitud(estadoSolicitud), item(undefined, { fob: 12 }))).toBe(E.COTIZADO);
    expect(estadoFinalItem(solicitud(estadoSolicitud), item(undefined, { precioUnitario: 5 }))).toBe(E.COTIZADO);
    expect(estadoFinalItem(solicitud(estadoSolicitud), item(undefined, { fob: 0, precioUnitario: 0 }))).toBe(E.PENDIENTE);
    expect(estadoFinalItem(solicitud(estadoSolicitud), item(undefined, {}))).toBe(E.PENDIENTE);
  });

  it('el precio puede venir como texto numérico', () => {
    expect(estadoFinalItem(solicitud('Cotizado'), item(undefined, { fob: '12.5' }))).toBe(E.COTIZADO);
    expect(estadoFinalItem(solicitud('Cotizado'), item(undefined, { fob: 'abc' }))).toBe(E.PENDIENTE);
  });

  it('un estado de ítem desconocido se decide por la solicitud y se señala como dato a revisar', () => {
    const it = item('En proceso');
    expect(estadoFinalItem(solicitud('Pedido'), it)).toBe(E.GANADO);
    expect(datoARevisarItem(solicitud('Pedido'), it)).toBe(DATO_A_REVISAR.ESTADO_ITEM_DESCONOCIDO);
    expect(datoARevisarItem(solicitud('Pedido'), item(undefined))).toBeNull();
  });
});

describe('estadoFinalItem: la bandera de la raíz no decide sobre un ítem con estado propio', () => {
  it('un ítem con estado propio mantiene su estado aunque la raíz lleve motivoVentaPerdida o estado "Venta Perdida"', () => {
    for (const [estadoItem, esperado] of [['Pedido', E.GANADO], ['Cotizado', E.COTIZADO], ['Anulado', E.ANULADO], ['Cancelado', E.RECHAZO]]) {
      expect(estadoFinalItem(solicitud('Pedido', true), item(estadoItem))).toBe(esperado);
      expect(estadoFinalItem(solicitud('Venta Perdida', true), item(estadoItem))).toBe(esperado);
    }
  });

  it('con la bandera en la raíz y la solicitud abierta, un ítem sin estado tampoco es venta perdida', () => {
    expect(estadoFinalItem(solicitud('Cotizado', true), item(undefined, { fob: 5 }))).toBe(E.COTIZADO);
    expect(estadoFinalItem(solicitud('Pedido Parcial', true), item(undefined))).toBe(E.PENDIENTE);
  });
});

describe('estadoFinalItem: entradas raras', () => {
  it('una solicitud o un ítem nulos dan Pendiente y no lanzan', () => {
    expect(estadoFinalItem(null, null)).toBe(E.PENDIENTE);
    expect(estadoFinalItem(undefined, undefined)).toBe(E.PENDIENTE);
    expect(estadoFinalItem({ estado: 'Pedido' }, null)).toBe(E.GANADO);
    expect(estadoFinalItem(null, item('Anulado'))).toBe(E.ANULADO);
    expect(datoARevisarItem(null, null)).toBeNull();
    expect(datoARevisarItem(null, item('Cotizado'))).toBeNull();
    expect(datoARevisarItem(undefined, item('Cotizado'))).toBeNull();
  });

  it('no modifica sus entradas', () => {
    const sol = Object.freeze({ ...solicitud('Pedido', true) });
    const it = Object.freeze(item('Pedido', { motivoRechazo: 'x' }));
    expect(() => { estadoFinalItem(sol, it); datoARevisarItem(sol, it); }).not.toThrow();
  });
});

describe('datoARevisarItem', () => {
  it('"Cotizado" dentro de un Pedido o Comprado cuenta como Cotizado (abierto) y se anota', () => {
    for (const estadoSolicitud of ['Pedido', 'Comprado']) {
      const it = item('Cotizado');
      expect(estadoFinalItem(solicitud(estadoSolicitud), it)).toBe(E.COTIZADO);
      expect(datoARevisarItem(solicitud(estadoSolicitud), it)).toBe(DATO_A_REVISAR.COTIZADO_EN_PEDIDO);
    }
  });

  it('"Cotizado" fuera de un Pedido no se anota', () => {
    expect(datoARevisarItem(solicitud('Cotizado'), item('Cotizado'))).toBeNull();
    expect(datoARevisarItem(solicitud('Pedido Parcial'), item('Cotizado'))).toBeNull();
  });

  it('los estados normales no se anotan', () => {
    for (const estadoItem of ['Pedido', 'Comprado', 'Pedido Parcial', 'Venta Perdida', 'Rechazado', 'Cancelado', 'Denegado', 'Anulado', 'Pendiente', undefined]) {
      expect(datoARevisarItem(solicitud('Pedido'), item(estadoItem))).toBeNull();
    }
  });
});

describe('esEstadoCerrado', () => {
  it('Ganado, Venta perdida, Rechazo y Anulado están cerrados; Cotizado y Pendiente, abiertos', () => {
    expect([E.GANADO, E.VENTA_PERDIDA, E.RECHAZO, E.ANULADO].map(esEstadoCerrado)).toEqual([true, true, true, true]);
    expect([E.COTIZADO, E.PENDIENTE, undefined, 'otro'].map(esEstadoCerrado)).toEqual([false, false, false, false]);
  });
});

describe('estadoFinalItem: casos anonimizados', () => {
  it('PED-0030 (real): Cancelado, Venta Perdida y Pedido dan Rechazo, Venta perdida y Ganado', () => {
    expect(PED_0030.productos.map((p) => estadoFinalItem(PED_0030, p))).toEqual([E.RECHAZO, E.VENTA_PERDIDA, E.GANADO]);
    expect(PED_0030.productos.map((p) => datoARevisarItem(PED_0030, p))).toEqual([null, null, null]);
  });

  it('caso tipo [Pedido, Pedido, Venta Perdida] con la bandera en la raíz: Ganado, Ganado y Venta perdida', () => {
    expect(CASO_TIPO.productos.map((p) => estadoFinalItem(CASO_TIPO, p))).toEqual([E.GANADO, E.GANADO, E.VENTA_PERDIDA]);
  });

  it('Cliente K (composición reconstruida): 29 ganados, 15 ventas perdidas, 2 rechazos, 20 anulados y 3 abiertos; conversión 43,9 %', () => {
    const estados = CLIENTE_K.flatMap((s) => s.productos.map((p) => estadoFinalItem(s, p)));
    const cuenta = (e) => estados.filter((x) => x === e).length;
    expect(CLIENTE_K).toHaveLength(39);
    expect(estados).toHaveLength(69);
    expect([cuenta(E.GANADO), cuenta(E.VENTA_PERDIDA), cuenta(E.RECHAZO), cuenta(E.ANULADO), cuenta(E.COTIZADO) + cuenta(E.PENDIENTE)]).toEqual([29, 15, 2, 20, 3]);
    const cerrados = estados.filter(esEstadoCerrado).length;
    expect(cerrados).toBe(66);
    expect(((cuenta(E.GANADO) / cerrados) * 100).toFixed(1)).toBe('43.9');
  });

  it('producto repetido en dos líneas de la misma solicitud: cada línea tiene su estado', () => {
    const sol = { estado: 'Pedido Parcial', productos: [item('Pedido', { desc: 'Bomba' }), item('Venta Perdida', { desc: 'Bomba' })] };
    expect(sol.productos.map((p) => estadoFinalItem(sol, p))).toEqual([E.GANADO, E.VENTA_PERDIDA]);
  });
});
