// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BarraFiltrosHistorial } from './BarraFiltrosHistorial';
import { reiniciarCapasParaPruebas } from '../../../components/filtros/capasAtras';

/** Barra de los Historiales: presentación pura. Cada control llama a su callback; los conteos los pasa el Historial. */
const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 40) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const Seguimiento = ({ onClick }) => <button type="button" onClick={onClick}>En seguimiento</button>;
const base = (extra = {}) => ({
  busqueda: '', onBusqueda: vi.fn(), placeholderBusqueda: 'Buscar por correlativo, producto...',
  estado: '', onEstado: vi.fn(), opcionesEstado: ['Cotizado', 'Pedido'],
  modalidad: '', onModalidad: vi.fn(), opcionesModalidad: ['Aéreo', 'Marítimo'],
  seguimiento: <Seguimiento onClick={() => {}} />, onLimpiar: vi.fn(), onExportar: vi.fn(), total: 5, ...extra
});
const montar = (props) => render(<BarraFiltrosHistorial {...props} />);
const contador = () => document.querySelector('[aria-live="polite"]').textContent;

beforeEach(() => { mm(false); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });

describe('BarraFiltrosHistorial (escritorio)', () => {
  it('pinta todos los controles y cada uno llama a su callback', () => {
    const seg = vi.fn();
    const p = base({ activosLimpiar: 2, seguimiento: <Seguimiento onClick={seg} />, cliente: '', onCliente: vi.fn(), opcionesCliente: ['A', 'B'] });
    montar(p);
    fireEvent.change(screen.getByPlaceholderText('Buscar por correlativo, producto...'), { target: { value: 'bomba' } });
    expect(p.onBusqueda).toHaveBeenCalledWith('bomba');
    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por estado' }));
    fireEvent.click(screen.getByRole('option', { name: 'Pedido' }));
    expect(p.onEstado).toHaveBeenCalledWith('Pedido');
    fireEvent.click(within(screen.getByRole('group', { name: 'Filtrar por modalidad' })).getByRole('button', { name: 'Marítimo' }));
    expect(p.onModalidad).toHaveBeenCalledWith('Marítimo');
    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por cliente' }));
    fireEvent.click(screen.getByRole('option', { name: 'B' }));
    expect(p.onCliente).toHaveBeenCalledWith('B');
    fireEvent.click(screen.getByRole('button', { name: 'En seguimiento' }));
    expect(seg).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /^Limpiar filtros/ }));
    expect(p.onLimpiar).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Exportar movimientos/ }));
    expect(p.onExportar).toHaveBeenCalledTimes(1);
  });

  it('las opciones de modalidad incluyen "Todas" (valor vacío) y la selección activa se marca', () => {
    montar(base({ modalidad: 'Aéreo' }));
    const grupo = screen.getByRole('group', { name: 'Filtrar por modalidad' });
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual(['Todas', 'Aéreo', 'Marítimo']);
    expect(within(grupo).getByRole('button', { name: 'Aéreo' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('sin chips no pinta la ranura de encabezado; con chips la pinta', () => {
    const { container, rerender } = montar(base());
    expect(container.querySelector('section .mb-3')).toBeNull();
    rerender(<BarraFiltrosHistorial {...base({ chips: <span>chip de prueba</span> })} />);
    expect(screen.getByText('chip de prueba')).toBeTruthy();
    expect(container.querySelector('section .mb-3')).toBeTruthy();
  });

  it('con soloAnulados no hay Estado ni seguimiento, pero sí búsqueda, modalidad, Limpiar y Exportar', () => {
    montar(base({ soloAnulados: true, activosLimpiar: 1 }));
    expect(screen.queryByRole('combobox', { name: 'Filtrar por estado' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'En seguimiento' })).toBeNull();
    expect(screen.getByPlaceholderText('Buscar por correlativo, producto...')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Filtrar por modalidad' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Limpiar filtros/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Exportar movimientos/ })).toBeTruthy();
  });

  it('el select de Cliente no aparece si no se pasa o si hay un solo cliente', () => {
    const { rerender } = montar(base());
    expect(screen.queryByRole('combobox', { name: 'Filtrar por cliente' })).toBeNull();
    rerender(<BarraFiltrosHistorial {...base({ opcionesCliente: ['A'], onCliente: vi.fn() })} />);
    expect(screen.queryByRole('combobox', { name: 'Filtrar por cliente' })).toBeNull();
    rerender(<BarraFiltrosHistorial {...base({ opcionesCliente: ['A', 'B'], onCliente: vi.fn() })} />);
    expect(screen.getByRole('combobox', { name: 'Filtrar por cliente' })).toBeTruthy();
  });

  it('Limpiar aparece solo con activosLimpiar > 0 y el contador pluraliza', () => {
    const { rerender } = montar(base({ activosLimpiar: 0, total: 1 }));
    expect(screen.queryByRole('button', { name: /^Limpiar filtros/ })).toBeNull();
    expect(contador()).toBe('Mostrando 1 movimiento');
    rerender(<BarraFiltrosHistorial {...base({ activosLimpiar: 3, total: 2 })} />);
    expect(screen.getByRole('button', { name: /^Limpiar filtros \(3/ })).toBeTruthy();
    expect(contador()).toBe('Mostrando 2 movimientos');
  });
});

describe('BarraFiltrosHistorial: escritorio en dos filas y modalidad con 3 opciones', () => {
  it('fila 1: búsqueda, Cliente y Estado; fila 2: Modalidad y seguimiento con Limpiar, Exportar y el contador en el bloque final', () => {
    const { container } = montar(base({ activosLimpiar: 1, cliente: '', onCliente: vi.fn(), opcionesCliente: ['A', 'B'] }));
    const filas = Array.from(container.querySelectorAll('section .space-y-2 > div'));
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByPlaceholderText('Buscar por correlativo, producto...')).toBeTruthy();
    expect(within(filas[0]).getByRole('combobox', { name: 'Filtrar por cliente' })).toBeTruthy();
    expect(within(filas[0]).getByRole('combobox', { name: 'Filtrar por estado' })).toBeTruthy();
    expect(within(filas[1]).getByRole('group', { name: 'Filtrar por modalidad' })).toBeTruthy();
    expect(within(filas[1]).getByRole('button', { name: 'En seguimiento' })).toBeTruthy();
    const bloque = filas[1].querySelector('[data-bloque]');
    expect(bloque.className).toContain('w-[27.5rem]');
    expect(within(bloque).getByRole('button', { name: /^Limpiar filtros/ })).toBeTruthy();
    expect(within(bloque).getByRole('button', { name: /Exportar movimientos/ })).toBeTruthy();
    expect(bloque.textContent).toContain('Mostrando 5 movimientos');
  });

  it('con soloAnulados la fila 1 no lleva Estado y la 2 no lleva seguimiento', () => {
    const { container } = montar(base({ soloAnulados: true }));
    const filas = Array.from(container.querySelectorAll('section .space-y-2 > div'));
    expect(within(filas[0]).queryByRole('combobox', { name: 'Filtrar por estado' })).toBeNull();
    expect(within(filas[1]).queryByRole('button', { name: 'En seguimiento' })).toBeNull();
    expect(within(filas[1]).getByRole('group', { name: 'Filtrar por modalidad' })).toBeTruthy();
  });

  it('con 3 modalidades (4 opciones con "Todas") Modalidad pasa a select y no hay segmentado que se superponga', () => {
    const p = base({ opcionesModalidad: ['Aéreo', 'Marítimo', 'No asignada'] });
    montar(p);
    expect(screen.queryByRole('group', { name: 'Filtrar por modalidad' })).toBeNull();
    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por modalidad' }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Todas', 'Aéreo', 'Marítimo', 'No asignada']);
    fireEvent.click(screen.getByRole('option', { name: 'No asignada' }));
    expect(p.onModalidad).toHaveBeenCalledWith('No asignada');
  });

  it('con 2 modalidades sigue el segmentado (Todas, Aéreo, Marítimo)', () => {
    montar(base());
    expect(screen.getByRole('group', { name: 'Filtrar por modalidad' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Filtrar por modalidad' })).toBeNull();
  });
});

describe('BarraFiltrosHistorial (móvil)', () => {
  it('"Filtros (N)" solo con filtrosActivos > 0; los controles viven en la hoja y la búsqueda en la barra', async () => {
    mm(true);
    const { rerender } = montar(base({ filtrosActivos: 0 }));
    expect(screen.getByRole('button', { name: /^Filtros$/ })).toBeTruthy();
    expect(screen.getByPlaceholderText('Buscar por correlativo, producto...')).toBeTruthy();
    rerender(<BarraFiltrosHistorial {...base({ filtrosActivos: 2 })} />);
    expect(screen.getByRole('button', { name: 'Filtros (2)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Filtros (2)' }));
    await esperar();
    const hoja = screen.getByRole('dialog');
    expect(within(hoja).getByRole('combobox', { name: 'Filtrar por estado' })).toBeTruthy();
    expect(within(hoja).getByRole('button', { name: 'En seguimiento' })).toBeTruthy();
    expect(within(hoja).getByText('Exportar movimientos')).toBeTruthy();
  });

  it('con soloAnulados la hoja no lleva Estado ni seguimiento', async () => {
    mm(true);
    montar(base({ soloAnulados: true, filtrosActivos: 1 }));
    fireEvent.click(screen.getByRole('button', { name: 'Filtros (1)' }));
    await esperar();
    const hoja = screen.getByRole('dialog');
    expect(within(hoja).queryByRole('combobox', { name: 'Filtrar por estado' })).toBeNull();
    expect(within(hoja).queryByRole('button', { name: 'En seguimiento' })).toBeNull();
  });
});

describe('BarraFiltrosHistorial: reglas de estilo', () => {
  it('el archivo no escribe colores, bordes ni sombras a mano', () => {
    const fuente = readFileSync('src/views/analisis/components/BarraFiltrosHistorial.jsx', 'utf8');
    expect(fuente).not.toMatch(/slate-|border|shadow|(^|[\s"'`:])(bg|text|ring)-|#[0-9a-f]{3,6}\b/i);
  });
});
