// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  BarraFiltros, BotonExportar, BotonLimpiar, ContadorResultados, FiltroBusqueda, FiltroConmutador, FiltroFechaCampo, FiltroFechasContenedor,
  FiltroPestanas, FiltroSegmentado, FiltroSelect
} from './index';
import { reiniciarCapasParaPruebas } from './capasAtras';
import { BotonSeguimiento } from '../../views/analisis/components/FiltroSeguimiento';

afterEach(async () => { cleanup(); vi.useRealTimers(); await new Promise((r) => setTimeout(r, 25)); reiniciarCapasParaPruebas(); window.history.replaceState(null, ''); });

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const OPC = ['Cotizado', 'Pedido', 'Pedido Parcial', { value: 'perdida', label: 'Venta perdida' }];
const teclear = (el, key, extra = {}) => fireEvent.keyDown(el, { key, ...extra });
const montarSelect = (props = {}) => {
  const onChange = props.onChange || vi.fn();
  const r = render(<FiltroSelect value="" onChange={onChange} opciones={OPC} prefijo="Estado:" ariaLabel="Filtrar por estado" {...props} />);
  return { onChange, ...r, boton: screen.getByRole('combobox', { name: 'Filtrar por estado' }) };
};
const lista = () => screen.queryByRole('listbox');

describe('FiltroBusqueda', () => {
  it('muestra el valor, nombra el campo con aria-label y devuelve el texto (no el evento)', () => {
    const onChange = vi.fn();
    render(<FiltroBusqueda value="abc" onChange={onChange} placeholder="Buscar ref" ariaLabel="Buscar por referencia o cliente" />);
    const campo = screen.getByRole('searchbox', { name: 'Buscar por referencia o cliente' });
    expect(campo.value).toBe('abc');
    fireEvent.change(campo, { target: { value: 'xyz' } });
    expect(onChange).toHaveBeenCalledWith('xyz');
  });
  it('con texto usa el estado seleccionado (bg-filtro-activo, texto primary-strong); vacío, no', () => {
    const { container, rerender } = render(<FiltroBusqueda value="" onChange={() => {}} />);
    expect(container.firstChild.className).not.toContain('bg-filtro-activo');
    rerender(<FiltroBusqueda value="bomba" onChange={() => {}} />);
    expect(container.firstChild.className).toContain('bg-filtro-activo');
    expect(container.querySelector('input').className).toContain('text-filtro-texto');
  });
});

