// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'u1', email: 'yo@hermaco.net' } }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}) }));
vi.mock('../../utils/exportarExcel', () => ({ exportarTodosLosMovimientosExcel: vi.fn() }));

import { AnalisisEstadisticas as Vista } from './AnalisisEstadisticas';
import { exportarTodosLosMovimientosExcel } from '../../utils/exportarExcel';
import { RESULTADOS_SOLICITUD } from '../../utils/clasificarSolicitud';
import { FASES_SEGUIMIENTO } from '../../utils/faseSeguimiento';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';
import { cargarFiltroPeriodoStorage, PERIODO_POR_DEFECTO } from '../../utils/dateValidation';

/**
 * Lógica de filtrado de Análisis y Estadísticas (período, vendedor, cliente, resultado, seguimiento, rango e histórico).
 * La fecha está congelada para que los datos y los resultados esperados no dependan del día en que se corra.
 * GOLD son los conteos que daba la pantalla ANTES de migrarla a la barra de filtros (medidos con la versión anterior del archivo).
 */
const HOY = new Date('2026-06-15T18:00:00Z');
const VEND = ['Carlos Rivera Hernández de la Cruz', 'Ana Martínez', 'Luis Pérez'];
const ESTADOS = ['Pendiente', 'Cotizado', 'Pedido', 'Pedido Parcial'];
const dia = (n) => new Date(HOY.getTime() - n * 86400000);
const iso = (n) => dia(n).toISOString().slice(0, 10);
const SOL = Array.from({ length: 60 }, (_, i) => ({
  id: `s${i}`, correlativo: `RFQ-${String(i + 1).padStart(4, '0')}`, cliente: i % 4 === 0 ? 'Bombas del Sur' : `Cliente ${i}`, estado: ESTADOS[i % 4],
  vendedorNombre: VEND[i % 3], vendedorEmail: `v${i % 3}@hermaco.net`, vendedorId: `x${i % 3}`, tipo: 'Aéreo',
  fechaS: dia((i * 7) % 420), fechaCreacion: dia((i * 7) % 420),
  productos: [{ desc: i % 5 === 0 ? 'bomba centrífuga' : 'válvula', marca: 'X', cantidad: 2, estadoItem: ESTADOS[i % 4] === 'Pedido' ? 'Pedido' : 'Cotizado', precio: 100 }]
}));
const RES = Object.values(RESULTADOS_SOLICITUD);
const FASE = Object.keys(FASES_SEGUIMIENTO)[0];
const ANIO = HOY.getUTCFullYear();

const ESCENARIOS = [
  ['30d por defecto', {}],
  ['7d', { periodo: '7d' }],
  ['este año', { periodo: 'this_year' }],
  ['90d + Ana', { periodo: '90d', analisis_vendedor_filter: 'Ana Martínez' }],
  ['histórico todos', { periodo: 'historico', anio: 'todos' }],
  ['histórico año actual', { periodo: 'historico', anio: ANIO }],
  ['rango', { periodo: 'custom', rango: [iso(120), iso(20)] }],
  ['rango solo desde', { periodo: 'custom', rango: [iso(60), ''] }],
  ['cliente bomba (hist.)', { periodo: 'historico', anio: 'todos', analisis_cliente_search: 'bomba' }],
  ['resultado (hist.)', { periodo: 'historico', anio: 'todos', analisis_resultado_filter: RES[0] }],
  ['seguimiento todas (hist.)', { periodo: 'historico', anio: 'todos', analisis_seguimiento_filter: 'todas' }],
  ['seguimiento fase (hist.)', { periodo: 'historico', anio: 'todos', analisis_seguimiento_filter: FASE }],
  ['combo', { periodo: 'custom', rango: [iso(300), iso(5)], analisis_vendedor_filter: 'Luis Pérez', analisis_cliente_search: 'cliente 1', analisis_resultado_filter: RES[0] }]
];
const GOLD = {
  '30d por defecto': 5,
  '7d': 2,
  'este año': 24,
  '90d + Ana': 4,
  'histórico todos': 60,
  'histórico año actual': 24,
  'rango': 15,
  'rango solo desde': 9,
  'cliente bomba (hist.)': 15,
  'resultado (hist.)': 60,
  'seguimiento todas (hist.)': 44,
  'seguimiento fase (hist.)': 0,
  'combo': 3,
};

