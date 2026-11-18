// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../utils/exportarExcel', () => ({ exportarTodosLosMovimientosExcel: vi.fn() }));

import { DetalleSolicitudesAnalisis as Vista } from './DetalleSolicitudesAnalisis';
import { claveResultadoSolicitud } from './utils/claveResultadoSolicitud';
import { evaluarEstadoGanada } from './theme';
import { resolverEtiqueta, tonoDe } from '../../utils/etiquetas';
import { RESULTADO_SOLICITUD } from '../../utils/resultadoSolicitud';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';

/**
 * Lista de solicitudes (F8c, commit 4): la columna "Resultado" sale de `resultadoSolicitud` (todos los ítems de la solicitud) y no de
 * `evaluarEstadoGanada`. La columna "Estado" sigue con el estado guardado. El Excel de movimientos conserva `evaluarEstadoGanada` hasta F8e.
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
const item = (desc, estadoItem, extra = {}) => ({ desc, marca: 'X', cant: 1, estadoItem, precio: 10, fob: 10, ...extra });
const sol = (id, estado, productos) => ({ id, correlativo: `RFQ-${id}`, cliente: 'Bombas del Sur', estado, vendedorNombre: 'Ana', tipo: 'RFQ', fechaS: dia(1), fechaCreacion: dia(1), productos });
const DATOS = [
  sol('1', 'Pedido', [item('a', 'Pedido'), item('b', 'Pedido')]), // Ganada (hoy Ganada)
  sol('2', 'Pedido Parcial', [item('a', 'Pedido'), item('b', 'Cotizado')]), // Ganada parcial (hoy Ganado Parcial)
  sol('3', 'Pedido', [item('a', 'Pedido'), item('b', 'Anulado')]), // Ganada parcial (hoy Ganado Parcial)
  sol('4', 'Pedido', [item('a', 'Pedido'), item('b', 'Venta Perdida')]), // Ganada parcial (hoy Ganada)
  sol('5', 'Venta Perdida', [item('a', 'Venta Perdida')]), // Venta perdida (hoy Venta Perdida)
  sol('6', 'Denegado', [item('a', 'Cancelado')]), // Rechazada (hoy "Denegado" crudo)
  sol('7', 'Anulado', [item('a', 'Anulado')]), // Anulada (hoy Anulada)
  sol('8', 'Cotizado', [item('a', 'Cotizado')]), // En curso (hoy Cotizada)
  sol('9', 'Pendiente', [item('a', 'Pendiente', { fob: 0, precio: 0 })]) // En curso (hoy Pendiente)
];
const SIN_ITEMS = sol('10', 'Pendiente', []); // Sin ítems
const MIXTA = sol('11', 'Cotizado Parcial', [item('a', 'Venta Perdida'), item('b', 'Cancelado')]); // Venta perdida (mixta)

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 80) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const montar = (solicitudes = DATOS) => { mm(false); return render(<MemoryRouter><Vista role="comprador" solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>); };
const columna = (nombre) => [...document.querySelectorAll('thead th')].findIndex((th) => th.textContent.trim() === nombre);
const celda = (correlativo, nombre) => {
  const fila = [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(correlativo));
  return fila.querySelectorAll('td')[columna(nombre)].textContent.replace(/\s+/g, ' ').trim();
};

beforeEach(() => { sessionStorage.clear(); Element.prototype.scrollIntoView = vi.fn(); window.scrollTo = vi.fn(); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.matchMedia = matchMediaOriginal; });

describe('lista de solicitudes: columna "Resultado" con resultadoSolicitud', () => {
  it.each([
    ['RFQ-1', 'Ganada'], ['RFQ-2', 'Ganada parcial'], ['RFQ-3', 'Ganada parcialítems anulados'], ['RFQ-4', 'Ganada parcial'], ['RFQ-5', 'Venta perdida'],
    ['RFQ-6', 'Rechazada'], ['RFQ-7', 'Anulada'], ['RFQ-8', 'En curso'], ['RFQ-9', 'En curso']
  ])('la solicitud %s dice "%s" (el texto "ítems anulados" va pegado cuando hay un ítem anulado)', async (correlativo, texto) => {
    montar();
    await esperar();
    expect(celda(correlativo, 'Resultado')).toBe(texto);
  });

  it('una mixta (venta perdida y rechazo) dice "Venta perdida" y una solo con rechazos dice "Rechazada"', async () => {
    montar([MIXTA, DATOS[5]]);
    await esperar();
    expect(celda('RFQ-11', 'Resultado')).toBe('Venta perdida');
    expect(celda('RFQ-6', 'Resultado')).toBe('Rechazada');
  });

  it('una solicitud sin ítems dice "Sin ítems"', async () => {
    montar([...DATOS, SIN_ITEMS]);
    await esperar();
    expect(celda('RFQ-10', 'Resultado')).toBe('Sin ítems');
  });

  it('el Pedido con un ítem perdido o rechazado pasa de "Ganada" a "Ganada parcial" (el cambio real de la regla)', async () => {
    montar();
    await esperar();
    expect(celda('RFQ-4', 'Resultado')).toBe('Ganada parcial');
    expect(evaluarEstadoGanada(DATOS[3]).label).toBe('Ganada');
  });

  it('ya no salen las etiquetas antiguas: Cotizada, Pendiente, Ganado Parcial, Denegado ni Venta Perdida en esa columna', async () => {
    montar();
    await esperar();
    [...document.querySelectorAll('tbody tr')].forEach((tr) => {
      expect(tr.querySelectorAll('td')[columna('Resultado')].textContent).not.toMatch(/Cotizada|Pendiente|Ganado Parcial|Denegado|Venta Perdida|^Perdida/);
    });
  });

  it('la columna "Estado" queda como estaba: el estado guardado de la solicitud', async () => {
    montar();
    await esperar();
    expect(celda('RFQ-3', 'Estado')).toMatch(/^Pedido/);
    expect(celda('RFQ-6', 'Estado')).toMatch(/^Denegado/);
    expect(celda('RFQ-2', 'Estado')).toMatch(/^Pedido Parcial/);
    expect(celda('RFQ-8', 'Estado')).toMatch(/^Cotizado/);
  });

  it('el aviso "ítems anulados" solo sale con un ítem anulado en una solicitud no anulada (la Anulada no lo lleva)', async () => {
    montar();
    await esperar();
    expect(celda('RFQ-3', 'Resultado')).toContain('ítems anulados');
    expect(celda('RFQ-7', 'Resultado')).not.toContain('ítems anulados');
    expect(celda('RFQ-1', 'Resultado')).not.toContain('ítems anulados');
  });
});

describe('claveResultadoSolicitud y etiquetas nuevas', () => {
  it.each([
    [RESULTADO_SOLICITUD.GANADA, 'ganada', 'Ganada', 'exito'],
    [RESULTADO_SOLICITUD.GANADA_PARCIAL, 'ganada_parcial', 'Ganada parcial', 'info'],
    [RESULTADO_SOLICITUD.VENTA_PERDIDA, 'venta_perdida', 'Venta perdida', 'peligro'],
    [RESULTADO_SOLICITUD.RECHAZADA, 'rechazada', 'Rechazada', 'peligro'],
    [RESULTADO_SOLICITUD.ANULADA, 'anulada', 'Anulada', 'peligro'],
    [RESULTADO_SOLICITUD.EN_CURSO, 'en_curso', 'En curso', 'azul'],
    [RESULTADO_SOLICITUD.SIN_ITEMS, 'sin_items', 'Sin ítems', 'apagado']
  ])('el resultado "%s" usa la clave %s: texto "%s" y tono %s', (resultado, clave, texto, tono) => {
    expect(claveResultadoSolicitud(resultado)).toBe(clave);
    expect(resolverEtiqueta('resultado', clave).texto).toBe(texto);
    expect(tonoDe('resultado', clave)).toBe(tono);
    expect(resolverEtiqueta('resultado', clave).icono).toBeTruthy();
  });

  it('un resultado desconocido o vacío cae en "En curso"', () => {
    expect(claveResultadoSolicitud('algo raro')).toBe('en_curso');
    expect(claveResultadoSolicitud(undefined)).toBe('en_curso');
  });

  it('las etiquetas antiguas del Excel siguen en el catálogo: ganado_parcial, no_comprado, cotizada y pendiente', () => {
    expect(resolverEtiqueta('resultado', 'ganado_parcial').texto).toBe('Ganado parcial');
    expect(resolverEtiqueta('resultado', 'cotizada').texto).toBe('Cotizada');
    expect(resolverEtiqueta('resultado', 'pendiente').texto).toBe('Pendiente');
    expect(resolverEtiqueta('resultado', 'no_comprado').texto).toBe('No comprado');
  });

  it('el Excel de movimientos conserva evaluarEstadoGanada: sigue dando "Ganado Parcial" y "Cotizada" (hasta F8e)', () => {
    expect(evaluarEstadoGanada(DATOS[2]).label).toBe('Ganado Parcial');
    expect(evaluarEstadoGanada(DATOS[7]).label).toBe('Cotizada');
  });
});
