// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BarraFiltros, FiltroBusqueda, FiltroSelect } from './index';
import { reiniciarCapasParaPruebas } from './capasAtras';
import { decidirDestino } from './hojaArrastrable';

const COMPACTA = 420;
let tiempo = 0;
let reducir = false;
const mm = () => { window.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion') ? reducir : true, addEventListener() {}, removeEventListener() {} }); };
const alto = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

beforeEach(() => {
  vi.useFakeTimers();
  tiempo = 0;
  reducir = false;
  mm();
  window.innerHeight = 800;
  vi.spyOn(performance, 'now').mockImplementation(() => tiempo);
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      if (this.getAttribute && this.getAttribute('role') === 'dialog') { if (this.style.height.includes('calc')) return 784; const h = parseFloat(this.style.height); return Number.isFinite(h) ? h : COMPACTA; }
      return 0;
    }
  });
});
afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (alto) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', alto); else delete HTMLElement.prototype.offsetHeight;
  reiniciarCapasParaPruebas();
  window.history.replaceState(null, '');
});

const Hoja = () => (
  <BarraFiltros
    busqueda={<FiltroBusqueda value="" onChange={() => {}} ariaLabel="buscar" />}
    filtros={<FiltroSelect value="" onChange={() => {}} opciones={['A', 'B']} prefijo="Estado:" ariaLabel="estado" />}
    resultados={5}
  />
);
const abrir = () => { render(<Hoja />); fireEvent.click(screen.getByRole('button', { name: /Filtros/ })); return screen.getByRole('dialog'); };
const cabecera = () => screen.getByRole('separator').parentElement;
const evento = (tipo, y) => {
  const e = new MouseEvent(tipo, { bubbles: true, cancelable: true, clientY: y });
  Object.defineProperty(e, 'timeStamp', { value: tiempo + 1000 });
  return e;
};
const avanzar = (ms = 20) => act(() => { vi.advanceTimersByTime(ms); });
/** pasos: [[y, t], ...]; suelta al final. */
const arrastrar = (pasos, objetivo = cabecera()) => {
  tiempo = pasos[0][1];
  act(() => { objetivo.dispatchEvent(evento('pointerdown', pasos[0][0])); });
  for (const [y, t] of pasos.slice(1)) { tiempo = t; act(() => { objetivo.dispatchEvent(evento('pointermove', y)); }); avanzar(16); }
  act(() => { objetivo.dispatchEvent(evento('pointerup', pasos[pasos.length - 1][0])); });
  avanzar(400);
};
const texto = () => screen.getByRole('separator').getAttribute('aria-valuetext');

describe('decidirDestino', () => {
  const base = { compacta: 420, completa: 784, inicial: 'compacta' };
  it('la velocidad manda sobre la posición (umbral 0,5 px/ms)', () => {
    expect(decidirDestino({ ...base, v: -0.6, alto: 430 })).toBe('completa');
    expect(decidirDestino({ ...base, v: 0.6, alto: 700, inicial: 'completa' })).toBe('compacta');
    expect(decidirDestino({ ...base, v: 0.6, alto: 420 })).toBe('cerrada');
    expect(decidirDestino({ ...base, v: 0.4, alto: 430 })).toBe('compacta');
  });
  it('sin velocidad: la posición más cercana entre cerrada, compacta y completa', () => {
    expect(decidirDestino({ ...base, v: 0, alto: 150 })).toBe('cerrada');
    expect(decidirDestino({ ...base, v: 0, alto: 300 })).toBe('compacta');
    expect(decidirDestino({ ...base, v: 0, alto: 650 })).toBe('completa');
    expect(decidirDestino({ ...base, v: 0.3, alto: 500 })).toBe('compacta');
  });
});