describe('FiltroSelect: select-only combobox', () => {
  it('ARIA: role combobox, aria-haspopup, aria-expanded, aria-controls y aria-label; no hay <select> nativo', () => {
    const { boton, container } = montarSelect();
    expect(container.querySelector('select')).toBeNull();
    expect(boton.getAttribute('aria-haspopup')).toBe('listbox');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(boton.getAttribute('aria-controls')).toBeTruthy();
    expect(boton.getAttribute('aria-activedescendant')).toBeNull();
    expect(container.textContent).toContain('Estado:');
    expect(container.textContent).toContain('Todos');
  });
  it('al abrir: listbox en un portal a body, opciones con aria-selected, "Todos" primero y aria-activedescendant en la activa', () => {
    const { boton, container } = montarSelect({ value: 'Pedido' });
    fireEvent.click(boton);
    const l = lista();
    expect(l).toBeTruthy();
    expect(container.contains(l)).toBe(false);
    expect(document.body.contains(l)).toBe(true);
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(boton.getAttribute('aria-controls')).toBe(l.id);
    const ops = within(l).getAllByRole('option');
    expect(ops.map((o) => o.textContent)).toEqual(['Todos', 'Cotizado', 'Pedido', 'Pedido Parcial', 'Venta perdida']);
    expect(ops.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true', 'false', 'false']);
    expect(boton.getAttribute('aria-activedescendant')).toBe(ops[2].id);
  });
  it('clic en una opción: onChange(valor) (no el evento), cierra y devuelve el foco al botón', () => {
    vi.useFakeTimers();
    const { boton, onChange } = montarSelect();
    fireEvent.click(boton);
    fireEvent.click(screen.getByRole('option', { name: 'Venta perdida' }));
    expect(onChange).toHaveBeenCalledWith('perdida');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton);
    act(() => { vi.advanceTimersByTime(200); });
    expect(lista()).toBeNull();
  });
  it('teclado cerrado: ↓ abre en la opción elegida; ↑, Enter y Espacio también abren', () => {
    for (const k of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
      const { boton, unmount } = montarSelect({ value: 'Pedido' });
      teclear(boton, k);
      expect(boton.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getAllByRole('option')[2].id).toBe(boton.getAttribute('aria-activedescendant'));
      unmount();
      cleanup();
    }
  });
  it('teclado abierto: flechas, Inicio, Fin, Enter elige; la activa se anuncia con aria-activedescendant', () => {
    const { boton, onChange } = montarSelect();
    teclear(boton, 'ArrowDown');
    const id = (i) => screen.getAllByRole('option')[i].id;
    expect(boton.getAttribute('aria-activedescendant')).toBe(id(0));
    teclear(boton, 'ArrowDown'); teclear(boton, 'ArrowDown');
    expect(boton.getAttribute('aria-activedescendant')).toBe(id(2));
    teclear(boton, 'ArrowUp');
    expect(boton.getAttribute('aria-activedescendant')).toBe(id(1));
    teclear(boton, 'End');
    expect(boton.getAttribute('aria-activedescendant')).toBe(id(4));
    teclear(boton, 'ArrowDown');
    expect(boton.getAttribute('aria-activedescendant')).toBe(id(4));
    teclear(boton, 'Home');
    expect(boton.getAttribute('aria-activedescendant')).toBe(id(0));
    teclear(boton, 'ArrowDown'); teclear(boton, 'Enter');
    expect(onChange).toHaveBeenCalledWith('Cotizado');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
  });
  it('Espacio elige la opción activa; Escape cierra sin cambiar y no llega al documento; Tab cierra', () => {
    const { boton, onChange } = montarSelect();
    teclear(boton, 'ArrowDown'); teclear(boton, 'ArrowDown'); teclear(boton, ' ');
    expect(onChange).toHaveBeenCalledWith('Cotizado');
    onChange.mockClear();
    const enDocumento = vi.fn();
    document.addEventListener('keydown', enDocumento);
    teclear(boton, 'ArrowDown');
    teclear(boton, 'Escape');
    document.removeEventListener('keydown', enDocumento);
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(onChange).not.toHaveBeenCalled();
    expect(enDocumento.mock.calls.filter(([e]) => e.key === 'Escape')).toHaveLength(0);
    teclear(boton, 'ArrowDown');
    teclear(boton, 'Tab');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('typeahead: escribir letras salta a la opción; el texto se reinicia a los 500 ms; repetir la letra recorre las que empiezan igual', () => {
    vi.useFakeTimers();
    const { boton } = montarSelect();
    const ops = () => screen.getAllByRole('option');
    teclear(boton, 'ArrowDown');
    teclear(boton, 'p');
    expect(boton.getAttribute('aria-activedescendant')).toBe(ops()[2].id);
    teclear(boton, 'e'); teclear(boton, 'd'); teclear(boton, 'i'); teclear(boton, 'd'); teclear(boton, 'o'); teclear(boton, ' ');
    teclear(boton, 'p');
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(boton.getAttribute('aria-activedescendant')).toBe(ops()[3].id);
    act(() => { vi.advanceTimersByTime(600); });
    teclear(boton, 'v');
    expect(boton.getAttribute('aria-activedescendant')).toBe(ops()[4].id);
    act(() => { vi.advanceTimersByTime(600); });
    teclear(boton, 'c');
    expect(boton.getAttribute('aria-activedescendant')).toBe(ops()[1].id);
  });
  it('cerrado, escribir una letra abre y salta a la opción', () => {
    const { boton } = montarSelect();
    teclear(boton, 'v');
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(boton.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[4].id);
  });
  it('el clic fuera cierra; el clic dentro del campo o de la lista no', () => {
    vi.useFakeTimers();
    const { boton } = montarSelect();
    fireEvent.click(boton);
    fireEvent.mouseDown(lista());
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    fireEvent.mouseDown(document.body);
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    act(() => { vi.advanceTimersByTime(200); });
    expect(lista()).toBeNull();
  });
  it('flip: si no cabe debajo y arriba hay más sitio, se abre hacia arriba y el campo pierde el radio superior', () => {
    const alto = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 200 });
    const innerHeight = window.innerHeight;
    window.innerHeight = 300;
    const { boton, container } = montarSelect();
    const campo = container.querySelector('[data-filtro-select]');
    campo.getBoundingClientRect = () => ({ top: 250, bottom: 286, left: 10, right: 170, width: 160, height: 36 });
    fireEvent.click(boton);
    expect(document.querySelector('[data-menu-anclado]').dataset.dir).toBe('arriba');
    expect(campo.className).toContain('rounded-t-none');
    window.innerHeight = innerHeight;
    if (alto) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', alto); else delete HTMLElement.prototype.scrollHeight;
  });
  it('abajo (hay sitio): el campo pierde el radio inferior mientras está abierto y se lee como una pieza con el menú', () => {
    const { boton, container } = montarSelect();
    const campo = container.querySelector('[data-filtro-select]');
    expect(campo.className).not.toContain('rounded-b-none');
    fireEvent.click(boton);
    expect(document.querySelector('[data-menu-anclado]').dataset.dir).toBe('abajo');
    expect(campo.className).toContain('rounded-b-none');
    expect(campo.className).toContain('bg-filtro-abierto');
    expect(document.querySelector('[data-menu-anclado]').className).toContain('bg-filtro-abierto');
  });
  it('estado seleccionado: con valor, bg-filtro-activo y texto primary-strong; "Todos" no se pinta como selección (sin check ni color)', () => {
    const { container, rerender, boton } = montarSelect();
    expect(container.querySelector('[data-filtro-select]').className).not.toContain('bg-filtro-activo');
    fireEvent.click(boton);
    const todos = screen.getAllByRole('option')[0];
    expect(todos.getAttribute('aria-selected')).toBe('true');
    expect(todos.className).not.toContain('text-filtro-texto');
    expect(todos.querySelector('svg')).toBeNull();
    fireEvent.keyDown(boton, { key: 'Escape' });
    rerender(<FiltroSelect value="Pedido" onChange={() => {}} opciones={OPC} prefijo="Estado:" ariaLabel="Filtrar por estado" />);
    expect(container.querySelector('[data-filtro-select]').className).toContain('bg-filtro-activo');
    fireEvent.click(screen.getByRole('combobox'));
    const sel = screen.getAllByRole('option')[2];
    expect(sel.className).toMatch(/bg-(primary-soft|filtro-activo)/);
    expect(sel.className).toContain('text-filtro-texto');
    expect(sel.querySelector('svg')).toBeTruthy();
  });
  it('con valor elegido apila el prefijo (línea pequeña); el aria-label no cambia', () => {
    const { container } = montarSelect({ value: 'Pedido Parcial' });
    expect(container.querySelector('span.absolute').textContent).toBe('Estado');
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toBeTruthy();
  });
  it('sin aria-label usa el prefijo como nombre accesible', () => {
    render(<FiltroSelect value="" onChange={() => {}} opciones={[]} prefijo="Vendedor:" />);
    expect(screen.getByRole('combobox', { name: 'Vendedor:' })).toBeTruthy();
  });
});

describe('FiltroSegmentado', () => {
  it('marca la opción activa con aria-pressed y devuelve el valor elegido', () => {
    const onChange = vi.fn();
    render(<FiltroSegmentado ariaLabel="Gerencia" value="todas" onChange={onChange} opciones={[{ value: 'todas', label: 'Todas' }, { value: 'propias', label: 'Propias' }]} />);
    expect(screen.getByRole('group', { name: 'Gerencia' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Todas' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Propias' }));
    expect(onChange).toHaveBeenCalledWith('propias');
  });
  it('con valorNeutro, un valor distinto usa el estado seleccionado', () => {
    const op = [{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }];
    const { container, rerender } = render(<FiltroSegmentado ariaLabel="P" value="7d" valorNeutro="7d" onChange={() => {}} opciones={op} />);
    expect(container.firstChild.className).not.toContain('bg-filtro-activo');
    rerender(<FiltroSegmentado ariaLabel="P" value="30d" valorNeutro="7d" onChange={() => {}} opciones={op} />);
    expect(container.firstChild.className).toContain('bg-filtro-activo');
  });
});

