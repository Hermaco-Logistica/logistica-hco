// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../utils/exportarExcel', () => ({ exportarMovimientosExcel: vi.fn(), exportarTodosLosMovimientosExcel: vi.fn(), extraerTodosLosMovimientos: vi.fn(() => []) }));

import { DetalleVendedorHistorial as Vista } from './DetalleVendedorHistorial';
import { exportarMovimientosExcel } from '../../utils/exportarExcel';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Historial de vendedor en móvil: "Filtros (N)" cuenta lo que hay en la hoja (estado, modalidad, cliente, seguimiento); Limpiar cuenta además
 * la búsqueda, no toca el chip de cliente (contexto del dashboard) ni las claves compartidas; el select de Cliente (filtra movimientos) y el
 * chip son independientes; con soloAnulados no hay Estado ni seguimiento.
 */
const HOY = new Date();
const dia = (n) => new Date(HOY.getTime() - n * 86400000);
const ESTADOS = ['Pendiente', 'Cotizado', 'Pedido'];
const CLIENTES = ['Bombas del Sur', 'Otro Cliente'];
const solicitudes = (clientes) => Array.from({ length: 6 }, (_, i) => ({
  id: `s${i}`, correlativo: `RFQ-${String(i + 1).padStart(4, '0')}`, cliente: clientes[i % clientes.length], estado: ESTADOS[i % 3], vendedorNombre: 'Ana', vendedorId: 'u1', tipo: 'RFQ',
  fechaS: dia(i), fechaCreacion: dia(i), modalidad: i % 2 === 0 ? 'Aéreo' : 'Marítimo',
  productos: [{ desc: `bomba ${i}`, marca: 'X', cant: 2, estadoItem: ESTADOS[i % 3], precio: 10 }]
}));

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const montar = ({ url = '/analisis/vendedor/Ana', soloAnulados = false, clientes = CLIENTES } = {}) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/analisis/vendedor/:vendedorId" element={<Vista role="comprador" solicitudes={solicitudes(clientes)} ordenesCompra={[]} soloAnulados={soloAnulados} />} /></Routes>
  </MemoryRouter>
);
const esperar = (ms = 80) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
const limpiar = () => screen.queryByRole('button', { name: /^Limpiar filtros/ });
const contador = () => document.querySelector('[aria-live="polite"]').textContent;
const guardado = (k) => JSON.parse(sessionStorage.getItem(k));
const abrirHoja = async () => { fireEvent.click(botonFiltros()); await esperar(); return screen.getByRole('dialog'); };

beforeEach(() => { sessionStorage.clear(); mm(true); Element.prototype.scrollIntoView = vi.fn(); window.scrollTo = vi.fn(); exportarMovimientosExcel.mockClear(); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });

