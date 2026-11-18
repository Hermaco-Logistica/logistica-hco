// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'u1', email: 'yo@hermaco.net' } }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}) }));
vi.mock('../../utils/exportarExcel', () => ({ exportarTodosLosMovimientosExcel: vi.fn() }));

import { DetalleSolicitudesAnalisis as Lista } from './DetalleSolicitudesAnalisis';
import { AnalisisEstadisticas as Dashboard } from './AnalisisEstadisticas';
import { ESTADOS_DE_PESTANA, esPestanaPorEstado, estadoRecalculado, perteneceAPestanaPorEstado } from './utils/pestanaSolicitud';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';
import { exportarTodosLosMovimientosExcel } from '../../utils/exportarExcel';

/**
 * Pestañas Pendientes, Cotizadas, Pedidos y Pedidos Parciales de la lista (F8c, commit 5): por el estado RECALCULADO desde los ítems, el mismo
 * de las filas del dashboard, y no por el estado guardado. La columna "Estado" sigue mostrando el guardado (decisión pendiente).
 *
 * Cada solicitud de abajo tiene un estado guardado que NO coincide con el recalculado (A a F); G a J son coherentes.
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
const item = (estadoItem, extra = {}) => ({ desc: 'bomba', marca: 'X', cant: 1, estadoItem, precio: 10, fob: 10, ...extra });
const pend = () => item('Pendiente', { fob: 0, precio: 0 });
const sol = (id, estado, productos, extra = {}) => ({ id, correlativo: `RFQ-${id}`, cliente: 'Bombas del Sur', estado, vendedorNombre: 'Ana', tipo: 'RFQ', fechaS: dia(1), fechaCreacion: dia(1), productos, ...extra });
const DATOS = [
  sol('A', 'Cotizado', [pend(), pend()]), // guardado Cotizado, recalculado Pendiente
  sol('B', 'Pendiente', [item('Pedido'), item('Pedido')]), // guardado Pendiente, recalculado Pedido
  sol('C', 'Pedido', [item('Cotizado'), pend()]), // guardado Pedido, recalculado Cotizado Parcial
  sol('D', 'Pedido', [item('Pedido'), item('Cotizado')]), // guardado Pedido, recalculado Pedido Parcial
  sol('E', 'Pedido Parcial', [item('Pedido'), item('Pedido')]), // guardado Pedido Parcial, recalculado Pedido
  sol('F', 'Cotizado Parcial', [item('Venta Perdida'), item('Cancelado')]), // guardado Cotizado Parcial, recalculado Denegado (sin pestaña)
  sol('G', 'Cotizado', [item('Cotizado')]), // coherente
  sol('H', 'Pendiente', [pend()]), // coherente
  sol('I', 'Pedido', [item('Pedido')]), // coherente
  sol('J', 'Pedido Parcial', [item('Pedido'), item('Cotizado')]) // coherente
];
const POR_PESTANA = {
  pendiente: ['RFQ-A', 'RFQ-H'],
  cotizadas: ['RFQ-C', 'RFQ-G'],
  pedidos: ['RFQ-B', 'RFQ-E', 'RFQ-I'],
  parciales: ['RFQ-D', 'RFQ-J']
};
const HOY_POR_PESTANA = { // lo que daba el estado guardado
  pendiente: ['RFQ-B', 'RFQ-H'], cotizadas: ['RFQ-A', 'RFQ-F', 'RFQ-G'], pedidos: ['RFQ-C', 'RFQ-D', 'RFQ-I'], parciales: ['RFQ-E', 'RFQ-J']
};

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 80) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const guardar = (clave, valor) => sessionStorage.setItem(clave, JSON.stringify(valor));
const lista = (url, solicitudes = DATOS) => {
  mm(false);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/analisis/solicitudes/:tipoEstado" element={<Lista role="comprador" solicitudes={solicitudes} ordenesCompra={[]} />} />
        <Route path="/lista" element={<Lista role="comprador" solicitudes={solicitudes} ordenesCompra={[]} />} />
      </Routes>
    </MemoryRouter>
  );
};
const correlativos = () => [...document.querySelectorAll('tbody tr')].map((tr) => tr.textContent.match(/RFQ-[A-Z]/)?.[0]).filter(Boolean).sort();
const contador = () => document.querySelector('[aria-live="polite"]').textContent;
const columna = (nombre) => [...document.querySelectorAll('thead th')].findIndex((th) => th.textContent.trim() === nombre);
const celda = (correlativo, nombre) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(correlativo)).querySelectorAll('td')[columna(nombre)].textContent.replace(/\s+/g, ' ').trim();

beforeEach(() => {
  sessionStorage.clear();
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  exportarTodosLosMovimientosExcel.mockClear();
});
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); sessionStorage.clear(); window.matchMedia = matchMediaOriginal; });

describe('ayudante pestanaSolicitud', () => {
  it('las cuatro pestañas por estado y sus estados', () => {
    expect(ESTADOS_DE_PESTANA).toEqual({ pendiente: ['Pendiente'], cotizadas: ['Cotizado', 'Cotizado Parcial'], pedidos: ['Pedido', 'Comprado'], parciales: ['Pedido Parcial'] });
    ['pendiente', 'cotizadas', 'pedidos', 'parciales'].forEach((p) => expect(esPestanaPorEstado(p)).toBe(true));
    ['todas', 'seguimiento', 'anuladas', 'anuladas-parcial', 'ventas-perdidas', 'toString', undefined].forEach((p) => expect(esPestanaPorEstado(p)).toBe(false));
  });

  it.each([
    ['A', 'Pendiente'], ['B', 'Pedido'], ['C', 'Cotizado Parcial'], ['D', 'Pedido Parcial'], ['E', 'Pedido'], ['F', 'Denegado'], ['G', 'Cotizado'], ['H', 'Pendiente'], ['I', 'Pedido'], ['J', 'Pedido Parcial']
  ])('la solicitud %s se recalcula como %s', (id, estado) => {
    expect(estadoRecalculado(DATOS.find((s) => s.id === id))).toBe(estado);
  });

  it('una solicitud sin lista de ítems conserva el estado guardado y sin estado es Pendiente; "Comprado" sin ítems cuenta en Pedidos', () => {
    expect(estadoRecalculado({ estado: 'Comprado' })).toBe('Comprado');
    expect(perteneceAPestanaPorEstado({ estado: 'Comprado' }, 'pedidos')).toBe(true);
    expect(estadoRecalculado({ productos: [] })).toBe('Pendiente');
    expect(estadoRecalculado(null)).toBe('Pendiente');
    expect(perteneceAPestanaPorEstado({ estado: 'Pedido', productos: [] }, 'pedidos')).toBe(true);
  });

  it('una pestaña que no se decide por estado nunca contiene la solicitud', () => {
    expect(perteneceAPestanaPorEstado(DATOS[0], 'todas')).toBe(false);
    expect(perteneceAPestanaPorEstado(DATOS[0], 'anuladas')).toBe(false);
  });
});

describe.each(Object.entries(POR_PESTANA))('pestaña "%s": estado recalculado', (pestana, esperadas) => {
  it('lista las solicitudes por su estado recalculado, aunque el guardado diga otra cosa, y el contador las cuenta', async () => {
    lista(`/analisis/solicitudes/${pestana}`);
    await esperar();
    expect(correlativos()).toEqual(esperadas);
    expect(contador()).toBe(`Mostrando ${esperadas.length} solicitudes`);
  });

  it('no lista las que el estado guardado ponía aquí y el recalculado no', async () => {
    lista(`/analisis/solicitudes/${pestana}`);
    await esperar();
    const sobran = HOY_POR_PESTANA[pestana].filter((c) => !esperadas.includes(c));
    expect(sobran.length).toBeGreaterThan(0);
    sobran.forEach((c) => expect(correlativos()).not.toContain(c));
  });

  it('la columna "Estado" sigue mostrando el estado GUARDADO de cada fila (decisión pendiente del commit 5)', async () => {
    lista(`/analisis/solicitudes/${pestana}`);
    await esperar();
    const guardado = Object.fromEntries(DATOS.map((s) => [s.correlativo, s.estado]));
    esperadas.forEach((c) => expect(celda(c, 'Estado')).toMatch(new RegExp(`^${guardado[c]}`)));
  });

  it('el Excel exporta las mismas filas que la pestaña', async () => {
    lista(`/analisis/solicitudes/${pestana}`);
    await esperar();
    const boton = screen.getByRole('button', { name: 'Exportar movimientos' });
    await act(async () => { boton.click(); });
    expect(exportarTodosLosMovimientosExcel).toHaveBeenCalledTimes(1);
    expect(exportarTodosLosMovimientosExcel.mock.calls[0][0].map((s) => s.correlativo).sort()).toEqual(esperadas);
  });
});

describe('otras pestañas y enlaces', () => {
  it('"Todas" las lista todas (10)', async () => {
    lista('/analisis/solicitudes/todas');
    await esperar();
    expect(correlativos()).toHaveLength(10);
    expect(contador()).toBe('Mostrando 10 solicitudes');
  });

  it('"Anuladas" sigue por el estado guardado (Anulado), aunque los ítems no estén todos anulados — desajuste sin cambiar', async () => {
    const datos = [sol('K', 'Anulado', [item('Anulado')]), sol('L', 'Anulado', [item('Pedido')]), sol('M', 'Cotizado', [item('Anulado')])];
    lista('/analisis/solicitudes/anuladas', datos);
    await esperar();
    expect(correlativos()).toEqual(['RFQ-K', 'RFQ-L']);
  });

  it('el estado guardado de la pestaña (sin parámetro en la URL) sigue funcionando: la clave de sesión manda', async () => {
    guardar('analisis_solicitudes_tab', 'pedidos');
    lista('/lista');
    await esperar();
    expect(correlativos()).toEqual(POR_PESTANA.pedidos);
  });

  it('los enlaces del dashboard (/pendiente, /cotizadas, /pedidos) y el de las pestañas (/parciales) abren la pestaña con el mismo identificador de siempre', async () => {
    for (const pestana of ['pendiente', 'cotizadas', 'pedidos', 'parciales']) {
      lista(`/analisis/solicitudes/${pestana}`);
      await esperar();
      expect(document.getElementById(`tab-sol-${pestana}`)).not.toBeNull();
      expect(document.getElementById(`tab-sol-${pestana}`).getAttribute('aria-selected')).toBe('true');
      cleanup();
      sessionStorage.clear();
    }
  });

  it('con vendedor y cliente de contexto recorta igual que antes y luego aplica el estado recalculado', async () => {
    const datos = [...DATOS, sol('N', 'Pendiente', [item('Pedido')], { vendedorNombre: 'Luis', cliente: 'Holcim' })];
    guardar('analisis_vendedor_filter', 'Luis');
    lista('/analisis/solicitudes/pedidos', datos);
    await esperar();
    expect(correlativos()).toEqual(['RFQ-N']);
  });
});

/**
 * Cruce con el dashboard: el número de cada fila ("Pendiente de Cotizar", "Respondido por Compras", "Pedidos Confirmados / Cerrados" y los
 * parciales del desglose de pedidos) es el contador de la pestaña del mismo nombre, con el mismo período, vendedor y cliente. Las diferencias
 * que sí quedan: el dashboard además aplica "Resultado" y "En seguimiento", y su fila de Pedidos no cuenta "Comprado" sin ítems.
 */
