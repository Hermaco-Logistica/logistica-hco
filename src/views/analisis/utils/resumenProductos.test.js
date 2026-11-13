import { describe, expect, it } from 'vitest';
import {
  CLAVES_ORDEN, CLAVE_ESTADO, ORDEN_CLAVES_ESTADO, claveEstadoFinal, claveProducto, claveSolicitud, compararProductos, normalizarClaveOrden, resumirProductos
} from './resumenProductos';
import { ESTADO_FINAL as E, DATO_A_REVISAR } from '../../../utils/estadoFinalItem';
import { PED_0030 } from '../../../utils/casosMetricas.fixtures';

/**
 * Cálculo común de los productos (docs/metricas.md, secciones 3 y 4). Las cifras de "hoy" que aparecen en los comentarios son las que
 * daba el código anterior a F8b con los mismos datos (medidas en el arnés con datos sintéticos): se dejan escritas para documentar el cambio.
 */
const linea = (desc, estadoItem, cant = 1, extra = {}) => ({ desc, cant, ...(estadoItem === undefined ? {} : { estadoItem }), ...extra });
const sol = (id, estado, productos, extra = {}) => ({ id, correlativo: `RFQ-${id}`, estado, cliente: `Cliente ${id}`, productos, ...extra });
const uno = (solicitudes, desc) => resumirProductos(solicitudes).find((r) => r.desc === desc);

