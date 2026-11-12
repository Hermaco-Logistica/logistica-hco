// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'u1', email: 'c@hermaco.net' } } }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn() }));
vi.mock('../../emails', () => ({ enviarEvento: vi.fn() }));
vi.mock('../../components/CotizacionDocumento', () => ({ default: () => null }));
vi.mock('../../components/CotizacionPDF', () => ({ default: () => null }));
vi.mock('@react-pdf/renderer', () => ({ pdf: vi.fn() }));

import { DashboardCompras } from './DashboardCompras';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Panel de Compras en móvil: el buscador vive en la barra (no en la hoja), "Filtros (N)" cuenta solo lo que hay dentro de la hoja y
 * "Limpiar (N)" cuenta además la búsqueda.
 */
const HOY = new Date();
const dia = (n) => new Date(HOY.getTime() - n * 86400000);
const SOL = Array.from({ length: 4 }, (_, i) => ({
  id: `s${i}`, correlativo: `RFQ-${String(i + 1).padStart(4, '0')}`, cliente: i % 2 ? 'Bombas del Sur' : 'Otro Cliente', estado: 'Pendiente', vendedorNombre: 'Ana',
  tipo: 'RFQ', fechaS: dia(i), fechaCreacion: dia(i), productos: [{ desc: 'bomba', marca: 'X', cant: 1, estadoItem: 'Pendiente' }]
}));

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const montar = () => render(<MemoryRouter><DashboardCompras solicitudes={SOL} readOnly={false} /></MemoryRouter>);
const buscador = () => screen.getByLabelText('Buscar por referencia o cliente');
const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
const limpiar = () => within(screen.getByRole('region', { name: 'Filtros' })).queryByRole('button', { name: /^Limpiar filtros/ });

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); mm(true); Element.prototype.scrollIntoView = vi.fn(); window.scrollTo = vi.fn(); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });

describe('DashboardCompras: buscador en la barra (móvil)', () => {
  it('el buscador está en la tarjeta de filtros, junto a "Filtros", y no dentro de la hoja', async () => {
    montar();
    await esperar();
    const tarjeta = screen.getByRole('region', { name: 'Filtros' });
    expect(tarjeta.contains(buscador())).toBe(true);
    fireEvent.click(botonFiltros());
    await esperar();
    const hoja = screen.getByRole('dialog');
    expect(within(hoja).queryByLabelText('Buscar por referencia o cliente')).toBeNull();
    expect(within(hoja).getByRole('combobox', { name: 'Filtrar por vendedor' })).toBeTruthy();
  });

  it('la búsqueda no cuenta en "Filtros (N)" pero sí en Limpiar', async () => {
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
    fireEvent.change(buscador(), { target: { value: 'RFQ-0001' } });
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
  });

  it('con un filtro de la hoja y búsqueda: Filtros (1) y Limpiar (2); Limpiar vacía ambos', async () => {
    montar();
    await esperar();
    fireEvent.change(buscador(), { target: { value: 'RFQ' } });
    fireEvent.click(botonFiltros());
    await esperar();
    const hoja = screen.getByRole('dialog');
    fireEvent.click(within(hoja).getByRole('combobox', { name: 'Filtrar por vendedor' }));
    await esperar();
    fireEvent.click(screen.getByRole('option', { name: 'Ana' }));
    await esperar();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Ver / }));
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (2)');
    fireEvent.click(limpiar());
    await esperar();
    expect(buscador().value).toBe('');
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
  });
});
