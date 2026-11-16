// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../utils/exportarExcel', () => ({ extraerTodosLosMovimientos: vi.fn(() => []), exportarMovimientosExcel: vi.fn() }));

import { DetalleProductosAnalisis as Vista } from './DetalleProductosAnalisis';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Top de productos en móvil: "Filtros (N)" cuenta el orden cuando es distinto del inicial (el de ?orden= de la URL, o 'veces'), "Limpiar" cuenta
 * búsqueda y orden y vuelve al orden inicial de la URL; los chips de vendedor y cliente se quitan con su X y Limpiar no los toca.
 */
const HOY = new Date();
const dia = (n) => new Date(HOY.getTime() - n * 86400000);
const SOL = Array.from({ length: 12 }, (_, i) => ({
  id: `s${i}`, correlativo: `RFQ-${i + 1}`, cliente: i % 2 === 0 ? 'Bombas del Sur' : `Cliente ${i}`, estado: 'Cotizado', vendedorNombre: 'Ana', tipo: 'Aéreo',
  fechaS: dia(i), fechaCreacion: dia(i), productos: [{ desc: i % 3 === 0 ? 'bomba' : 'válvula', marca: 'X', cant: 2, estadoItem: 'Cotizado', precio: 10 }]
}));

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const montar = (url = '/analisis/productos') => render(<MemoryRouter initialEntries={[url]}><Vista role="comprador" solicitudes={SOL} ordenesCompra={[]} /></MemoryRouter>);
const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
const limpiar = () => screen.queryByRole('button', { name: /^Limpiar filtros/ });
const guardado = (k) => JSON.parse(sessionStorage.getItem(k));
const elegirOrden = async (nombre) => {
  fireEvent.click(botonFiltros());
  await esperar();
  fireEvent.click(screen.getByRole('combobox', { name: /Ordenar/ }));
  await esperar();
  fireEvent.click(screen.getByRole('option', { name: nombre }));
  await esperar();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar filtros' }));
  await esperar(500);
};

beforeEach(() => { sessionStorage.clear(); mm(true); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });

