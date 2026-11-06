// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  BarraFiltros, BotonExportar, FiltroFechaCampo, FiltroFechasContenedor, BotonLimpiar, ContadorResultados, FiltroBusqueda, FiltroConmutador, FiltroPestanas, FiltroSegmentado, FiltroSelect
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

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const montarBarra = (props = {}) => render(
  <BarraFiltros
    encabezado={<h2>Solicitudes</h2>}
    busqueda={<FiltroBusqueda value="" onChange={() => {}} ariaLabel="buscar" />}
    filtros={<>
      <FiltroSelect value="" onChange={() => {}} opciones={['Cotizado']} prefijo="Estado:" ariaLabel="estado" />
      <FiltroConmutador activo={false} onChange={() => {}} etiqueta="En seguimiento" />
    </>}
    limpiar={<BotonLimpiar activos={2} onClick={props.onLimpiar || (() => {})} />}
    extremo={<span>20 resultados</span>}
    filtrosActivos={2}
    resultados={12}
    {...props}
  />
);

describe('BarraFiltros en escritorio', () => {
  it('es una superficie (surface, sin borde) y ordena los slots: encabezado, búsqueda, filtros y, al final, limpiar + extremo', () => {
    mm(false);
    const { container } = montarBarra();
    const seccion = container.querySelector('section');
    expect(seccion.className).toContain('surface');
    expect(seccion.className).not.toMatch(/(^|\s)border(\s|$)/);
    const hijos = [...seccion.children];
    expect(hijos[0].textContent).toBe('Solicitudes');
    const fila = hijos[1];
    expect(fila.children[0].querySelector('input')).toBeTruthy();
    expect(fila.children[1].querySelector('select')).toBeTruthy();
    const ultimo = fila.lastElementChild;
    expect(ultimo.className).toContain('ml-auto');
    expect(ultimo.textContent).toContain('Limpiar filtros (2)');
    expect(ultimo.textContent).toContain('20 resultados');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(/^Filtros/)).toBeNull();
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
    expect(d.querySelector('select[aria-label="estado"]')).toBeTruthy();
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
    vi.useRealTimers();
  });
  it('atrapa el foco: Tab en el último elemento vuelve al primero y Shift+Tab en el primero va al último', () => {
    mm(true);
    montarBarra();
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    const d = screen.getByRole('dialog');
    const foco = [...d.querySelectorAll('button, select, input')];
    foco[foco.length - 1].focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(foco[0]);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(foco[foco.length - 1]);
  });
  it('"Limpiar (N)" llama a la acción de la vista (la hoja no guarda estado propio) y la selección se aplica al instante', () => {
    mm(true);
    const onLimpiar = vi.fn();
    const onChange = vi.fn();
    montarBarra({ onLimpiar, filtros: <FiltroSelect value="" onChange={onChange} opciones={['Cotizado']} prefijo="Estado:" ariaLabel="estado" /> });
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    fireEvent.change(screen.getByLabelText('estado'), { target: { value: 'Cotizado' } });
    expect(onChange).toHaveBeenCalledWith('Cotizado');
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros (2 activos)' }));
    expect(onLimpiar).toHaveBeenCalledTimes(1);
  });
  it('fila de fecha: el calendario se despliega en línea dentro de la hoja (sin portal ni segunda hoja)', () => {
    mm(true);
    const Fecha = () => {
      const [ab, setAb] = React.useState(false);
      return (
        <div>
          <FiltroFechaCampo texto="1 nov – 30 nov" expandido={ab} onClick={() => setAb((v) => !v)} />
          <FiltroFechasContenedor abierto={ab} onCerrar={() => setAb(false)}><button type="button">día 28</button></FiltroFechasContenedor>
        </div>
      );
    };
    montarBarra({ filtros: <Fecha /> });
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    const hoja = screen.getByRole('dialog');
    const cont = hoja.querySelector('[data-fechas-contenedor]');
    expect(cont.getAttribute('data-estado')).toBe('cerrado');
    expect(cont.hasAttribute('inert')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Fecha/ }));
    expect(cont.getAttribute('data-estado')).toBe('abierto');
    expect(cont.hasAttribute('inert')).toBe(false);
    expect(hoja.contains(screen.getByRole('button', { name: 'día 28' }))).toBe(true);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
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
