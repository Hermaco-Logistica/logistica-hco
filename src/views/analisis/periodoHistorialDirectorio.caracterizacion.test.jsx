// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'u1', email: 'yo@hermaco.net' } }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}) }));
vi.mock('../../utils/exportarExcel', () => ({ exportarMovimientosExcel: vi.fn(), exportarTodosLosMovimientosExcel: vi.fn(), extraerTodosLosMovimientos: vi.fn(() => []) }));

import { DetalleProductoHistorial as Historial } from './DetalleProductoHistorial';
import { DetalleProductosAnalisis as Directorio } from './DetalleProductosAnalisis';
import { cumpleFiltroPeriodoAnalisis } from './utils/periodoAnalisis';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';
import { reiniciarPopoverUnico } from '../../utils/popoverUnico';

/**
 * PRUEBAS DE CARACTERIZACIÓN (F8c): documentan lo que el código hace HOY con el período en el Historial de producto y en el Directorio de
 * productos. No dicen que el comportamiento sea el correcto: si alguna de estas pruebas falla después de un cambio, no es una regresión sino
 * el aviso de que el comportamiento descrito aquí cambió y hay que decidirlo (docs/metricas.md). Ningún código se modificó para escribirlas.
 *
 *  (a) El Directorio aplica `?periodo=` de la URL; el Historial lo ignora y usa solo el período guardado (30 días por defecto).
 *  (b) `cumpleFiltroPeriodoAnalisis` compara `anioHistorico` con `===`: con el año como TEXTO (así llega desde `?anioHistorico=` de la URL)
 *      deja fuera todas las solicitudes; el Historial usa `Number(anioHistorico)` y sí las incluye.
 *  (c) Con el rango invertido (inicio posterior al fin) la función compartida no filtra nada. Por el almacenamiento un rango invertido nunca llega:
 *      `cargarFiltroPeriodoStorage` lo corrige igualando el fin al inicio; solo la URL del Directorio lo puede traer sin corregir.
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(d);
const l = (desc, estadoItem) => ({ desc, marca: 'X', cant: 1, estadoItem, precio: 10, fob: 10 });
const s = (id, estado, productos, fecha) => ({ id, correlativo: `RFQ-${id}`, cliente: 'Bombas del Sur', estado, vendedorNombre: 'Ana', tipo: 'RFQ', fechaS: fecha, fechaCreacion: fecha, modalidad: 'Aéreo', productos });
/** A: hace 1 día, ganada. B: hace 20 días, venta perdida. */
const DATOS = [s('A', 'Pedido', [l('bomba', 'Pedido')], dia(1)), s('B', 'Venta Perdida', [l('bomba', 'Venta Perdida')], dia(20))];

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const guardar = (clave, valor) => sessionStorage.setItem(clave, JSON.stringify(valor));
const periodoGuardado = (valor) => guardar('analisis_filtro_periodo', valor);

/** Title de la conversión del Directorio para BOMBA, o null si el producto no aparece. */
const directorio = async (url) => {
  mm(false);
  render(<MemoryRouter initialEntries={[url]}><Directorio role="comprador" solicitudes={DATOS} ordenesCompra={[]} /></MemoryRouter>);
  await esperar();
  const fila = [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes('BOMBA'));
  if (!fila) return null;
  return fila.querySelector('[title^="Conversión"], [title^="Sin ítems cerrados"]').getAttribute('title');
};
/** Title de la conversión del Historial de BOMBA y el contador de movimientos. */
const historial = async (url = '/analisis/producto/bomba') => {
  mm(false);
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/analisis/producto/:productId" element={<Historial role="comprador" solicitudes={DATOS} ordenesCompra={[]} />} /></Routes>
    </MemoryRouter>
  );
  await esperar();
  const tarjeta = screen.getByText('Conversión').closest('.surface');
  return { title: tarjeta.querySelector('[title]').getAttribute('title').split(' (')[0], movimientos: document.querySelector('[aria-live="polite"]').textContent };
};

beforeEach(() => {
  sessionStorage.clear();
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); reiniciarCapasParaPruebas(); reiniciarPopoverUnico(); sessionStorage.clear(); window.matchMedia = matchMediaOriginal; });

describe('caracterización (a): ?periodo= de la URL', () => {
  it('sin nada en la URL los dos usan el período guardado (30 días por defecto) y coinciden: A y B entran', async () => {
    expect(await directorio('/analisis/productos')).toBe('Conversión 50 %: 1 ítem ganado de 2 cerrados');
    cleanup();
    const h = await historial();
    expect(h.title).toBe('Conversión 50 %: 1 ítem ganado de 2 cerrados');
    expect(h.movimientos).toBe('Mostrando 2 movimientos');
  });

  it('con ?periodo=7d el Directorio lo aplica (solo A) y el Historial lo IGNORA (A y B): las cifras difieren — comportamiento actual', async () => {
    expect(await directorio('/analisis/productos?periodo=7d')).toBe('Conversión 100 %: 1 ítem ganado de 1 cerrado');
    cleanup();
    const h = await historial('/analisis/producto/bomba?periodo=7d');
    expect(h.title).toBe('Conversión 50 %: 1 ítem ganado de 2 cerrados');
    expect(h.movimientos).toBe('Mostrando 2 movimientos');
  });

  it('el Historial sí respeta el período GUARDADO: con 7 días guardados solo entra A (el Directorio también)', async () => {
    periodoGuardado({ periodo: '7d' });
    const h = await historial();
    expect(h.title).toBe('Conversión 100 %: 1 ítem ganado de 1 cerrado');
    cleanup();
    expect(await directorio('/analisis/productos')).toBe('Conversión 100 %: 1 ítem ganado de 1 cerrado');
  });
});