describe('FiltroPestanas', () => {
  const opciones = [{ id: 'todas', label: 'Todas' }, { id: 'pend', label: 'Pendientes', cantidad: 4 }];
  it('role tab con aria-selected y onChange(id)', () => {
    const onChange = vi.fn();
    render(<FiltroPestanas ariaLabel="Estado" value="todas" onChange={onChange} opciones={opciones} />);
    expect(screen.getByRole('tablist', { name: 'Estado' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Todas/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: /Pendientes/ }));
    expect(onChange).toHaveBeenCalledWith('pend');
  });
  it('la variante sticky envuelve la barra en un contenedor pegado arriba, de ancho completo y sin pastilla propia', () => {
    const { container } = render(<FiltroPestanas sticky value="todas" onChange={() => {}} opciones={opciones} />);
    const pegado = container.querySelector('[data-pegada]');
    expect(pegado.className).toContain('sticky');
    expect(pegado.style.top).toBe('0px');
    expect(pegado.className).toContain('-mx-[var(--tf-pad-x)]');
    expect(screen.getByRole('tablist').className).not.toContain('bg-slate-100');
  });
  it('sin sticky no hay centinela ni capa de vidrio y la pastilla gris se mantiene', () => {
    const { container } = render(<FiltroPestanas value="todas" onChange={() => {}} opciones={opciones} />);
    expect(container.querySelector('[data-centinela]')).toBeNull();
    expect(container.querySelector('[data-vidrio]')).toBeNull();
    expect(screen.getByRole('tablist').className).toContain('bg-slate-100');
  });
  describe('estado pegada (IntersectionObserver)', () => {
    let cb; let opts;
    beforeEach(() => {
      cb = null; opts = null;
      window.IntersectionObserver = class { constructor(f, o) { cb = f; opts = o; } observe() {} disconnect() {} };
    });
    afterEach(() => { delete window.IntersectionObserver; });
    const montar = () => {
      const r = render(<main style={{ paddingTop: '14px' }}><FiltroPestanas sticky value="todas" onChange={() => {}} opciones={opciones} /></main>);
      return { vidrio: r.container.querySelector('[data-vidrio]'), caja: r.container.querySelector('[data-pegada]') };
    };
    it('observa un centinela de altura 0 con raíz en main y suma el relleno superior', () => {
      const { container } = render(<main style={{ paddingTop: '14px' }}><FiltroPestanas sticky value="todas" onChange={() => {}} opciones={opciones} /></main>);
      const cent = container.querySelector('[data-centinela]');
      expect(cent.className).toContain('h-0');
      expect(opts.root).toBe(container.querySelector('main'));
      expect(opts.rootMargin).toBe('14px 0px 0px 0px');
      expect(container.querySelector('[data-pegada]').style.top).toBe('-14px');
    });
    it('empieza sin pegar, se marca al salir el centinela por arriba y vuelve a reposo', () => {
      const { vidrio, caja } = montar();
      expect(caja.getAttribute('data-pegada')).toBe('false');
      expect(vidrio.getAttribute('data-pegada')).toBe('false');
      act(() => cb([{ isIntersecting: false, boundingClientRect: { top: -30 } }]));
      expect(vidrio.getAttribute('data-pegada')).toBe('true');
      act(() => cb([{ isIntersecting: true, boundingClientRect: { top: 40 } }]));
      expect(vidrio.getAttribute('data-pegada')).toBe('false');
    });
    it('el centinela por debajo del borde (no ha llegado) no cuenta como pegada', () => {
      const { vidrio } = montar();
      act(() => cb([{ isIntersecting: false, boundingClientRect: { top: 2000 } }]));
      expect(vidrio.getAttribute('data-pegada')).toBe('false');
    });
    it('la capa de vidrio solo anima opacity y transform, con los tokens de animación, y sin desplazamiento con reduced motion', () => {
      const { vidrio } = montar();
      const c = vidrio.className;
      expect(c).toContain('transition-[opacity,transform]');
      expect(c).toContain('duration-[var(--anim-abrir)]');
      expect(c).toContain('ease-[var(--ease-abrir)]');
      expect(c).toContain('duration-[var(--anim-cerrar)]');
      expect(c).toContain('ease-[var(--ease-cerrar)]');
      expect(c).toContain('motion-reduce:[transform:none]');
      expect(c).toContain('backdrop-blur-md');
      expect(c).toContain('bg-background/95');
      expect(c).toContain('supports-[backdrop-filter]:bg-background/65');
      expect(c).toContain('shadow-menu');
      expect(c).not.toMatch(/border|#[0-9a-f]{3,6}/i);
    });
  });
});

describe('FiltroConmutador y BotonSeguimiento', () => {
  it('conmuta el valor y expone aria-pressed', () => {
    const onChange = vi.fn();
    render(<FiltroConmutador activo={false} onChange={onChange} etiqueta="Solo abiertos" />);
    const b = screen.getByRole('button', { name: 'Solo abiertos' });
    expect(b.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(b);
    expect(onChange).toHaveBeenCalledWith(true);
  });
  it('activo usa el estado seleccionado del rol (bg-filtro-activo, texto primary-strong), no slate-900', () => {
    render(<FiltroConmutador activo onChange={() => {}} etiqueta="X" />);
    const c = screen.getByRole('button', { name: 'X' }).className;
    expect(c).toContain('bg-filtro-activo');
    expect(c).toContain('text-filtro-texto');
    expect(c).not.toContain('slate-900');
  });
  it('BotonSeguimiento conserva su API (activo, onChange) y su texto', () => {
    const onChange = vi.fn();
    render(<BotonSeguimiento activo onChange={onChange} />);
    const b = screen.getByRole('button', { name: 'En seguimiento' });
    expect(b.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(b);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('BotonLimpiar', () => {
  it('no se pinta sin filtros activos', () => {
    const { container } = render(<BotonLimpiar activos={0} onClick={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
  it('con filtros activos muestra el contador y llama a onClick', () => {
    const onClick = vi.fn();
    render(<BotonLimpiar activos={3} onClick={onClick} />);
    const b = screen.getByRole('button', { name: 'Limpiar filtros (3 activos)' });
    expect(b.textContent).toContain('Limpiar filtros (3)');
    fireEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('ContadorResultados y BotonExportar', () => {
  it('"N unidad" sin filtro y "N de M unidad" con filtro', () => {
    const { container, rerender } = render(<ContadorResultados total={20} unidad="solicitudes" />);
    expect(container.textContent).toBe('20 solicitudes');
    rerender(<ContadorResultados total={20} filtrados={5} unidad="solicitudes" />);
    expect(container.textContent).toBe('5 de 20 solicitudes');
  });
  it('BotonExportar llama a onClick y respeta disabled', () => {
    const onClick = vi.fn();
    const { rerender } = render(<BotonExportar onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<BotonExportar onClick={onClick} disabled />);
    expect(screen.getByRole('button', { name: /Exportar/ }).disabled).toBe(true);
  });
});

const montarBarra = (props = {}) => render(
  <BarraFiltros
    encabezado={<h2>Solicitudes</h2>}
    busqueda={<FiltroBusqueda value="" onChange={() => {}} ariaLabel="buscar" />}
    filtros={<>
      <FiltroSelect value="" onChange={() => {}} opciones={['Cotizado']} prefijo="Estado:" ariaLabel="estado" />
      <FiltroConmutador activo={false} onChange={() => {}} etiqueta="En seguimiento" />
    </>}
    limpiar={<BotonLimpiar activos={props.activos ?? 2} onClick={props.onLimpiar || (() => {})} />}
    extremo={<span>20 resultados</span>}
    filtrosActivos={2}
    resultados={12}
    {...props}
  />
);

describe('BarraFiltros en escritorio', () => {
  it('es una superficie (surface, sin borde) con rejilla; el bloque limpiar + extremo es el último hijo y está siempre reservado', () => {
    mm(false);
    const { container, rerender } = montarBarra();
    const seccion = container.querySelector('section');
    expect(seccion.className).toContain('surface');
    expect(seccion.className).not.toMatch(/(^|\s)border(\s|$)/);
    const hijos = [...seccion.children];
    expect(hijos[0].textContent).toBe('Solicitudes');
    const rejilla = hijos[1];
    expect(rejilla.className).toContain('grid');
    expect(rejilla.children[0].getAttribute('data-peso')).toBe('2');
    expect(rejilla.children[0].querySelector('input')).toBeTruthy();
    expect(rejilla.children[1].querySelector('button[role="combobox"]')).toBeTruthy();
    const bloque = rejilla.lastElementChild;
    expect(bloque.hasAttribute('data-bloque')).toBe(true);
    expect(bloque.textContent).toContain('Limpiar filtros (2)');
    expect(bloque.textContent).toContain('20 resultados');
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <BarraFiltros busqueda={<FiltroBusqueda value="" onChange={() => {}} />} limpiar={<BotonLimpiar activos={0} onClick={() => {}} />} extremo={<span>20 resultados</span>} />
    );
    expect(container.querySelector('[data-bloque]')).toBeTruthy();
    expect(container.querySelector('[data-bloque]').textContent).toBe('20 resultados');
  });
  it('un solo marcado: cada control aparece una vez', () => {
    mm(false);
    montarBarra();
    expect(screen.getAllByLabelText('estado')).toHaveLength(1);
    expect(screen.getAllByLabelText('buscar')).toHaveLength(1);
  });
});

describe('BarraFiltros en móvil: hoja inferior', () => {
  it('la barra solo muestra "Filtros (N)" y el extremo; los controles no están hasta abrir', () => {
    mm(true);
    montarBarra();
    const t = screen.getByRole('button', { name: /Filtros \(2\)/ });
    expect(t.getAttribute('aria-expanded')).toBe('false');
    expect(t.getAttribute('aria-controls')).toBeTruthy();
    expect(screen.queryByLabelText('estado')).toBeNull();
    expect(screen.getByText('20 resultados')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('abre en un portal a body con role dialog, aria-modal, aria-labelledby y el foco dentro; el trigger queda expandido', () => {
    mm(true);
    montarBarra();
    const t = screen.getByRole('button', { name: /Filtros \(2\)/ });
    fireEvent.click(t);
    const d = screen.getByRole('dialog', { name: 'Filtros' });
    expect(document.body.contains(d) && !document.querySelector('section').contains(d)).toBe(true);
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.getAttribute('aria-labelledby')).toBeTruthy();
    expect(d.id).toBe(t.getAttribute('aria-controls'));
    expect(t.getAttribute('aria-expanded')).toBe('true');
    expect(d.contains(document.activeElement)).toBe(true);
    expect(d.getAttribute('data-variante')).toBe('hojaInferior');
    expect(document.body.style.overflow).toBe('hidden');
  });
  it('dentro: búsqueda arriba, filas con etiqueta visible, "Limpiar (N)" en la cabecera y pie con el conteo', () => {
    mm(true);
    montarBarra();
    fireEvent.click(screen.getByRole('button', { name: /Filtros \(2\)/ }));
    const d = screen.getByRole('dialog');
    expect(d.querySelector('input[type="search"]')).toBeTruthy();
    expect(d.textContent).toContain('Estado');
    expect(d.querySelector('button[role="combobox"][aria-label="estado"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Limpiar filtros (2 activos)' }).textContent).toBe('Limpiar (2)');
    expect(screen.getByRole('button', { name: 'Ver 12 resultados' })).toBeTruthy();
  });
  it('sin conteo el pie dice "Ver resultados"; con 1 dice "Ver 1 resultado"', () => {
    mm(true);
    const { unmount } = montarBarra({ resultados: undefined });
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    expect(screen.getByRole('button', { name: 'Ver resultados' })).toBeTruthy();
    unmount();
    montarBarra({ resultados: 1 });
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    expect(screen.getByRole('button', { name: 'Ver 1 resultado' })).toBeTruthy();
  });
  it('cierra con el pie, la X, Escape y el fondo; mantiene la hoja montada durante la salida y devuelve el foco al trigger', () => {
    vi.useFakeTimers();
    mm(true);
    montarBarra();
    const t = screen.getByRole('button', { name: /Filtros \(2\)/ });
    const abrir = () => { t.focus(); fireEvent.click(t); };
    const cerrado = () => { act(() => { vi.advanceTimersByTime(250); }); return screen.queryByRole('dialog') === null; };
    abrir(); fireEvent.click(screen.getByRole('button', { name: 'Ver 12 resultados' }));
    expect(screen.queryByRole('dialog').getAttribute('data-saliendo')).toBe('true');
    expect(cerrado()).toBe(true);
    expect(document.activeElement).toBe(t);
    abrir(); fireEvent.click(screen.getByRole('button', { name: 'Cerrar filtros' }));
    expect(cerrado()).toBe(true);
    abrir(); fireEvent.keyDown(document, { key: 'Escape' });
    expect(cerrado()).toBe(true);
    abrir(); const fondo = screen.getByRole('dialog').parentElement;
    fireEvent.mouseDown(fondo); fireEvent.click(fondo);
    expect(cerrado()).toBe(true);
    expect(document.body.style.overflow).toBe('');
  });
  it('atrapa el foco: Tab en el último elemento vuelve al primero y Shift+Tab en el primero va al último', () => {
    mm(true);
    montarBarra();
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    const d = screen.getByRole('dialog');
    const foco = [...d.querySelectorAll('button, input, [role="separator"]')].filter((el) => !el.closest('[inert]'));
    foco[foco.length - 1].focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(foco[0]);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(foco[foco.length - 1]);
  });
  it('"Limpiar (N)" llama a la acción de la vista (la hoja no guarda estado propio)', () => {
    mm(true);
    const onLimpiar = vi.fn();
    montarBarra({ onLimpiar });
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros (2 activos)' }));
    expect(onLimpiar).toHaveBeenCalledTimes(1);
  });
});

describe('Acordeón de la hoja móvil', () => {
  const Vista = ({ onEstado = () => {}, onResultado = () => {}, onFecha = () => {} }) => {
    const [ab, setAb] = React.useState(false);
    return (
      <BarraFiltros
        busqueda={<FiltroBusqueda value="" onChange={() => {}} ariaLabel="buscar" />}
        filtros={<>
          <FiltroSelect value="" onChange={onEstado} opciones={['Cotizado', 'Pedido']} prefijo="Estado:" ariaLabel="estado" />
          <FiltroSelect value="Parcial" onChange={onResultado} opciones={['Parcial', 'Completo']} prefijo="Resultado:" ariaLabel="resultado" />
          <FiltroSegmentado ariaLabel="Período" etiqueta="Período" value="7d" onChange={() => {}} opciones={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }]} />
          <FiltroSegmentado ariaLabel="Orden" etiqueta="Orden" value="a" onChange={() => {}} opciones={['a', 'b', 'c', 'd'].map((v) => ({ value: v, label: `Orden ${v}` }))} />
          <div>
            <FiltroFechaCampo texto="Elegir" activo={false} expandido={ab} onClick={() => { onFecha(!ab); setAb(!ab); }} />
            <FiltroFechasContenedor abierto={ab} onCerrar={() => setAb(false)}><button type="button">día 28</button></FiltroFechasContenedor>
          </div>
        </>}
        limpiar={<BotonLimpiar activos={0} onClick={() => {}} />}
      />
    );
  };
  const abrirHoja = () => { mm(true); const r = render(<Vista />); fireEvent.click(screen.getByRole('button', { name: /Filtros/ })); return r; };
  const fila = (nombre) => screen.getByRole('combobox', { name: nombre });

  it('las filas con opciones son combobox que se despliegan en línea con la misma lista (listbox dentro de la hoja)', () => {
    abrirHoja();
    const hoja = screen.getByRole('dialog');
    expect(fila('estado').getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(fila('estado'));
    expect(fila('estado').getAttribute('aria-expanded')).toBe('true');
    const l = document.getElementById(fila('estado').getAttribute('aria-controls'));
    expect(hoja.contains(l)).toBe(true);
    expect(l.closest('.filtro-acordeon').getAttribute('data-abierto')).toBe('true');
    expect(within(l).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todos', 'Cotizado', 'Pedido']);
  });
  it('solo una fila abierta a la vez: abrir otra cierra la anterior', () => {
    abrirHoja();
    fireEvent.click(fila('estado'));
    fireEvent.click(fila('resultado'));
    expect(fila('estado').getAttribute('aria-expanded')).toBe('false');
    expect(fila('resultado').getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelectorAll('.filtro-acordeon[data-abierto="true"]')).toHaveLength(1);
  });
  it('elegir una opción cierra el acordeón, llama a onChange(valor) y devuelve el foco a la fila', () => {
    mm(true);
    const onEstado = vi.fn();
    render(<Vista onEstado={onEstado} />);
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    fireEvent.click(fila('estado'));
    fireEvent.click(screen.getByRole('option', { name: 'Pedido' }));
    expect(onEstado).toHaveBeenCalledWith('Pedido');
    expect(fila('estado').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(fila('estado'));
  });
  it('teclado en la fila: flechas y Enter eligen; Escape cierra el acordeón y NO cierra la hoja', () => {
    mm(true);
    const onEstado = vi.fn();
    render(<Vista onEstado={onEstado} />);
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    const f = fila('estado');
    teclear(f, 'ArrowDown'); teclear(f, 'ArrowDown'); teclear(f, 'Enter');
    expect(onEstado).toHaveBeenCalledWith('Cotizado');
    teclear(f, 'ArrowDown');
    expect(f.getAttribute('aria-expanded')).toBe('true');
    teclear(f, 'Escape');
    expect(f.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('dialog').getAttribute('data-saliendo')).toBe('false');
  });
  it('el calendario es una fila más del acordeón: abrirlo cierra la fila abierta y abrir una fila cierra el calendario', () => {
    abrirHoja();
    fireEvent.click(fila('estado'));
    fireEvent.click(screen.getByRole('button', { name: /Elegir/ }));
    expect(document.querySelector('[data-fechas-contenedor]').getAttribute('data-estado')).toBe('abierto');
    expect(fila('estado').getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(fila('resultado'));
    expect(document.querySelector('[data-fechas-contenedor]').getAttribute('data-estado')).toBe('cerrado');
    expect(fila('resultado').getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelectorAll('.filtro-acordeon[data-abierto="true"]')).toHaveLength(1);
  });
  it('criterio del segmentado: con 3 opciones o menos sigue siendo una fila con botones; con más, un acordeón', () => {
    abrirHoja();
    expect(screen.getByRole('group', { name: 'Período' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Período' })).toBeNull();
    expect(fila('Orden')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Orden' })).toBeNull();
  });
  it('el estado seleccionado también tiñe la fila de la hoja', () => {
    abrirHoja();
    expect(fila('resultado').closest('[data-fila-acordeon]').className).toContain('bg-filtro-activo');
    expect(fila('estado').closest('[data-fila-acordeon]').className).not.toContain('bg-filtro-activo');
  });
  it('las filas desplegadas heredan altura mínima de 44 px y el panel cerrado queda inert', () => {
    abrirHoja();
    expect(fila('estado').className).toContain('min-h-11');
    expect(fila('estado').closest('[data-fila-acordeon]').querySelector('[data-acordeon-panel]').hasAttribute('inert')).toBe(true);
  });
});

describe('FiltroFechasContenedor', () => {
  it('cerrado no pinta nada', () => {
    mm(false);
    const { container } = render(<FiltroFechasContenedor abierto={false} onCerrar={() => {}}>x</FiltroFechasContenedor>);
    expect(container.firstChild).toBeNull();
  });
  it('escritorio: desplegable absoluto en línea con surface-flotante', () => {
    mm(false);
    const { container } = render(<FiltroFechasContenedor abierto onCerrar={() => {}}><i>cal</i></FiltroFechasContenedor>);
    const d = container.querySelector('[data-fechas-contenedor]');
    expect(d.className).toContain('absolute');
    expect(d.className).toContain('surface-flotante');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('móvil: hoja en portal a body, apoyada sobre el dock, con cerrar y Escape', () => {
    mm(true);
    const onCerrar = vi.fn();
    const { container } = render(<FiltroFechasContenedor abierto onCerrar={onCerrar}><i>cal</i></FiltroFechasContenedor>);
    expect(container.firstChild).toBeNull();
    const dlg = screen.getByRole('dialog', { name: 'Filtrar por fecha' });
    expect(document.body.contains(dlg)).toBe(true);
    expect(dlg.className).toContain('surface-flotante');
    expect(dlg.className).toContain('bottom-[var(--bottom-dock-h,0px)]');
    expect(dlg.className).toContain('max-h-[calc(100dvh-var(--bottom-dock-h,0px)-1rem)]');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar calendario' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledTimes(3);
  });
  it('móvil: mousedown dentro de la hoja no llega al listener del documento ("clic fuera" de la vista)', () => {
    mm(true);
    const fuera = vi.fn();
    document.addEventListener('mousedown', fuera);
    render(<FiltroFechasContenedor abierto onCerrar={() => {}}><button type="button">día 28</button></FiltroFechasContenedor>);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'día 28' }));
    document.removeEventListener('mousedown', fuera);
    expect(fuera).not.toHaveBeenCalled();
  });
});

describe('Tokens de animación (una sola fuente)', () => {
  const tokens = readFileSync('src/styles/tokens.css', 'utf8');
  const css = readFileSync('src/index.css', 'utf8');
  it('tokens.css define abrir, cerrar y las de la hoja', () => {
    expect(tokens).toMatch(/--anim-abrir:\s*220ms/);
    expect(tokens).toMatch(/--ease-abrir:\s*cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/);
    expect(tokens).toMatch(/--anim-cerrar:\s*140ms/);
    expect(tokens).toMatch(/--ease-cerrar:\s*cubic-bezier\(0\.4, 0, 1, 1\)/);
    expect(tokens).toMatch(/--anim-hoja-abrir:\s*280ms/);
    expect(tokens).toMatch(/--anim-hoja-cerrar:\s*200ms/);
  });
  it('la hoja, el desplegable y el acordeón usan los tokens (sin duraciones propias) y el movimiento reducido es un fundido', () => {
    expect(css).toMatch(/hoja-inferior-in var\(--anim-hoja-abrir\) var\(--ease-abrir\)/);
    expect(css).toMatch(/hoja-inferior-out var\(--anim-hoja-cerrar\) var\(--ease-cerrar\)/);
    expect(css).toMatch(/\.menu-anclado \{[^}]*menu-abrir-abajo var\(--anim-abrir\) var\(--ease-abrir\)/);
    expect(css).toMatch(/menu-cerrar-abajo var\(--anim-cerrar\) var\(--ease-cerrar\)/);
    expect(css).toMatch(/\.filtro-acordeon \{[^}]*grid-template-rows var\(--anim-cerrar\) var\(--ease-cerrar\)/);
    expect(css).toMatch(/filtros-fundido-in 0\.12s/);
  });
  it('--color-filtro-activo se declara en el bloque inline y en el de derivados por ámbito (sigue al rol)', () => {
    expect(tokens.match(/--color-filtro-activo:/g)).toHaveLength(2);
    expect(tokens.match(/--color-filtro-texto:/g)).toHaveLength(2);
    expect(tokens.match(/--color-filtro-abierto:/g)).toHaveLength(2);
  });
});

describe('Hoja móvil: scroll, altura y botón atrás', () => {
  const esperar = (ms = 30) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
  const Mini = () => (
    <BarraFiltros
      busqueda={<FiltroBusqueda value="" onChange={() => {}} ariaLabel="buscar" />}
      filtros={<FiltroSelect value="" onChange={() => {}} opciones={['A', 'B']} prefijo="Estado:" ariaLabel="estado" />}
      resultados={3}
    />
  );
  it('el cuerpo se desplaza con el dedo sin arrastrar la página y la cabecera y el pie son fijos', () => {
    mm(true);
    render(<Mini />);
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    const cuerpo = document.querySelector('[data-hoja-cuerpo]');
    for (const c of ['overflow-y-auto', 'overscroll-contain', 'touch-pan-y', 'flex-1', 'min-h-0']) expect(cuerpo.className).toContain(c);
    expect(cuerpo.previousElementSibling.className).toContain('shrink-0');
    expect(cuerpo.nextElementSibling.className).toContain('shrink-0');
  });
  it('atrás por capas: cierra la fila, luego la hoja, sin tocar el valor; la entrada del historial se retira al cerrar con la interfaz', async () => {
    mm(true);
    const onChange = vi.fn();
    render(<BarraFiltros busqueda={<FiltroBusqueda value="" onChange={() => {}} ariaLabel="buscar" />} filtros={<FiltroSelect value="" onChange={onChange} opciones={['A', 'B']} prefijo="Estado:" ariaLabel="estado" />} />);
    const base = window.history.length;
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    await esperar();
    expect(window.history.state.filtros).toBe(1);
    fireEvent.click(screen.getByRole('combobox', { name: 'estado' }));
    await esperar();
    expect(window.history.state.filtros).toBe(2);
    window.history.back();
    await esperar();
    expect(screen.getByRole('combobox', { name: 'estado' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    window.history.back();
    await esperar(300);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(window.history.length).toBeGreaterThanOrEqual(base);
    // cierre con la interfaz (X): la entrada se retira y el siguiente atrás no cierra nada ni deja entrada fantasma
    const antes = window.history.state && window.history.state.filtros;
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    await esperar();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar filtros' }));
    await esperar(400);
    await esperar(100);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((window.history.state && window.history.state.filtros) || undefined).toBe(antes || undefined);
  });
  it('elegir una opción cierra la fila y retira su entrada: el atrás siguiente cierra la hoja', async () => {
    mm(true);
    render(<Mini />);
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    await esperar();
    fireEvent.click(screen.getByRole('combobox', { name: 'estado' }));
    await esperar();
    fireEvent.click(screen.getByRole('option', { name: 'B' }));
    await esperar();
    expect(window.history.state.filtros).toBe(1);
    window.history.back();
    await esperar(300);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('el menú de escritorio mide siempre el ancho del campo (sin min-width) y sus opciones largas parten en dos líneas con title', () => {
    mm(false);
    const largo = 'Una opción muy larga que no cabe en una sola línea del campo';
    const { container } = render(<FiltroSelect value="" onChange={() => {}} opciones={[largo]} prefijo="Estado:" ariaLabel="estado" />);
    container.querySelector('[data-filtro-select]').getBoundingClientRect = () => ({ top: 10, bottom: 46, left: 20, right: 180, width: 160, height: 36 });
    fireEvent.click(screen.getByRole('combobox', { name: 'estado' }));
    const menu = document.querySelector('[data-menu-anclado]');
    expect(menu.style.width).toBe('160px');
    expect(menu.style.minWidth).toBe('');
    const op = screen.getByRole('option', { name: largo });
    expect(op.title).toBe(largo);
    expect(op.querySelector('span').className).toContain('line-clamp-2');
    expect(menu.querySelector('ul').className).toContain('scroll-filtros');
  });
});

describe('FiltroBusqueda con etiqueta en la hoja', () => {
  it('en la hoja la fila lleva la etiqueta visible; en la barra no', () => {
    mm(true);
    render(
      <BarraFiltros
        filtros={<FiltroBusqueda value="" onChange={() => {}} placeholder="N° de OC…" etiqueta="N° OC" ariaLabel="Buscar por N° de OC" />}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    const hoja = screen.getByRole('dialog');
    expect(hoja.textContent).toContain('N° OC');
    expect(screen.getByLabelText('Buscar por N° de OC').tagName).toBe('INPUT');
    cleanup();
    mm(false);
    const { container } = render(<BarraFiltros filtros={<FiltroBusqueda value="" onChange={() => {}} placeholder="N° de OC…" etiqueta="N° OC" ariaLabel="Buscar por N° de OC" />} />);
    expect(container.textContent).not.toContain('N° OC');
  });
});

describe('FiltroPestanas: ids, desplazamiento y degradado', () => {
  const ops = [{ id: 'a', label: 'A', cantidad: 1 }, { id: 'b', label: 'B', cantidad: 2 }];
  it('prefijoId da el id de cada pestaña y no hay barra de desplazamiento visible', () => {
    render(<FiltroPestanas opciones={ops} value="a" onChange={() => {}} prefijoId="tab-prorroga-" />);
    expect(document.getElementById('tab-prorroga-a')).toBeTruthy();
    const barra = screen.getByRole('tablist');
    expect(barra.className).toContain('overflow-x-auto');
    expect(barra.className).toContain('[scrollbar-width:none]');
    expect(barra.className).toContain('[&::-webkit-scrollbar]:hidden');
  });
  it('si hay contenido fuera, los bordes se difuminan según el desplazamiento', () => {
    render(<FiltroPestanas opciones={ops} value="a" onChange={() => {}} />);
    const barra = screen.getByRole('tablist');
    Object.defineProperty(barra, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(barra, 'scrollWidth', { configurable: true, value: 500 });
    barra.scrollLeft = 0;
    fireEvent.scroll(barra);
    expect(barra.dataset.fadeIzq).toBe('false');
    expect(barra.dataset.fadeDer).toBe('true');
    barra.scrollLeft = 100;
    fireEvent.scroll(barra);
    expect(barra.dataset.fadeIzq).toBe('true');
    expect(barra.dataset.fadeDer).toBe('true');
    barra.scrollLeft = 300;
    fireEvent.scroll(barra);
    expect(barra.dataset.fadeIzq).toBe('true');
    expect(barra.dataset.fadeDer).toBe('false');
  });
});

describe('FiltroSegmentado con prefijo', () => {
  it('muestra el nombre del filtro dentro de la pista en la barra', () => {
    mm(false);
    const { container } = render(<FiltroSegmentado ariaLabel="Vendedor" prefijo="Vendedor:" valorNeutro="todas" value="otros" onChange={() => {}} opciones={[{ value: 'todas', label: 'Todos' }, { value: 'propias', label: 'Propias' }, { value: 'otros', label: 'Otros' }]} />);
    expect(container.textContent).toContain('Vendedor:');
    expect(container.firstChild.className).toContain('bg-filtro-activo');
  });
});

describe('FiltroSegmentado: pista compacta que cubre todas las opciones', () => {
  const op = [{ value: 'todas', label: 'Todos' }, { value: 'propias', label: 'Propias' }, { value: 'otros', label: 'Otros' }];
  it('todas las opciones viven dentro de la pista; ancho del contenido y botones de igual ancho (rejilla auto-cols-fr)', () => {
    mm(false);
    render(<FiltroSegmentado ariaLabel="V" prefijo="Vendedor:" value="todas" onChange={() => {}} opciones={op} />);
    const pista = screen.getByRole('group', { name: 'V' });
    expect(pista.className).toContain('w-max');
    expect(pista.className).toContain('inline-flex');
    expect(pista.className).not.toMatch(/(^|\s)w-full(\s|$)/);
    const rejilla = pista.querySelector('.grid');
    expect(rejilla.className).toContain('auto-cols-fr');
    expect([...rejilla.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Todos', 'Propias', 'Otros']);
    expect(pista.querySelectorAll('button')).toHaveLength(3);
  });
  it('`completo` la lleva al ancho del contenedor', () => {
    mm(false);
    render(<FiltroSegmentado ariaLabel="V" completo value="todas" onChange={() => {}} opciones={op} />);
    expect(screen.getByRole('group', { name: 'V' }).className).toMatch(/(^|\s)w-full(\s|$)/);
  });
});

describe('ContadorResultados: singular y plural', () => {
  it('"1 registro", "0 registros" y "N registros"', () => {
    const { container, rerender } = render(<ContadorResultados total={1} singular="registro" plural="registros" />);
    expect(container.textContent).toBe('1 registro');
    rerender(<ContadorResultados total={0} singular="registro" plural="registros" />);
    expect(container.textContent).toBe('0 registros');
    rerender(<ContadorResultados total={7} singular="registro" plural="registros" />);
    expect(container.textContent).toBe('7 registros');
  });
  it('con filtro el sustantivo concuerda con el total y sin singular se deriva de unidad', () => {
    const { container, rerender } = render(<ContadorResultados total={20} filtrados={1} singular="orden" plural="órdenes" />);
    expect(container.textContent).toBe('1 de 20 órdenes');
    rerender(<ContadorResultados total={1} singular="ítem" plural="ítems" />);
    expect(container.textContent).toBe('1 ítem');
    rerender(<ContadorResultados total={1} unidad="resultados" />);
    expect(container.textContent).toBe('1 resultado');
  });
});

describe('BarraFiltros con filas y búsqueda aparte (Prórrogas)', () => {
  const montar = (props = {}) => render(
    <BarraFiltros
      filas={props.filas || [[<span key="f">FECHAS</span>], [<span key="v">VENDEDOR</span>]]}
      busquedaAparte
      busqueda={<FiltroBusqueda value="" onChange={() => {}} ariaLabel="buscar" />}
      limpiar={<BotonLimpiar activos={props.activos ?? 2} onClick={() => {}} />}
      extremo={<ContadorResultados total={5} singular="registro" plural="registros" />}
      filtrosActivos={1}
      resultados={5}
      busquedaEnBarraMovil
    />
  );
  it('escritorio: tarjeta de filtros con las filas apiladas y Limpiar al final de la última, y tarjeta de búsqueda aparte con el contador', () => {
    mm(false);
    const { container } = montar();
    const tarjetas = container.querySelectorAll('section');
    expect(tarjetas).toHaveLength(2);
    const filas = tarjetas[0].querySelectorAll(':scope > div > div');
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toBe('FECHAS');
    expect(filas[1].textContent).toContain('VENDEDOR');
    const bloque = filas[1].querySelector('[data-bloque]');
    expect(bloque.textContent).toContain('Limpiar filtros (2)');
    expect(bloque.className).toContain('w-44');
    expect(bloque.textContent).not.toContain('registros');
    expect(tarjetas[0].querySelector('input')).toBeNull();
    expect(tarjetas[1].querySelector('input[type="search"]')).toBeTruthy();
    expect(tarjetas[1].textContent).toContain('5 registros');
    expect(tarjetas[0].compareDocumentPosition(tarjetas[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('el hueco de Limpiar está siempre reservado (existe aunque no haya filtros activos)', () => {
    mm(false);
    const { container } = montar({ activos: 0 });
    const bloque = container.querySelector('section [data-bloque]');
    expect(bloque).toBeTruthy();
    expect(bloque.textContent).toBe('');
  });
  it('una sola fila cuando no hay segundo filtro', () => {
    mm(false);
    const { container } = montar({ filas: [[<span key="f">FECHAS</span>]] });
    const filas = container.querySelectorAll('section')[0].querySelectorAll(':scope > div > div');
    expect(filas).toHaveLength(1);
    expect(filas[0].querySelector('[data-bloque]')).toBeTruthy();
  });
  it('móvil: una tarjeta con búsqueda, "Filtros (N)" (solo lo de la hoja), Limpiar y contador; la hoja sin buscador', () => {
    mm(true);
    const { container } = montar();
    expect(container.querySelectorAll('section')).toHaveLength(1);
    expect(container.querySelector('input[type="search"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Filtros \(1\)/ })).toBeTruthy();
    const icono = screen.getByRole('button', { name: 'Limpiar filtros (2)' });
    expect(icono.className).toContain('size-11');
    expect(icono.textContent).toBe('2');
    expect(container.querySelector('section > div > div').children).toHaveLength(3);
    expect(container.textContent).toContain('5 registros');
    fireEvent.click(screen.getByRole('button', { name: /Filtros \(1\)/ }));
    const hoja = screen.getByRole('dialog');
    expect(hoja.querySelector('input[type="search"]')).toBeNull();
    expect(hoja.textContent).toContain('FECHAS');
    expect(hoja.textContent).toContain('VENDEDOR');
    expect(screen.getByRole('button', { name: 'Ver 5 resultados' })).toBeTruthy();
  });
});

describe('FiltroSelect sinTodos y acciones de la barra', () => {
  it('sinTodos: no hay opción "Todos", siempre hay un valor y no usa el estado seleccionado', () => {
    mm(false);
    const onChange = vi.fn();
    render(<FiltroSelect sinTodos value="2025" onChange={onChange} opciones={['2026', '2025', { value: 'todos', label: 'Todo el historial' }]} prefijo="Año:" ariaLabel="Año" />);
    const b = screen.getByRole('combobox', { name: 'Año' });
    expect(b.textContent).toContain('2025');
    expect(b.closest('[data-filtro-select]').className).not.toContain('bg-filtro-activo');
    fireEvent.click(b);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['2026', '2025', 'Todo el historial']);
    fireEvent.click(screen.getByRole('option', { name: 'Todo el historial' }));
    expect(onChange).toHaveBeenCalledWith('todos');
  });
  it('acciones: en escritorio van en el bloque final con ancho mayor; en móvil son la última fila de la hoja', () => {
    mm(false);
    const { container, unmount } = render(<BarraFiltros filtros={<FiltroSelect value="" onChange={() => {}} opciones={['A']} prefijo="E:" ariaLabel="e" />} acciones={<BotonExportar onClick={() => {}} etiqueta="Exportar Excel" />} extremo={<ContadorResultados total={3} singular="solicitud" plural="solicitudes" />} />);
    const bloque = container.querySelector('[data-bloque]');
    expect(bloque.getAttribute('data-ancho')).toBe('440');
    expect(bloque.textContent).toContain('Exportar Excel');
    expect(bloque.textContent).toContain('3 solicitudes');
    unmount();
    mm(true);
    render(<BarraFiltros filtros={<FiltroSelect value="" onChange={() => {}} opciones={['A']} prefijo="E:" ariaLabel="e" />} acciones={<BotonExportar onClick={() => {}} etiqueta="Exportar Excel" />} extremo={<ContadorResultados total={3} singular="solicitud" plural="solicitudes" />} />);
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    const hoja = screen.getByRole('dialog');
    const ult = hoja.querySelector('.divide-y').lastElementChild;
    expect(ult.textContent).toBe('Exportar Excel');
    expect(ult.className).toContain('min-h-11');
  });
});

describe('FiltroSegmentado: estilo de selección', () => {
  it('la opción activa usa el tono oscuro del rol, negrita y transición; las demás peso medio', () => {
    mm(false);
    render(<FiltroSegmentado ariaLabel="Período" opciones={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} value="a" onChange={() => {}} />);
    const a = screen.getByRole('button', { name: 'A' }); const b = screen.getByRole('button', { name: 'B' });
    for (const c of ['bg-segmento-activo', 'text-primary-soft', 'font-semibold', 'transition-colors']) expect(a.className).toContain(c);
    expect(a.getAttribute('aria-pressed')).toBe('true');
    expect(b.className).toContain('font-medium');
    expect(b.className).not.toContain('bg-segmento-activo');
    expect(b.getAttribute('aria-pressed')).toBe('false');
  });
});
