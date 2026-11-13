// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../utils/exportarExcel', () => ({ exportarTodosLosMovimientosExcel: vi.fn() }));

import { DetalleClientesAnalisis as Vista } from './DetalleClientesAnalisis';
import { exportarTodosLosMovimientosExcel } from '../../utils/exportarExcel';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Directorio de clientes en móvil: "Filtros (N)" cuenta el orden cuando no es el inicial ('total') y "Limpiar" cuenta búsqueda y orden;
 * su acción vacía la búsqueda y devuelve el orden al inicial. Las claves de sesión son analisis_clientes_dir_search / _orden.
 */
const HOY = new Date();
const dia = (n) => new Date(HOY.getTime() - n * 86400000);
const SOL = Array.from({ length: 12 }, (_, i) => ({
  id: `s${i}`, correlativo: `RFQ-${i + 1}`, cliente: i % 2 === 0 ? 'Bombas del Sur' : `Cliente ${i}`, estado: 'Cotizado', vendedorNombre: 'Ana', tipo: 'Aéreo',
  fechaS: dia(i), fechaCreacion: dia(i), productos: [{ desc: 'bomba', marca: 'X', cantidad: 1, estadoItem: 'Cotizado', precio: 10 }]
}));

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const montar = (solicitudes = SOL) => render(<MemoryRouter><Vista role="comprador" solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>);
const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
const limpiar = () => screen.queryByRole('button', { name: /^Limpiar filtros/ });
const guardado = (k) => JSON.parse(sessionStorage.getItem(k));

beforeEach(() => { sessionStorage.clear(); mm(true); exportarTodosLosMovimientosExcel.mockClear(); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });

