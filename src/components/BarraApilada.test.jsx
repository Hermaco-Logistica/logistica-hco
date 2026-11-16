// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { BarraApilada } from './BarraApilada';
import { clasesSegmento } from '../utils/etiquetas';
import { reiniciarObservadorVisible } from '../utils/observadorVisible';
import { reiniciarPopoverUnico } from '../utils/popoverUnico';

const SEGMENTOS = [
  { clave: 'ganado', tono: 'exito', texto: 'Ganado', valor: 20 },
  { clave: 'pendiente', tono: 'info', texto: 'Pendiente', valor: 0 },
  { clave: 'cotizado', tono: 'aviso', texto: 'Cotizado', valor: 124 },
  { clave: 'anulado', tono: 'apagado', texto: 'Anulado', valor: 0 },
  { clave: 'ventaPerdida', tono: 'peligro', texto: 'Venta perdida', valor: 44 },
  { clave: 'rechazo', tono: 'peligro', texto: 'Rechazo', valor: 8 }
];
const barraDe = (container) => container.querySelector('.barra-apilada');
const dialogo = () => document.querySelector('[data-popover-barra]');
const filas = () => [...document.querySelectorAll('[data-popover-barra] li')];

/** jsdom no tiene layout: cada segmento mide 100 px de ancho en su posición (--i) y la barra empieza en x = 0. */
const simularGeometria = () => vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function medir() {
  if (this.classList.contains('barra-seg')) { const i = Number(this.style.getPropertyValue('--i')); return { left: i * 100, right: i * 100 + 100, top: 100, bottom: 106, width: 100, height: 6 }; }
  return { left: 0, right: 400, top: 100, bottom: 106, width: 400, height: 6 };
});

beforeEach(() => { reiniciarPopoverUnico(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); reiniciarPopoverUnico(); });

