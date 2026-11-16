// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { PopoverBarra } from './PopoverBarra';
import { TONOS } from '../utils/etiquetas';
import { SEGMENTOS_VOLUMEN, segmentosDeVolumen } from '../views/analisis/utils/segmentosVolumen';

const SEGMENTOS = [
  { clave: 'ganado', tono: 'exito', texto: 'Ganado', valor: 20 },
  { clave: 'ventaPerdida', tono: 'peligro', texto: 'Venta perdida', valor: 0 },
  { clave: 'rechazo', tono: 'peligro', texto: 'Rechazo', valor: 1 }
];
const globo = () => document.querySelector('[data-popover-barra]');

/** jsdom no mide: se simulan el viewport, la barra (ancla) y el tamaño del globo (256 × alto). */
const geometria = ({ barra, vw = 1280, vh = 800, alto = 220 }) => {
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: vw });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(256);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(alto);
  const ancla = { current: document.createElement('button') };
  document.body.appendChild(ancla.current);
  const { left, top, width = 140, height = 6 } = barra;
  ancla.current.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height });
  return ancla;
};
const montar = (ancla, extra = {}) => {
  const alCerrar = vi.fn();
  render(<PopoverBarra id="p1" ancla={ancla} segmentos={SEGMENTOS} titulo="Volumen por estado" unidad="u." claveActiva={null} alCerrar={alCerrar} {...extra} />);
  return alCerrar;
};
const posicion = () => ({ left: parseFloat(globo().style.left), top: parseFloat(globo().style.top), dir: globo().dataset.dir, maxAlto: globo().style.maxHeight });

beforeEach(() => { document.body.innerHTML = ''; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const filasDe = () => [...globo().querySelectorAll('li')].map((f) => f.textContent.replace(/\s+/g, ' ').trim());
const seis = { ganado: 20, pendiente: 8, cotizado: 116, anulado: 12, ventaPerdida: 44, rechazo: 8 };

describe('PopoverBarra: contenido', () => {
  it('es un diálogo con título, total y una fila por estado con unidades, con su porcentaje; los estados en 0 no aparecen', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla);
    expect(globo().getAttribute('role')).toBe('dialog');
    expect(globo().getAttribute('aria-label')).toBe('Volumen por estado: desglose por estado');
    expect(globo().querySelector('p').textContent).toContain('21 u.');
    expect(filasDe()).toEqual(['Ganado20 u.95 %', 'Rechazo1 u.5 %']);
    expect(globo().textContent).not.toContain('Venta perdida');
  });

  it('un solo estado con unidades: una sola fila con 100 %', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla, { segmentos: segmentosDeVolumen({ ganado: 11 }) });
    expect(filasDe()).toEqual(['Ganado11 u.100 %']);
    expect(globo().querySelectorAll('li')).toHaveLength(1);
  });

  it('tres estados: tres filas en el orden fijo', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla, { segmentos: segmentosDeVolumen({ rechazo: 5, ganado: 10, cotizado: 5 }) });
    expect(filasDe()).toEqual(['Ganado10 u.50 %', 'Cotizado5 u.25 %', 'Rechazo5 u.25 %']);
  });

  it('seis estados: seis filas en el orden Ganado, Pendiente, Cotizado, Anulado, Venta perdida y Rechazo', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla, { segmentos: segmentosDeVolumen(seis) });
    expect([...globo().querySelectorAll('li')].map((f) => f.dataset.clave)).toEqual(['ganado', 'pendiente', 'cotizado', 'anulado', 'ventaPerdida', 'rechazo']);
    expect(filasDe()).toEqual(['Ganado20 u.10 %', 'Pendiente8 u.4 %', 'Cotizado116 u.56 %', 'Anulado12 u.6 %', 'Venta perdida44 u.21 %', 'Rechazo8 u.4 %']);
  });

  it('un valor menor que 1 % sigue apareciendo, rotulado "<1 %"', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla, { segmentos: segmentosDeVolumen({ ganado: 1, cotizado: 999 }) });
    expect(filasDe()).toEqual(['Ganado1 u.<1 %', 'Cotizado999 u.100 %']);
  });

  it('con todos los estados en 0 (o sin segmentos) no pinta nada: no queda un popover vacío', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla, { segmentos: segmentosDeVolumen({}) });
    expect(globo()).toBeNull();
    cleanup();
    montar(ancla, { segmentos: [] });
    expect(globo()).toBeNull();
  });

  it('cada fila usa la Etiqueta de su estado con el tono del catálogo (TONOS), no un relleno de la barra', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla, { segmentos: segmentosDeVolumen(seis) });
    const tonoPorEstado = Object.fromEntries(SEGMENTOS_VOLUMEN.map((e) => [e.clave, e.tono]));
    expect(tonoPorEstado).toEqual({ ganado: 'exito', pendiente: 'info', cotizado: 'aviso', anulado: 'apagado', ventaPerdida: 'peligro', rechazo: 'peligro' });
    [...globo().querySelectorAll('li')].forEach((fila) => {
      const pastilla = fila.firstChild;
      expect(pastilla.className).toContain(TONOS[tonoPorEstado[fila.dataset.clave]]);
      expect(pastilla.className).toMatch(/bg-tag-[a-z]+-soft/);
      expect(pastilla.className).not.toContain('-barra');
      expect(pastilla.className).toContain('h-6');
    });
  });

  it('las filas no van atenuadas y la activa se resalta solo con el fondo neutro de fila (bg-slate-100)', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla, { claveActiva: 'rechazo' });
    const [ganado, rechazo] = globo().querySelectorAll('li');
    expect(globo().innerHTML).not.toContain('opacity-');
    expect(rechazo.dataset.activo).toBe('true');
    expect(rechazo.className).toContain('bg-slate-100');
    expect(ganado.dataset.activo).toBeUndefined();
    expect(ganado.className).not.toContain('bg-slate-100');
  });

  it('mide 256 px de ancho con cualquier número de filas: más que las barras de la tarjeta Top (138 a 146 px) y cabe en 393 px', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla);
    expect(globo().style.width).toBe('256px');
    cleanup();
    montar(ancla, { segmentos: segmentosDeVolumen({ ganado: 3 }) });
    expect(globo().style.width).toBe('256px');
  });

  it('usa la superficie flotante del proyecto, sin borde', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla);
    expect(globo().className).toContain('surface-flotante');
    expect(globo().className).not.toMatch(/\bborder\b/);
    expect(globo().className).toContain('popover-barra');
  });
});

