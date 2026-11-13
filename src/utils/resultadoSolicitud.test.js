import { describe, expect, it } from 'vitest';
import { RESULTADO_SOLICITUD as R, formatoGanadas, resultadoSolicitud, resumirGanadas } from './resultadoSolicitud';
import { CASO_TIPO, CLIENTE_K, PED_0030 } from './casosMetricas.fixtures';

/**
 * Resultado de una solicitud (docs/metricas.md, sección 5): se calcula con el estado final de TODOS sus ítems. Cada fila de la tabla es
 * [estados de los ítems (estadoItem), resultado esperado].
 */
const sol = (estados, estado = 'Cotizado Parcial') => ({
  estado,
  productos: estados.map((estadoItem, i) => ({ desc: `Producto ${i}`, cant: 1, estadoItem }))
});

describe('resultadoSolicitud: valores', () => {
  it('los resultados tienen los nombres del documento', () => {
    expect(Object.values(R)).toEqual(['Ganada', 'Ganada parcial', 'Perdida', 'Anulada', 'En curso', 'Sin ítems']);
  });
});

describe('resultadoSolicitud: tabla de resultados', () => {
  it.each([
    [['Pedido'], R.GANADA],
    [['Pedido', 'Comprado', 'Pedido'], R.GANADA],
    [['Pedido', 'Cotizado'], R.GANADA_PARCIAL],
    [['Pedido', 'Pendiente'], R.GANADA_PARCIAL],
    [['Pedido', 'Venta Perdida'], R.GANADA_PARCIAL],
    [['Pedido', 'Rechazado'], R.GANADA_PARCIAL],
    [['Pedido', 'Pedido', 'Anulado'], R.GANADA_PARCIAL], // un Anulado cuenta como "no ganado"
    [['Anulado', 'Pedido'], R.GANADA_PARCIAL],
    [['Venta Perdida'], R.PERDIDA],
    [['Rechazado'], R.PERDIDA],
    [['Cancelado', 'Denegado'], R.PERDIDA],
    [['Venta Perdida', 'Anulado'], R.PERDIDA], // los Anulados no cambian una pérdida
    [['Rechazado', 'Anulado', 'Anulado'], R.PERDIDA],
    [['Anulado'], R.ANULADA],
    [['Anulado', 'Anulado', 'Anulado'], R.ANULADA],
    [['Cotizado'], R.EN_CURSO],
    [['Pendiente', 'Cotizado'], R.EN_CURSO],
    [['Cotizado', 'Venta Perdida'], R.EN_CURSO],
    [['Anulado', 'Cotizado'], R.EN_CURSO]
  ])('ítems %j → %s', (estados, esperado) => {
    expect(resultadoSolicitud(sol(estados)).resultado).toBe(esperado);
  });

  it('una solicitud sin productos, o con productos que no son una lista, es "Sin ítems"', () => {
    expect(resultadoSolicitud({ estado: 'Pedido', productos: [] }).resultado).toBe(R.SIN_ITEMS);
    expect(resultadoSolicitud({ estado: 'Pedido' }).resultado).toBe(R.SIN_ITEMS);
    expect(resultadoSolicitud({ estado: 'Pedido', productos: 'x' }).resultado).toBe(R.SIN_ITEMS);
    expect(resultadoSolicitud(null).resultado).toBe(R.SIN_ITEMS);
    expect(resultadoSolicitud(undefined).resultado).toBe(R.SIN_ITEMS);
  });

  it('los ítems sin estado propio se resuelven por el estado de la solicitud', () => {
    expect(resultadoSolicitud({ estado: 'Pedido', productos: [{}, {}] }).resultado).toBe(R.GANADA);
    expect(resultadoSolicitud({ estado: 'Venta Perdida', productos: [{}] }).resultado).toBe(R.PERDIDA);
    expect(resultadoSolicitud({ estado: 'Anulado', productos: [{}] }).resultado).toBe(R.ANULADA);
    expect(resultadoSolicitud({ estado: 'Denegado', productos: [{}] }).resultado).toBe(R.PERDIDA);
    expect(resultadoSolicitud({ estado: 'Pendiente', productos: [{}] }).resultado).toBe(R.EN_CURSO);
  });

  it('un motivo suelto en un ítem Pedido no lo rebaja: la solicitud sigue ganada', () => {
    const solicitud = { estado: 'Pedido', productos: [{ estadoItem: 'Pedido', motivoRechazo: 'x' }, { estadoItem: 'Comprado', motivoVentaPerdida: { motivo: 'x' } }] };
    expect(resultadoSolicitud(solicitud).resultado).toBe(R.GANADA);
  });
});