describe('BarraApilada: forma y texto', () => {
  it('es un botón con aria-haspopup, aria-expanded y un aria-label que lista solo los segmentos no vacíos', () => {
    const { container } = render(<BarraApilada titulo="Volumen por estado" unidad="u." segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    expect(barra.tagName).toBe('BUTTON');
    expect(barra.getAttribute('type')).toBe('button');
    expect(barra.getAttribute('aria-haspopup')).toBe('dialog');
    expect(barra.getAttribute('aria-expanded')).toBe('false');
    expect(barra.hasAttribute('aria-controls')).toBe(false);
    expect(barra.getAttribute('aria-label')).toBe('Volumen por estado: Ganado 20 u., Cotizado 124 u., Venta perdida 44 u., Rechazo 8 u.');
  });

  it('se enfoca con Tab: es un botón nativo sin tabindex negativo', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    expect(barraDe(container).getAttribute('tabindex')).not.toBe('-1');
  });

  it('no dibuja los segmentos en cero ni lleva title nativo (el desglose está en el popover)', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    expect(barra.children).toHaveLength(4);
    expect(barra.getAttribute('aria-label')).not.toContain('Anulado');
    [...barra.children].forEach((s) => expect(s.hasAttribute('title')).toBe(false));
  });

  it('mide 10 px de alto y tiene los extremos redondeados: la barra redondea y solo el primer y último segmento', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    expect(barra.style.height).toBe('10px');
    expect(barra.className).not.toMatch(/bg-slate/); // sin pista: el hueco entre segmentos deja ver la superficie de detrás
    expect(barra.className).not.toMatch(/\bh-\d/);
    expect(barra.className).toMatch(/\brounded-full\b/);
    expect(barra.className).not.toMatch(/\bgap-/);
    [...barra.children].forEach((s) => expect(s.className).not.toMatch(/(^|\s)rounded-/));
    const [primero, , , ultimo] = barra.children;
    expect(primero.className).toContain('first:rounded-l-full');
    expect(ultimo.className).toContain('last:rounded-r-full');
  });

  it('cada segmento lleva su flex-grow proporcional con ancho mínimo de 3 px', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const [ganado, cotizado] = barraDe(container).children;
    expect(ganado.style.flexGrow).toBe('20');
    expect(cotizado.style.flexGrow).toBe('124');
    expect(ganado.style.minWidth).toBe('3px');
  });

  it('el resalte crece 2 px sea cual sea el alto: --escala-resalte = (alto + 2) / alto', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    expect(barraDe(container).style.getPropertyValue('--escala-resalte')).toBe('1.2');
  });

  it('los colores salen de clasesSegmento: solo el fondo suave de la Etiqueta del estado', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const clases = [...barraDe(container).children].map((s) => s.className);
    expect(clases[0]).toContain(clasesSegmento('exito'));
    expect(clases[1]).toContain(clasesSegmento('aviso'));
    expect(clases[2]).toContain(clasesSegmento('peligro'));
    expect(clases[3]).toContain(clasesSegmento('peligro'));
    clases.forEach((c) => { expect(c).toMatch(/bg-tag-[a-z]+-soft/); expect(c).not.toContain('inset-ring'); expect(c).not.toContain('-barra'); });
  });

  it('sin contorno ni borde ni separador blanco: venta perdida y rechazo se pintan igual y un segmento de 3 px mide 3 px', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    [...barraDe(container).children].forEach((s) => {
      expect(s.className).not.toMatch(/(^|\s)border/);
      expect(s.className).not.toContain('border-white');
    });
    expect([...barraDe(container).children][0].style.minWidth).toBe('3px');
  });

  it('el separador es un hueco de 2 px entre segmentos (gap del contenedor): sin color propio, sin márgenes, sin bordes y sin elementos extra', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    expect(barra.style.columnGap).toBe('2px');
    expect(barra.children).toHaveLength(4);
    expect(barra.className).not.toMatch(/(^|\s)(p[xylrtb]?-|gap-|bg-white)/);
    [...barra.children].forEach((s) => {
      expect(s.tagName).toBe('SPAN');
      expect(s.style.marginLeft).toBe('');
      expect(s.style.marginRight).toBe('');
      expect(s.style.minWidth).toBe('3px');
      expect(s.className).not.toMatch(/(^|\s)(m[xylrtb]?-|border|bg-white)/);
    });
  });

  it('no recorta con overflow-hidden (el segmento resaltado crece 2 px por encima y por debajo de la barra); los extremos los redondean el primero y el último', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    expect(barraDe(container).className).not.toMatch(/overflow-hidden/);
    expect(barraDe(container).className).toMatch(/\brounded-full\b/);
    const hijos = [...barraDe(container).children];
    expect(hijos[0].className).toContain('first:rounded-l-full');
    expect(hijos[hijos.length - 1].className).toContain('last:rounded-r-full');
  });

  it('con dos segmentos hay un solo hueco entre ellos y ningún elemento antes ni después; con uno solo no hay nada que separar', () => {
    const dos = render(<BarraApilada segmentos={[{ clave: 'ganado', tono: 'exito', texto: 'Ganado', valor: 3 }, { clave: 'cotizado', tono: 'aviso', texto: 'Cotizado', valor: 7 }]} />);
    expect(barraDe(dos.container).children).toHaveLength(2);
    expect(barraDe(dos.container).style.columnGap).toBe('2px');
    cleanup();
    const uno = render(<BarraApilada segmentos={[{ clave: 'ganado', tono: 'exito', texto: 'Ganado', valor: 3 }, { clave: 'cotizado', tono: 'aviso', texto: 'Cotizado', valor: 0 }]} />);
    expect(barraDe(uno.container).children).toHaveLength(1);
    expect(barraDe(uno.container).children[0].style.minWidth).toBe('3px');
  });

  it('el separador no pinta nada propio: ningún segmento ni la barra llevan un color escrito para él (los segmentos solo llevan bg-tag-*-soft)', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    [...barraDe(container).children].forEach((s) => expect(s.className.match(/bg-[\w/-]+/g)).toEqual([expect.stringMatching(/^bg-tag-[a-z]+-soft$/)]));
  });

  it('no pinta nada con el total en cero o sin segmentos', () => {
    expect(render(<BarraApilada segmentos={[{ clave: 'ganado', tono: 'exito', texto: 'Ganado', valor: 0 }]} />).container.firstChild).toBeNull();
    expect(render(<BarraApilada />).container.firstChild).toBeNull();
  });
});

