// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const DOCS = vi.hoisted(() => ({ lista: [] }));
vi.mock('../../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'u1', email: 'c@hermaco.net' } } }));
vi.mock('firebase/firestore', () => {
  const snap = () => ({ docs: DOCS.lista.map((d) => ({ id: d.id, data: () => d, exists: () => true })), size: DOCS.lista.length, empty: !DOCS.lista.length, forEach: (f) => DOCS.lista.forEach((d) => f({ id: d.id, data: () => d })) });
  return {
    collection: vi.fn((db, n) => ({ __n: n })), query: vi.fn((r) => r), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), doc: vi.fn(), updateDoc: vi.fn(), addDoc: vi.fn(), setDoc: vi.fn(),
    serverTimestamp: vi.fn(), getDoc: vi.fn(async () => ({ exists: () => false, data: () => ({}) })), getDocFromServer: vi.fn(async () => ({ exists: () => false, data: () => ({}) })), runTransaction: vi.fn(),
    onSnapshot: vi.fn((ref, cb) => { cb(snap()); return () => {}; })
  };
});
vi.mock('../../emails', () => ({ enviarEvento: vi.fn() }));
vi.mock('../../services/trackingStatusService', () => ({ consultarTrackingStatus: vi.fn(), trackingStatusEnabled: false }));

import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

import { GestionOC } from './GestionOC';

const dia = (n) => new Date(Date.now() - n * 86400000);
DOCS.lista = Array.from({ length: 4 }, (_, i) => ({ id: `o${i}`, numeroOC: `OC-${100 + i}`, proveedor: `Proveedor ${i % 2}`, estado: 'Pendiente', tracking: `TRK${i}`, fechaCreacion: dia(i), items: [{ descripcion: `Bomba ${i}`, marca: 'X', cantidad: 2 }] }));

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
const limpiar = () => within(screen.getByRole('region', { name: 'Filtros' })).queryByRole('button', { name: /^Limpiar filtros/ });

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); mm(true); Element.prototype.scrollIntoView = vi.fn(); window.scrollTo = vi.fn(); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });
const montar = () => render(<MemoryRouter><GestionOC readOnly={false} /></MemoryRouter>);
const buscador = () => screen.getByLabelText('Buscar por OC, ítem o tracking');

describe('GestionOC: buscador en la barra (móvil)', () => {
  it('el buscador está en la tarjeta de filtros, junto a "Filtros", y no dentro de la hoja', async () => {
    montar();
    await esperar();
    expect(screen.getByRole('region', { name: 'Filtros' }).contains(buscador())).toBe(true);
    fireEvent.click(botonFiltros());
    await esperar();
    const hoja = screen.getByRole('dialog');
    expect(within(hoja).queryByLabelText('Buscar por OC, ítem o tracking')).toBeNull();
    expect(within(hoja).getByRole('combobox', { name: 'Filtrar por proveedor' })).toBeTruthy();
  });

  it('la búsqueda no cuenta en "Filtros (N)" pero sí en Limpiar', async () => {
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
    fireEvent.change(buscador(), { target: { value: 'abc' } });
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
  });

  it('con un filtro de la hoja y búsqueda: Filtros (1) y Limpiar (2); Limpiar vacía ambos', async () => {
    montar();
    await esperar();
    fireEvent.change(buscador(), { target: { value: 'abc' } });
    fireEvent.click(botonFiltros());
    await esperar();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Filtrar por proveedor' }));
    await esperar();
    fireEvent.click(screen.getByRole('option', { name: 'Proveedor 1' }));
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