const mm = (m) => { window.matchMedia = () => ({ matches: m, addEventListener() {}, removeEventListener() {} }); };
const montar = (role, preset = {}, solicitudes = SOL) => {
  sessionStorage.clear();
  const { periodo, rango, anio, ...resto } = preset;
  if (periodo) sessionStorage.setItem('analisis_filtro_periodo', JSON.stringify({ periodo, fechaInicio: rango?.[0] || '', fechaFin: rango?.[1] || '', anioHistorico: anio ?? null }));
  Object.entries(resto).forEach(([k, v]) => sessionStorage.setItem(k, JSON.stringify(v)));
  return render(<MemoryRouter><Vista role={role} solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>);
};
const contar = (c) => {
  const a = c.querySelector('span[aria-live]');
  if (a) return Number(a.textContent.match(/\d+/)[0]);
  const v = c.querySelector('div.ml-auto.hidden strong');
  if (v) return Number(v.textContent);
  const p = [...c.querySelectorAll('p')].find((x) => /solicitudes?$/.test(x.textContent.trim()));
  return p ? Number(p.textContent.match(/\d+/)[0]) : null;
};
const guardado = (k) => JSON.parse(sessionStorage.getItem(k));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY);
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  window.innerWidth = 1280;
  mm(false);
});
afterEach(() => { cleanup(); sessionStorage.clear(); vi.useRealTimers(); });

