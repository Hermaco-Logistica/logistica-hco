// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FiltroPestanas, FiltroSegmentado } from './index';

/**
 * useCarrusel / FlechaCarrusel y la variante `carrusel` de FiltroSegmentado. jsdom no calcula layout: se simulan los tamaños del scroller
 * (ancho visible 300, contenido 600) y un ResizeObserver que mide al observar.
 */
const OPCIONES = [
  { value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: 'this_month', label: 'Este Mes' }, { value: '90d', label: '90D' },
  { value: 'this_year', label: 'Este Año' }, { value: 'custom', label: 'Rango' }, { value: 'historico', label: 'Histórico' }
];
const TABS = OPCIONES.map((o) => ({ id: o.value, label: o.label }));

const originales = {};
const definir = (proto, nombre, valor) => {
  originales[`${proto.constructor.name}.${nombre}`] = [proto, nombre, Object.getOwnPropertyDescriptor(proto, nombre)];
  Object.defineProperty(proto, nombre, { configurable: true, ...valor });
};

beforeEach(() => {
  globalThis.ResizeObserver = class { constructor(f) { this.f = f; } observe() { this.f(); } disconnect() {} };
  definir(HTMLElement.prototype, 'clientWidth', { get: () => 300 });
  definir(HTMLElement.prototype, 'scrollWidth', { get: () => 600 });
  Element.prototype.scrollBy = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
});
afterEach(() => {
  cleanup();
  Object.values(originales).forEach(([proto, nombre, desc]) => { if (desc) Object.defineProperty(proto, nombre, desc); else delete proto[nombre]; });
  delete globalThis.ResizeObserver;
});

const flecha = (container, lado) => container.querySelector(`[data-flecha="${lado}"]`);
const scroller = (container) => container.querySelector('[data-carrusel]');

describe('FiltroSegmentado carrusel', () => {
  const montar = (props = {}) => render(<FiltroSegmentado carrusel ariaLabel="Período" opciones={OPCIONES} value="this_year" onChange={() => {}} {...props} />);

  it('es un grupo con todas las opciones, con la pista gris del segmentado y sin barra de desplazamiento', () => {
    const { container } = montar();
    const grupo = screen.getByRole('group', { name: 'Período' });
    expect([...grupo.querySelectorAll('button')].filter((b) => !b.hasAttribute('data-flecha')).map((b) => b.textContent)).toEqual(['7D', '30D', 'Este Mes', '90D', 'Este Año', 'Rango', 'Histórico']);
    expect(grupo.className).toContain('bg-slate-100');
    expect(grupo.className).toContain('rounded-xl');
    expect(grupo.className).toContain('h-11');
    expect(scroller(container).className).toContain('[scrollbar-width:none]');
    expect(screen.getByRole('button', { name: 'Este Año' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Este Año' }).className).toContain('bg-segmento-activo');
  });

  it('al inicio solo hay flecha a la derecha, dentro de la pista (right-1.5), y el difuminado es solo a la derecha', () => {
    const { container } = montar();
    expect(flecha(container, 'der').getAttribute('data-visible')).toBe('true');
    expect(flecha(container, 'izq').getAttribute('data-visible')).toBe('false');
    expect(flecha(container, 'der').className).toContain('right-1.5');
    expect(flecha(container, 'izq').className).toContain('left-1.5');
    expect(flecha(container, 'der').className).toContain('size-6');
    expect(scroller(container).getAttribute('data-fade-der')).toBe('true');
    expect(scroller(container).getAttribute('data-fade-izq')).toBe('false');
  });

  it('las flechas desplazan ~70 % del ancho visible y se ocultan en el extremo', () => {
    const { container } = montar();
    fireEvent.click(flecha(container, 'der'));
    expect(Element.prototype.scrollBy).toHaveBeenLastCalledWith({ left: 210, behavior: 'smooth' });
    const el = scroller(container);
    el.scrollLeft = 100; fireEvent.scroll(el);
    expect(flecha(container, 'izq').getAttribute('data-visible')).toBe('true');
    expect(flecha(container, 'der').getAttribute('data-visible')).toBe('true');
    fireEvent.click(flecha(container, 'izq'));
    expect(Element.prototype.scrollBy).toHaveBeenLastCalledWith({ left: -210, behavior: 'smooth' });
    el.scrollLeft = 300; fireEvent.scroll(el);
    expect(flecha(container, 'der').getAttribute('data-visible')).toBe('false');
    expect(flecha(container, 'izq').getAttribute('data-visible')).toBe('true');
  });

  it('con movimiento reducido las flechas desplazan sin animación', () => {
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    const { container } = montar();
    fireEvent.click(flecha(container, 'der'));
    expect(Element.prototype.scrollBy).toHaveBeenLastCalledWith({ left: 210, behavior: 'auto' });
  });

  it('centra la opción activa al montar y al elegirla (scrollIntoView inline center)', () => {
    const { rerender } = montar();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'nearest', inline: 'center' });
    Element.prototype.scrollIntoView.mockClear();
    rerender(<FiltroSegmentado carrusel ariaLabel="Período" opciones={OPCIONES} value="historico" onChange={() => {}} />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });

  it('elegir una opción llama a onChange, también la que ya está activa', () => {
    const onChange = vi.fn();
    montar({ onChange });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    fireEvent.click(screen.getByRole('button', { name: 'Este Año' }));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['custom', 'this_year']);
  });

  it('es excluyente con colapsable: no colapsa a desplegable aunque la celda no quepa', () => {
    montar({ colapsable: true });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('group', { name: 'Período' })).toBeTruthy();
  });

  it('sin la variante, el segmentado de escritorio no cambia: sin flechas ni scroller', () => {
    const { container } = render(<FiltroSegmentado ariaLabel="Período" opciones={OPCIONES} value="this_year" onChange={() => {}} />);
    expect(container.querySelector('[data-flecha]')).toBeNull();
    expect(container.querySelector('[data-carrusel]')).toBeNull();
    expect(scroller(container)).toBeNull();
  });
});

describe('FiltroPestanas: flechas y recorte independientes de sticky', () => {
  it('con sticky las flechas y el recorte son los de siempre (por defecto)', () => {
    const { container } = render(<FiltroPestanas sticky ariaLabel="Estado" opciones={TABS} value="7d" onChange={() => {}} />);
    expect(flecha(container, 'der')).toBeTruthy();
    expect(flecha(container, 'izq')).toBeTruthy();
    expect(flecha(container, 'der').className).toContain('right-[calc(var(--tf-pad-x)+6px)]');
  });

  it('sin sticky no hay flechas por defecto, pero se pueden pedir con `flechas` (dentro de la tira)', () => {
    const a = render(<FiltroPestanas ariaLabel="Estado" opciones={TABS} value="7d" onChange={() => {}} />);
    expect(a.container.querySelector('[data-flecha]')).toBeNull();
    a.unmount();
    const b = render(<FiltroPestanas flechas ariaLabel="Estado" opciones={TABS} value="7d" onChange={() => {}} />);
    expect(flecha(b.container, 'der').className).toContain('right-1.5');
    expect(flecha(b.container, 'der').getAttribute('data-visible')).toBe('true');
    b.unmount();
    const c = render(<FiltroPestanas sticky flechas={false} ariaLabel="Estado" opciones={TABS} value="7d" onChange={() => {}} />);
    expect(c.container.querySelector('[data-flecha]')).toBeNull();
  });
});
