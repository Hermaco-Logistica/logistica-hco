// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../utils/exportarExcel', () => ({ exportarMovimientosExcel: vi.fn(), exportarTodosLosMovimientosExcel: vi.fn(), extraerTodosLosMovimientos: vi.fn(() => []) }));
// La vista de seguimiento depende de fechas y de la fase de cada ítem: aquí un ítem está en seguimiento si trae `enSeg`, para controlar qué modalidades quedan en la vista.
vi.mock('../../utils/faseSeguimiento', async (importarOriginal) => ({
  ...(await importarOriginal()),
  itemEnSeguimiento: (solicitud, indice) => Boolean(solicitud?.productos?.[indice]?.enSeg)
}));

import { DetalleClienteHistorial } from './DetalleClienteHistorial';
import { DetalleProductoHistorial } from './DetalleProductoHistorial';
import { DetalleVendedorHistorial } from './DetalleVendedorHistorial';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Filtro "Modalidad" de los tres Historiales: siempre un desplegable ("Todas" más las modalidades presentes en la vista), con 1, 2 o 3 modalidades, en la vista
 * normal y en la de seguimiento, en escritorio y móvil. Una modalidad guardada en sesión que la vista ya no tiene se muestra y se aplica como "Todas".
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
// Cuatro solicitudes: Aéreo, Marítimo y sin modalidad (No asignada) en seguimiento, y otra Aéreo fuera de seguimiento.
const sol = (i, modalidad, enSeg) => ({
  id: `s${i}`, correlativo: `RFQ-000${i}`, cliente: 'Bombas del Sur', estado: 'Cotizado', vendedorNombre: 'Ana', vendedorId: 'u1', tipo: 'RFQ',
  fechaS: dia(i), fechaCreacion: dia(i), modalidad,
  productos: [{ desc: 'bomba', marca: 'X', cant: 1, estadoItem: 'Cotizado', precio: 10, enSeg }]
});
const SOLICITUDES = [sol(1, 'Aéreo', true), sol(2, 'Marítimo', true), sol(3, '', true), sol(4, 'Aéreo', false)];
/** Con `n` modalidades en seguimiento: Aéreo; Aéreo y Marítimo; Aéreo, Marítimo y No asignada. */
const enSeguimiento = (n) => SOLICITUDES.map((s, i) => (i < 3 ? { ...s, productos: s.productos.map((p) => ({ ...p, enSeg: i < n })) } : s));

const VISTAS = [
  ['Cliente', DetalleClienteHistorial, '/analisis/cliente/:clienteId', '/analisis/cliente/Bombas%20del%20Sur', 'analisis_cli_hist_modalidad'],
  ['Producto', DetalleProductoHistorial, '/analisis/producto/:productId', '/analisis/producto/BOMBA', 'analisis_prod_hist_modalidad'],
  ['Vendedor', DetalleVendedorHistorial, '/analisis/vendedor/:vendedorId', '/analisis/vendedor/Ana', 'analisis_vend_hist_modalidad']
];

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 80) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const contador = () => document.querySelector('[aria-live="polite"]').textContent;
const guardado = (k) => JSON.parse(sessionStorage.getItem(k));
const montar = (Vista, ruta, url, solicitudes) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path={ruta} element={<Vista role="comprador" solicitudes={solicitudes} ordenesCompra={[]} />} /></Routes>
  </MemoryRouter>
);
const opcionesDelCombobox = () => {
  fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por modalidad' }));
  return screen.getAllByRole('option').map((o) => o.textContent);
};

beforeEach(() => { sessionStorage.clear(); mm(false); Element.prototype.scrollIntoView = vi.fn(); window.scrollTo = vi.fn(); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); sessionStorage.clear(); window.matchMedia = matchMediaOriginal; });

