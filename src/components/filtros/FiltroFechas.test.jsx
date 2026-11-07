// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BarraFiltros, FiltroBusqueda, FiltroFechas, derivarAcceso, rangoMesActualISO } from './index';
import { reiniciarCapasParaPruebas } from './capasAtras';

afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 20)); reiniciarCapasParaPruebas(); window.history.replaceState(null, ''); });
const mm = (m) => { window.matchMedia = () => ({ matches: m, addEventListener() {}, removeEventListener() {} }); };

describe('rangosFecha', () => {
  it('el mes actual en ISO y el acceso derivado del rango (sin estado propio)', () => {
    const mes = rangoMesActualISO();
    expect(mes.desde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(mes.hasta >= mes.desde).toBe(true);
    expect(derivarAcceso(mes)).toBe('mes');
    expect(derivarAcceso({ desde: '', hasta: '' })).toBe('todas');
    expect(derivarAcceso({ desde: '2026-01-01', hasta: '' })).toBe('personalizado');
    expect(derivarAcceso({ desde: mes.desde, hasta: '' })).toBe('personalizado');
  });
});

describe('FiltroFechas en la barra (escritorio)', () => {
  const montar = (valor, props = {}) => {
    mm(false);
    const onChange = vi.fn();
    const r = render(<FiltroFechas value={valor} onChange={onChange} {...props} />);
    return { onChange, ...r };
  };
  it('dos <input type="date"> con ISO y accesos rápidos derivados; un solo campo compuesto', () => {
    const mes = rangoMesActualISO();
    const { container } = montar(mes);
    const d = screen.getByLabelText('Fecha desde'); const h = screen.getByLabelText('Fecha hasta');
    expect(d.type).toBe('date'); expect(h.type).toBe('date');
    expect(d.value).toBe(mes.desde); expect(h.value).toBe(mes.hasta);
    expect(d.parentElement).toBe(h.parentElement);
    expect(container.querySelector('[data-peso]').getAttribute('data-peso')).toBe('3');
    expect(screen.getByRole('button', { name: 'Mes actual' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Personalizado' }).getAttribute('aria-pressed')).toBe('false');
  });
  it('cambiar un campo llama a onChange con el rango completo en ISO (sin tocar el otro extremo)', () => {
    const mes = rangoMesActualISO();
    const { onChange } = montar(mes);
    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-03-05' } });
    expect(onChange).toHaveBeenLastCalledWith({ desde: '2026-03-05', hasta: mes.hasta });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '2026-04-01' } });
    expect(onChange).toHaveBeenLastCalledWith({ desde: mes.desde, hasta: '2026-04-01' });
  });
  it('los accesos: "Mes actual" y "Todas las fechas" fijan el rango; "Personalizado" solo enfoca el campo desde', () => {
    const { onChange } = montar({ desde: '2026-01-01', hasta: '2026-01-31' });
    expect(screen.getByRole('button', { name: 'Personalizado' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Mes actual' }));
    expect(onChange).toHaveBeenLastCalledWith(rangoMesActualISO());
    fireEvent.click(screen.getByRole('button', { name: 'Todas las fechas' }));
    expect(onChange).toHaveBeenLastCalledWith({ desde: '', hasta: '' });
    onChange.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('Fecha desde'));
  });
  it('min y max enlazan los dos campos', () => {
    montar({ desde: '2026-02-01', hasta: '2026-02-20' });
    expect(screen.getByLabelText('Fecha desde').max).toBe('2026-02-20');
    expect(screen.getByLabelText('Fecha hasta').min).toBe('2026-02-01');
  });
  it('estado seleccionado solo si se aparta del rango por defecto (mes actual)', () => {
    const mes = rangoMesActualISO();
    const a = montar(mes);
    const campo = () => screen.getByLabelText('Fecha desde').parentElement;
    expect(campo().className).not.toContain('bg-filtro-activo');
    a.unmount();
    montar({ desde: '', hasta: '' });
    expect(campo().className).toContain('bg-filtro-activo');
    cleanup();
    montar({ desde: '', hasta: '' }, { porDefecto: { desde: '', hasta: '' } });
    expect(campo().className).not.toContain('bg-filtro-activo');
  });
});

describe('FiltroFechas en la hoja móvil', () => {
  const Vista = ({ onChange = () => {}, inicial }) => {
    const [v, setV] = React.useState(inicial || rangoMesActualISO());
    return (
      <BarraFiltros
        busqueda={<FiltroBusqueda value="" onChange={() => {}} ariaLabel="buscar" />}
        filtros={<FiltroFechas value={v} onChange={(r) => { setV(r); onChange(r); }} />}
        resultados={3}
      />
    );
  };
  it('la fila "Fecha" se despliega en línea con los accesos y los dos campos nativos', () => {
    mm(true);
    const onChange = vi.fn();
    render(<Vista onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    const hoja = screen.getByRole('dialog');
    const fila = screen.getByRole('button', { name: 'Filtrar por fecha' });
    expect(fila.getAttribute('aria-expanded')).toBe('false');
    expect(fila.textContent).toContain('Mes actual');
    fireEvent.click(fila);
    expect(fila.getAttribute('aria-expanded')).toBe('true');
    const panel = hoja.querySelector('[data-acordeon-panel]');
    expect(panel.getAttribute('data-abierto')).toBe('true');
    expect(panel.contains(screen.getByLabelText('Fecha desde'))).toBe(true);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Todas las fechas' }));
    expect(onChange).toHaveBeenLastCalledWith({ desde: '', hasta: '' });
    expect(fila.textContent).toContain('Todas las fechas');
    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-02-03' } });
    expect(onChange).toHaveBeenLastCalledWith({ desde: '2026-02-03', hasta: '' });
    expect(fila.textContent).toContain('03/02/2026');
    expect(fila.closest('[data-fila-acordeon]').className).toContain('bg-filtro-activo');
  });
  it('es una fila más del acordeón: se cierra con el botón atrás por capas', async () => {
    mm(true);
    render(<Vista />);
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    await new Promise((r) => setTimeout(r, 20));
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por fecha' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(window.history.state.filtros).toBe(2);
    window.history.back();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByRole('button', { name: 'Filtrar por fecha' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