describe('Análisis y Estadísticas: filtrado', () => {
  for (const rol of ['comprador', 'gerente', 'administrador']) {
    it(`las 13 combinaciones dan los mismos resultados que antes de la migración (${rol})`, () => {
      const vistos = {};
      for (const [nombre, preset] of ESCENARIOS) {
        const r = montar(rol, preset);
        vistos[nombre] = contar(r.container);
        cleanup();
      }
      expect(vistos).toEqual(GOLD);
    });
  }

  it('móvil (vendedor): mismos resultados que escritorio', () => {
    window.innerWidth = 400; mm(true);
    for (const [nombre, preset] of ESCENARIOS.slice(0, 8)) {
      const r = montar('vendedor', preset);
      expect(contar(r.container), nombre).toBe(GOLD[nombre]);
      cleanup();
    }
  });

  it('móvil: el período usa el mismo FiltroSegmentado y los mismos rótulos que escritorio (sin tira de píldoras)', () => {
    window.innerWidth = 400; mm(true);
    const { container } = montar('gerente', { periodo: 'this_year' });
    const grupo = screen.getByRole('group', { name: 'Período' });
    expect([...grupo.querySelectorAll('button:not([data-flecha])')].map((b) => b.textContent)).toEqual(['7D', '30D', 'Este Mes', '90D', 'Este Año', 'Rango', 'Histórico']);
    expect(container.querySelector('[id^="periodo-btn-"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    expect(screen.getByRole('dialog', { name: 'Rango de fechas' })).toBeTruthy();
    expect(guardado('analisis_filtro_periodo').periodo).toBe('this_year');
    fireEvent.click(screen.getByRole('button', { name: 'Histórico' }));
    expect(guardado('analisis_filtro_periodo').periodo).toBe('historico');
  });

  it('móvil: el período es un carrusel (no un desplegable): flechas con desbordamiento, opción activa a la vista y elegir una cambia la clave', () => {
    window.innerWidth = 400; mm(true);
    const ro = globalThis.ResizeObserver;
    const cw = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    const sw = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    globalThis.ResizeObserver = class { constructor(f) { this.f = f; } observe() { this.f(); } disconnect() {} };
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 336 });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 523 });
    try {
      const { container } = montar('gerente', { periodo: 'this_year' });
      expect(screen.queryByRole('combobox', { name: 'Período' })).toBeNull();
      const grupo = screen.getByRole('group', { name: 'Período' });
      expect(grupo.className).toContain('h-11');
      expect(grupo.className).toContain('bg-slate-100');
      const scroller = container.querySelector('[data-carrusel]');
      expect(scroller.className).toContain('[scrollbar-width:none]');
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'nearest', inline: 'center' });
      expect(container.querySelector('[data-flecha="der"]').getAttribute('data-visible')).toBe('true');
      expect(container.querySelector('[data-flecha="izq"]').getAttribute('data-visible')).toBe('false');
      fireEvent.click(screen.getByRole('button', { name: '90D' }));
      expect(guardado('analisis_filtro_periodo').periodo).toBe('90d');
      expect(screen.getByRole('button', { name: '90D' }).getAttribute('aria-pressed')).toBe('true');
    } finally {
      globalThis.ResizeObserver = ro;
      if (cw) Object.defineProperty(HTMLElement.prototype, 'clientWidth', cw); else delete HTMLElement.prototype.clientWidth;
      if (sw) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', sw); else delete HTMLElement.prototype.scrollWidth;
    }
  });

  it('cada filtro persiste en su clave analisis_*; el período en analisis_filtro_periodo', () => {
    const { container } = montar('gerente', { periodo: 'historico', anio: 'todos' });
    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por vendedor' }));
    fireEvent.click(screen.getByRole('option', { name: 'Ana Martínez' }));
    expect(guardado('analisis_vendedor_filter')).toBe('Ana Martínez');
    fireEvent.change(screen.getByLabelText('Filtrar por cliente'), { target: { value: 'bomba' } });
    expect(guardado('analisis_cliente_search')).toBe('bomba');
    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por resultado' }));
    fireEvent.click(screen.getByRole('option', { name: 'Completo' }));
    expect(guardado('analisis_resultado_filter')).not.toBe('');
    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por seguimiento de cliente' }));
    fireEvent.click(screen.getByRole('option', { name: 'En seguimiento (todas)' }));
    expect(guardado('analisis_seguimiento_filter')).toBe('todas');
    fireEvent.click(screen.getByRole('button', { name: '30D' }));
    expect(guardado('analisis_filtro_periodo').periodo).toBe('30d');
    fireEvent.click(screen.getByRole('button', { name: 'Histórico' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Año del histórico' }));
    fireEvent.click(screen.getByRole('option', { name: String(ANIO) }));
    expect(guardado('analisis_filtro_periodo').anioHistorico).toBe(ANIO);
    expect(container.querySelector('span[aria-live]').textContent).toMatch(/^\d+ solicitudes?$/);
  });

  it('al recargar, los filtros guardados se restauran con el mismo resultado', () => {
    const preset = ESCENARIOS[3][1];
    const a = montar('gerente', preset);
    const n = contar(a.container);
    cleanup();
    const b = render(<MemoryRouter><Vista role="gerente" solicitudes={SOL} ordenesCompra={[]} /></MemoryRouter>);
    expect(contar(b.container)).toBe(n);
    expect(screen.getByRole('combobox', { name: 'Filtrar por vendedor' }).textContent).toContain('Ana Martínez');
  });

  it('Limpiar vacía vendedor, cliente, resultado, seguimiento y fechas, y las claves guardadas', () => {
    montar('gerente', { periodo: 'custom', rango: [iso(120), iso(20)], analisis_vendedor_filter: 'Ana Martínez', analisis_cliente_search: 'bomba', analisis_resultado_filter: RES[0], analisis_seguimiento_filter: 'todas' });
    expect(screen.getByRole('button', { name: /^Limpiar filtros \(5 activos\)$/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Limpiar filtros/ }));
    for (const k of ['analisis_vendedor_filter', 'analisis_cliente_search', 'analisis_resultado_filter', 'analisis_seguimiento_filter']) expect(guardado(k)).toBe('');
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: '30d', fechaInicio: '', fechaFin: '' });
    expect(screen.queryByLabelText('Fecha desde')).toBeNull();
    expect(screen.getByRole('button', { name: '30D' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: /^Limpiar filtros/ })).toBeNull();
  });

  it('Exportar llama a la exportación y el contador usa singular y plural', () => {
    const { container } = montar('gerente', { periodo: 'historico', anio: 'todos' });
    fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
    expect(exportarTodosLosMovimientosExcel).toHaveBeenCalledTimes(1);
    cleanup();
    const una = montar('gerente', { periodo: 'historico', anio: 'todos' }, [SOL[1]]);
    expect(una.container.querySelector('span[aria-live]').textContent).toBe('1 solicitud');
    cleanup();
    const cero = montar('gerente', { periodo: 'historico', anio: 'todos', analisis_cliente_search: 'no-existe-xyz' });
    expect(cero.container.querySelector('span[aria-live]').textContent).toBe('0 solicitudes');
    expect(container).toBeTruthy();
  });
});