describe.each(VISTAS)('Historial de %s: Modalidad siempre desplegable', (nombre, Vista, ruta, url, claveModalidad) => {
  it('vista normal con 3 modalidades: combobox con "Todas" y las tres', async () => {
    montar(Vista, ruta, url, SOLICITUDES);
    await esperar();
    expect(screen.queryByRole('group', { name: 'Filtrar por modalidad' })).toBeNull();
    expect(opcionesDelCombobox()).toEqual(['Todas', 'Aéreo', 'Marítimo', 'No asignada']);
  });

  it.each([[1, ['Todas', 'Aéreo']], [2, ['Todas', 'Aéreo', 'Marítimo']], [3, ['Todas', 'Aéreo', 'Marítimo', 'No asignada']]])(
    'vista de seguimiento con %i modalidades: el mismo combobox con solo las presentes',
    async (n, esperado) => {
      montar(Vista, ruta, `${url}?seguimiento=1`, enSeguimiento(n));
      await esperar();
      expect(screen.queryByRole('group', { name: 'Filtrar por modalidad' })).toBeNull();
      expect(opcionesDelCombobox()).toEqual(esperado);
      expect(contador()).toBe(`Mostrando ${n} ${n === 1 ? 'movimiento' : 'movimientos'}`);
    }
  );

  it('elegir una modalidad filtra la lista y la guarda en sesión', async () => {
    montar(Vista, ruta, url, SOLICITUDES);
    await esperar();
    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por modalidad' }));
    fireEvent.click(screen.getByRole('option', { name: 'Aéreo' }));
    await esperar();
    expect(guardado(claveModalidad)).toBe('Aéreo');
    expect(contador()).toBe('Mostrando 2 movimientos');
  });

  it('móvil, vista de seguimiento con 2 modalidades: la hoja usa el mismo desplegable, no botones', async () => {
    mm(true);
    montar(Vista, ruta, `${url}?seguimiento=1`, enSeguimiento(2));
    await esperar();
    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }));
    await esperar();
    const hoja = screen.getByRole('dialog');
    expect(within(hoja).queryByRole('group', { name: 'Filtrar por modalidad' })).toBeNull();
    const fila = within(hoja).getByRole('combobox', { name: 'Filtrar por modalidad' });
    expect(fila.closest('[data-fila-acordeon]')).toBeTruthy();
    const lista = fila.closest('[data-fila-acordeon]').querySelector('[role="listbox"]');
    expect(Array.from(lista.querySelectorAll('[role="option"]')).map((o) => o.textContent)).toEqual(['Todas', 'Aéreo', 'Marítimo']);
  });

  it('una modalidad guardada que la vista ya no tiene se muestra y se aplica como "Todas", no cuenta en "Filtros" y no borra el valor guardado', async () => {
    sessionStorage.setItem(claveModalidad, JSON.stringify('Marítimo'));
    montar(Vista, ruta, `${url}?seguimiento=1`, enSeguimiento(1)); // en seguimiento solo queda Aéreo
    await esperar();
    const campo = screen.getByRole('combobox', { name: 'Filtrar por modalidad' });
    expect(campo.textContent).toContain('Todas');
    expect(campo.textContent).not.toContain('Marítimo');
    expect(contador()).toBe('Mostrando 1 movimiento');
    expect(screen.queryByRole('button', { name: /^Limpiar filtros/ })?.getAttribute('aria-label')).toBe('Limpiar filtros (1 activo)'); // solo el seguimiento
    expect(guardado(claveModalidad)).toBe('Marítimo');
  });

  it('mientras la vista no tiene movimientos (cargando o vacía) la modalidad guardada se conserva y cuenta', async () => {
    sessionStorage.setItem(claveModalidad, JSON.stringify('Marítimo'));
    montar(Vista, ruta, `${url}?seguimiento=1`, enSeguimiento(0));
    await esperar();
    expect(contador()).toBe('Mostrando 0 movimientos');
    expect(screen.getByRole('button', { name: /^Limpiar filtros/ }).getAttribute('aria-label')).toBe('Limpiar filtros (2 activos)');
  });

  it('con la modalidad guardada presente en la vista, sigue aplicándose', async () => {
    sessionStorage.setItem(claveModalidad, JSON.stringify('Marítimo'));
    montar(Vista, ruta, url, SOLICITUDES);
    await esperar();
    expect(screen.getByRole('combobox', { name: 'Filtrar por modalidad' }).textContent).toContain('Marítimo');
    expect(contador()).toBe('Mostrando 1 movimiento');
  });
});