describe('DetalleProductosAnalisis: barra de filtros en móvil', () => {
  it('con el orden inicial y sin búsqueda no hay número en "Filtros" ni botón Limpiar', async () => {
    montar();
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
  });

  it('elegir un orden distinto del inicial muestra (1) y Limpiar con 1; Limpiar vuelve a "Más solicitados"', async () => {
    montar();
    await esperar();
    await elegirOrden('Más rechazos');
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
    fireEvent.click(limpiar());
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
  });

  it('con ?orden= en la URL ese es el orden inicial: no cuenta, y Limpiar vuelve a él (no a un valor fijo)', async () => {
    montar('/analisis/productos?orden=rechazos');
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
    await elegirOrden('Más solicitados');
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    fireEvent.click(limpiar());
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar()).toBeNull();
    // el orden volvió a "Más rechazos": elegir "Más solicitados" lo vuelve a contar
    await elegirOrden('Más solicitados');
    expect(botonFiltros().textContent).toBe('Filtros (1)');
  });

  it('?orden=ganadas se traduce a "Más ganados" como orden inicial', async () => {
    montar('/analisis/productos?orden=ganadas');
    await esperar();
    expect(botonFiltros().textContent).toBe('Filtros');
    await elegirOrden('Más solicitados');
    expect(botonFiltros().textContent).toBe('Filtros (1)');
  });

  it('búsqueda y orden distinto: Limpiar cuenta 2, vacía la búsqueda y no toca las claves de vendedor ni cliente', async () => {
    sessionStorage.setItem('analisis_prod_dir_search', JSON.stringify('bomba'));
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Ana'));
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    montar();
    await esperar();
    await elegirOrden('Más rechazos');
    expect(botonFiltros().textContent).toBe('Filtros (1)');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (2)');
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_prod_dir_search')).toBe('');
    expect(guardado('analisis_vendedor_filter')).toBe('Ana');
    expect(guardado('analisis_cliente_search')).toBe('Bombas');
    expect(botonFiltros().textContent).toBe('Filtros');
  });

  it('los chips de vendedor y cliente se muestran y cada X solo limpia su clave', async () => {
    sessionStorage.setItem('analisis_vendedor_filter', JSON.stringify('Ana'));
    sessionStorage.setItem('analisis_cliente_search', JSON.stringify('Bombas'));
    montar();
    await esperar();
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('Bombas')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de vendedor' }));
    await esperar();
    expect(guardado('analisis_vendedor_filter')).toBe('');
    expect(guardado('analisis_cliente_search')).toBe('Bombas');
    expect(screen.queryByRole('button', { name: 'Quitar filtro de vendedor' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de cliente' }));
    await esperar();
    expect(guardado('analisis_cliente_search')).toBe('');
  });

  it('sin chips no hay fila de chips en la tarjeta', async () => {
    montar();
    await esperar();
    expect(screen.queryByRole('button', { name: /^Quitar filtro/ })).toBeNull();
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

/**
 * "Veces solicitadas" (F8b, docs/metricas.md sección 3): solicitudes distintas en las que aparece el producto, en cualquier estado.
 * Hasta F8b la columna se llamaba "Veces Cotizado" y contaba líneas sin decisión ("N RFQs").
 */
describe('DetalleProductosAnalisis: Veces solicitadas', () => {
  const l = (desc, estadoItem, cant = 1) => ({ desc, marca: 'X', cant, estadoItem, precio: 10 });
  const s = (id, estado, productos, extra = {}) => ({ id, correlativo: `RFQ-${id}`, cliente: `Cliente ${id}`, estado, vendedorNombre: 'Ana', tipo: 'Aéreo', fechaS: dia(1), fechaCreacion: dia(1), productos, ...extra });
  const montarCon = (solicitudes, url = '/analisis/productos') => render(<MemoryRouter initialEntries={[url]}><Vista role="comprador" solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>);
  const filas = () => [...document.querySelectorAll('tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim());

  beforeEach(() => mm(false));

  it('el título y la columna dicen "Más solicitados" y "Veces solicitadas"', async () => {
    montarCon([s('1', 'Cotizado', [l('bomba', 'Cotizado')])]);
    await esperar();
    expect(screen.getByText('Top Productos Más Solicitados')).toBeTruthy();
    expect(screen.getByText('Veces solicitadas')).toBeTruthy();
    expect(screen.queryByText('Veces Cotizado')).toBeNull();
    expect(screen.queryByText('Top Productos Más Cotizados')).toBeNull();
  });

  it('cuenta solicitudes distintas, no líneas sin decisión: un producto repetido en una solicitud, una venta perdida y un anulado dan 3 (hoy daba 2)', async () => {
    montarCon([
      s('r0', 'Cotizado', [l('bomba', 'Cotizado'), l('bomba', 'Cotizado')]),
      s('r1', 'Venta Perdida', [l('bomba', 'Venta Perdida')]),
      s('r2', 'Anulado', [l('bomba', 'Anulado')])
    ]);
    await esperar();
    expect(screen.getByText('3 solic.')).toBeTruthy();
    expect(screen.getByTitle('3 solicitudes')).toBeTruthy();
    expect(screen.queryByText(/RFQs?$/)).toBeNull();
  });

  it('en singular dice "1 solic." con el texto completo "1 solicitud" en el title', async () => {
    montarCon([s('1', 'Cotizado', [l('bomba', 'Cotizado'), l('bomba', 'Cotizado')])]);
    await esperar();
    expect(screen.getByText('1 solic.')).toBeTruthy();
    expect(screen.getByTitle('1 solicitud')).toBeTruthy();
  });

  it('sin id cuenta por correlativo: dos solicitudes con correlativo distinto son 2', async () => {
    montarCon([
      { correlativo: 'RFQ-A', estado: 'Cotizado', cliente: 'A', vendedorNombre: 'Ana', fechaS: dia(1), fechaCreacion: dia(1), productos: [l('tubo', 'Cotizado')] },
      { correlativo: 'RFQ-B', estado: 'Cotizado', cliente: 'B', vendedorNombre: 'Ana', fechaS: dia(1), fechaCreacion: dia(1), productos: [l('tubo', 'Cotizado')] }
    ]);
    await esperar();
    expect(screen.getByText('2 solic.')).toBeTruthy();
    expect(screen.getByTitle('2 solicitudes')).toBeTruthy();
  });

  it('"Más solicitados" ordena por solicitudes distintas: 2 solicitudes con 1 línea van antes que 1 solicitud con 3 líneas', async () => {
    montarCon([
      s('x', 'Cotizado', [l('pieza x', 'Cotizado'), l('pieza x', 'Cotizado'), l('pieza x', 'Cotizado')]),
      s('y1', 'Cotizado', [l('pieza y', 'Cotizado')]),
      s('y2', 'Cotizado', [l('pieza y', 'Cotizado')])
    ]);
    await esperar();
    const f = filas();
    expect(f[0]).toContain('PIEZA Y');
    expect(f[1]).toContain('PIEZA X');
  });

  it('la clave de orden sigue siendo "veces": ?orden=veces y el valor por defecto dan el mismo resultado', async () => {
    const datos = [s('x', 'Cotizado', [l('pieza x', 'Cotizado'), l('pieza x', 'Cotizado')]), s('y1', 'Cotizado', [l('pieza y', 'Cotizado')]), s('y2', 'Cotizado', [l('pieza y', 'Cotizado')])];
    montarCon(datos, '/analisis/productos?orden=veces');
    await esperar();
    expect(filas()[0]).toContain('PIEZA Y');
  });

  it('móvil: la tarjeta dice "Solicitados" con las solicitudes distintas (3 veces) y el singular "1 vez"', async () => {
    mm(true);
    montarCon([
      s('r0', 'Cotizado', [l('bomba', 'Cotizado'), l('bomba', 'Cotizado')]), s('r1', 'Venta Perdida', [l('bomba', 'Venta Perdida')]), s('r2', 'Anulado', [l('bomba', 'Anulado')]),
      s('u0', 'Cotizado', [l('tubo', 'Cotizado'), l('tubo', 'Cotizado')])
    ]);
    await esperar();
    const tarjetaDe = (desc) => [...document.querySelectorAll('h3')].find((h) => h.textContent.trim() === desc).closest('.surface');
    const solicitados = (desc) => within(tarjetaDe(desc)).getByText('Solicitados').parentElement.textContent.replace(/\s+/g, ' ').trim();
    expect(solicitados('BOMBA')).toBe('Solicitados3 veces');
    expect(solicitados('TUBO')).toBe('Solicitados1 vez');
    expect(screen.queryByText('Cotizados')).toBeNull();
  });
});