describe('Análisis y Estadísticas: rango de fechas (sesión)', () => {
  it('un rango guardado en la sesión filtra por ambos extremos y no hay campos de fecha en línea (el Rango se edita en el modal)', () => {
    window.innerWidth = 1280; mm(false);
    const { container } = montar('comprador', { periodo: 'custom', rango: [iso(120), iso(20)] });
    expect(contar(container)).toBe(GOLD.rango);
    expect(screen.queryByLabelText('Fecha desde')).toBeNull();
    expect(screen.queryByLabelText('Fecha hasta')).toBeNull();
  });
});

describe('Análisis y Estadísticas: Rango en un modal (móvil)', () => {
  const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
  const modal = () => screen.getByRole('dialog', { name: 'Rango de fechas' });
  // El calendario del modal parte del mes de la fecha de inicio guardada o, sin ella, del mes de hoy (junio de 2026 con la fecha congelada).
  const dia = (n) => within(modal()).getAllByRole('button').find((b) => b.hasAttribute('aria-pressed') && b.textContent === String(n));
  const resumen = () => modal().querySelector('[data-resumen-rango]').textContent;
  const aplicar = () => within(modal()).getByRole('button', { name: 'Aplicar' });
  const botonFiltros = () => screen.getByRole('button', { name: /^Filtros/ });
  const limpiar = () => within(screen.getByRole('region', { name: 'Filtros' })).queryByRole('button', { name: /^Limpiar filtros/ });
  const movil = (ancho = 400) => { window.innerWidth = ancho; mm(ancho < 768); };
  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 40));
    reiniciarCapasParaPruebas();
    delete globalThis.ResizeObserver;
    delete HTMLElement.prototype.offsetWidth;
    delete Element.prototype.clientWidth;
  });

  it('elegir Rango abre el modal y no cambia el período; Cancelar lo cierra sin cambiar nada', async () => {
    movil();
    montar('gerente', { periodo: 'this_year' });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(guardado('analisis_filtro_periodo').periodo).toBe('this_year');
    fireEvent.click(dia(1));
    expect(resumen()).toBe('01/06/2026 (un día)');
    fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }));
    await esperar(260);
    expect(screen.queryByRole('dialog', { name: 'Rango de fechas' })).toBeNull();
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: 'this_year', fechaInicio: '', fechaFin: '' });
  });

  it('Aplicar con fechas válidas cambia el período a Rango, guarda las fechas y muestra la línea corta', async () => {
    movil();
    const { container } = montar('gerente', { periodo: 'this_year' });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(aplicar().disabled).toBe(true);
    fireEvent.click(dia(1));
    fireEvent.click(dia(10));
    expect(resumen()).toBe('01/06/2026 — 10/06/2026');
    expect(aplicar().disabled).toBe(false);
    fireEvent.click(aplicar());
    await esperar(260);
    expect(screen.queryByRole('dialog', { name: 'Rango de fechas' })).toBeNull();
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: 'custom', fechaInicio: '2026-06-01', fechaFin: '2026-06-10' });
    expect(container.querySelector('[data-linea-fechas]').textContent).toBe('01/06 – 10/06');
  });

  it('la línea de fechas solo aparece con Rango activo', () => {
    movil();
    const a = montar('gerente', { periodo: 'this_year' });
    expect(a.container.querySelector('[data-linea-fechas]')).toBeNull();
    cleanup();
    const b = montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'] });
    expect(b.container.querySelector('[data-linea-fechas]').textContent).toBe('01/05 – 10/05');
  });

  it('un solo toque aplica ese único día (desde = hasta); un día futuro no se puede elegir', async () => {
    movil();
    const { container } = montar('gerente', { periodo: 'this_year' });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(resumen()).toBe('Elige un día o un rango');
    expect(aplicar().disabled).toBe(true);
    expect(dia(16).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(dia(16));
    expect(aplicar().disabled).toBe(true);
    fireEvent.click(dia(15));
    expect(resumen()).toBe('15/06/2026 (un día)');
    expect(within(modal()).getByText(/Se aplicará solo este día/)).toBeTruthy();
    expect(aplicar().disabled).toBe(false);
    fireEvent.click(aplicar());
    await esperar(260);
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: 'custom', fechaInicio: '2026-06-15', fechaFin: '2026-06-15' });
    expect(container.querySelector('[data-linea-fechas]').textContent).toBe('15/06 – 15/06');
  });

  it('con Rango activo el modal abre con las fechas actuales; si no, con las últimas guardadas', async () => {
    movil();
    montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'] });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(resumen()).toBe('01/05/2026 — 10/05/2026');
    cleanup();
    await esperar(60);
    reiniciarCapasParaPruebas();
    montar('gerente', { periodo: '30d', rango: ['2026-04-01', '2026-04-20'] });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(resumen()).toBe('01/04/2026 — 20/04/2026');
  });

  it('reelegir Rango (ya activo) vuelve a abrir el modal; la opción activa no salta a Rango hasta Aplicar y Cancelar la deja donde estaba', async () => {
    movil();
    montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'] });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(modal()).toBeTruthy();
    expect(resumen()).toBe('01/05/2026 — 10/05/2026');
    fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }));
    await esperar(300);
    expect(screen.getByRole('button', { name: 'Rango' }).getAttribute('aria-pressed')).toBe('true');
    cleanup();
    await esperar(60);
    reiniciarCapasParaPruebas();
    montar('gerente', { periodo: '30d' });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(screen.getByRole('button', { name: '30D' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Rango' }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }));
    await esperar(300);
    expect(screen.getByRole('button', { name: '30D' }).getAttribute('aria-pressed')).toBe('true');
    expect(guardado('analisis_filtro_periodo').periodo).toBe('30d');
  });

  it('el botón atrás del teléfono, la X y Escape cierran sin cambiar nada', async () => {
    movil();
    montar('gerente', { periodo: 'this_year' });
    const abrir = async () => { fireEvent.click(screen.getByRole('button', { name: 'Rango' })); await esperar(); };
    await abrir();
    window.history.back();
    await esperar(300);
    expect(screen.queryByRole('dialog', { name: 'Rango de fechas' })).toBeNull();
    await abrir();
    fireEvent.click(within(modal()).getByRole('button', { name: 'Cerrar' }));
    await esperar(300);
    expect(screen.queryByRole('dialog', { name: 'Rango de fechas' })).toBeNull();
    await abrir();
    fireEvent.keyDown(document, { key: 'Escape' });
    await esperar(300);
    expect(screen.queryByRole('dialog', { name: 'Rango de fechas' })).toBeNull();
    expect(guardado('analisis_filtro_periodo').periodo).toBe('this_year');
  });

  it('"Filtros (N)" no cuenta las fechas del rango pero Limpiar sí; Limpiar vacía las fechas, vuelve a 30D y el distintivo desaparece', async () => {
    movil();
    montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'] });
    expect(botonFiltros().textContent).toBe('Filtros');
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
    fireEvent.click(botonFiltros());
    await esperar();
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: 'Filtrar por rango de fechas' })).toBeNull();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Ver / }));
    await esperar(300);
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: '30d', fechaInicio: '', fechaFin: '' });
    expect(limpiar()).toBeNull();
  });

  it('entre 768 y 1023 px el modal sigue al layout móvil (no hay FiltroFechas en línea)', async () => {
    movil(800);
    const { container } = montar('gerente', { periodo: 'this_year' });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(modal()).toBeTruthy();
    fireEvent.click(dia(1));
    fireEvent.click(dia(10));
    fireEvent.click(aplicar());
    await esperar(300);
    expect(screen.queryByLabelText('Fecha desde')).toBeNull();
    expect(container.querySelector('[data-linea-fechas]').textContent).toBe('01/06 – 10/06');
  });

  // (las pruebas de escritorio del modal están en el describe de «Rango en escritorio»)
});