describe('Hoja arrastrable', () => {
  it('el tirador es un separator enfocable con aria-orientation, aria-valuenow y aria-label', () => {
    abrir();
    const t = screen.getByRole('separator', { name: 'Ajustar la altura de los filtros' });
    expect(t.getAttribute('aria-orientation')).toBe('horizontal');
    expect(t.getAttribute('tabindex')).toBe('0');
    expect(Number(t.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    expect(texto()).toBe('Altura compacta');
  });
  it('touch-action none solo en el tirador y la cabecera; el cuerpo conserva su scroll', () => {
    abrir();
    expect(cabecera().className).toContain('touch-none');
    const cuerpo = document.querySelector('[data-hoja-cuerpo]');
    expect(cuerpo.className).toContain('touch-pan-y');
    expect(cuerpo.className).toContain('overscroll-contain');
    expect(cuerpo.className).not.toContain('touch-none');
  });
  it('arrastrar hacia arriba lleva a completa y la hoja sigue al dedo durante el arrastre', () => {
    const hoja = abrir();
    tiempo = 0;
    act(() => { cabecera().dispatchEvent(evento('pointerdown', 700)); });
    tiempo = 400; act(() => { cabecera().dispatchEvent(evento('pointermove', 600)); }); avanzar(16);
    expect(hoja.style.transition).toBe('none');
    expect(hoja.style.height).toBe(`${COMPACTA + 100}px`);
    tiempo = 800; act(() => { cabecera().dispatchEvent(evento('pointermove', 400)); }); avanzar(16);
    expect(hoja.style.height).toBe(`${COMPACTA + 300}px`);
    act(() => { cabecera().dispatchEvent(evento('pointerup', 400)); });
    avanzar(400);
    expect(texto()).toBe('Altura completa');
    expect(hoja.style.height).toContain('100dvh');
  });
  it('resistencia elástica por encima de la altura completa', () => {
    const hoja = abrir();
    tiempo = 0; act(() => { cabecera().dispatchEvent(evento('pointerdown', 700)); });
    tiempo = 500; act(() => { cabecera().dispatchEvent(evento('pointermove', 100)); }); avanzar(16);
    const h = parseFloat(hoja.style.height);
    expect(h).toBeGreaterThan(784);
    expect(h).toBeLessThanOrEqual(784 + 14);
    act(() => { cabecera().dispatchEvent(evento('pointerup', 100)); }); avanzar(400);
  });
  it('un fling rápido hacia arriba (poco recorrido, > 0,5 px/ms) lleva a completa', () => {
    const hoja = abrir();
    arrastrar([[700, 0], [680, 15], [650, 30]]);
    expect(texto()).toBe('Altura completa');
    expect(hoja.style.height).toContain('100dvh');
  });
  it('soltar a mitad y despacio elige el estado más cercano: poco recorrido vuelve a compacta', () => {
    const hoja = abrir();
    arrastrar([[700, 0], [680, 200], [660, 400], [650, 600]]);
    expect(texto()).toBe('Altura compacta');
    expect(hoja.style.height).toBe('');
  });
  it('desde completa, hacia abajo vuelve a compacta (fling o despacio hasta la mitad)', () => {
    const hoja = abrir();
    arrastrar([[700, 0], [500, 300], [400, 600]]);
    expect(texto()).toBe('Altura completa');
    arrastrar([[200, 0], [260, 15], [330, 30]]);
    expect(texto()).toBe('Altura compacta');
    expect(hoja.style.height).toBe('');
    arrastrar([[700, 0], [500, 300], [400, 600]]);
    arrastrar([[200, 0], [300, 400], [520, 800]]);
    expect(texto()).toBe('Altura compacta');
  });
  it('desde compacta, hacia abajo cierra (fling o pasando de la mitad), con la misma salida que la X (sin doble animación)', () => {
    const hoja = abrir();
    arrastrar([[400, 0], [440, 15], [480, 30]]);
    expect(hoja.getAttribute('data-saliendo')).toBe('true');
    expect(hoja.style.transform).toBe('translateY(100%)');
    expect(hoja.style.animation).toBe('none');
    avanzar(300);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('desde compacta, soltar despacio por debajo de la mitad también cierra', () => {
    abrir();
    arrastrar([[400, 0], [500, 300], [660, 900]]);
    avanzar(300);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('arrastrar la cabecera (no solo el tirador) también funciona; los botones de la cabecera no inician arrastre', () => {
    const hoja = abrir();
    const titulo = screen.getByRole('heading', { name: 'Filtros' });
    arrastrar([[700, 0], [650, 15], [600, 30]], titulo);
    expect(texto()).toBe('Altura completa');
    arrastrar([[300, 0], [340, 15], [380, 30]], screen.getByRole('button', { name: 'Cerrar filtros' }));
    expect(texto()).toBe('Altura completa');
    expect(hoja.getAttribute('data-saliendo')).toBe('false');
  });
  it('teclado: ArrowUp → completa, ArrowDown → compacta y de nuevo → cierra; Escape sigue cerrando', () => {
    const hoja = abrir();
    const t = screen.getByRole('separator');
    fireEvent.keyDown(t, { key: 'ArrowUp' }); avanzar(400);
    expect(texto()).toBe('Altura completa');
    fireEvent.keyDown(t, { key: 'ArrowDown' }); avanzar(400);
    expect(texto()).toBe('Altura compacta');
    fireEvent.keyDown(t, { key: 'ArrowDown' });
    expect(hoja.getAttribute('data-saliendo')).toBe('true');
    avanzar(300);
    expect(screen.queryByRole('dialog')).toBeNull();
    cleanup();
    abrir();
    fireEvent.keyDown(document, { key: 'Escape' }); avanzar(300);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('abrir una fila lleva a completa y al cerrarla vuelve a compacta; si ya estaba completa, se queda', () => {
    const hoja = abrir();
    fireEvent.click(screen.getByRole('combobox', { name: 'estado' })); avanzar(400);
    expect(texto()).toBe('Altura completa');
    expect(hoja.style.height).toContain('100dvh');
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'estado' }), { key: 'Escape' }); avanzar(400);
    expect(texto()).toBe('Altura compacta');
    expect(hoja.style.height).toBe('');
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowUp' }); avanzar(400);
    fireEvent.click(screen.getByRole('combobox', { name: 'estado' })); avanzar(400);
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'estado' }), { key: 'Escape' }); avanzar(400);
    expect(texto()).toBe('Altura completa');
  });
  it('cerrar arrastrando retira la entrada del historial igual que la X', async () => {
    abrir();
    avanzar(50);
    expect(window.history.state.filtros).toBe(1);
    arrastrar([[400, 0], [440, 15], [480, 30]]);
    avanzar(100); avanzar(100);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((window.history.state && window.history.state.filtros) || undefined).toBeUndefined();
  });
  it('el pie "Ver N resultados" sigue en la hoja en ambos estados', () => {
    abrir();
    expect(screen.getByRole('button', { name: 'Ver 5 resultados' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowUp' }); avanzar(400);
    expect(screen.getByRole('button', { name: 'Ver 5 resultados' })).toBeTruthy();
  });
  it('animación con los tokens al soltar; con prefers-reduced-motion no hay animación pero el arrastre funciona', () => {
    const hoja = abrir();
    arrastrar([[700, 0], [680, 15], [650, 30]]);
    cleanup();
    reducir = true; mm();
    const hoja2 = abrir();
    tiempo = 0; act(() => { cabecera().dispatchEvent(evento('pointerdown', 700)); });
    tiempo = 400; act(() => { cabecera().dispatchEvent(evento('pointermove', 600)); }); avanzar(16);
    expect(hoja2.style.height).toBe(`${COMPACTA + 100}px`);
    tiempo = 800; act(() => { cabecera().dispatchEvent(evento('pointermove', 400)); }); avanzar(16);
    act(() => { cabecera().dispatchEvent(evento('pointerup', 400)); });
    expect(texto()).toBe('Altura completa');
    expect(hoja2.style.transition).toBe('');
    expect(hoja2.style.height).toContain('100dvh');
    expect(hoja).toBeTruthy();
  });
  it('al soltar anima la altura con --anim-abrir / --anim-cerrar', () => {
    const hoja = abrir();
    tiempo = 0; act(() => { cabecera().dispatchEvent(evento('pointerdown', 700)); });
    tiempo = 10; act(() => { cabecera().dispatchEvent(evento('pointermove', 650)); }); avanzar(16);
    act(() => { cabecera().dispatchEvent(evento('pointerup', 650)); });
    expect(hoja.style.transition).toContain('var(--anim-abrir)');
    expect(hoja.style.transition).toContain('var(--ease-abrir)');
    avanzar(400);
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowDown' });
    expect(hoja.style.transition).toContain('var(--anim-cerrar)');
    expect(hoja.style.transition).toContain('var(--ease-cerrar)');
  });
});
