// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../utils/exportarExcel', () => ({ exportarTodosLosMovimientosExcel: vi.fn() }));

import { DetalleClientesAnalisis as Vista } from './DetalleClientesAnalisis';
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
const montar = () => render(<MemoryRouter><Vista role="comprador" solicitudes={SOL} ordenesCompra={[]} /></MemoryRouter>);
const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
const limpiar = () => screen.queryByRole('button', { name: /^Limpiar filtros/ });
const guardado = (k) => JSON.parse(sessionStorage.getItem(k));

beforeEach(() => { sessionStorage.clear(); mm(true); });
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