describe('Análisis y Estadísticas: Limpiar desde Rango, red de seguridad y etiqueta de fechas', () => {
  const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
  const movil = () => { window.innerWidth = 400; mm(true); };
  const limpiar = () => within(screen.getByRole('region', { name: 'Filtros' })).queryByRole('button', { name: /^Limpiar filtros/ });
  const etiqueta = (container) => container.querySelector('[data-linea-fechas]');
  afterEach(async () => { await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); });

  it('Limpiar con Rango vacía las fechas, vuelve a 30D (por la constante compartida), quita la etiqueta y deja el carrusel en 30D', async () => {
    movil();
    const { container } = montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'] });
    expect(PERIODO_POR_DEFECTO).toBe('30d');
    expect(screen.getByRole('button', { name: 'Rango' }).getAttribute('aria-pressed')).toBe('true');
    expect(etiqueta(container)).toBeTruthy();
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: PERIODO_POR_DEFECTO, fechaInicio: '', fechaFin: '' });
    expect(screen.getByRole('button', { name: '30D' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Rango' }).getAttribute('aria-pressed')).toBe('false');
    expect(etiqueta(container)).toBeNull();
    expect(limpiar()).toBeNull();
  });

  it('Limpiar con otro período (aunque haya otros filtros) no cambia el período', async () => {
    movil();
    montar('gerente', { periodo: 'this_year', analisis_cliente_search: 'bomba' });
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (1)');
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_filtro_periodo').periodo).toBe('this_year');
    expect(guardado('analisis_cliente_search')).toBe('');
    expect(screen.getByRole('button', { name: 'Este Año' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('Limpiar con Rango y otro filtro: vuelve a 30D y el distintivo cuenta solo lo que queda hasta que también se vacía', async () => {
    movil();
    montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'], analisis_cliente_search: 'bomba' });
    expect(limpiar().getAttribute('aria-label')).toBe('Limpiar filtros (2)');
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_cliente_search')).toBe('');
    expect(limpiar()).toBeNull();
  });

  it('una sesión con Rango sin ninguna fecha carga en el período por defecto (no como un Rango vacío)', () => {
    movil();
    const { container } = montar('gerente', { periodo: 'custom', rango: ['', ''] });
    expect(screen.getByRole('button', { name: '30D' }).getAttribute('aria-pressed')).toBe('true');
    expect(etiqueta(container)).toBeNull();
    expect(guardado('analisis_filtro_periodo').periodo).toBe('30d');
  });

  it('cargarFiltroPeriodoStorage: custom sin fechas vuelve al por defecto; con una sola fecha sigue siendo Rango; otros períodos no cambian', () => {
    const guardar = (valor) => sessionStorage.setItem('analisis_filtro_periodo', JSON.stringify(valor));
    guardar({ periodo: 'custom', fechaInicio: '', fechaFin: '' });
    expect(cargarFiltroPeriodoStorage().periodo).toBe(PERIODO_POR_DEFECTO);
    guardar({ periodo: 'custom', fechaInicio: '2026-05-01', fechaFin: '' });
    expect(cargarFiltroPeriodoStorage()).toMatchObject({ periodo: 'custom', fechaInicio: '2026-05-01' });
    guardar({ periodo: 'custom', fechaInicio: '', fechaFin: '2026-05-10' });
    expect(cargarFiltroPeriodoStorage()).toMatchObject({ periodo: 'custom', fechaFin: '2026-05-10' });
    guardar({ periodo: 'this_year', fechaInicio: '', fechaFin: '' });
    expect(cargarFiltroPeriodoStorage().periodo).toBe('this_year');
    sessionStorage.clear();
    expect(cargarFiltroPeriodoStorage().periodo).toBe(PERIODO_POR_DEFECTO);
  });

  it('la etiqueta de fechas aparece solo con Rango en móvil, con los tres formatos', () => {
    movil();
    const a = montar('gerente', { periodo: 'this_year' });
    expect(etiqueta(a.container)).toBeNull();
    cleanup();
    const b = montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'] });
    expect(etiqueta(b.container).textContent).toBe('01/05 – 10/05');
    cleanup();
    const c = montar('gerente', { periodo: 'custom', rango: ['2026-05-01', ''] });
    expect(etiqueta(c.container).textContent).toBe('Desde 01/05');
    cleanup();
    const d = montar('gerente', { periodo: 'custom', rango: ['', '2026-05-05'] });
    expect(etiqueta(d.container).textContent).toBe('Hasta 05/05');
  });

  it('la etiqueta usa Etiqueta (tono apagado, compacta, icono) y es un botón con nombre accesible y área de toque ampliada', () => {
    movil();
    const { container } = montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'] });
    const boton = etiqueta(container);
    expect(boton.tagName).toBe('BUTTON');
    expect(boton.getAttribute('aria-label')).toBe('Editar fechas del rango');
    expect(boton.className).toContain('before:-bottom-4');
    expect(boton.className).toContain('mt-1');
    const chip = boton.querySelector('span');
    expect(chip.className).toContain('bg-tag-apagado-soft');
    expect(chip.className).toContain('h-6');
    expect(chip.querySelector('svg')).toBeTruthy();
  });

  it('tocar la etiqueta abre el modal de Rango prellenado y Cancelar no cambia nada', async () => {
    movil();
    montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'] });
    fireEvent.click(screen.getByRole('button', { name: 'Editar fechas del rango' }));
    await esperar();
    const modal = screen.getByRole('dialog', { name: 'Rango de fechas' });
    expect(modal.querySelector('[data-resumen-rango]').textContent).toBe('01/05/2026 — 10/05/2026');
    fireEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    await esperar(300);
    expect(screen.queryByRole('dialog', { name: 'Rango de fechas' })).toBeNull();
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: 'custom', fechaInicio: '2026-05-01', fechaFin: '2026-05-10' });
  });
});

describe('Análisis y Estadísticas: Rango en escritorio (mismo modal que en móvil)', () => {
  const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
  const escritorio = (ancho = 1280) => { window.innerWidth = ancho; mm(false); };
  const modal = () => screen.getByRole('dialog', { name: 'Rango de fechas' });
  const dia = (n) => within(modal()).getAllByRole('button').find((b) => b.hasAttribute('aria-pressed') && b.textContent === String(n));
  const resumen = () => modal().querySelector('[data-resumen-rango]').textContent;
  const etiqueta = (container) => container.querySelector('[data-linea-fechas]');
  const limpiar = () => within(screen.getByRole('region', { name: 'Filtros' })).queryByRole('button', { name: /^Limpiar filtros/ });
  afterEach(async () => { await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); });

  it('elegir Rango abre el modal, no cambia el período hasta Aplicar y no hay campos de fecha en línea', async () => {
    escritorio();
    montar('gerente', { periodo: 'this_year' });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(modal()).toBeTruthy();
    expect(guardado('analisis_filtro_periodo').periodo).toBe('this_year');
    expect(screen.getByRole('button', { name: 'Este Año' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByLabelText('Fecha desde')).toBeNull();
    fireEvent.click(dia(1));
    fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }));
    await esperar(300);
    expect(screen.queryByRole('dialog', { name: 'Rango de fechas' })).toBeNull();
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: 'this_year', fechaInicio: '', fechaFin: '' });
  });

  it('Aplicar guarda las fechas, pasa a Rango y muestra la etiqueta junto al segmentado; con un día aplica desde = hasta', async () => {
    escritorio();
    const { container } = montar('gerente', { periodo: 'this_year' });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(within(modal()).getByRole('button', { name: 'Aplicar' }).disabled).toBe(true);
    fireEvent.click(dia(1));
    fireEvent.click(dia(10));
    fireEvent.click(within(modal()).getByRole('button', { name: 'Aplicar' }));
    await esperar(300);
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: 'custom', fechaInicio: '2026-06-01', fechaFin: '2026-06-10' });
    expect(screen.getByRole('button', { name: 'Rango' }).getAttribute('aria-pressed')).toBe('true');
    expect(etiqueta(container).textContent).toBe('01/06 – 10/06');
    // la etiqueta está en la cabecera, en el mismo contenedor que el segmentado
    expect(etiqueta(container).parentElement).toBe(screen.getByRole('group', { name: 'Período' }).parentElement);
    fireEvent.click(etiqueta(container));
    await esperar();
    fireEvent.click(dia(5));
    fireEvent.click(within(modal()).getByRole('button', { name: 'Aplicar' }));
    await esperar(300);
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: 'custom', fechaInicio: '2026-06-05', fechaFin: '2026-06-05' });
    expect(etiqueta(container).textContent).toBe('05/06 – 05/06');
  });

  it('la etiqueta abre el modal prellenado y Cancelar no cambia nada; reelegir Rango (ya activo) también lo abre', async () => {
    escritorio();
    const { container } = montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'] });
    expect(etiqueta(container).getAttribute('aria-label')).toBe('Editar fechas del rango');
    fireEvent.click(etiqueta(container));
    await esperar();
    expect(resumen()).toBe('01/05/2026 — 10/05/2026');
    fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }));
    await esperar(300);
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(resumen()).toBe('01/05/2026 — 10/05/2026');
    fireEvent.keyDown(document, { key: 'Escape' });
    await esperar(300);
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: 'custom', fechaInicio: '2026-05-01', fechaFin: '2026-05-10' });
  });

  it('el botón atrás y la X cierran el modal sin cambiar nada', async () => {
    escritorio();
    montar('gerente', { periodo: 'this_year' });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    window.history.back();
    await esperar(300);
    expect(screen.queryByRole('dialog', { name: 'Rango de fechas' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    fireEvent.click(within(modal()).getByRole('button', { name: 'Cerrar' }));
    await esperar(300);
    expect(screen.queryByRole('dialog', { name: 'Rango de fechas' })).toBeNull();
    expect(guardado('analisis_filtro_periodo').periodo).toBe('this_year');
  });

  it('los días posteriores a hoy no se eligen', async () => {
    escritorio();
    montar('gerente', { periodo: 'this_year' });
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(dia(16).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(dia(16));
    expect(within(modal()).getByRole('button', { name: 'Aplicar' }).disabled).toBe(true);
  });

  it('Limpiar desde Rango vuelve a 30D, quita la etiqueta y Limpiar cuenta bien: fechas + cliente = 2', async () => {
    escritorio();
    const { container } = montar('gerente', { periodo: 'custom', rango: ['2026-05-01', '2026-05-10'], analisis_cliente_search: 'bomba' });
    expect(screen.getByRole('button', { name: /^Limpiar filtros \(2 activos\)$/ })).toBeTruthy();
    fireEvent.click(limpiar());
    await esperar();
    expect(guardado('analisis_filtro_periodo')).toMatchObject({ periodo: '30d', fechaInicio: '', fechaFin: '' });
    expect(screen.getByRole('button', { name: '30D' }).getAttribute('aria-pressed')).toBe('true');
    expect(etiqueta(container)).toBeNull();
    expect(limpiar()).toBeNull();
  });

  it('sin Rango no hay etiqueta, y a 1024 px (límite del layout móvil) el escritorio usa también el modal', async () => {
    escritorio(1024);
    const { container } = montar('gerente', { periodo: 'this_year' });
    expect(etiqueta(container)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
    await esperar();
    expect(modal()).toBeTruthy();
  });
});

describe('Análisis y Estadísticas: foco del modal de Rango', () => {
  const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
  afterEach(async () => { await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); });

  it('al abrir el modal el foco queda en el día seleccionado, y al cerrar vuelve al botón Rango del selector (móvil y escritorio)', async () => {
    for (const ancho of [400, 1280]) {
      window.innerWidth = ancho; mm(ancho < 768);
      montar('gerente', { periodo: 'custom', rango: ['2026-05-03', '2026-05-06'] });
      const rango = screen.getByRole('button', { name: 'Rango' });
      rango.focus();
      fireEvent.click(rango);
      await esperar(100);
      expect(document.activeElement.getAttribute('data-dia')).toBe('2026-05-03');
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Rango de fechas' })).getByRole('button', { name: 'Cancelar' }));
      await esperar(320);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rango' }));
      cleanup();
      await esperar(60);
      reiniciarCapasParaPruebas();
    }
  });

  it('abierto desde la etiqueta de fechas, al cerrar el foco vuelve a la etiqueta', async () => {
    window.innerWidth = 1280; mm(false);
    const { container } = montar('gerente', { periodo: 'custom', rango: ['2026-05-03', '2026-05-06'] });
    const etiqueta = container.querySelector('[data-linea-fechas]');
    etiqueta.focus();
    fireEvent.click(etiqueta);
    await esperar(100);
    expect(document.activeElement.getAttribute('data-dia')).toBe('2026-05-03');
    fireEvent.keyDown(document, { key: 'Escape' });
    await esperar(320);
    expect(document.activeElement).toBe(container.querySelector('[data-linea-fechas]'));
  });
});
