// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../utils/exportarExcel', () => ({ exportarTodosLosMovimientosExcel: vi.fn() }));

import { DetalleSolicitudesAnalisis as Vista } from './DetalleSolicitudesAnalisis';
import { exportarTodosLosMovimientosExcel } from '../../utils/exportarExcel';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Explorador de solicitudes en móvil: las pestañas de estado quedan fuera de la hoja y no cuentan como filtro (no hay "Filtros (N)" ni
 * Limpiar por la pestaña); Limpiar cuenta solo la búsqueda y la vacía sin tocar la pestaña ni las claves de vendedor y cliente; los chips
 * de vendedor y cliente se quitan con su X; el contador refleja la pestaña activa.
 */
const HOY = new Date();
const dia = (n) => new Date(HOY.getTime() - n * 86400000);
const ESTADOS = ['Pendiente', 'Cotizado', 'Pedido', 'Pedido'];
const SOL = Array.from({ length: 12 }, (_, i) => ({
  id: `s${i}`, correlativo: `RFQ-${String(i + 1).padStart(4, '0')}`, cliente: i % 2 === 0 ? 'Bombas del Sur' : `Cliente ${i}`, estado: ESTADOS[i % 4],
  vendedorNombre: 'Ana', tipo: 'Aéreo', fechaS: dia(i), fechaCreacion: dia(i),
  productos: [{ desc: 'bomba', marca: 'X', cant: 1, estadoItem: ESTADOS[i % 4] === 'Pedido' ? 'Pedido' : ESTADOS[i % 4], precio: 10 }]
}));

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const montar = () => render(<MemoryRouter><Vista role="comprador" solicitudes={SOL} ordenesCompra={[]} /></MemoryRouter>);
const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
const limpiar = () => screen.queryByRole('button', { name: /^Limpiar filtros/ });
const contador = () => document.querySelector('[aria-live="polite"]').textContent;
const guardado = (k) => JSON.parse(sessionStorage.getItem(k));

beforeEach(() => { sessionStorage.clear(); mm(true); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });

describe('DetalleSolicitudesAnalisis: barra de filtros en móvil', () => {
  it('sin búsqueda no hay número en "Filtros" ni botón Limpiar', async () => {
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
  });

  it('la pestaña activa no cuenta como filtro: ni número en "Filtros" ni Limpiar', async () => {
    sessionStorage.setItem('analisis_solicitudes_tab', JSON.stringify('pedidos'));
    montar();
    await esperar();
    expect(screen.getByRole('tab', { name: /Pedidos$/ }).getAttribute('aria-selected')).toBe('true');
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
  });

  it('el contador refleja la pestaña activa', async () => {
    montar();
    await esperar();
    expect(contador()).toContain('12 solicitudes');
    fireEvent.click(screen.getByRole('tab', { name: /^Pedidos$/ }));
    await esperar();
    expect(contador()).toContain('6 solicitudes');
  });

  it('con búsqueda Limpiar cuenta 1 (y "Filtros" no); su acción vacía la búsqueda y no toca la pestaña ni vendedor/cliente', async () => {
    sessionStorage.setItem('analisis_solicitudes_tab', JSON.stringify('pedidos'));
    sessionStorage.setItem('analisis_solicitudes_search', JSON.stringify('RFQ-0003'));
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Ana'));
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_solicitudes_search')).toBe('');
    expect(guardado('analisis_solicitudes_tab')).toBe('pedidos');
    expect(guardado('analisis_vendedor_filter')).toBe('Ana');
    expect(guardado('analisis_cliente_search')).toBe('Bombas');
    expect(limpiar()).toBeNull();
  });

  it('los chips de vendedor y cliente se muestran y cada X solo limpia su clave', async () => {
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Ana'));
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    montar();
    await esperar();
    expect(screen.getByRole('button', { name: 'Quitar filtro de vendedor' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quitar filtro de cliente' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de vendedor' }));
    await esperar();
    expect(guardado('analisis_vendedor_filter')).toBe('');
    expect(guardado('analisis_cliente_search')).toBe('Bombas');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de cliente' }));
    await esperar();
    expect(guardado('analisis_cliente_search')).toBe('');
    expect(screen.queryByRole('button', { name: /^Quitar filtro/ })).toBeNull();
  });

  it('exportar en la hoja dice "Exportar movimientos" y exporta las solicitudes filtradas de la pestaña activa', async () => {
    sessionStorage.setItem('analisis_solicitudes_tab', JSON.stringify('pedidos'));
    montar();
    await esperar();
    fireEvent.click(botonFiltros());
    await esperar();
    const boton = screen.getByRole('button', { name: /Exportar movimientos/ });
    expect(screen.queryByText('Exportar Movimientos')).toBeNull();
    fireEvent.click(boton);
    expect(exportarTodosLosMovimientosExcel).toHaveBeenCalledTimes(1);
    const [lista, , nombre, opciones] = exportarTodosLosMovimientosExcel.mock.calls[0];
    expect(lista).toHaveLength(6);
    expect(nombre).toBe('movimientos_solicitudes_pedidos');
    expect(opciones.titulo).toBe('CONTROL DE LOGÍSTICA - PEDIDOS GANADOS');
    expect(opciones.periodoLabel).toBe('Pestaña: PEDIDOS GANADOS');
  });
});