describe('BarraApilada: popover', () => {
  it('abre con un clic: aria-expanded, aria-controls y un único diálogo en <body> (no dentro de la barra) con el desglose de los estados que tienen unidades', () => {
    const { container } = render(<BarraApilada titulo="Volumen por estado" unidad="u." segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    expect(dialogo()).toBeNull();
    fireEvent.click(barra);
    expect(barra.getAttribute('aria-expanded')).toBe('true');
    expect(dialogo()).not.toBeNull();
    expect(container.contains(dialogo())).toBe(false);
    expect(barra.getAttribute('aria-controls')).toBe(dialogo().id);
    expect(dialogo().getAttribute('role')).toBe('dialog');
    expect(filas().map((f) => f.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      'Ganado20 u.10 %', 'Cotizado124 u.63 %', 'Venta perdida44 u.22 %', 'Rechazo8 u.4 %'
    ]);
    expect(dialogo().textContent).toContain('196 u.');
  });

  it('no lista los estados en 0 y sus filas coinciden con los segmentos del aria-label de la barra', () => {
    const { container } = render(<BarraApilada titulo="Volumen por estado" unidad="u." segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    fireEvent.click(barra, { detail: 0 });
    const delAria = barra.getAttribute('aria-label').replace('Volumen por estado: ', '').split(', ');
    const delPopover = filas().map((f) => `${f.firstChild.textContent} ${f.querySelector('.font-semibold').textContent}`);
    expect(delPopover).toEqual(delAria);
    expect(dialogo().textContent).not.toContain('Pendiente');
    expect(dialogo().textContent).not.toContain('Anulado');
  });

  it('un solo estado con unidades: una sola fila con 100 %', () => {
    const { container } = render(<BarraApilada unidad="u." segmentos={[{ clave: 'ganado', tono: 'exito', texto: 'Ganado', valor: 11 }, { clave: 'rechazo', tono: 'peligro', texto: 'Rechazo', valor: 0 }]} />);
    fireEvent.click(barraDe(container), { detail: 0 });
    expect(filas().map((f) => f.textContent.replace(/\s+/g, ' ').trim())).toEqual(['Ganado11 u.100 %']);
  });

  it('con todos los estados en 0 no hay botón ni popover; si el popover estaba abierto y los valores pasan a 0, se cierra y no queda vacío', () => {
    const ceros = SEGMENTOS.map((s) => ({ ...s, valor: 0 }));
    const { container, rerender } = render(<BarraApilada segmentos={ceros} />);
    expect(container.querySelector('button')).toBeNull();
    expect(dialogo()).toBeNull();
    rerender(<BarraApilada segmentos={SEGMENTOS} />);
    fireEvent.click(barraDe(container), { detail: 0 });
    expect(dialogo()).not.toBeNull();
    rerender(<BarraApilada segmentos={ceros} />);
    expect(dialogo()).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('el desglose usa una Etiqueta compacta por estado con su tono, sin clases tag-* escritas en la vista', () => {
    fireEvent.click(barraDe(render(<BarraApilada segmentos={SEGMENTOS} />).container));
    const etiquetas = filas().map((f) => f.firstChild.className);
    // filas con unidades: ganado, cotizado, venta perdida y rechazo
    expect(etiquetas[0]).toContain('bg-tag-exito-soft');
    expect(etiquetas[1]).toContain('bg-tag-aviso-soft');
    expect(etiquetas[2]).toContain('bg-tag-peligro-soft');
    expect(etiquetas[3]).toContain('bg-tag-peligro-soft');
    expect(etiquetas[0]).toContain('h-6');
  });

  it('el segmento tocado queda resaltado en la lista: el de venta perdida y el de rechazo, por separado', () => {
    simularGeometria();
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    // visibles: ganado 0-100, cotizado 100-200, venta perdida 200-300, rechazo 300-400
    fireEvent.click(barra, { clientX: 250, detail: 1 });
    expect(filas().filter((f) => f.dataset.activo === 'true').map((f) => f.dataset.clave)).toEqual(['ventaPerdida']);
    fireEvent.click(barra, { clientX: 350, detail: 1 });
    expect(filas().filter((f) => f.dataset.activo === 'true').map((f) => f.dataset.clave)).toEqual(['rechazo']);
    expect(barra.getAttribute('aria-expanded')).toBe('true');
  });

  it('el segmento tocado queda engrosado mientras el popover está abierto', () => {
    simularGeometria();
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    fireEvent.click(barra, { clientX: 150, detail: 1 });
    expect([...barra.children].map((s) => s.dataset.seleccion)).toEqual([undefined, 'true', undefined, undefined]);
    fireEvent.click(barra, { clientX: 150, detail: 1 });
    expect([...barra.children].every((s) => s.dataset.seleccion === undefined)).toBe(true);
  });

  it('se abre con el teclado (clic con detail 0, lo que hace Enter o Espacio) sin segmento resaltado', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    fireEvent.click(barraDe(container), { detail: 0 });
    expect(dialogo()).not.toBeNull();
    expect(filas().some((f) => f.dataset.activo === 'true')).toBe(false);
  });

  it('un segundo clic sobre el mismo segmento cierra el popover', () => {
    simularGeometria();
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    fireEvent.click(barra, { clientX: 50, detail: 1 });
    fireEvent.click(barra, { clientX: 50, detail: 1 });
    expect(dialogo()).toBeNull();
    expect(barra.getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape cierra y devuelve el foco a la barra', () => {
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    fireEvent.click(barra, { detail: 0 });
    expect(document.activeElement).not.toBe(barra);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dialogo()).toBeNull();
    expect(document.activeElement).toBe(barra);
  });

  it('pulsar fuera cierra; pulsar dentro del popover o en la barra no lo cierra', () => {
    const { container } = render(<div><BarraApilada segmentos={SEGMENTOS} /><p data-testid="fuera">fuera</p></div>);
    fireEvent.click(barraDe(container), { detail: 0 });
    fireEvent.pointerDown(dialogo());
    fireEvent.pointerDown(barraDe(container));
    expect(dialogo()).not.toBeNull();
    fireEvent.pointerDown(container.querySelector('[data-testid="fuera"]'));
    expect(dialogo()).toBeNull();
  });

  it('solo hay un popover abierto: abrir el de otra barra cierra el anterior', () => {
    const { container } = render(<div><BarraApilada segmentos={SEGMENTOS} titulo="A" /><BarraApilada segmentos={SEGMENTOS} titulo="B" /></div>);
    const [a, b] = container.querySelectorAll('.barra-apilada');
    fireEvent.click(a, { detail: 0 });
    fireEvent.pointerDown(b);
    fireEvent.click(b, { detail: 0 });
    expect(document.querySelectorAll('[data-popover-barra]')).toHaveLength(1);
    expect(a.getAttribute('aria-expanded')).toBe('false');
    expect(b.getAttribute('aria-expanded')).toBe('true');
    expect(dialogo().getAttribute('aria-label')).toContain('B');
  });

  it('abrir otra barra sin pasar por el cierre por clic fuera también deja uno solo', () => {
    const { container } = render(<div><BarraApilada segmentos={SEGMENTOS} titulo="A" /><BarraApilada segmentos={SEGMENTOS} titulo="B" /></div>);
    const [a, b] = container.querySelectorAll('.barra-apilada');
    fireEvent.click(a, { detail: 0 });
    fireEvent.click(b, { detail: 0 });
    expect(document.querySelectorAll('[data-popover-barra]')).toHaveLength(1);
    expect(a.getAttribute('aria-expanded')).toBe('false');
  });

  it('40 barras no crean ningún popover; abrir una crea exactamente uno', () => {
    const { container } = render(<div>{Array.from({ length: 40 }, (_, i) => <BarraApilada key={i} segmentos={SEGMENTOS} />)}</div>);
    expect(document.querySelectorAll('[data-popover-barra]')).toHaveLength(0);
    fireEvent.click(container.querySelectorAll('.barra-apilada')[7], { detail: 0 });
    expect(document.querySelectorAll('[data-popover-barra]')).toHaveLength(1);
  });

  it('el clic en la barra y en el popover no llega a la tarjeta que la contiene', () => {
    const alTarjeta = vi.fn();
    const { container } = render(<div onClick={alTarjeta}><BarraApilada segmentos={SEGMENTOS} /></div>);
    fireEvent.click(barraDe(container), { detail: 0 });
    fireEvent.click(dialogo());
    expect(alTarjeta).not.toHaveBeenCalled();
  });

  it('cambiar los valores o el orden (reinicio) cierra el popover; desmontar también', () => {
    const { container, rerender, unmount } = render(<BarraApilada segmentos={SEGMENTOS} reinicio="veces" />);
    fireEvent.click(barraDe(container), { detail: 0 });
    expect(dialogo()).not.toBeNull();
    rerender(<BarraApilada segmentos={SEGMENTOS} reinicio="unidades" />);
    expect(dialogo()).toBeNull();
    fireEvent.click(barraDe(container), { detail: 0 });
    expect(dialogo()).not.toBeNull();
    unmount();
    expect(dialogo()).toBeNull();
  });
});

describe('BarraApilada: resalte con el cursor', () => {
  it('el segmento bajo el cursor se marca con data-hover y se desmarca al salir; con el dedo no hay resalte', () => {
    simularGeometria();
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    const barra = barraDe(container);
    fireEvent.pointerMove(barra, { clientX: 150, pointerType: 'mouse' });
    expect([...barra.children].map((s) => s.dataset.hover)).toEqual([undefined, 'true', undefined, undefined]);
    fireEvent.pointerMove(barra, { clientX: 320, pointerType: 'mouse' });
    expect([...barra.children].map((s) => s.dataset.hover)).toEqual([undefined, undefined, undefined, 'true']);
    fireEvent.pointerLeave(barra);
    expect([...barra.children].every((s) => s.dataset.hover === undefined)).toBe(true);
    fireEvent.pointerMove(barra, { clientX: 150, pointerType: 'touch' });
    expect([...barra.children].every((s) => s.dataset.hover === undefined)).toBe(true);
  });

  it('un punto sobre la zona de pulsación fuera de la barra resalta el segmento más cercano', () => {
    simularGeometria();
    const { container } = render(<BarraApilada segmentos={SEGMENTOS} />);
    fireEvent.pointerMove(barraDe(container), { clientX: -30, pointerType: 'mouse' });
    expect(barraDe(container).children[0].dataset.hover).toBe('true');
    fireEvent.pointerMove(barraDe(container), { clientX: 999, pointerType: 'mouse' });
    expect(barraDe(container).children[3].dataset.hover).toBe('true');
  });
});

/** IntersectionObserver simulado: cuenta cuántos se crean y qué se observa, y permite "hacer visible" una barra. */
class ObservadorFalso {
  static creados = [];
  static observaciones = 0;
  static cancelaciones = 0;
  constructor(alCambiar) { this.alCambiar = alCambiar; this.observados = new Set(); ObservadorFalso.creados.push(this); }
  observe(el) { this.observados.add(el); ObservadorFalso.observaciones += 1; }
  unobserve(el) { this.observados.delete(el); ObservadorFalso.cancelaciones += 1; }
  mostrar(...elementos) { this.alCambiar(elementos.map((target) => ({ target, isIntersecting: true }))); }
  ocultar(...elementos) { this.alCambiar(elementos.map((target) => ({ target, isIntersecting: false }))); }
}

describe('BarraApilada: animación', () => {
  const uno = [{ clave: 'ganado', tono: 'exito', texto: 'Ganado', valor: 5 }, { clave: 'cotizado', tono: 'aviso', texto: 'Cotizado', valor: 5 }];
  const matchMediaOriginal = window.matchMedia;
  const movimientoReducido = (reducido) => { window.matchMedia = () => ({ matches: reducido, addEventListener() {}, removeEventListener() {} }); };

  beforeEach(() => {
    ObservadorFalso.creados = []; ObservadorFalso.observaciones = 0; ObservadorFalso.cancelaciones = 0;
    reiniciarObservadorVisible();
    vi.stubGlobal('IntersectionObserver', ObservadorFalso);
    movimientoReducido(false);
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.matchMedia = matchMediaOriginal; reiniciarObservadorVisible(); });

  it('empieza en espera (segmentos ocultos) y pasa a activa cuando la barra entra en el viewport', () => {
    const { container } = render(<BarraApilada segmentos={uno} />);
    const barra = container.firstChild;
    expect(barra.dataset.anim).toBe('espera');
    act(() => ObservadorFalso.creados[0].mostrar(barra));
    expect(barra.dataset.anim).toBe('activa');
  });

  it('cada segmento lleva su posición (--i) para la escalonada', () => {
    const { container } = render(<BarraApilada segmentos={uno} />);
    const [a, b] = container.firstChild.children;
    expect(a.style.getPropertyValue('--i')).toBe('0');
    expect(b.style.getPropertyValue('--i')).toBe('1');
  });

  it('40 barras comparten un único IntersectionObserver y solo se animan las que se ven', () => {
    const { container } = render(<div>{Array.from({ length: 40 }, (_, i) => <BarraApilada key={i} segmentos={uno} />)}</div>);
    const barras = [...container.querySelectorAll('.barra-apilada')];
    expect(ObservadorFalso.creados).toHaveLength(1);
    expect(ObservadorFalso.observaciones).toBe(40);
    act(() => ObservadorFalso.creados[0].mostrar(barras[0], barras[1], barras[2]));
    expect(barras.filter((b) => b.dataset.anim === 'activa')).toHaveLength(3);
    expect(barras.filter((b) => b.dataset.anim === 'espera')).toHaveLength(37);
    expect(ObservadorFalso.creados[0].observados.size).toBe(37);
  });

  it('abrir el popover no crea observadores nuevos', () => {
    const { container } = render(<BarraApilada segmentos={uno} />);
    const barra = container.firstChild;
    act(() => ObservadorFalso.creados[0].mostrar(barra));
    fireEvent.click(barra, { detail: 0 });
    expect(dialogo()).not.toBeNull();
    expect(ObservadorFalso.creados).toHaveLength(1);
    expect(ObservadorFalso.observaciones).toBe(1);
  });

  it('anima una vez por entrada: tras animarse deja de observarse y no se anima de nuevo con un re-render igual', () => {
    const { container, rerender } = render(<BarraApilada segmentos={uno} reinicio="veces" />);
    const barra = container.firstChild;
    act(() => ObservadorFalso.creados[0].mostrar(barra));
    expect(ObservadorFalso.creados[0].observados.size).toBe(0);
    const observaciones = ObservadorFalso.observaciones;
    rerender(<BarraApilada segmentos={uno} reinicio="veces" />);
    expect(barra.dataset.anim).toBe('activa');
    expect(ObservadorFalso.observaciones).toBe(observaciones);
  });

  it('vuelve a animar cuando cambia el orden (reinicio) o los valores', () => {
    const { container, rerender } = render(<BarraApilada segmentos={uno} reinicio="veces" />);
    const barra = container.firstChild;
    act(() => ObservadorFalso.creados[0].mostrar(barra));
    expect(barra.dataset.anim).toBe('activa');
    rerender(<BarraApilada segmentos={uno} reinicio="unidades" />);
    expect(barra.dataset.anim).toBe('espera');
    act(() => ObservadorFalso.creados[0].mostrar(barra));
    expect(barra.dataset.anim).toBe('activa');
    rerender(<BarraApilada segmentos={[{ ...uno[0], valor: 9 }, uno[1]]} reinicio="unidades" />);
    expect(barra.dataset.anim).toBe('espera');
  });

  it('una entrada que no intersecta no anima ni deja de observar la barra', () => {
    const { container } = render(<BarraApilada segmentos={uno} />);
    const barra = container.firstChild;
    act(() => ObservadorFalso.creados[0].ocultar(barra));
    expect(barra.dataset.anim).toBe('espera');
    expect(ObservadorFalso.creados[0].observados.size).toBe(1);
  });

  it('tras verse y animarse, desmontar ya no vuelve a cancelar nada', () => {
    const { container, unmount } = render(<BarraApilada segmentos={uno} />);
    act(() => ObservadorFalso.creados[0].mostrar(container.firstChild));
    const cancelaciones = ObservadorFalso.cancelaciones;
    unmount();
    expect(ObservadorFalso.cancelaciones).toBe(cancelaciones);
  });

  it('al desmontar cancela su observación', () => {
    const { unmount } = render(<BarraApilada segmentos={uno} />);
    unmount();
    expect(ObservadorFalso.creados[0].observados.size).toBe(0);
    expect(ObservadorFalso.cancelaciones).toBe(1);
  });

  it('el popover no se abre mientras la barra espera a verse ni mientras sus segmentos crecen; sí al terminar', () => {
    const { container } = render(<BarraApilada segmentos={uno} />);
    const barra = container.firstChild;
    fireEvent.click(barra, { detail: 0 });
    expect(dialogo()).toBeNull();
    act(() => ObservadorFalso.creados[0].mostrar(barra));
    barra.getAnimations = () => [{ animationName: 'barra-crecer', playState: 'running' }];
    fireEvent.click(barra, { detail: 0 });
    expect(dialogo()).toBeNull();
    barra.getAnimations = () => [{ animationName: 'barra-crecer', playState: 'finished' }];
    fireEvent.click(barra, { detail: 0 });
    expect(dialogo()).not.toBeNull();
  });

  it('tampoco resalta el segmento bajo el cursor mientras anima la entrada', () => {
    simularGeometria();
    const { container } = render(<BarraApilada segmentos={uno} />);
    const barra = container.firstChild;
    fireEvent.pointerMove(barra, { clientX: 10, pointerType: 'mouse' });
    expect([...barra.children].every((s) => s.dataset.hover === undefined)).toBe(true);
  });

  it('con prefers-reduced-motion no anima ni observa: la barra se ve terminada y el popover se abre', () => {
    movimientoReducido(true);
    const { container } = render(<BarraApilada segmentos={uno} />);
    expect(container.firstChild.dataset.anim).toBeUndefined();
    expect(ObservadorFalso.creados).toHaveLength(0);
    fireEvent.click(container.firstChild, { detail: 0 });
    expect(dialogo()).not.toBeNull();
  });

  it('sin IntersectionObserver la barra se ve terminada', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<BarraApilada segmentos={uno} />);
    expect(container.firstChild.dataset.anim).toBeUndefined();
  });
});