describe('resumirProductos: estados finales', () => {
  it.each([
    ['Pedido', 'ganado'], ['Comprado', 'ganado'], ['Venta Perdida', 'ventaPerdida'], ['Cancelado', 'rechazo'], ['Denegado', 'rechazo'],
    ['Rechazado', 'rechazo'], ['Anulado', 'anulado'], ['Cotizado', 'abierto'], ['Pendiente', 'abierto']
  ])('una línea con estadoItem "%s" cuenta como %s (ítems y unidades)', (estadoItem, clave) => {
    const r = uno([sol('1', 'Cotizado', [linea('P', estadoItem, 4)])], 'P');
    expect(r.items[clave]).toBe(1);
    expect(r.unidades[clave]).toBe(4);
    const otras = ORDEN_CLAVES_ESTADO.filter((k) => k !== clave);
    otras.forEach((k) => { expect(r.items[k]).toBe(0); expect(r.unidades[k]).toBe(0); });
    expect(r.volumen).toBe(4);
    expect(r.vecesSolicitadas).toBe(1);
  });

  it('los alias de cada cifra salen de los conteos por estado', () => {
    const r = uno([
      sol('1', 'Pedido', [linea('P', 'Pedido', 2)]), sol('2', 'Venta Perdida', [linea('P', 'Venta Perdida', 3)]),
      sol('3', 'Denegado', [linea('P', 'Cancelado', 5)]), sol('4', 'Anulado', [linea('P', 'Anulado', 7)]), sol('5', 'Cotizado', [linea('P', 'Cotizado', 11)]),
      sol('6', 'Pendiente', [linea('P', 'Pendiente', 13)])
    ], 'P');
    expect([r.ganadas, r.unidadesGanadas, r.ventasPerdidas, r.rechazos, r.anulaciones, r.abiertos, r.cerrados]).toEqual([1, 2, 1, 1, 1, 2, 4]);
    expect(r.volumen).toBe(2 + 3 + 5 + 7 + 11 + 13);
    expect(r.vecesSolicitadas).toBe(6);
  });

  it('un ítem sin estado de una solicitud Pedido es ganado, y la bandera de la raíz no decide nada sobre un ítem con estado propio', () => {
    const r = resumirProductos([sol('1', 'Pedido', [linea('SIN ESTADO', undefined, 4)], { motivoVentaPerdida: { motivo: 'Precio' } })]);
    expect(r[0].ganadas).toBe(1);
    expect(r[0].ventasPerdidas).toBe(0);
  });

  it('PED-0030: cancelado es rechazo, el de venta perdida lo es y el pedido es ganado (hoy los tres contaban como venta perdida)', () => {
    const r = resumirProductos([PED_0030]);
    const por = (d) => r.find((x) => x.desc === d);
    expect([por('PRODUCTO 0').rechazos, por('PRODUCTO 0').ventasPerdidas, por('PRODUCTO 0').ganadas]).toEqual([1, 0, 0]);
    expect([por('PRODUCTO 1').rechazos, por('PRODUCTO 1').ventasPerdidas, por('PRODUCTO 1').ganadas]).toEqual([0, 1, 0]);
    expect([por('PRODUCTO 2').rechazos, por('PRODUCTO 2').ventasPerdidas, por('PRODUCTO 2').ganadas]).toEqual([0, 0, 1]);
    expect(por('PRODUCTO 2').conversion).toBe(100);
  });

  it('un Cotizado dentro de un Pedido es abierto y se señala como dato a revisar; no cuenta como ganado', () => {
    const r = uno([sol('1', 'Pedido', [linea('P', 'Cotizado', 4)])], 'P');
    expect(r.abiertos).toBe(1);
    expect(r.ganadas).toBe(0);
    expect(r.datosARevisar).toEqual({ total: 1, porMotivo: { [DATO_A_REVISAR.COTIZADO_EN_PEDIDO]: 1 } });
  });

  it('un Pedido con un motivo suelto de rechazo es ganado (hoy contaba como rechazo) y se señala', () => {
    const r = uno([sol('1', 'Pedido', [linea('P', 'Pedido', 6, { motivoRechazo: 'Residuo' })])], 'P');
    expect([r.ganadas, r.rechazos]).toEqual([1, 0]);
    expect(r.datosARevisar.porMotivo).toEqual({ [DATO_A_REVISAR.GANADO_CON_MOTIVO_DE_RECHAZO]: 1 });
  });

  it('un Cotizado con la bandera de venta perdida en la raíz sigue abierto (hoy contaba como venta perdida)', () => {
    const r = uno([sol('1', 'Cotizado', [linea('P', 'Cotizado', 2)], { motivoVentaPerdida: { motivo: 'Precio' } })], 'P');
    expect([r.abiertos, r.ventasPerdidas]).toEqual([1, 0]);
  });

  it('sin datos a revisar el contador queda en cero y sin motivos', () => {
    const r = uno([sol('1', 'Pedido', [linea('P', 'Pedido')])], 'P');
    expect(r.datosARevisar).toEqual({ total: 0, porMotivo: {} });
  });

  it('claveEstadoFinal: Cotizado, Pendiente y lo desconocido son abierto', () => {
    expect([E.GANADO, E.VENTA_PERDIDA, E.RECHAZO, E.ANULADO, E.COTIZADO, E.PENDIENTE, 'otro', undefined].map(claveEstadoFinal))
      .toEqual(['ganado', 'ventaPerdida', 'rechazo', 'anulado', 'abierto', 'abierto', 'abierto', 'abierto']);
    expect(ORDEN_CLAVES_ESTADO).toEqual(['ganado', 'abierto', 'anulado', 'ventaPerdida', 'rechazo']);
    expect(Object.values(CLAVE_ESTADO).sort()).toEqual([...ORDEN_CLAVES_ESTADO].sort());
  });
});

