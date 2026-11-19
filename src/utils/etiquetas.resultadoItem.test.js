import { describe, expect, it } from 'vitest';
import { CATALOGOS, resolverEtiqueta, tonoDe } from './etiquetas';
import { ESTADO_FINAL } from './estadoFinalItem';

/**
 * Etiqueta de resultado de un ítem (F8c): una entrada por cada estado final de `estadoFinalItem`, con tonos que ya existían
 * (no se añade ningún color: `check:colores` no sube).
 */
describe('etiquetas: dominio "resultadoItem"', () => {
  it.each([
    [ESTADO_FINAL.GANADO, 'Ganado', 'exito'],
    [ESTADO_FINAL.VENTA_PERDIDA, 'Venta perdida', 'peligro'],
    [ESTADO_FINAL.RECHAZO, 'Rechazo', 'peligro'],
    [ESTADO_FINAL.ANULADO, 'Anulado', 'apagado'],
    [ESTADO_FINAL.COTIZADO, 'Cotizado', 'azul'],
    [ESTADO_FINAL.PENDIENTE, 'Pendiente', 'aviso']
  ])('el estado final "%s" se muestra como "%s" con el tono %s y un icono', (estado, texto, tono) => {
    const e = resolverEtiqueta('resultadoItem', estado);
    expect(e.texto).toBe(texto);
    expect(e.tono).toBe(tono);
    expect(e.icono).toBeTruthy();
    expect(tonoDe('resultadoItem', estado)).toBe(tono);
  });

  it('cubre exactamente los seis estados finales, sin entradas de más', () => {
    expect(Object.keys(CATALOGOS.resultadoItem).sort()).toEqual(Object.values(ESTADO_FINAL).sort());
  });

  it('regla de género: el ítem es "Ganado" y la solicitud sigue siendo "Ganada" (dominio resultado)', () => {
    expect(resolverEtiqueta('resultadoItem', ESTADO_FINAL.GANADO).texto).toBe('Ganado');
    expect(resolverEtiqueta('resultado', 'ganada').texto).toBe('Ganada');
  });

  it('los textos de las decisiones coinciden con los de las decisiones del DecisionBadge (mismos tonos y palabras)', () => {
    expect(resolverEtiqueta('resultadoItem', ESTADO_FINAL.ANULADO)).toMatchObject({ texto: resolverEtiqueta('decision', 'anulacion').texto, tono: resolverEtiqueta('decision', 'anulacion').tono });
    expect(resolverEtiqueta('resultadoItem', ESTADO_FINAL.RECHAZO)).toMatchObject({ texto: resolverEtiqueta('decision', 'rechazo').texto, tono: resolverEtiqueta('decision', 'rechazo').tono });
    expect(resolverEtiqueta('resultadoItem', ESTADO_FINAL.VENTA_PERDIDA)).toMatchObject({ texto: resolverEtiqueta('decision', 'venta_perdida').texto, tono: resolverEtiqueta('decision', 'venta_perdida').tono });
  });
});
