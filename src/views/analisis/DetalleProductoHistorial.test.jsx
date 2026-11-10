// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../utils/exportarExcel', () => ({ exportarMovimientosExcel: vi.fn(), exportarTodosLosMovimientosExcel: vi.fn(), extraerTodosLosMovimientos: vi.fn(() => []) }));

import { DetalleProductoHistorial as Vista } from './DetalleProductoHistorial';
import { exportarMovimientosExcel } from '../../utils/exportarExcel';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Historial de producto en móvil: "Filtros (N)" cuenta lo que hay en la hoja (estado, modalidad, seguimiento); Limpiar cuenta además la
 * búsqueda, no toca los chips (vendedor y cliente) ni las claves compartidas; con soloAnulados no hay Estado ni seguimiento.
 */
const HOY = new Date();
const dia = (n) => new Date(HOY.getTime() - n * 86400000);
const ESTADOS = ['Pendiente', 'Cotizado', 'Pedido'];
const SOL = Array.from({ length: 6 }, (_, i) => ({
  id: `s${i}`, correlativo: `RFQ-${String(i + 1).padStart(4, '0')}`, cliente: i % 2 === 0 ? 'Bombas del Sur' : 'Otro Cliente', estado: ESTADOS[i % 3], vendedorNombre: 'Ana', tipo: 'RFQ',
  fechaS: dia(i), fechaCreacion: dia(i), modalidad: i % 2 === 0 ? 'Aéreo' : 'Marítimo',
  productos: [{ desc: 'bomba', marca: 'X', cant: 2, estadoItem: ESTADOS[i % 3], precio: 10 }]
}));

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const montar = ({ url = '/analisis/producto/bomba', soloAnulados = false } = {}) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/analisis/producto/:productId" element={<Vista role="comprador" solicitudes={SOL} ordenesCompra={[]} soloAnulados={soloAnulados} />} /></Routes>
  </MemoryRouter>
);
const esperar = (ms = 80) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
const limpiar = () => screen.queryByRole('button', { name: /^Limpiar filtros/ });
const contador = () => document.querySelector('[aria-live="polite"]').textContent;
const guardado = (k) => JSON.parse(sessionStorage.getItem(k));

beforeEach(() => { sessionStorage.clear(); mm(true); Element.prototype.scrollIntoView = vi.fn(); window.scrollTo = vi.fn(); exportarMovimientosExcel.mockClear(); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });

describe('DetalleProductoHistorial: barra de filtros', () => {
  it('sin filtros no hay número en "Filtros" ni botón Limpiar, y el contador es nuevo', async () => {
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
    expect(contador()).toBe('Mostrando 6 movimientos');
  });

  it('estado, modalidad y seguimiento suman a "Filtros (N)"', async () => {
    sessionStorage.setItem('analisis_prod_hist_estado', JSON.stringify('Pedido'));
    sessionStorage.setItem('analisis_prod_hist_modalidad', JSON.stringify('Aéreo'));
    montar({ url: '/analisis/producto/bomba?seguimiento=1' });
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (3)');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (3)');
  });

  it('la búsqueda suma a Limpiar pero no a "Filtros"', async () => {
    sessionStorage.setItem('analisis_prod_hist_search', JSON.stringify('RFQ-0001'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
    expect(contador()).toBe('Mostrando 1 movimiento');
  });

  it('Limpiar vuelve todo a su valor inicial y no toca los chips ni las claves compartidas', async () => {
    sessionStorage.setItem('analisis_prod_hist_search', JSON.stringify('RFQ'));
    sessionStorage.setItem('analisis_prod_hist_estado', JSON.stringify('Pedido'));
    sessionStorage.setItem('analisis_prod_hist_modalidad', JSON.stringify('Aéreo'));
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Ana'));
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    montar();
    await esperar();
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (3)');
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_prod_hist_search')).toBe('');
    expect(guardado('analisis_prod_hist_estado')).toBe('');
    expect(guardado('analisis_prod_hist_modalidad')).toBe('');
    expect(guardado('analisis_vendedor_filter')).toBe('Ana');
    expect(guardado('analisis_cliente_search')).toBe('Bombas');
    expect(screen.getByRole('button', { name: 'Quitar filtro de vendedor' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quitar filtro de cliente' })).toBeTruthy();
    expect(limpiar()).toBeNull();
  });

  it('Limpiar también apaga el conmutador de seguimiento (?seguimiento=1), como el botón viejo', async () => {
    montar({ url: '/analisis/producto/bomba?seguimiento=1' });
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    fireEvent.click(limpiar());
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
  });

  it('los chips solo aparecen si hay vendedor o cliente y cada X limpia solo su clave', async () => {
    montar();
    await esperar();
    expect(screen.queryByRole('button', { name: /^Quitar filtro/ })).toBeNull();
    cleanup();
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Ana'));
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    montar();
    await esperar();
    expect(screen.getAllByRole('button', { name: /^Quitar filtro/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de vendedor' }));
    await esperar();
    expect(guardado('analisis_vendedor_filter')).toBe('');
    expect(guardado('analisis_cliente_search')).toBe('Bombas');
    expect(screen.queryByRole('button', { name: 'Quitar filtro de vendedor' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de cliente' }));
    await esperar();
    expect(guardado('analisis_cliente_search')).toBe('');
    expect(screen.queryByRole('button', { name: /^Quitar filtro/ })).toBeNull();
  });

  it('quitar los dos chips deja ambas claves vacías sin tocar los filtros propios', async () => {
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Ana'));
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    sessionStorage.setItem('analisis_prod_hist_estado', JSON.stringify('Pedido'));
    montar();
    await esperar();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de vendedor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de cliente' }));
    await esperar();
    expect(guardado('analisis_vendedor_filter')).toBe('');
    expect(guardado('analisis_cliente_search')).toBe('');
    expect(guardado('analisis_prod_hist_estado')).toBe('Pedido');
  });

  it('con soloAnulados la hoja no lleva Estado ni seguimiento y sí modalidad, y Estado no cuenta', async () => {
    sessionStorage.setItem('analisis_prod_hist_estado', JSON.stringify('Pedido'));
    sessionStorage.setItem('analisis_prod_hist_modalidad', JSON.stringify('Aéreo'));
    montar({ soloAnulados: true });
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    fireEvent.click(botonFiltros());
    await esperar();
    const hoja = screen.getByRole('dialog');
    expect(within(hoja).queryByRole('combobox', { name: 'Filtrar por estado' })).toBeNull();
    expect(within(hoja).queryByRole('button', { name: 'En seguimiento' })).toBeNull();
    expect(within(hoja).getByText('Modalidad')).toBeTruthy();
    expect(within(hoja).getByText('Exportar movimientos')).toBeTruthy();
  });

  it('el contador pluraliza y exportar usa el mismo nombre y filtros que antes', async () => {
    sessionStorage.setItem('analisis_prod_hist_estado', JSON.stringify('Pedido'));
    sessionStorage.setItem('analisis_prod_hist_search', JSON.stringify('RFQ'));
    montar();
    await esperar();
    expect(contador()).toBe('Mostrando 2 movimientos');
    fireEvent.click(botonFiltros());
    await esperar();
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Exportar movimientos'));
    expect(exportarMovimientosExcel).toHaveBeenCalledTimes(1);
    const [lista, nombre, opciones] = exportarMovimientosExcel.mock.calls[0];
    expect(lista).toHaveLength(2);
    expect(nombre).toMatch(/^historial_producto_/);
    expect(opciones.periodoLabel).toBe('Historial Completo | Estado: Pedido | Búsqueda: "RFQ"');
  });
});