describe('resumirProductos: veces solicitadas y volumen', () => {
  it('un producto en dos líneas de la misma solicitud cuenta una vez y suma las dos líneas (hoy contaba dos veces)', () => {
    const r = uno([
      sol('1', 'Pedido Parcial', [linea('BOMBA', 'Cotizado', 5), linea('BOMBA', 'Pedido', 3)]),
      sol('2', 'Venta Perdida', [linea('BOMBA', 'Venta Perdida', 4)]),
      sol('3', 'Pendiente', [linea('BOMBA', 'Pendiente', 2)])
    ], 'BOMBA');
    expect(r.vecesSolicitadas).toBe(3);
    expect(r.volumen).toBe(14); // hoy: 10 (excluía la línea de la venta perdida)
    expect(r.items.ganado + r.items.ventaPerdida + r.items.abierto).toBe(4);
  });

  it('cuenta también las pendientes y las decisiones, que hoy quedaban fuera de "Veces Cotizado"', () => {
    const r = uno([sol('1', 'Venta Perdida', [linea('P', 'Venta Perdida')]), sol('2', 'Anulado', [linea('P', 'Anulado')]), sol('3', 'Pendiente', [linea('P', 'Pendiente')])], 'P');
    expect(r.vecesSolicitadas).toBe(3); // hoy: 1
  });

  it('tipo ABB (datos sintéticos): 104 solicitudes, 10 ganadas, 4 rechazadas, 22 ventas perdidas, 6 anuladas, 58 cotizadas (3 con bandera) y 4 pendientes', () => {
    const lista = [];
    const mas = (n, estado, estadoItem, extra = {}) => { for (let i = 0; i < n; i++) lista.push(sol(`abb${lista.length}`, estado, [linea('ABB VARIADOR', estadoItem, 2)], extra)); };
    mas(10, 'Pedido', 'Pedido'); mas(4, 'Denegado', 'Cancelado'); mas(22, 'Venta Perdida', 'Venta Perdida'); mas(6, 'Anulado', 'Anulado');
    mas(3, 'Cotizado', 'Cotizado', { motivoVentaPerdida: { motivo: 'Precio' } }); mas(55, 'Cotizado', 'Cotizado'); mas(4, 'Pendiente', 'Pendiente');
    const r = uno(lista, 'ABB VARIADOR');
    // Hoy (código anterior): veces 69, unidades 138, ventas perdidas 25, ganadas 10 (14 %).
    expect(r.vecesSolicitadas).toBe(104);
    expect(r.volumen).toBe(208);
    expect(r.unidades).toEqual({ ganado: 20, ventaPerdida: 44, rechazo: 8, anulado: 12, abierto: 124 });
    expect([r.ganadas, r.ventasPerdidas, r.rechazos, r.anulaciones, r.abiertos, r.cerrados]).toEqual([10, 22, 4, 6, 62, 42]);
    expect(r.conversion).toBeCloseTo(23.81, 2);
  });

  it('las unidades por estado suman el volumen', () => {
    const r = uno([sol('1', 'Pedido', [linea('P', 'Pedido', 3), linea('P', 'Anulado', 2)]), sol('2', 'Cotizado', [linea('P', 'Cotizado', 5)])], 'P');
    expect(Object.values(r.unidades).reduce((a, b) => a + b, 0)).toBe(r.volumen);
  });

  it('solo se lee cant (como hasta ahora): una línea con solo cantidad cuenta 1 unidad', () => {
    expect(uno([sol('1', 'Cotizado', [{ desc: 'P', cantidad: 5, estadoItem: 'Cotizado' }])], 'P').volumen).toBe(1);
  });

  it('las unidades salen de cant; sin cant cuentan 1; un texto numérico se suma; lo que no es número cuenta 0 (no deja NaN)', () => {
    const r = uno([sol('1', 'Cotizado', [linea('P', 'Cotizado', undefined), linea('P', 'Cotizado', '3'), linea('P', 'Cotizado', 'abc'), { desc: 'P', cant: 0, estadoItem: 'Cotizado' }])], 'P');
    expect(r.volumen).toBe(1 + 3 + 0 + 1);
    expect(Number.isNaN(r.volumen)).toBe(false);
  });
});