describe('PopoverBarra: posición', () => {
  it('centrado bajo la barra, a 8 px de ella', () => {
    const ancla = geometria({ barra: { left: 500, top: 300, width: 140 } });
    montar(ancla);
    // centro de la barra = 570; el globo mide 256 → left = 442; debajo: bottom 306 + 8
    expect(posicion()).toMatchObject({ left: 442, top: 314, dir: 'abajo' });
  });

  it('empujado hacia dentro cerca del borde izquierdo y del derecho (8 px de margen)', () => {
    const izquierda = geometria({ barra: { left: 20, top: 300, width: 140 } });
    montar(izquierda);
    expect(posicion().left).toBe(8);
    cleanup(); document.body.innerHTML = '';
    const derecha = geometria({ barra: { left: 1200, top: 300, width: 140 }, vw: 1280 });
    montar(derecha);
    expect(posicion().left).toBe(1280 - 256 - 8);
  });

  it('en 393 px de ancho no se sale: queda dentro de [8, 393 - 256 - 8]', () => {
    const ancla = geometria({ barra: { left: 250, top: 300, width: 138 }, vw: 393, vh: 760 });
    montar(ancla);
    expect(posicion().left).toBe(393 - 256 - 8);
    expect(posicion().left + 256).toBeLessThanOrEqual(393 - 8);
  });

  it('sube encima de la barra si debajo no cabe y arriba hay más sitio', () => {
    const ancla = geometria({ barra: { left: 500, top: 700 }, vh: 800, alto: 220 });
    montar(ancla);
    // arriba: 700 - 8 - 220 = 472
    expect(posicion()).toMatchObject({ dir: 'arriba', top: 472 });
  });

  it('el alto cambia con las filas: el mismo sitio libre debajo basta para 1 y 3 filas, pero no para 6', () => {
    // barra en y 640 de 800: debajo quedan 800 - 646 - 16 = 138 px
    [[90, 'abajo'], [130, 'abajo'], [146, 'arriba'], [227, 'arriba']].forEach(([alto, dir]) => {
      cleanup(); document.body.innerHTML = '';
      const ancla = geometria({ barra: { left: 500, top: 640 }, vh: 800, alto });
      montar(ancla);
      expect(posicion().dir).toBe(dir);
    });
  });

  it('con pocas filas el globo no se pega a la barra: sigue a 8 px, encima o debajo', () => {
    const debajo = geometria({ barra: { left: 500, top: 300 }, alto: 90 });
    montar(debajo);
    expect(posicion().top).toBe(314);
    cleanup(); document.body.innerHTML = '';
    const encima = geometria({ barra: { left: 500, top: 700 }, vh: 800, alto: 90 });
    montar(encima, { segmentos: segmentosDeVolumen({ ganado: 4 }) });
    // 700 - 8 - 90: cabe debajo? 800 - 706 - 16 = 78 < 90, así que sube
    expect(posicion()).toMatchObject({ dir: 'arriba', top: 602 });
  });

  it('con el empuje horizontal el ancho se mantiene en 256 px también con una fila', () => {
    const ancla = geometria({ barra: { left: 20, top: 300, width: 140 }, vw: 393, alto: 90 });
    montar(ancla, { segmentos: segmentosDeVolumen({ ganado: 4 }) });
    expect(posicion().left).toBe(8);
    expect(globo().style.width).toBe('256px');
  });

  it('si no cabe ni arriba ni abajo toma el lado con más sitio y limita su alto', () => {
    const ancla = geometria({ barra: { left: 500, top: 150 }, vh: 400, alto: 500 });
    montar(ancla);
    const p = posicion();
    expect(p.dir).toBe('abajo');
    expect(p.maxAlto).toBe('228px'); // 400 - 156 - 8 - 8
    expect(p.top).toBe(164);
  });

  it('se cierra si al hacer scroll la barra sale del viewport', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    const alCerrar = montar(ancla);
    ancla.current.getBoundingClientRect = () => ({ left: 500, top: -50, width: 140, height: 6, right: 640, bottom: -44 });
    fireEvent.scroll(window);
    expect(alCerrar).toHaveBeenCalled();
  });

  it('se reposiciona con scroll y resize', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    montar(ancla);
    ancla.current.getBoundingClientRect = () => ({ left: 500, top: 340, width: 140, height: 6, right: 640, bottom: 346 });
    fireEvent.scroll(window);
    expect(posicion().top).toBe(354);
    ancla.current.getBoundingClientRect = () => ({ left: 500, top: 360, width: 140, height: 6, right: 640, bottom: 366 });
    fireEvent(window, new Event('resize'));
    expect(posicion().top).toBe(374);
  });

  it('el origen de la animación sale del centro de la barra, medido desde el borde del globo', () => {
    const ancla = geometria({ barra: { left: 20, top: 300, width: 140 } });
    montar(ancla);
    // globo en left 8; centro de la barra 90 → origen 82
    expect(globo().style.getPropertyValue('--origen-x')).toBe('82px');
  });
});

describe('PopoverBarra: cierre', () => {
  it('Escape pide cerrar devolviendo el foco', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    const alCerrar = montar(ancla);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(alCerrar).toHaveBeenCalledWith({ devolverFoco: true });
  });

  it('otra tecla no cierra', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    const alCerrar = montar(ancla);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(alCerrar).not.toHaveBeenCalled();
  });

  it('pulsar fuera cierra; dentro del globo o sobre la barra, no', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    const alCerrar = montar(ancla);
    fireEvent.pointerDown(globo());
    fireEvent.pointerDown(ancla.current);
    expect(alCerrar).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('al desmontar quita sus oyentes', () => {
    const ancla = geometria({ barra: { left: 500, top: 300 } });
    const alCerrar = vi.fn();
    const { unmount } = render(<PopoverBarra id="p" ancla={ancla} segmentos={SEGMENTOS} titulo="T" unidad="u." claveActiva={null} alCerrar={alCerrar} />);
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.pointerDown(document.body);
    expect(alCerrar).not.toHaveBeenCalled();
  });
});
