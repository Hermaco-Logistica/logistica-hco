import { describe, expect, it } from 'vitest';
import { claveProducto, resumirLineas, resumirProductos } from './resumenProductos';
import { CASO_TIPO, CLIENTE_K, PED_0030 } from '../../../utils/casosMetricas.fixtures';

/**
 * `resumirLineas` (F8c) es el cálculo de `resumirProductos` sobre líneas sueltas: el Historial de producto lo usa con las filas ya filtradas
 * de su tabla. Con las líneas de las solicitudes y el producto como clave tiene que dar exactamente lo mismo que `resumirProductos`
 * (las pruebas de `resumenProductos.test.js` no se tocaron y siguen siendo la red de esa equivalencia).
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
const l = (desc, estadoItem, extra = {}) => ({ desc, marca: 'X', cant: 1, estadoItem, precio: 10, fob: 10, ...extra });
const s = (id, estado, cliente, productos, extra = {}) => ({ id, correlativo: `RFQ-${id}`, cliente, estado, vendedorNombre: 'Ana', tipo: 'Aéreo', fechaS: dia(1), fechaCreacion: dia(1), productos, ...extra });

/** Los mismos datos de F8b que usa `cifrasProductos.test.jsx` (BOMBA: 3 ganadas, 6 cerradas, conversión 50 %). */
const DATOS_F8B = [
  s('1', 'Pedido', 'Cliente Uno, S.A.', [l('bomba', 'Pedido')]),
  s('2', 'Pedido Parcial', 'CLIENTE UNO SA', [l('bomba', 'Pedido'), l('bomba', 'Cotizado')]),
  s('3', 'Venta Perdida', 'Cliente Dos', [l('bomba', 'Venta Perdida')]),
  s('4', 'Denegado', 'Cliente Tres', [l('bomba', 'Cancelado')]),
  s('5', 'Anulado', 'Cliente Tres', [l('bomba', 'Anulado')]),
  s('6', 'Pedido', 'Cliente Cuatro', [l('bomba', 'Pedido', { motivoRechazo: 'Residuo' })], { motivoVentaPerdida: { motivo: 'Precio' } }),
  s('7', 'Cotizado', 'Cliente Cuatro', [l('bomba', 'Cotizado')], { motivoVentaPerdida: { motivo: 'Precio' } }),
  s('8', 'Cotizado', 'Cliente Cinco', [l('tubo', 'Cotizado'), l('tubo', 'Pendiente', { fob: 0, precio: 0 })]),
  s('9', 'Pedido', 'Cliente Seis', [l('codo', 'Pedido'), l('codo', 'Pedido')]),
  s('10', 'Pedido', 'Cliente Seis', [l('codo', 'Pedido', { cant: 'abc' }), l('', 'Pedido'), l('codo', 'Pedido', { cant: 3 })])
];

/** Aplana las solicitudes a líneas como lo hace `resumirProductos`. */
const aLineas = (solicitudes) => solicitudes.flatMap((solicitud, indiceSolicitud) => (
  Array.isArray(solicitud?.productos) ? solicitud.productos.map((item, indiceItem) => ({ solicitud, item, indiceSolicitud, indiceItem })) : []
));

describe('resumirLineas con el producto como clave es resumirProductos', () => {
  it.each([
    ['los datos de F8b', DATOS_F8B],
    ['PED-0030 y el caso tipo', [PED_0030, CASO_TIPO]],
    ['el Cliente K reconstruido', CLIENTE_K],
    ['una lista vacía', []]
  ])('da el mismo resultado con %s', (_nombre, solicitudes) => {
    expect(resumirLineas(aLineas(solicitudes), { clave: claveProducto })).toEqual(resumirProductos(solicitudes));
  });

  it('con `porLinea` recibe lo mismo: resumen, solicitud, ítem, índice del ítem y estado final', () => {
    const visto = (funcion) => {
      const lista = [];
      funcion((r, solicitud, item, indiceItem, estado) => lista.push([r.desc, solicitud.id, item.desc, indiceItem, estado]));
      return lista;
    };
    const conProductos = visto((porLinea) => resumirProductos(DATOS_F8B, { porLinea }));
    const conLineas = visto((porLinea) => resumirLineas(aLineas(DATOS_F8B), { clave: claveProducto, porLinea }));
    expect(conLineas).toEqual(conProductos);
    expect(conLineas.length).toBeGreaterThan(10);
    expect(conLineas[0]).toEqual(['BOMBA', '1', 'bomba', 0, 'Ganado']);
  });

  it('un producto escrito de dos formas (espacios y mayúsculas) es un solo grupo, como en `resumirProductos`', () => {
    const lineas = aLineas([s('1', 'Pedido', 'A', [l(' Bomba ', 'Pedido')]), s('2', 'Pedido', 'B', [l('BOMBA', 'Venta Perdida')])]);
    const r = resumirLineas(lineas, { clave: claveProducto });
    expect(r).toHaveLength(1);
    expect(r[0].desc).toBe('BOMBA');
    expect([r[0].ganadas, r[0].ventasPerdidas, r[0].vecesSolicitadas]).toEqual([1, 1, 2]);
  });
});