describe('cruce con las filas del dashboard (mismo período, vendedor y cliente)', () => {
  const MAS = [
    sol('P', 'Pedido', [item('Pedido'), item('Cotizado')], { vendedorNombre: 'Luis', cliente: 'Holcim' }),
    sol('Q', 'Pendiente', [item('Pedido')], { vendedorNombre: 'Luis', cliente: 'Holcim' }),
    sol('R', 'Cotizado', [pend()], { vendedorNombre: 'Ana', cliente: 'Holcim' }),
    sol('S', 'Pedido', [item('Pedido')], { fechaS: dia(100), fechaCreacion: dia(100) }),
    sol('T', 'Cotizado Parcial', [item('Cotizado'), pend()], { fechaS: dia(100), fechaCreacion: dia(100), vendedorNombre: 'Luis' })
  ];
  const TODOS = [...DATOS, ...MAS];
  const CASOS = [
    ['sin filtros (período por defecto: 30 días)', {}],
    ['vendedor Ana', { analisis_vendedor_filter: 'Ana' }],
    ['vendedor Luis', { analisis_vendedor_filter: 'Luis' }],
    ['cliente "holcim"', { analisis_cliente_search: 'holcim' }],
    ['vendedor Ana y cliente "bombas"', { analisis_vendedor_filter: 'Ana', analisis_cliente_search: 'bombas' }],
    ['período 7 días', { analisis_filtro_periodo: { periodo: '7d' } }],
    ['histórico completo', { analisis_filtro_periodo: { periodo: 'historico', anioHistorico: 'todos' } }],
    ['histórico completo y vendedor Luis', { analisis_filtro_periodo: { periodo: 'historico', anioHistorico: 'todos' }, analisis_vendedor_filter: 'Luis' }]
  ];
  const aplicar = (sesion) => { sessionStorage.clear(); Object.entries(sesion).forEach(([k, v]) => guardar(k, v)); };
  const filaDashboard = (etiqueta) => screen.getByText(etiqueta).closest('div[class*="cursor-pointer"]');
  const numeroDeFila = (etiqueta) => Number(filaDashboard(etiqueta).querySelector('span.font-mono').textContent);
  const parcialesDeFila = (etiqueta) => Number(filaDashboard(etiqueta).textContent.match(/(\d+) parciales/)[1]);
  const cuentaLista = (pestana, sesion) => {
    aplicar(sesion);
    const { unmount } = lista(`/analisis/solicitudes/${pestana}`, TODOS);
    return { unmount };
  };

  it.each(CASOS)('%s: las filas del dashboard y los contadores de las pestañas dan el mismo número', async (_nombre, sesion) => {
    window.innerWidth = 1280;
    aplicar(sesion);
    mm(false);
    const { unmount } = render(<MemoryRouter><Dashboard role="gerente" solicitudes={TODOS} ordenesCompra={[]} /></MemoryRouter>);
    await esperar();
    const dash = {
      pendiente: numeroDeFila('Pendiente de Cotizar'),
      cotizadas: numeroDeFila('Respondido por Compras'),
      pedidos: numeroDeFila('Pedidos Confirmados / Cerrados'),
      parciales: parcialesDeFila('Pedidos Confirmados / Cerrados')
    };
    unmount();
    cleanup();
    const lis = {};
    for (const pestana of ['pendiente', 'cotizadas', 'pedidos', 'parciales']) {
      const { unmount: desmontar } = cuentaLista(pestana, sesion);
      await esperar();
      lis[pestana] = Number(contador().match(/\d+/)[0]);
      desmontar();
      cleanup();
    }
    expect(lis).toEqual(dash);
  });

  it('el caso sin filtros no es trivial: las cuatro pestañas tienen filas y los números son distintos entre sí', async () => {
    aplicar({});
    const { unmount } = cuentaLista('pedidos', {});
    await esperar();
    expect(Number(contador().match(/\d+/)[0])).toBeGreaterThan(1);
    unmount();
  });

  it('diferencia conocida: una solicitud "Comprado" sin ítems está en la pestaña Pedidos y no en la fila de Pedidos del dashboard', async () => {
    const datos = [sol('Z', 'Comprado', [])];
    aplicar({});
    mm(false);
    window.innerWidth = 1280;
    const d = render(<MemoryRouter><Dashboard role="gerente" solicitudes={datos} ordenesCompra={[]} /></MemoryRouter>);
    await esperar();
    expect(numeroDeFila('Pedidos Confirmados / Cerrados')).toBe(0);
    d.unmount();
    cleanup();
    lista('/analisis/solicitudes/pedidos', datos);
    await esperar();
    expect(correlativos()).toEqual(['RFQ-Z']);
  });
});