describe('resultadoSolicitud: conteos por ítem', () => {
  it('devuelve el total y el desglose por estado final', () => {
    const r = resultadoSolicitud(sol(['Pedido', 'Pedido', 'Venta Perdida', 'Rechazado', 'Anulado', 'Cotizado', 'Pendiente']));
    expect(r).toEqual({
      resultado: R.GANADA_PARCIAL, total: 7, cerrados: 5, ganados: 2, ventasPerdidas: 1, rechazos: 1, anulados: 1, abiertos: 2
    });
  });

  it('cerrados + abiertos = total', () => {
    const r = resultadoSolicitud(sol(['Cotizado', 'Anulado', 'Pedido']));
    expect(r.cerrados + r.abiertos).toBe(r.total);
  });

  it('una solicitud vacía tiene todos los conteos en cero', () => {
    expect(resultadoSolicitud(null)).toEqual({ resultado: R.SIN_ITEMS, total: 0, cerrados: 0, ganados: 0, ventasPerdidas: 0, rechazos: 0, anulados: 0, abiertos: 0 });
  });
});

describe('resultadoSolicitud: casos anonimizados', () => {
  it('PED-0030 (real): Rechazo, Venta perdida y Ganado dan "Ganada parcial", no tres ventas perdidas', () => {
    const r = resultadoSolicitud(PED_0030);
    expect(r.resultado).toBe(R.GANADA_PARCIAL);
    expect([r.ganados, r.ventasPerdidas, r.rechazos, r.anulados]).toEqual([1, 1, 1, 0]);
  });

  it('caso tipo [Pedido, Pedido, Venta Perdida] con la bandera en la raíz: "Ganada parcial" con 2 ganados y 1 venta perdida', () => {
    const r = resultadoSolicitud(CASO_TIPO);
    expect(r.resultado).toBe(R.GANADA_PARCIAL);
    expect([r.ganados, r.ventasPerdidas]).toEqual([2, 1]);
  });

  it('Cliente K (composición reconstruida): ganadas por solicitud "16 (+2 parc.)" de 39', () => {
    const resumen = resumirGanadas(CLIENTE_K);
    expect(resumen).toEqual({ ganadas: 16, parciales: 2, total: 39 });
    expect(formatoGanadas(resumen)).toBe('16 (+2 parc.)');
    const por = (resultado) => CLIENTE_K.filter((s) => resultadoSolicitud(s).resultado === resultado).length;
    expect([por(R.GANADA), por(R.GANADA_PARCIAL), por(R.EN_CURSO), por(R.ANULADA), por(R.PERDIDA)]).toEqual([16, 2, 3, 8, 10]);
  });

  it('producto repetido en dos líneas de la misma solicitud: la solicitud cuenta una sola vez', () => {
    const solicitud = { estado: 'Pedido Parcial', productos: [{ desc: 'Bomba', estadoItem: 'Pedido' }, { desc: 'Bomba', estadoItem: 'Pedido' }] };
    expect(resumirGanadas([solicitud])).toEqual({ ganadas: 1, parciales: 0, total: 1 });
  });
});

describe('resumirGanadas y formatoGanadas', () => {
  it('cuenta solicitudes, una vez cada una, y deja fuera las que no son Ganada ni Ganada parcial', () => {
    const lista = [sol(['Pedido']), sol(['Pedido', 'Cotizado']), sol(['Venta Perdida']), sol(['Anulado']), sol(['Cotizado']), { estado: 'Pedido', productos: [] }];
    expect(resumirGanadas(lista)).toEqual({ ganadas: 1, parciales: 1, total: 6 });
  });

  it('una lista vacía o que no es una lista da ceros', () => {
    expect(resumirGanadas([])).toEqual({ ganadas: 0, parciales: 0, total: 0 });
    expect(resumirGanadas(null)).toEqual({ ganadas: 0, parciales: 0, total: 0 });
    expect(resumirGanadas(undefined)).toEqual({ ganadas: 0, parciales: 0, total: 0 });
    expect(resumirGanadas('x')).toEqual({ ganadas: 0, parciales: 0, total: 0 });
    expect(resumirGanadas({ productos: [] })).toEqual({ ganadas: 0, parciales: 0, total: 0 });
  });

  it('formatoGanadas: "N (+M parc.)" con parciales y solo "N" sin ellas', () => {
    expect(formatoGanadas({ ganadas: 16, parciales: 2 })).toBe('16 (+2 parc.)');
    expect(formatoGanadas({ ganadas: 5, parciales: 0 })).toBe('5');
    expect(formatoGanadas({ ganadas: 0, parciales: 3 })).toBe('0 (+3 parc.)');
    expect(formatoGanadas({ ganadas: 0, parciales: 0 })).toBe('0');
    expect(formatoGanadas({})).toBe('0');
    expect(formatoGanadas()).toBe('0');
  });
});