describe('DetalleClientesAnalisis: indicadores de filtros activos en móvil', () => {
  it('con el orden inicial y sin búsqueda no hay número en "Filtros" ni botón Limpiar', async () => {
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
  });

  it('con un orden distinto del inicial "Filtros" muestra (1) y aparece Limpiar con 1', async () => {
    sessionStorage.setItem('analisis_clientes_dir_orden', JSON.stringify('decisiones'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
  });

  it('la búsqueda cuenta en Limpiar pero no en "Filtros (N)" (que solo cuenta lo de la hoja)', async () => {
    sessionStorage.setItem('analisis_clientes_dir_search', JSON.stringify('bomba'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
  });

  it('búsqueda y orden distinto: Limpiar cuenta 2 y su acción vacía la búsqueda y devuelve el orden a "total"', async () => {
    sessionStorage.setItem('analisis_clientes_dir_search', JSON.stringify('bomba'));
    sessionStorage.setItem('analisis_clientes_dir_orden', JSON.stringify('monto'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (2)');
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_clientes_dir_search')).toBe('');
    expect(guardado('analisis_clientes_dir_orden')).toBe('total');
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
  });

  it('el botón de exportar de la hoja dice "Exportar movimientos" (sentence case)', async () => {
    montar();
    await esperar();
    fireEvent.click(botonFiltros());
    await esperar();
    expect(screen.getByRole('button', { name: /Exportar movimientos/ })).toBeTruthy();
    expect(screen.queryByText('Exportar Movimientos')).toBeNull();
  });
});

/** Filtro de contexto de vendedor (clave compartida analisis_vendedor_filter): chip, lista filtrada, Limpiar y exportar. */
const SOL_V = [
  { id: 'a1', cliente: 'Bombas del Sur', vendedorNombre: 'Ana', estado: 'Pedido' },
  { id: 'a2', cliente: 'Bombas del Sur', vendedorNombre: 'Ana', estado: 'Cotizado' },
  { id: 'a3', cliente: 'HOLCIM', vendedorNombre: 'Ana', estado: 'Cotizado' },
  { id: 'l1', cliente: 'Bombas del Sur', vendedorNombre: 'Luis', estado: 'Cotizado' },
  { id: 'l2', cliente: 'Cemex', vendedorNombre: 'Luis', estado: 'Cotizado' }
].map((s, i) => ({ ...s, correlativo: `RFQ-${i + 1}`, tipo: 'Aéreo', fechaS: dia(i), fechaCreacion: dia(i), productos: [{ desc: 'bomba', marca: 'X', cant: 1, estadoItem: s.estado, precio: 10 }] }));
const filasTabla = () => [...document.querySelectorAll('table tbody tr')].map((tr) => tr.querySelectorAll('td')[1].textContent.trim());
const chipVendedor = () => screen.queryByRole('button', { name: 'Quitar filtro de vendedor' });
const exportar = async () => { fireEvent.click(botonFiltros()); await esperar(); fireEvent.click(screen.getByRole('button', { name: /Exportar movimientos/ })); await esperar(); };

describe('DetalleClientesAnalisis: filtro de contexto de vendedor', () => {
  it('sin filtro no hay chip y la lista trae todos los clientes', async () => {
    montar(SOL_V);
    await esperar();
    expect(chipVendedor()).toBeNull();
    expect(screen.queryByText('Vendedor:')).toBeNull();
    expect(filasTabla()).toEqual(['Bombas del Sur', 'HOLCIM', 'Cemex']);
  });

  it('con el filtro aparece el chip y la lista solo trae clientes de ese vendedor, con sus cifras', async () => {
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Luis'));
    montar(SOL_V);
    await esperar();
    expect(screen.getByText('Vendedor:')).toBeTruthy();
    expect(chipVendedor()).toBeTruthy();
    expect(filasTabla()).toEqual(['Bombas del Sur', 'Cemex']);
    const celdas = [...document.querySelectorAll('table tbody tr')[0].querySelectorAll('td')].map((td) => td.textContent.trim());
    expect(celdas[2]).toBe('1'); // Total Solicitudes: solo la de Luis
  });

  it('la X vacía solo la clave de vendedor, no toca la búsqueda por nombre ni la de cliente, y la lista vuelve completa', async () => {
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Luis'));
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    sessionStorage.setItem('analisis_clientes_dir_search', JSON.stringify('bomba'));
    montar(SOL_V);
    await esperar();
    fireEvent.click(chipVendedor());
    await esperar();
    expect(guardado('analisis_vendedor_filter')).toBe('');
    expect(guardado('analisis_cliente_search')).toBe('Bombas');
    expect(guardado('analisis_clientes_dir_search')).toBe('bomba');
    expect(chipVendedor()).toBeNull();
  });

  it('el chip no suma a "Filtros (N)" ni a Limpiar, y Limpiar no lo toca', async () => {
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Luis'));
    montar(SOL_V);
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
    fireEvent.change(screen.getAllByRole('searchbox')[0] || screen.getAllByPlaceholderText(/Buscar por nombre/)[0], { target: { value: 'cemex' } });
    await esperar();
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_vendedor_filter')).toBe('Luis');
    expect(chipVendedor()).toBeTruthy();
  });

  it('un vendedor sin filas deja la lista vacía con el aviso y el chip visibles', async () => {
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Nadie'));
    montar(SOL_V);
    await esperar();
    expect(screen.getByText('No se encontraron clientes con el filtro aplicado.')).toBeTruthy();
    expect(chipVendedor()).toBeTruthy();
  });

  it('exportar sin filtro manda todas las solicitudes; con filtro, solo las del vendedor y lo dice en la etiqueta', async () => {
    montar(SOL_V);
    await esperar();
    await exportar();
    expect(exportarTodosLosMovimientosExcel.mock.calls[0][0]).toHaveLength(5);
    expect(exportarTodosLosMovimientosExcel.mock.calls[0][3].periodoLabel).toBe('Todos los registros de clientes');
    cleanup();
    exportarTodosLosMovimientosExcel.mockClear();
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Luis'));
    montar(SOL_V);
    await esperar();
    await exportar();
    const [sols, , , opciones] = exportarTodosLosMovimientosExcel.mock.calls[0];
    expect(sols.map((s) => s.id)).toEqual(['l1', 'l2']);
    expect(opciones.periodoLabel).toBe('Todos los registros de clientes | Vendedor: Luis');
  });
});