describe('resumirProductos: identificación de la solicitud', () => {
  it('sin id usa el correlativo: dos solicitudes con correlativo distinto cuentan dos, y la misma solicitud dos veces cuenta una', () => {
    const a = { correlativo: 'RFQ-1', estado: 'Cotizado', cliente: 'A', productos: [linea('P', 'Cotizado'), linea('P', 'Cotizado')] };
    const b = { correlativo: 'RFQ-2', estado: 'Cotizado', cliente: 'B', productos: [linea('P', 'Cotizado')] };
    expect(uno([a, b], 'P').vecesSolicitadas).toBe(2);
    expect(uno([a], 'P').vecesSolicitadas).toBe(1);
  });

  it('sin id ni correlativo usa la posición: dos solicitudes sin identificar no se funden en una', () => {
    const a = { estado: 'Cotizado', productos: [linea('P', 'Cotizado')] };
    const b = { estado: 'Cotizado', productos: [linea('P', 'Cotizado')] };
    expect(uno([a, b], 'P').vecesSolicitadas).toBe(2);
  });

  it('un id vacío o solo con espacios se trata como ausente', () => {
    expect(claveSolicitud({ id: '  ', correlativo: 'X' }, 3)).toBe('correlativo:X');
    expect(claveSolicitud({ id: '', correlativo: '' }, 3)).toBe('posicion:3');
    expect(claveSolicitud({ id: null }, 0)).toBe('posicion:0');
    expect(claveSolicitud(null, 7)).toBe('posicion:7');
  });

  it('un id "5" y un correlativo "5" no chocan', () => {
    expect(claveSolicitud({ id: '5' })).not.toBe(claveSolicitud({ correlativo: '5' }));
    const a = { id: '5', estado: 'Cotizado', productos: [linea('P', 'Cotizado')] };
    const b = { correlativo: '5', estado: 'Cotizado', productos: [linea('P', 'Cotizado')] };
    expect(uno([a, b], 'P').vecesSolicitadas).toBe(2);
  });

  it('un id que imita a otra clave tampoco choca con una solicitud sin identificar', () => {
    const a = { id: 'posicion:1', estado: 'Cotizado', productos: [linea('P', 'Cotizado')] };
    const b = { estado: 'Cotizado', productos: [linea('P', 'Cotizado')] };
    expect(uno([{ estado: 'Cotizado', productos: [] }, b, a], 'P').vecesSolicitadas).toBe(2);
  });

  it('con id y correlativo manda el id', () => {
    const a = { id: 'x', correlativo: 'RFQ-1', estado: 'Cotizado', productos: [linea('P', 'Cotizado')] };
    const b = { id: 'x', correlativo: 'RFQ-2', estado: 'Cotizado', productos: [linea('P', 'Cotizado')] };
    expect(uno([a, b], 'P').vecesSolicitadas).toBe(1);
  });
});

describe('resumirProductos: clientes distintos, marcas y agrupación', () => {
  it('el nombre del cliente se normaliza: mayúsculas, tildes y signos no crean otro cliente (hoy: 2)', () => {
    const r = uno([sol('1', 'Cotizado', [linea('P', 'Cotizado')], { cliente: 'Cliente Uno, S.A.' }), sol('2', 'Cotizado', [linea('P', 'Cotizado')], { cliente: 'CLIENTE UNO SA' }), sol('3', 'Cotizado', [linea('P', 'Cotizado')], { cliente: 'Cliente Dos' })], 'P');
    expect(r.clientesDistintos).toBe(2);
  });

  it('un cliente ausente, vacío o solo con signos no cuenta', () => {
    const r = uno([sol('1', 'Cotizado', [linea('P', 'Cotizado')], { cliente: undefined }), sol('2', 'Cotizado', [linea('P', 'Cotizado')], { cliente: '   ' }), sol('3', 'Cotizado', [linea('P', 'Cotizado')], { cliente: '---' })], 'P');
    expect(r.clientesDistintos).toBe(0);
  });

  it('agrupa por descripción sin espacios sobrantes y en mayúsculas, y acepta "descripcion"', () => {
    const lista = resumirProductos([sol('1', 'Cotizado', [{ desc: ' bomba ', cant: 1 }, { descripcion: 'BOMBA', cant: 2 }, { desc: 'Bomba' }])]);
    expect(lista).toHaveLength(1);
    expect(lista[0].desc).toBe('BOMBA');
    expect(lista[0].volumen).toBe(4);
    expect(claveProducto({ desc: ' a b ' })).toBe('A B');
    expect(claveProducto({})).toBe('');
  });

  it('las líneas sin descripción, las solicitudes sin lista de productos y los elementos nulos se ignoran', () => {
    const lista = resumirProductos([null, undefined, { id: '1' }, { id: '2', productos: 'x' }, sol('3', 'Cotizado', [{ cant: 1 }, linea('P', 'Cotizado')])]);
    expect(lista.map((r) => r.desc)).toEqual(['P']);
  });

  it('una lista que no es un arreglo da un resultado vacío', () => {
    expect(resumirProductos(undefined)).toEqual([]);
    expect(resumirProductos({ productos: [] })).toEqual([]);
  });

  it('las marcas se recortan, no se repiten y conservan el orden de aparición', () => {
    const r = uno([sol('1', 'Cotizado', [linea('P', 'Cotizado', 1, { marca: ' ABB ' }), linea('P', 'Cotizado', 1, { marca: 'ABB' }), linea('P', 'Cotizado', 1, { marca: 'Siemens' }), linea('P', 'Cotizado', 1, { marca: 5 }), linea('P', 'Cotizado')])], 'P');
    expect(r.marcas).toEqual(['ABB', 'Siemens']);
  });

  it('el resumen no deja los conjuntos de trabajo', () => {
    const r = uno([sol('1', 'Cotizado', [linea('P', 'Cotizado')])], 'P');
    expect(Object.keys(r).filter((k) => k.startsWith('_'))).toEqual([]);
  });
});

