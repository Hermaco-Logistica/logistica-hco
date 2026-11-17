// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';

vi.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'u1', email: 'yo@hermaco.net' } }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}) }));
vi.mock('../../utils/exportarExcel', () => ({ exportarTodosLosMovimientosExcel: vi.fn() }));

import { AnalisisEstadisticas as Vista } from './AnalisisEstadisticas';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Fila "Respondido por Compras" del dashboard (F8b, commit 5): nombre, descripción, conjunto, reparto por estado final y navegación.
 * El conjunto lo sigue decidiendo clasificarSolicitud (Cotizado o Cotizado Parcial); el reparto, el estado final de cada ítem.
 */
const HOY = new Date('2026-06-15T18:00:00Z');
const dia = (n) => new Date(HOY.getTime() - n * 86400000);
const base = (id, estado, productos) => ({
  id, correlativo: `RFQ-${id}`, cliente: `Cliente ${id}`, estado, tipo: 'RFQ',
  vendedorNombre: 'Ana Martínez', vendedorEmail: 'a@hermaco.net', vendedorId: 'x1',
  fechaS: dia(2), fechaCreacion: dia(2), productos
});
const p = (extra) => ({ desc: 'bomba', marca: 'X', cant: 1, fob: 10, ...extra });

const SOLICITUDES = [
  // Completa: todos los ítems Cotizado.
  base('c1', 'Cotizado', [p({ estadoItem: 'Cotizado' }), p({ estadoItem: 'Cotizado' })]),
  // Parcial: un ítem sigue Pendiente en Compras.
  base('c2', 'Cotizado Parcial', [p({ estadoItem: 'Cotizado' }), p({ estadoItem: 'Pendiente', fob: 0 })]),
  // Con un ítem ganado: sale del conjunto (clasificarSolicitud la deja en Pedido Parcial).
  base('c3', 'Pedido Parcial', [p({ estadoItem: 'Pedido' }), p({ estadoItem: 'Cotizado' })]),
  // Ítem sin estadoItem con precio: estado final Cotizado, así que es completa aunque el estado guardado sea parcial.
  base('c4', 'Cotizado Parcial', [p({ estadoItem: 'Cotizado' }), p({ fob: 30 })]),
  // Ítem Pendiente con motivo de rechazo suelto: estado final Rechazo, no es Cotizado: parcial.
  base('c5', 'Cotizado Parcial', [p({ estadoItem: 'Cotizado' }), p({ estadoItem: 'Pendiente', motivoRechazo: 'precio', fob: 0 })]),
  // Otra completa: el reparto 3 · 2 no es simétrico, así que invertirlo se nota.
  base('c6', 'Cotizado', [p({ estadoItem: 'Cotizado' })])
];

const mm = (m) => { window.matchMedia = () => ({ matches: m, addEventListener() {}, removeEventListener() {} }); };
const montar = (role) => {
  sessionStorage.clear();
  return render(
    <MemoryRouter initialEntries={['/analisis']}>
      <Routes>
        <Route path="/analisis" element={<Vista role={role} solicitudes={SOLICITUDES} ordenesCompra={[]} />} />
        <Route path="/analisis/solicitudes/:tipo" element={<DestinoPrueba />} />
      </Routes>
    </MemoryRouter>
  );
};
const DestinoPrueba = () => <div data-testid="destino">{useParams().tipo}</div>;

const anchos = (f) => [...f.querySelectorAll('[style*="width"]')].map((e) => e.style.width);
const fila = () => screen.getByText('Respondido por Compras').closest('div[class*="cursor-pointer"]');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY);
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  window.innerWidth = 1280;
  mm(false);
});
afterEach(() => { cleanup(); reiniciarCapasParaPruebas(); sessionStorage.clear(); vi.useRealTimers(); });

describe('KPI "Respondido por Compras": escritorio', () => {
  it('lleva el nombre y la descripción nuevos y ya no el nombre viejo', () => {
    montar('gerente');
    expect(screen.getByText('Respondido por Compras')).toBeTruthy();
    expect(screen.getByText('Con respuesta de Compras, sin pedido aún')).toBeTruthy();
    expect(screen.queryByText('Precios enviados al vendedor o cliente')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Cotizadas \/ Parciales/);
  });

  it('el conjunto es el de clasificarSolicitud (5 de 6: la que tiene un ítem ganado sale) y el reparto sale del estado final de cada ítem', () => {
    montar('gerente');
    const f = fila();
    expect(f.textContent).toContain('3 completas · 2 parciales');
    // Con el estado guardado serían 2 completas · 3 parciales.
    expect(f.textContent).not.toContain('2 completas · 3 parciales');
    expect(f.textContent).toContain('aún583.3%'); // conteo 5 y 83,3 % de las 6 solicitudes
  });

  it('la barra parte la fila 60 % completas y 40 % parciales (3 y 2), no 40 / 60 como con el estado guardado', () => {
    montar('gerente');
    expect(anchos(fila())).toEqual(expect.arrayContaining(['60%', '40%']));
  });

  it('la fila de seguimiento remite al nombre nuevo', () => {
    montar('gerente');
    expect(document.body.textContent).toContain('(ya incluidas en Respondido por Compras)');
    expect(document.body.textContent).not.toContain('ya incluidas en Cotizadas');
  });

  it('al pulsarla navega a la misma pestaña de la lista, "cotizadas"', () => {
    montar('gerente');
    fireEvent.click(fila());
    expect(screen.getByTestId('destino').textContent).toBe('cotizadas');
  });
});

describe('KPI "Respondido por Compras": móvil', () => {
  beforeEach(() => { window.innerWidth = 400; mm(true); });

  it('nombre nuevo, mismo reparto y la descripción no se muestra', () => {
    montar('vendedor');
    const f = fila();
    expect(f.textContent).toContain('3 completas · 2 parciales');
    expect(f.textContent).toContain('parciales583.3%'); // conteo 5 y 83,3 % de las 6 solicitudes
    expect(document.body.textContent).not.toContain('Con respuesta de Compras, sin pedido aún');
    expect(document.body.textContent).not.toMatch(/Cotizadas \/ Parciales/);
  });

  it('la barra parte la fila 60 % completas y 40 % parciales', () => {
    montar('vendedor');
    expect(anchos(fila())).toEqual(expect.arrayContaining(['60%', '40%']));
  });

  it('al tocarla navega a la misma pestaña, "cotizadas"', () => {
    montar('vendedor');
    fireEvent.click(fila());
    expect(screen.getByTestId('destino').textContent).toBe('cotizadas');
  });
});
