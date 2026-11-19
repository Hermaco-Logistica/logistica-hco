// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'u1', email: 'yo@hermaco.net' } }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}) }));
vi.mock('../../utils/exportarExcel', () => ({ exportarMovimientosExcel: vi.fn(), exportarTodosLosMovimientosExcel: vi.fn(), extraerTodosLosMovimientos: vi.fn(() => []) }));

import { DetalleProductoHistorial } from './DetalleProductoHistorial';
import { DetalleClienteHistorial } from './DetalleClienteHistorial';
import { DetalleVendedorHistorial } from './DetalleVendedorHistorial';
import { DetalleProductosAnalisis } from './DetalleProductosAnalisis';
import { DetalleSolicitudesAnalisis } from './DetalleSolicitudesAnalisis';
import { AnalisisEstadisticas } from './AnalisisEstadisticas';
import { resumirProductos } from './utils/resumenProductos';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';
import { reiniciarPopoverUnico } from '../../utils/popoverUnico';

/**
 * Efecto de la regla de pedido confirmado (F8c, commit 8) en las pantallas: un ítem "Pedido" con negociación y sin `pedidoGenerado` (aprobado por
 * Compras y sin notificar, como PED-0020) deja de ser Ganado en Productos, los Historiales, la columna Resultado, las pestañas y las filas del dashboard.
 *
 * Datos: PRODUCTO 0 aparece en cuatro solicitudes.
 *  S1 (PED-0020): Pendiente, 2 ítems Pedido aprobados sin notificar (PRODUCTO 0 y PRODUCTO 1).
 *  S2: Pedido manual con PRODUCTO 0 Pedido, negociación acordada y pedidoGenerado true (PED-0030, ítem 2).
 *  S3: RFQ Pedido con PRODUCTO 0 sin negociación.
 *  S4: Venta Perdida con PRODUCTO 0.
 * Antes: PRODUCTO 0 tenía 3 ganados de 4 cerrados (75 %) y S1 era "Ganada" y estaba en Pedidos. Ahora: 2 de 3 (67 %), S1 "En curso" y en Cotizadas.
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
const neg = (extra = {}) => ({ turno: null, resultado: 'acordado', version: 1, ...extra });
const p = (desc, estadoItem, extra = {}) => ({ desc, marca: 'X', cant: 3, fob: 10, precio: 10, estadoItem, ...extra });
const sol = (id, estado, tipo, productos, extra = {}) => ({ id, correlativo: `${tipo === 'Pedido Manual' ? 'PED' : 'RFQ'}-${id}`, cliente: 'Cliente C', estado, tipo, vendedorNombre: 'Ana', fechaS: dia(2), fechaCreacion: dia(2), productos, ...extra });
const S1 = sol('A', 'Pendiente', 'Pedido Manual', [p('PRODUCTO 0', 'Pedido', { negociacion: neg({ sinNotificar: true }) }), p('PRODUCTO 1', 'Pedido', { negociacion: neg({ sinNotificar: true }) })]);
const S2 = sol('B', 'Pedido', 'Pedido Manual', [p('PRODUCTO 0', 'Pedido', { negociacion: neg(), pedidoGenerado: true })]);
const S3 = sol('C', 'Pedido', 'RFQ', [p('PRODUCTO 0', 'Pedido')]);
const S4 = sol('D', 'Venta Perdida', 'RFQ', [p('PRODUCTO 0', 'Venta Perdida')]);
const DATOS = [S1, S2, S3, S4];

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 80) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const montar = (ui, url) => { mm(false); window.innerWidth = 1280; return render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>); };
const ruta = (path, element) => <Routes><Route path={path} element={element} /></Routes>;
const columna = (nombre) => [...document.querySelectorAll('thead th')].findIndex((th) => th.textContent.trim() === nombre);
const celda = (correlativo, nombre) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(correlativo)).querySelectorAll('td')[columna(nombre)].textContent.replace(/\s+/g, ' ').trim();
const tarjeta = (nombre) => screen.getByText(nombre).closest('.surface');
const subtitulo = (el) => el.querySelector('[title]').textContent.replace(/\s+/g, ' ').trim();
const contador = () => document.querySelector('[aria-live="polite"]').textContent;
const correlativos = () => [...document.querySelectorAll('tbody tr')].map((tr) => tr.textContent.match(/(PED|RFQ)-[A-Z]/)?.[0]).filter(Boolean).sort();

beforeEach(() => {
  sessionStorage.clear();
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); reiniciarPopoverUnico(); sessionStorage.clear(); window.matchMedia = matchMediaOriginal; });

describe('Productos (resumirProductos y Directorio)', () => {
  it('PRODUCTO 0: 2 ganados de 3 cerrados (67 %), no 3 de 4; el pedido sin confirmar es un ítem abierto', () => {
    const r = resumirProductos(DATOS).find((x) => x.desc === 'PRODUCTO 0');
    expect([r.ganadas, r.cerrados, r.abiertos, r.ventasPerdidas]).toEqual([2, 3, 1, 1]);
    expect(Math.round(r.conversion)).toBe(67);
    expect(r.unidadesGanadas).toBe(6);
    expect(r.unidades.abierto).toBe(3);
    expect(r.unidadesAbiertas.cotizado).toBe(3);
  });

  it('PRODUCTO 1, que solo está en el pedido sin confirmar, no tiene ganados ni cerrados', () => {
    const r = resumirProductos(DATOS).find((x) => x.desc === 'PRODUCTO 1');
    expect([r.ganadas, r.cerrados, r.conversion]).toEqual([0, 0, null]);
  });

  it('los datos a revisar cuentan los dos aprobados sin notificar', () => {
    const r = resumirProductos([S1]);
    expect(r.map((x) => x.datosARevisar.porMotivo)).toEqual([{ pedido_sin_confirmar: 1 }, { pedido_sin_confirmar: 1 }]);
  });

  it('el Directorio muestra los Ganados de PRODUCTO 0 sin el pedido sin confirmar', async () => {
    montar(<DetalleProductosAnalisis role="comprador" solicitudes={DATOS} ordenesCompra={[]} />, '/analisis/productos');
    await esperar();
    const fila = [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes('PRODUCTO 0'));
    const cabeceras = [...document.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    expect(fila.querySelectorAll('td')[cabeceras.indexOf('Ganados')].textContent.replace(/\s+/g, '')).toBe('2(67%)');
  });
});

describe('Historiales', () => {
  it('Historial de producto: tarjeta Conversión 2 ganados / 3 cerrados, 6 en pedido y la fila de PED-A es "Cotizado"', async () => {
    montar(ruta('/analisis/producto/:productId', <DetalleProductoHistorial role="comprador" solicitudes={DATOS} ordenesCompra={[]} />), '/analisis/producto/PRODUCTO%200');
    await esperar();
    expect(subtitulo(tarjeta('Conversión'))).toBe('2 de 3 ítems cerrados');
    expect(within(tarjeta('Unid. Solicitadas')).getByText(/en pedido/).textContent).toBe('6 en pedido');
    expect(celda('PED-A', 'Resultado')).toMatch(/^Cotizado/);
    expect(celda('PED-B', 'Resultado')).toMatch(/^Ganado/);
    expect(celda('RFQ-C', 'Resultado')).toMatch(/^Ganado/);
  });

  it('Historial de cliente: 2 ganados de 3 cerrados (con la regla vieja eran 4 de 5); unidades en pedido 6', async () => {
    montar(ruta('/analisis/cliente/:clienteId', <DetalleClienteHistorial role="comprador" solicitudes={DATOS} ordenesCompra={[]} />), '/analisis/cliente/Cliente%20C');
    await esperar();
    // ganados: S2 y S3 (PRODUCTO 0); cerrados: más la venta perdida de S4; los dos ítems de S1 están abiertos
    expect(subtitulo(tarjeta('Conversión'))).toBe('2 de 3 ítems cerrados');
    expect(screen.getByText(/en pedido/).textContent).toBe('6 en pedido');
  });

  it('Historial de vendedor: igual, y el Monto en Pedidos solo suma los ítems confirmados', async () => {
    montar(ruta('/analisis/vendedor/:vendedorId', <DetalleVendedorHistorial role="comprador" solicitudes={DATOS} ordenesCompra={[]} />), '/analisis/vendedor/Ana');
    await esperar();
    expect(subtitulo(tarjeta('Conversión'))).toBe('2 de 3 ítems cerrados');
    expect(tarjeta('Prods. Cotizados').textContent).toMatch(/\(6 ped\)/);
    expect(tarjeta('Monto en Pedidos').textContent).toContain('$60.00'); // 2 ítems confirmados × 3 u. × $10
  });
});

describe('Lista de solicitudes', () => {
  const lista = (pestana) => montar(ruta('/analisis/solicitudes/:tipoEstado', <DetalleSolicitudesAnalisis role="comprador" solicitudes={DATOS} ordenesCompra={[]} />), `/analisis/solicitudes/${pestana}`);

  it('PED-A: Resultado "En curso" (antes "Ganada"), Estado guardado "Pendiente" y el indicador "Según ítems: Cotizado"', async () => {
    lista('todas');
    await esperar();
    expect(celda('PED-A', 'Resultado')).toBe('En curso');
    expect(celda('PED-A', 'Estado')).toBe('PendienteSegún ítems: Cotizado');
    expect(celda('PED-B', 'Resultado')).toBe('Ganada');
    expect(celda('RFQ-C', 'Resultado')).toBe('Ganada');
  });

  it('las pestañas: PED-A sale de Pedidos y está en Cotizadas; Pedidos queda con PED-B y RFQ-C', async () => {
    lista('pedidos');
    await esperar();
    expect(correlativos()).toEqual(['PED-B', 'RFQ-C']);
    expect(contador()).toBe('Mostrando 2 solicitudes');
    cleanup();
    lista('cotizadas');
    await esperar();
    expect(correlativos()).toEqual(['PED-A']);
    cleanup();
    lista('pendiente');
    await esperar();
    expect(correlativos()).toEqual([]);
  });
});

describe('Filas del dashboard', () => {
  const fila = (etiqueta) => screen.getByText(etiqueta).closest('div[class*="cursor-pointer"]');
  const numero = (etiqueta) => Number(fila(etiqueta).querySelector('span.font-mono').textContent);

  it('Pedidos Confirmados / Cerrados cuenta 2 (antes 3) y Respondido por Compras 1 completa (antes 0)', async () => {
    montar(<AnalisisEstadisticas role="gerente" solicitudes={DATOS} ordenesCompra={[]} />, '/analisis');
    await esperar();
    expect(numero('Pedidos Confirmados / Cerrados')).toBe(2);
    expect(numero('Respondido por Compras')).toBe(1);
    expect(fila('Respondido por Compras').textContent).toContain('1 completas · 0 parciales');
    expect(numero('Pendiente de Cotizar')).toBe(0);
  });

  it('la fila de Respondido por Compras coincide con la pestaña Cotizadas y la de Pedidos con la pestaña Pedidos', async () => {
    montar(<AnalisisEstadisticas role="gerente" solicitudes={DATOS} ordenesCompra={[]} />, '/analisis');
    await esperar();
    const pedidos = numero('Pedidos Confirmados / Cerrados');
    const respondido = numero('Respondido por Compras');
    cleanup();
    montar(ruta('/analisis/solicitudes/:tipoEstado', <DetalleSolicitudesAnalisis role="comprador" solicitudes={DATOS} ordenesCompra={[]} />), '/analisis/solicitudes/pedidos');
    await esperar();
    expect(Number(contador().match(/\d+/)[0])).toBe(pedidos);
    cleanup();
    montar(ruta('/analisis/solicitudes/:tipoEstado', <DetalleSolicitudesAnalisis role="comprador" solicitudes={DATOS} ordenesCompra={[]} />), '/analisis/solicitudes/cotizadas');
    await esperar();
    expect(Number(contador().match(/\d+/)[0])).toBe(respondido);
  });
});
