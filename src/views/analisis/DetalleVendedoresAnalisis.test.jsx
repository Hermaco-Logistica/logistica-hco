// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const MOVS = [
  { vendedor: 'Ana', cliente: 'Bombas del Sur' },
  { vendedor: 'Ana', cliente: 'HOLCIM' },
  { vendedor: 'Luis', cliente: 'Bombas del Sur' },
  { vendedor: 'Luis', cliente: 'Cemex' }
];
vi.mock('../../utils/exportarExcel', () => ({ exportarMovimientosExcel: vi.fn(), extraerTodosLosMovimientos: vi.fn(() => MOVS) }));

import { DetalleVendedoresAnalisis as Vista } from './DetalleVendedoresAnalisis';
import { exportarMovimientosExcel } from '../../utils/exportarExcel';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Directorio de vendedores con el filtro de contexto de cliente (clave compartida analisis_cliente_search, la que guarda el dashboard):
 * chip "Cliente:", lista filtrada con la misma coincidencia que el dashboard (texto normalizado contenido en el cliente), la X vacía solo
 * esa clave, el chip no cuenta en "Filtros (N)" ni en Limpiar y exportar sale filtrado. La búsqueda propia es analisis_vend_dir_search.
 */
const HOY = new Date();
const dia = (n) => new Date(HOY.getTime() - n * 86400000);
const SOL = [
  { id: 'a1', cliente: 'Bombas del Sur', vendedorNombre: 'Ana', estado: 'Pedido' },
  { id: 'a2', cliente: 'Bombas del Sur', vendedorNombre: 'Ana', estado: 'Cotizado' },
  { id: 'a3', cliente: 'HOLCIM', vendedorNombre: 'Ana', estado: 'Cotizado' },
  { id: 'l1', cliente: 'Bombas del Sur', vendedorNombre: 'Luis', estado: 'Cotizado' },
  { id: 'l2', cliente: 'Cemex', vendedorNombre: 'Luis', estado: 'Cotizado' }
].map((s, i) => ({ ...s, vendedorEmail: `${s.vendedorNombre.toLowerCase()}@hermaco.net`, correlativo: `RFQ-${i + 1}`, tipo: 'Aéreo', fechaS: dia(i), fechaCreacion: dia(i), productos: [{ desc: 'bomba', marca: 'X', cant: 1, estadoItem: s.estado, precio: 10 }] }));

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const montar = (solicitudes = SOL) => render(<MemoryRouter><Vista role="comprador" solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>);
const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
const limpiar = () => screen.queryByRole('button', { name: /^Limpiar filtros/ });
const guardado = (k) => JSON.parse(sessionStorage.getItem(k));
const chipCliente = () => screen.queryByRole('button', { name: 'Quitar filtro de cliente' });
const filasTabla = () => [...document.querySelectorAll('table tbody tr')].map((tr) => tr.querySelectorAll('td')[1].textContent);
const celdasFila = (i) => [...document.querySelectorAll('table tbody tr')[i].querySelectorAll('td')].map((td) => td.textContent.trim());
const exportar = async () => { fireEvent.click(botonFiltros()); await esperar(); fireEvent.click(screen.getByRole('button', { name: /Exportar movimientos/ })); await esperar(); };

beforeEach(() => { sessionStorage.clear(); mm(true); exportarMovimientosExcel.mockClear(); window.scrollTo = vi.fn(); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });

describe('DetalleVendedoresAnalisis: filtro de contexto de cliente', () => {
  it('sin filtro no hay chip y la lista trae a todos los vendedores', async () => {
    montar();
    await esperar();
    expect(chipCliente()).toBeNull();
    expect(screen.queryByText('Cliente:')).toBeNull();
    expect(filasTabla()).toHaveLength(2);
  });

  it('con el filtro aparece el chip y las cifras cuentan solo las solicitudes de ese cliente', async () => {
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('bombas'));
    montar();
    await esperar();
    expect(screen.getByText('Cliente:')).toBeTruthy();
    expect(chipCliente()).toBeTruthy();
    expect(filasTabla()).toHaveLength(2);
    expect(celdasFila(0)[2]).toBe('2'); // Ana: 2 de sus 3 solicitudes son de "Bombas del Sur"
    expect(celdasFila(1)[2]).toBe('1'); // Luis: 1 de sus 2
  });

  it('un cliente que solo tiene un vendedor deja solo a ese vendedor en la lista', async () => {
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('cemex'));
    montar();
    await esperar();
    expect(filasTabla()).toHaveLength(1);
    expect(filasTabla()[0]).toContain('Luis');
  });

  it('la X vacía solo la clave de cliente, no toca la de vendedor ni la búsqueda propia', async () => {
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('bombas'));
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Ana'));
    sessionStorage.setItem('analisis_vend_dir_search', JSON.stringify('luis'));
    montar();
    await esperar();
    fireEvent.click(chipCliente());
    await esperar();
    expect(guardado('analisis_cliente_search')).toBe('');
    expect(guardado('analisis_vendedor_filter')).toBe('Ana');
    expect(guardado('analisis_vend_dir_search')).toBe('luis');
    expect(chipCliente()).toBeNull();
  });

  it('el chip no suma a "Filtros (N)" ni a Limpiar, y Limpiar no lo toca', async () => {
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('bombas'));
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
    fireEvent.change(screen.getAllByPlaceholderText(/Buscar por vendedor/)[0], { target: { value: 'luis' } });
    await esperar();
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_cliente_search')).toBe('bombas');
    expect(chipCliente()).toBeTruthy();
  });

  it('un cliente sin filas deja la lista vacía con el aviso y el chip visibles', async () => {
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('zzz'));
    montar();
    await esperar();
    expect(screen.getByText('No se encontraron vendedores con los filtros aplicados.')).toBeTruthy();
    expect(chipCliente()).toBeTruthy();
  });

  it('exportar sin filtro manda todos los movimientos; con filtro, solo los del cliente y lo dice en la etiqueta', async () => {
    montar();
    await esperar();
    await exportar();
    expect(exportarMovimientosExcel.mock.calls[0][0]).toHaveLength(4);
    expect(exportarMovimientosExcel.mock.calls[0][2].periodoLabel).toBe('Todos los registros de vendedores');
    cleanup();
    exportarMovimientosExcel.mockClear();
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('bombas'));
    montar();
    await esperar();
    await exportar();
    const [movs, , opciones] = exportarMovimientosExcel.mock.calls[0];
    expect(movs.map((m) => `${m.vendedor}/${m.cliente}`)).toEqual(['Ana/Bombas del Sur', 'Luis/Bombas del Sur']);
    expect(opciones.periodoLabel).toBe('Todos los registros de vendedores | Cliente: "bombas"');
  });
});