describe('DetalleVendedorHistorial: barra de filtros', () => {
  it('sin filtros no hay número en "Filtros" ni botón Limpiar y el contador dice "movimientos" (no "movs")', async () => {
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
    expect(contador()).toBe('Mostrando 6 movimientos');
    expect(document.body.textContent).not.toMatch(/\bmovs\b/);
  });

  it('estado y cliente suman a "Filtros (N)" y a Limpiar', async () => {
    sessionStorage.setItem('analisis_vend_hist_estado', JSON.stringify('Pedido'));
    sessionStorage.setItem('analisis_vend_hist_cliente', JSON.stringify('Otro Cliente'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (2)');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (2)');
  });

  it('el seguimiento suma a "Filtros (N)"', async () => {
    montar({ url: '/analisis/vendedor/Ana?seguimiento=1' });
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (1)');
  });

  it('la modalidad suma a "Filtros (N)"', async () => {
    sessionStorage.setItem('analisis_vend_hist_modalidad', JSON.stringify('Aéreo'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (1)');
  });

  it('si los otros filtros dejan un solo cliente el select se oculta: ese cliente no cuenta en "Filtros" pero Limpiar sí lo cuenta y lo vacía', async () => {
    sessionStorage.setItem('analisis_vend_hist_estado', JSON.stringify('Pedido'));
    sessionStorage.setItem('analisis_vend_hist_modalidad', JSON.stringify('Aéreo'));
    sessionStorage.setItem('analisis_vend_hist_cliente', JSON.stringify('Bombas del Sur'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (2)');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (3)');
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_vend_hist_cliente')).toBe('');
  });

  it('la búsqueda suma a Limpiar pero no a "Filtros"', async () => {
    sessionStorage.setItem('analisis_vend_hist_search', JSON.stringify('RFQ-0001'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
    expect(contador()).toBe('Mostrando 1 movimiento');
  });

  it('el select de Cliente aparece solo con más de un cliente', async () => {
    montar();
    await esperar();
    let hoja = await abrirHoja();
    expect(within(hoja).getByRole('combobox', { name: 'Filtrar por cliente' })).toBeTruthy();
    cleanup();
    montar({ clientes: ['Bombas del Sur'] });
    await esperar();
    hoja = await abrirHoja();
    expect(within(hoja).queryByRole('combobox', { name: 'Filtrar por cliente' })).toBeNull();
    expect(within(hoja).getByRole('combobox', { name: 'Filtrar por estado' })).toBeTruthy();
  });

  it('elegir un cliente en el select filtra los movimientos y cuenta en "Filtros"', async () => {
    montar();
    await esperar();
    const hoja = await abrirHoja();
    fireEvent.click(within(hoja).getByRole('combobox', { name: 'Filtrar por cliente' }));
    await esperar();
    fireEvent.click(within(hoja).getByRole('option', { name: 'Otro Cliente' }));
    await esperar();
    expect(guardado('analisis_vend_hist_cliente')).toBe('Otro Cliente');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar filtros' }));
    await esperar(500);
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    expect(contador()).toBe('Mostrando 3 movimientos');
  });

  it('Limpiar vacía el select de Cliente, estado, modalidad y búsqueda y no toca el chip ni las claves compartidas', async () => {
    sessionStorage.setItem('analisis_vend_hist_search', JSON.stringify('RFQ'));
    sessionStorage.setItem('analisis_vend_hist_estado', JSON.stringify('Pedido'));
    sessionStorage.setItem('analisis_vend_hist_modalidad', JSON.stringify('Aéreo'));
    sessionStorage.setItem('analisis_vend_hist_cliente', JSON.stringify('Bombas del Sur'));
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Ana'));
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    montar();
    await esperar();
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (4)');
    fireEvent.click(limpiar());
    await esperar();
    for (const k of ['search', 'estado', 'modalidad', 'cliente']) expect(guardado(`analisis_vend_hist_${k}`)).toBe('');
    expect(guardado('analisis_vendedor_filter')).toBe('Ana');
    expect(guardado('analisis_cliente_search')).toBe('Bombas');
    expect(screen.getByRole('button', { name: 'Quitar filtro de cliente' })).toBeTruthy();
    expect(limpiar()).toBeNull();
  });

  it('Limpiar también apaga el conmutador de seguimiento (?seguimiento=1), como el botón viejo', async () => {
    montar({ url: '/analisis/vendedor/Ana?seguimiento=1' });
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    fireEvent.click(limpiar());
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
  });

  it('el chip de cliente aparece solo con clienteFilter y su X limpia solo esa clave, sin tocar el select de Cliente', async () => {
    montar();
    await esperar();
    expect(screen.queryByRole('button', { name: /^Quitar filtro/ })).toBeNull();
    cleanup();
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    sessionStorage.setItem('analisis_vend_hist_cliente', JSON.stringify('Bombas del Sur'));
    montar();
    await esperar();
    expect(screen.queryByRole('button', { name: 'Quitar filtro de vendedor' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de cliente' }));
    await esperar();
    expect(guardado('analisis_cliente_search')).toBe('');
    expect(guardado('analisis_vend_hist_cliente')).toBe('Bombas del Sur');
    expect(screen.queryByRole('button', { name: /^Quitar filtro/ })).toBeNull();
  });

  it('con soloAnulados la hoja no lleva Estado ni seguimiento y sí modalidad, y Estado no cuenta', async () => {
    sessionStorage.setItem('analisis_vend_hist_estado', JSON.stringify('Pedido'));
    sessionStorage.setItem('analisis_vend_hist_modalidad', JSON.stringify('Aéreo'));
    montar({ soloAnulados: true });
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    const hoja = await abrirHoja();
    expect(within(hoja).queryByRole('combobox', { name: 'Filtrar por estado' })).toBeNull();
    expect(within(hoja).queryByRole('button', { name: 'En seguimiento' })).toBeNull();
    expect(within(hoja).getByText('Modalidad')).toBeTruthy();
    expect(within(hoja).getByText('Exportar movimientos')).toBeTruthy();
  });

  it('exportar usa el mismo nombre y los mismos filtros que antes (incluido el cliente)', async () => {
    sessionStorage.setItem('analisis_vend_hist_estado', JSON.stringify('Pedido'));
    sessionStorage.setItem('analisis_vend_hist_cliente', JSON.stringify('Bombas del Sur'));
    sessionStorage.setItem('analisis_vend_hist_search', JSON.stringify('RFQ'));
    montar();
    await esperar();
    expect(contador()).toBe('Mostrando 1 movimiento');
    const hoja = await abrirHoja();
    fireEvent.click(within(hoja).getByText('Exportar movimientos'));
    expect(exportarMovimientosExcel).toHaveBeenCalledTimes(1);
    const [lista, nombre, opciones] = exportarMovimientosExcel.mock.calls[0];
    expect(lista).toHaveLength(1);
    expect(nombre).toMatch(/^historial_vendedor_/);
    expect(opciones.periodoLabel).toBe('Historial Completo | Cliente: Bombas del Sur | Estado: Pedido | Búsqueda: "RFQ"');
  });
});