describe('caracterización (b): anioHistorico con === en cumpleFiltroPeriodoAnalisis', () => {
  const fecha = new Date('2026-06-15T12:00:00-06:00');
  const cumple = (anioHistorico) => cumpleFiltroPeriodoAnalisis({ fecha, filtroPeriodo: { periodo: 'historico', anioHistorico }, rangoEsteMes: { inicio: new Date(0), fin: new Date(0) } });

  it('función compartida: el año como NÚMERO coincide y como TEXTO no (2026 !== "2026"); "todos" deja pasar todo — comportamiento actual', () => {
    expect(cumple(2026)).toBe(true);
    expect(cumple('2026')).toBe(false);
    expect(cumple('todos')).toBe(true);
    expect(cumple(2025)).toBe(false);
  });

  const anio = ymd(dia(1)).slice(0, 4);

  it('Directorio por URL: ?periodo=historico&anioHistorico=<año> llega como texto y deja FUERA toda solicitud de ese año — comportamiento actual', async () => {
    expect(await directorio(`/analisis/productos?periodo=historico&anioHistorico=${anio}`)).toBeNull();
  });

  it('Directorio por URL con "todos" sí las incluye (A y B)', async () => {
    expect(await directorio('/analisis/productos?periodo=historico&anioHistorico=todos')).toBe('Conversión 50 %: 1 ítem ganado de 2 cerrados');
  });

  it('Directorio con el año guardado como NÚMERO las incluye, y como TEXTO guardado también las deja fuera', async () => {
    periodoGuardado({ periodo: 'historico', anioHistorico: Number(anio) });
    expect(await directorio('/analisis/productos')).toBe('Conversión 50 %: 1 ítem ganado de 2 cerrados');
    cleanup();
    periodoGuardado({ periodo: 'historico', anioHistorico: anio });
    expect(await directorio('/analisis/productos')).toBeNull();
  });

  it('Historial: usa Number(anioHistorico), así que el año guardado como texto o como número incluye A y B', async () => {
    periodoGuardado({ periodo: 'historico', anioHistorico: anio });
    expect((await historial()).title).toBe('Conversión 50 %: 1 ítem ganado de 2 cerrados');
    cleanup();
    periodoGuardado({ periodo: 'historico', anioHistorico: Number(anio) });
    expect((await historial()).title).toBe('Conversión 50 %: 1 ítem ganado de 2 cerrados');
  });
});

describe('caracterización (c): rango invertido (inicio posterior al fin)', () => {
  const inicio = ymd(dia(1));
  const fin = ymd(dia(20));
  const rangoRevesado = { periodo: 'custom', fechaInicio: inicio, fechaFin: fin, anioHistorico: null };

  it('función compartida: un rango invertido NO filtra nada (devuelve true para cualquier fecha) — comportamiento actual', () => {
    const ctx = { filtroPeriodo: rangoRevesado, rangoEsteMes: { inicio: new Date(0), fin: new Date(0) } };
    expect(cumpleFiltroPeriodoAnalisis({ ...ctx, fecha: dia(100) })).toBe(true);
    expect(cumpleFiltroPeriodoAnalisis({ ...ctx, fecha: dia(5) })).toBe(true);
    expect(cumpleFiltroPeriodoAnalisis({ ...ctx, fecha: new Date('2001-01-01') })).toBe(true);
  });

  it('el mismo rango en orden normal sí filtra (control de la prueba anterior)', () => {
    const normal = { periodo: 'custom', fechaInicio: fin, fechaFin: inicio, anioHistorico: null };
    const ctx = { filtroPeriodo: normal, rangoEsteMes: { inicio: new Date(0), fin: new Date(0) } };
    expect(cumpleFiltroPeriodoAnalisis({ ...ctx, fecha: dia(100) })).toBe(false);
    expect(cumpleFiltroPeriodoAnalisis({ ...ctx, fecha: dia(5) })).toBe(true);
  });

  it('Directorio por URL con el rango invertido: no filtra y entran A y B — comportamiento actual', async () => {
    expect(await directorio(`/analisis/productos?periodo=custom&fechaInicio=${inicio}&fechaFin=${fin}`)).toBe('Conversión 50 %: 1 ítem ganado de 2 cerrados');
  });

  it('por el almacenamiento el rango invertido se corrige (fin = inicio): el Directorio y el Historial ven solo el día de inicio, o sea A', async () => {
    periodoGuardado(rangoRevesado);
    expect(await directorio('/analisis/productos')).toBe('Conversión 100 %: 1 ítem ganado de 1 cerrado');
    cleanup();
    const h = await historial();
    expect(h.title).toBe('Conversión 100 %: 1 ítem ganado de 1 cerrado');
    expect(h.movimientos).toBe('Mostrando 1 movimiento');
  });
});