describe('resumirProductos: conversión', () => {
  it('es ganadas ÷ cerradas (ganadas + ventas perdidas + rechazos + anuladas); las abiertas no cuentan', () => {
    const r = uno([
      sol('1', 'Pedido', [linea('P', 'Pedido')]), sol('2', 'Pedido', [linea('P', 'Comprado')]), sol('3', 'Venta Perdida', [linea('P', 'Venta Perdida')]),
      sol('4', 'Denegado', [linea('P', 'Denegado')]), sol('5', 'Cotizado', [linea('P', 'Cotizado')]), sol('6', 'Pendiente', [linea('P', 'Pendiente')])
    ], 'P');
    expect(r.cerrados).toBe(4);
    expect(r.conversion).toBe(50);
  });

  it('el producto repetido: 1 ganada de 2 cerradas es 50 % (hoy mostraba 33 %, ganadas ÷ veces cotizado)', () => {
    const r = uno([sol('1', 'Pedido Parcial', [linea('B', 'Cotizado', 5), linea('B', 'Pedido', 3)]), sol('2', 'Venta Perdida', [linea('B', 'Venta Perdida', 4)]), sol('3', 'Pendiente', [linea('B', 'Pendiente', 2)])], 'B');
    expect(r.conversion).toBe(50);
  });

  it('sin ninguna cerrada es null, no 0', () => {
    expect(uno([sol('1', 'Cotizado', [linea('P', 'Cotizado')])], 'P').conversion).toBeNull();
  });

  it('todas ganadas es 100 y ninguna ganada con cerradas es 0', () => {
    expect(uno([sol('1', 'Pedido', [linea('P', 'Pedido')])], 'P').conversion).toBe(100);
    expect(uno([sol('1', 'Venta Perdida', [linea('P', 'Venta Perdida')])], 'P').conversion).toBe(0);
  });

  it('los anulados cuentan entre los cerrados (bajan la conversión)', () => {
    expect(uno([sol('1', 'Pedido', [linea('P', 'Pedido')]), sol('2', 'Anulado', [linea('P', 'Anulado')])], 'P').conversion).toBe(50);
  });
});

describe('resumirProductos: porLinea', () => {
  it('se llama una vez por línea con el resumen, la solicitud, la línea, su índice y el estado final, y lo que añade se conserva', () => {
    const llamadas = [];
    const lista = resumirProductos([sol('1', 'Pedido', [linea('P', 'Pedido'), linea('Q', 'Cotizado')]), sol('2', 'Cotizado', [linea('P', 'Cotizado')])], {
      porLinea: (r, s, it, i, estado) => { llamadas.push([r.desc, s.id, it.estadoItem, i, estado]); r.extra = (r.extra || 0) + 1; }
    });
    expect(llamadas).toEqual([['P', '1', 'Pedido', 0, E.GANADO], ['Q', '1', 'Cotizado', 1, E.COTIZADO], ['P', '2', 'Cotizado', 0, E.COTIZADO]]);
    expect(lista.find((r) => r.desc === 'P').extra).toBe(2);
    expect(lista.find((r) => r.desc === 'Q').extra).toBe(1);
  });

  it('sin porLinea no pasa nada', () => {
    expect(() => resumirProductos([sol('1', 'Cotizado', [linea('P', 'Cotizado')])], {})).not.toThrow();
  });
});