describe('resumirLineas: líneas sueltas (filas filtradas del Historial)', () => {
  const todas = aLineas(DATOS_F8B).filter((linea) => claveProducto(linea.item) === 'BOMBA');
  const unico = (lineas) => resumirLineas(lineas, { clave: () => 'BOMBA' })[0];

  it('una clave constante junta todas las líneas en un solo resumen con las cifras de ganados y cerrados', () => {
    const r = unico(todas);
    expect([r.ganadas, r.cerrados, r.ventasPerdidas, r.rechazos, r.anulaciones, r.abiertos]).toEqual([3, 6, 1, 1, 1, 2]);
    expect(r.conversion).toBe(50);
    expect(r.vecesSolicitadas).toBe(7);
  });

  it('solo cuenta las líneas que se le dan: sin las ganadas, la conversión es 0 y sin cerradas es null', () => {
    const sinGanadas = todas.filter((linea) => linea.item.estadoItem !== 'Pedido');
    expect([unico(sinGanadas).ganadas, unico(sinGanadas).cerrados, unico(sinGanadas).conversion]).toEqual([0, 3, 0]);
    const soloAbiertas = todas.filter((linea) => linea.item.estadoItem === 'Cotizado');
    expect([unico(soloAbiertas).cerrados, unico(soloAbiertas).conversion]).toEqual([0, null]);
  });

  it('sin líneas no hay resumen (el llamador usa su valor por defecto)', () => {
    expect(resumirLineas([], { clave: () => 'X' })).toEqual([]);
    expect(resumirLineas(undefined, { clave: () => 'X' })).toEqual([]);
    expect(resumirLineas(null)).toEqual([]);
  });

  it('una clave vacía o sin función de clave descarta la línea, y una línea nula no rompe nada', () => {
    expect(resumirLineas(todas, { clave: () => '' })).toEqual([]);
    expect(resumirLineas(todas)).toEqual([]);
    expect(resumirLineas([null, undefined, {}, ...todas], { clave: () => 'X' })[0].cerrados).toBe(6);
  });

  it('el mismo producto en dos líneas de una solicitud cuenta una vez en `vecesSolicitadas`; dos solicitudes sin id ni correlativo cuentan dos', () => {
    const dos = { id: 'z', productos: [l('bomba', 'Pedido'), l('bomba', 'Cotizado')], estado: 'Pedido Parcial' };
    expect(unico(aLineas([dos])).vecesSolicitadas).toBe(1);
    const sinId = [{ estado: 'Pedido', productos: [l('bomba', 'Pedido')] }, { estado: 'Pedido', productos: [l('bomba', 'Pedido')] }];
    expect(unico(aLineas(sinId)).vecesSolicitadas).toBe(2);
    // sin los índices las dos caen en la posición 0 y se funden: por eso `resumirProductos` los pasa siempre
    expect(unico(sinId.map((solicitud) => ({ solicitud, item: solicitud.productos[0] }))).vecesSolicitadas).toBe(1);
  });

  it('las unidades ganadas y los datos a revisar salen de las líneas dadas', () => {
    const r = unico(aLineas([s('1', 'Pedido', 'A', [l('bomba', 'Pedido', { cant: 5 }), l('bomba', 'Cotizado', { cant: 2 })])]));
    expect([r.unidadesGanadas, r.volumen, r.unidades.abierto, r.unidadesAbiertas.cotizado]).toEqual([5, 7, 2, 2]);
    expect(r.datosARevisar.total).toBe(1);
    expect(r.datosARevisar.porMotivo).toEqual({ cotizado_en_pedido: 1 });
  });
});
