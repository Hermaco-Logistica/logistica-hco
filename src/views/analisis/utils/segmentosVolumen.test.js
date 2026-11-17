import { describe, expect, it } from 'vitest';
import { resumirProductos } from './resumenProductos';
import { SEGMENTOS_VOLUMEN, segmentosDeVolumen, volumenPorEstado } from './segmentosVolumen';

describe('segmentosDeVolumen', () => {
  it('son seis estados en el orden Ganado, Pendiente, Cotizado, Anulado, Venta perdida y Rechazo, con el tono que el catálogo da a cada estado de ítem', () => {
    expect(SEGMENTOS_VOLUMEN.map((s) => [s.clave, s.texto, s.tono])).toEqual([
      ['ganado', 'Ganado', 'exito'],
      ['pendiente', 'Pendiente', 'info'],
      ['cotizado', 'Cotizado', 'aviso'],
      ['anulado', 'Anulado', 'apagado'],
      ['ventaPerdida', 'Venta perdida', 'peligro'],
      ['rechazo', 'Rechazo', 'peligro']
    ]);
  });

  it('toma el valor de cada estado y pone 0 si falta o no es un número', () => {
    const segs = segmentosDeVolumen({ ganado: 20, cotizado: 124, ventaPerdida: 'x' });
    expect(Object.fromEntries(segs.map((s) => [s.clave, s.valor]))).toEqual({ ganado: 20, pendiente: 0, cotizado: 124, anulado: 0, ventaPerdida: 0, rechazo: 0 });
  });

  it('no tiene la opción de unificar: Venta perdida y Rechazo siguen como dos segmentos (el popover da el desglose)', () => {
    const segs = segmentosDeVolumen({ ventaPerdida: 44, rechazo: 8 }, { unificar: true });
    expect(segs.map((s) => s.clave)).toEqual(['ganado', 'pendiente', 'cotizado', 'anulado', 'ventaPerdida', 'rechazo']);
    expect(segs.every((s) => s.detalle === undefined)).toBe(true);
  });

  it('acepta unidades indefinidas', () => {
    expect(segmentosDeVolumen(undefined).every((s) => s.valor === 0)).toBe(true);
  });
});

describe('volumenPorEstado', () => {
  const sol = (id, estado, productos) => ({ id, estado, cliente: 'C', productos });
  const l = (estadoItem, cant, extra = {}) => ({ desc: 'bomba', cant, estadoItem, ...extra });

  it('reparte las unidades en los seis estados: las abiertas se separan en Cotizado y Pendiente', () => {
    const [r] = resumirProductos([
      sol('1', 'Pedido', [l('Pedido', 3)]),
      sol('2', 'Cotizado', [l('Cotizado', 5, { fob: 10 })]),
      sol('3', 'Pendiente', [l('Pendiente', 2)]),
      sol('4', 'Anulado', [l('Anulado', 1)]),
      sol('5', 'Venta Perdida', [l('Venta Perdida', 4)]),
      sol('6', 'Denegado', [l('Denegado', 6)])
    ]);
    expect(volumenPorEstado(r)).toEqual({ ganado: 3, pendiente: 2, cotizado: 5, anulado: 1, ventaPerdida: 4, rechazo: 6 });
  });

  it('la suma de los seis es el volumen total', () => {
    const [r] = resumirProductos([sol('1', 'Cotizado', [l('Cotizado', 5), l('Pendiente', 2), l('Pedido', 3)])]);
    const v = volumenPorEstado(r);
    expect(Object.values(v).reduce((a, b) => a + b, 0)).toBe(r.volumen);
  });

  it('acepta un resumen indefinido', () => {
    expect(segmentosDeVolumen(volumenPorEstado(undefined)).every((s) => s.valor === 0)).toBe(true);
  });
});
