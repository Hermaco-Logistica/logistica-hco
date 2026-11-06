// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  BarraFiltros, BotonExportar, FiltroFechasContenedor, BotonLimpiar, ContadorResultados, FiltroBusqueda, FiltroConmutador, FiltroPestanas, FiltroSegmentado, FiltroSelect
} from './index';
import { BotonSeguimiento } from '../../views/analisis/components/FiltroSeguimiento';

afterEach(cleanup);

describe('FiltroBusqueda', () => {
  it('muestra el valor, nombra el campo con aria-label y devuelve el texto (no el evento)', () => {
    const onChange = vi.fn();
    render(<FiltroBusqueda value="abc" onChange={onChange} placeholder="Buscar ref" ariaLabel="Buscar por referencia o cliente" />);
    const campo = screen.getByRole('searchbox', { name: 'Buscar por referencia o cliente' });
    expect(campo.value).toBe('abc');
    fireEvent.change(campo, { target: { value: 'xyz' } });
    expect(onChange).toHaveBeenCalledWith('xyz');
  });
});

describe('FiltroSelect', () => {
  const opciones = ['Cotizado', { value: 'Pedido', label: 'Pedido ganado' }];
  it('conserva el <select> nativo, antepone la opción "todos" y devuelve el valor', () => {
    const onChange = vi.fn();
    const { container } = render(<FiltroSelect value="" onChange={onChange} opciones={opciones} prefijo="Estado:" ariaLabel="Filtrar por estado" />);
    const sel = screen.getByRole('combobox', { name: 'Filtrar por estado' });
    expect(sel.tagName).toBe('SELECT');
    expect([...sel.options].map((o) => o.textContent)).toEqual(['Todos', 'Cotizado', 'Pedido ganado']);
    expect(container.textContent).toContain('Estado:');
    fireEvent.change(sel, { target: { value: 'Pedido' } });
    expect(onChange).toHaveBeenCalledWith('Pedido');
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
  it('la variante sticky envuelve la barra en un contenedor pegado arriba', () => {
    const { container } = render(<FiltroPestanas sticky value="todas" onChange={() => {}} opciones={opciones} />);
    expect(container.firstChild.className).toContain('sticky');
    expect(container.firstChild.className).toContain('top-0');
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
  it('activo usa el color del rol (primary-strong con texto primary-soft), no slate-900', () => {
    render(<FiltroConmutador activo onChange={() => {}} etiqueta="X" />);
    const c = screen.getByRole('button', { name: 'X' }).className;
    expect(c).toContain('bg-primary-strong');
    expect(c).toContain('text-primary-soft');
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

describe('BarraFiltros', () => {
  const montar = (props = {}) => render(
    <BarraFiltros
      encabezado={<h2>Solicitudes</h2>}
      busqueda={<input aria-label="buscar" />}
      filtros={<select aria-label="estado"><option value="">Todos</option></select>}
      limpiar={<button type="button">Limpiar</button>}
      extremo={<span>20 resultados</span>}
      filtrosActivos={2}
      {...props}
    />
  );
  it('es una superficie (surface, sin borde) y ordena los slots: encabezado, búsqueda, filtros y, al final, limpiar + extremo', () => {
    const { container } = montar();
    const seccion = container.querySelector('section');
    expect(seccion.className).toContain('surface');
    expect(seccion.className).not.toMatch(/(^|\s)border(\s|$)/);
    const hijos = [...seccion.children];
    expect(hijos[0].textContent).toBe('Solicitudes');
    const fila = hijos[1];
    const orden = [...fila.children].map((c) => c.textContent || c.querySelector('select, input')?.getAttribute('aria-label'));
    expect(orden[0]).toBeTruthy();
    const ultimo = fila.lastElementChild;
    expect(ultimo.className).toContain('md:ml-auto');
    expect(ultimo.textContent).toContain('Limpiar');
    expect(ultimo.textContent).toContain('20 resultados');
  });
  it('móvil: "Filtros (N)" con aria-expanded y aria-controls; el panel se pliega y se abre', () => {
    montar();
    const toggle = screen.getByRole('button', { name: /Filtros \(2\)/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(panel.className).toContain('hidden');
    expect(panel.className).toContain('md:contents');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });
  it('un solo marcado: el select aparece una vez (no hay copia móvil y de escritorio)', () => {
    montar();
    expect(screen.getAllByLabelText('estado')).toHaveLength(1);
  });
  it('sin filtros activos el botón móvil no lleva número; sin slots opcionales no pinta bloques vacíos', () => {
    const { container } = render(<BarraFiltros busqueda={<input aria-label="b" />} />);
    expect(container.querySelector('[aria-expanded]')).toBeNull();
    expect(container.querySelector('.md\\:ml-auto')).toBeNull();
  });
});

describe('FiltroSelect con valor largo', () => {
  it('con valor elegido apila el prefijo (línea pequeña) y conserva <select> y aria-label', () => {
    const { container } = render(<FiltroSelect value="Carlos Rivera Hernández" onChange={() => {}} opciones={['Carlos Rivera Hernández']} prefijo="Vendedor:" ariaLabel="Filtrar por vendedor" />);
    expect(screen.getByRole('combobox', { name: 'Filtrar por vendedor' }).tagName).toBe('SELECT');
    const pref = container.querySelector('span[aria-hidden="true"].absolute');
    expect(pref.textContent).toBe('Vendedor');
  });
});

describe('FiltroFechasContenedor', () => {
  const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
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