describe('normalizarClaveOrden y compararProductos', () => {
  const R = (desc, extra) => ({ desc, vecesSolicitadas: 0, volumen: 0, ganadas: 0, unidadesGanadas: 0, anulaciones: 0, ventasPerdidas: 0, rechazos: 0, ...extra });
  const ordenar = (lista, clave) => [...lista].sort(compararProductos(clave)).map((r) => r.desc);

  it('las claves que ya existían siguen valiendo con su mismo nombre', () => {
    expect(CLAVES_ORDEN).toEqual(['veces', 'unidades', 'pedidos', 'anulaciones', 'decisiones', 'ventasPerdidas', 'rechazos']);
    CLAVES_ORDEN.forEach((k) => expect(normalizarClaveOrden(k)).toBe(k));
  });

  it('"ganadas" (lo que manda el dashboard) es "pedidos"; lo desconocido, vacío o ausente es "veces"', () => {
    expect(normalizarClaveOrden('ganadas')).toBe('pedidos');
    ['x', '', null, undefined, 3, 'Veces'].forEach((v) => expect(normalizarClaveOrden(v)).toBe('veces'));
  });

  it('veces: más solicitudes primero y, a igualdad, más volumen', () => {
    expect(ordenar([R('a', { vecesSolicitadas: 2, volumen: 9 }), R('b', { vecesSolicitadas: 3, volumen: 1 }), R('c', { vecesSolicitadas: 2, volumen: 20 })], 'veces')).toEqual(['b', 'c', 'a']);
  });

  it('unidades: más volumen primero y, a igualdad, más solicitudes', () => {
    expect(ordenar([R('a', { vecesSolicitadas: 5, volumen: 9 }), R('b', { vecesSolicitadas: 1, volumen: 20 }), R('c', { vecesSolicitadas: 3, volumen: 9 })], 'unidades')).toEqual(['b', 'a', 'c']);
  });

  it('pedidos y ganadas: más ganadas, luego unidades ganadas, luego solicitudes', () => {
    const lista = [R('a', { ganadas: 2, unidadesGanadas: 1, vecesSolicitadas: 9 }), R('b', { ganadas: 3 }), R('c', { ganadas: 2, unidadesGanadas: 5 }), R('d', { ganadas: 2, unidadesGanadas: 1, vecesSolicitadas: 10 })];
    expect(ordenar(lista, 'pedidos')).toEqual(['b', 'c', 'd', 'a']);
    expect(ordenar(lista, 'ganadas')).toEqual(['b', 'c', 'd', 'a']);
  });

  it.each([['anulaciones'], ['ventasPerdidas'], ['rechazos']])('%s: más primero y, a igualdad, más solicitudes', (clave) => {
    const lista = [R('a', { [clave]: 1, vecesSolicitadas: 5 }), R('b', { [clave]: 2, vecesSolicitadas: 1 }), R('c', { [clave]: 1, vecesSolicitadas: 7 })];
    expect(ordenar(lista, clave)).toEqual(['b', 'c', 'a']);
  });

  it('decisiones suma ventas perdidas, rechazos y anulaciones', () => {
    const lista = [R('a', { ventasPerdidas: 1, rechazos: 1, anulaciones: 1 }), R('b', { ventasPerdidas: 5 }), R('c', { rechazos: 2, anulaciones: 2 })];
    expect(ordenar(lista, 'decisiones')).toEqual(['b', 'c', 'a']);
  });

  it('decisiones: a igualdad gana el que tiene más solicitudes', () => {
    expect(ordenar([R('a', { ventasPerdidas: 2, vecesSolicitadas: 1 }), R('b', { rechazos: 2, vecesSolicitadas: 9 })], 'decisiones')).toEqual(['b', 'a']);
  });

  it('una clave desconocida ordena como "veces"', () => {
    const lista = [R('a', { vecesSolicitadas: 1 }), R('b', { vecesSolicitadas: 4 })];
    expect(ordenar(lista, 'nada')).toEqual(ordenar(lista, 'veces'));
  });
});
