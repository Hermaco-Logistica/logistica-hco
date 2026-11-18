// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../utils/exportarExcel', () => ({ exportarTodosLosMovimientosExcel: vi.fn() }));

import { DetalleSolicitudesAnalisis as Lista } from './DetalleSolicitudesAnalisis';
import { TITULO_ESTADO_SEGUN_ITEMS, estadoRecalculadoSiDifiere, textoEstadoSegunItems } from './utils/pestanaSolicitud';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';
import { exportarTodosLosMovimientosExcel } from '../../utils/exportarExcel';

/**
 * Indicador "Según ítems: X" bajo el Estado de la lista (F8c, commit 6): cuando el estado guardado de la solicitud difiere del recalculado que
 * decide su pestaña, la celda de Estado conserva el guardado y añade una línea pequeña con el recalculado. Solo en las cuatro pestañas por estado
 * y en "Todas"; nunca en las demás pestañas ni en el Excel.
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
const item = (estadoItem, extra = {}) => ({ desc: 'bomba', marca: 'X', cant: 1, estadoItem, precio: 10, fob: 10, ...extra });
const pend = () => item('Pendiente', { fob: 0, precio: 0 });
const sol = (id, estado, productos, extra = {}) => ({ id, correlativo: `RFQ-${id}`, cliente: 'Bombas del Sur', estado, vendedorNombre: 'Ana', tipo: 'RFQ', fechaS: dia(1), fechaCreacion: dia(1), productos, ...extra });
const DATOS = [
  sol('A', 'Cotizado', [pend(), pend()]), // guardado Cotizado, recalculado Pendiente (pestaña Pendientes)
  sol('B', 'Pendiente', [item('Pedido'), item('Pedido')]), // Pendiente → Pedido (Pedidos)
  sol('C', 'Pedido', [item('Cotizado'), pend()]), // Pedido → Cotizado Parcial (Cotizadas)
  sol('D', 'Pedido', [item('Pedido'), item('Cotizado')]), // Pedido → Pedido Parcial (Pedidos Parciales)
  sol('E', 'Pedido Parcial', [item('Pedido'), item('Pedido')]), // Pedido Parcial → Pedido (Pedidos)
  sol('F', 'Cotizado Parcial', [item('Venta Perdida'), item('Cancelado')]), // Cotizado Parcial → Denegado (solo en Todas)
  sol('G', 'Cotizado', [item('Cotizado')]), // coherente
  sol('H', 'Pendiente', [pend()]), // coherente
  sol('I', 'Pedido', [item('Pedido')]), // coherente
  sol('J', 'Pedido Parcial', [item('Pedido'), item('Cotizado')]), // coherente
  sol('K', 'Cotizado', [item('Cotizado'), pend()]) // Cotizado → Cotizado Parcial: mismo grupo de pestaña (Cotizadas): SIN indicador
];
const CON_INDICADOR = { A: 'Pendiente', B: 'Pedido', C: 'Cotizado Parcial', D: 'Pedido Parcial', E: 'Pedido', F: 'Denegado' }; // K no: mismo grupo
const POR_PESTANA = { pendiente: ['A', 'H'], cotizadas: ['C', 'G', 'K'], pedidos: ['B', 'E', 'I'], parciales: ['D', 'J'] };

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 80) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const lista = (pestana, solicitudes = DATOS, { movil = false } = {}) => {
  mm(movil);
  return render(
    <MemoryRouter initialEntries={[`/analisis/solicitudes/${pestana}`]}>
      <Routes><Route path="/analisis/solicitudes/:tipoEstado" element={<Lista role="comprador" solicitudes={solicitudes} ordenesCompra={[]} />} /></Routes>
    </MemoryRouter>
  );
};
const filaTabla = (id) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(`RFQ-${id}`));
const columna = (nombre) => [...document.querySelectorAll('thead th')].findIndex((th) => th.textContent.trim() === nombre);
const celdaEstado = (id) => filaTabla(id).querySelectorAll('td')[columna('Estado')];
const indicadorDe = (celda) => [...celda.querySelectorAll('span[title]')].find((e) => e.textContent.startsWith('Según ítems'));
const tarjetas = () => [...document.querySelectorAll('.md\\:hidden .surface')];
const tarjetaDe = (id) => tarjetas().find((t) => t.textContent.includes(`RFQ-${id}`));

beforeEach(() => {
  sessionStorage.clear();
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  exportarTodosLosMovimientosExcel.mockClear();
});
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); sessionStorage.clear(); window.matchMedia = matchMediaOriginal; });

describe('estadoRecalculadoSiDifiere', () => {
  it('devuelve el recalculado solo si difiere del guardado, en las cuatro pestañas por estado y en "Todas"', () => {
    Object.entries(CON_INDICADOR).forEach(([id, recalculado]) => {
      const s = DATOS.find((x) => x.id === id);
      ['pendiente', 'cotizadas', 'pedidos', 'parciales', 'todas'].forEach((p) => expect(estadoRecalculadoSiDifiere(s, p)).toBe(recalculado));
    });
    ['G', 'H', 'I', 'J'].forEach((id) => expect(estadoRecalculadoSiDifiere(DATOS.find((x) => x.id === id), 'todas')).toBeNull());
  });

  it('una diferencia dentro del mismo grupo de pestaña no se avisa: Cotizado ↔ Cotizado Parcial y Pedido ↔ Comprado', () => {
    expect(estadoRecalculadoSiDifiere(DATOS.find((x) => x.id === 'K'), 'cotizadas')).toBeNull(); // Cotizado → Cotizado Parcial
    expect(estadoRecalculadoSiDifiere(DATOS.find((x) => x.id === 'K'), 'todas')).toBeNull();
    expect(estadoRecalculadoSiDifiere(sol('Y', 'Cotizado Parcial', [item('Cotizado')]), 'cotizadas')).toBeNull(); // Cotizado Parcial → Cotizado
    expect(estadoRecalculadoSiDifiere({ estado: 'Pedido', productos: [] }, 'pedidos')).toBeNull();
    expect(estadoRecalculadoSiDifiere({ estado: 'Comprado', productos: [] }, 'pedidos')).toBeNull();
  });

  it('entre grupos distintos, o con un estado que ninguna pestaña agrupa, sí se avisa', () => {
    expect(estadoRecalculadoSiDifiere(sol('Y', 'Anulado', [item('Pedido')]), 'todas')).toBe('Pedido'); // sin grupo → pedidos
    expect(estadoRecalculadoSiDifiere(sol('Y', 'Denegado', [item('Venta Perdida')]), 'todas')).toBe('Venta Perdida'); // sin grupo → sin grupo, texto distinto
    expect(estadoRecalculadoSiDifiere(sol('Y', 'Pedido', [item('Venta Perdida')]), 'todas')).toBe('Venta Perdida'); // pedidos → sin grupo
    expect(estadoRecalculadoSiDifiere(sol('Y', 'Cotizado', [item('Pedido'), item('Cotizado')]), 'pedidos')).toBe('Pedido Parcial'); // cotizadas → parciales
  });

  it('nunca en las demás pestañas', () => {
    ['seguimiento', 'anuladas', 'anuladas-parcial', 'ventas-perdidas', 'otra', undefined].forEach((p) => expect(estadoRecalculadoSiDifiere(DATOS[0], p)).toBeNull());
  });

  it('una solicitud sin estado guardado se compara como Pendiente', () => {
    expect(estadoRecalculadoSiDifiere({ productos: [pend()] }, 'todas')).toBeNull();
    expect(estadoRecalculadoSiDifiere({ productos: [item('Pedido')] }, 'todas')).toBe('Pedido');
    expect(estadoRecalculadoSiDifiere(null, 'todas')).toBeNull();
  });

  it('el texto y el title', () => {
    expect(textoEstadoSegunItems('Pedido Parcial')).toBe('Según ítems: Pedido Parcial');
    expect(TITULO_ESTADO_SEGUN_ITEMS).toBe('El estado guardado no coincide con el que resulta de los ítems de la solicitud; las pestañas por estado usan el que resulta de los ítems.');
  });
});

describe.each(Object.entries(POR_PESTANA))('indicador en la pestaña "%s" (tabla)', (pestana, ids) => {
  it('las filas con estado guardado distinto llevan "Según ítems: X" bajo el guardado, y las coherentes no', async () => {
    lista(pestana);
    await esperar();
    ids.forEach((id) => {
      const celda = celdaEstado(id);
      const ind = indicadorDe(celda);
      if (CON_INDICADOR[id]) {
        expect(ind).toBeTruthy();
        expect(ind.textContent).toBe(`Según ítems: ${CON_INDICADOR[id]}`);
        expect(ind.getAttribute('title')).toBe(TITULO_ESTADO_SEGUN_ITEMS);
        expect(celda.textContent.startsWith(DATOS.find((s) => s.id === id).estado)).toBe(true);
      } else {
        expect(ind).toBeUndefined();
        expect(celda.textContent).not.toContain('Según ítems');
      }
    });
  });

  it('el estado guardado se sigue mostrando como etiqueta y el indicador va debajo, antes de la fase de seguimiento', async () => {
    lista(pestana);
    await esperar();
    const id = ids.find((x) => CON_INDICADOR[x]);
    const hijos = [...celdaEstado(id).firstElementChild.children];
    expect(hijos[0].textContent).toBe(DATOS.find((s) => s.id === id).estado);
    expect(hijos[1].textContent).toBe(`Según ítems: ${CON_INDICADOR[id]}`);
  });
});

describe('indicador en "Todas"', () => {
  it('lo llevan las 6 solicitudes con estado de otro grupo de la primera página (incluida F, que no está en ninguna pestaña por estado) y ninguna de las 4 coherentes', async () => {
    const diez = DATOS.filter((x) => x.id !== 'K'); // la lista pagina de 10 en 10
    lista('todas', diez);
    await esperar();
    diez.forEach((s) => {
      const ind = indicadorDe(celdaEstado(s.id));
      if (CON_INDICADOR[s.id]) expect(ind?.textContent).toBe(`Según ítems: ${CON_INDICADOR[s.id]}`);
      else expect(ind).toBeUndefined();
    });
    expect([...document.querySelectorAll('tbody span')].filter((e) => e.textContent.startsWith('Según ítems')).length).toBe(6);
  });
});

describe('mismo grupo de pestaña: sin indicador', () => {
  it('K (guardado Cotizado, recalculado Cotizado Parcial) está en Cotizadas y en Todas sin indicador', async () => {
    lista('cotizadas');
    await esperar();
    expect(filaTabla('K')).toBeTruthy();
    expect(indicadorDe(celdaEstado('K'))).toBeUndefined();
    cleanup();
    lista('todas', [DATOS.find((x) => x.id === 'K')]);
    await esperar();
    expect(indicadorDe(celdaEstado('K'))).toBeUndefined();
  });

  it('móvil: tampoco', async () => {
    lista('cotizadas', DATOS, { movil: true });
    await esperar();
    expect(tarjetaDe('K').textContent).not.toContain('Según ítems');
    expect(tarjetaDe('C').textContent).toContain('Según ítems: Cotizado Parcial'); // C viene de Pedido: otro grupo
  });
});

describe('sin indicador en las demás pestañas', () => {
  it.each(['seguimiento', 'anuladas', 'anuladas-parcial', 'ventas-perdidas'])('"%s" no lo lleva aunque haya solicitudes con estado distinto', async (pestana) => {
    const datos = [sol('X', 'Anulado', [item('Pedido')]), sol('Y', 'Cotizado', [item('Anulado'), item('Pedido')]), sol('Z', 'Cotizado', [item('Venta Perdida'), item('Cotizado')]), ...DATOS];
    lista(pestana, datos);
    await esperar();
    expect(document.body.textContent).not.toContain('Según ítems');
  });
});

describe('móvil: la tarjeta de la lista muestra el Estado y lleva el mismo indicador', () => {
  it('tarjeta con y sin diferencia en una pestaña por estado y en Todas', async () => {
    lista('pedidos', DATOS, { movil: true });
    await esperar();
    expect(tarjetas().length).toBe(3);
    expect(tarjetaDe('B').textContent).toContain('Según ítems: Pedido');
    expect(tarjetaDe('B').textContent).toContain('Pendiente'); // el estado guardado sigue
    expect(tarjetaDe('I').textContent).not.toContain('Según ítems');
    cleanup();
    lista('todas', DATOS, { movil: true });
    await esperar();
    expect(tarjetaDe('F').textContent).toContain('Según ítems: Denegado');
    expect(tarjetaDe('G').textContent).not.toContain('Según ítems');
  });

  it('en una pestaña que no es por estado la tarjeta no lo lleva', async () => {
    lista('anuladas', [sol('X', 'Anulado', [item('Pedido')])], { movil: true });
    await esperar();
    expect(document.body.textContent).not.toContain('Según ítems');
  });
});

describe('junto con el aviso "ítems anulados"', () => {
  it('una fila con las dos cosas muestra "Según ítems" bajo Estado e "ítems anulados" bajo Resultado, cada uno en su celda', async () => {
    const datos = [sol('W', 'Pedido', [item('Pedido'), item('Cotizado'), item('Anulado')])]; // recalculado: Pedido Parcial
    lista('parciales', datos);
    await esperar();
    expect(celdaEstado('W').textContent).toContain('Según ítems: Pedido Parcial');
    expect(celdaEstado('W').textContent).not.toContain('ítems anulados');
    const resultado = filaTabla('W').querySelectorAll('td')[columna('Resultado')].textContent;
    expect(resultado).toContain('ítems anulados');
    expect(resultado).not.toContain('Según ítems');
    // el aviso de ítems anulados conserva su icono y el nuevo no lleva ninguno
    const avisoAnulados = [...filaTabla('W').querySelectorAll('td')[columna('Resultado')].querySelectorAll('span')].find((e) => e.textContent === 'ítems anulados');
    expect(avisoAnulados.querySelector('svg')).not.toBeNull();
    expect(indicadorDe(celdaEstado('W')).querySelector('svg')).toBeNull();
    expect(avisoAnulados.className).toBe(indicadorDe(celdaEstado('W')).className);
  });
});

describe('el Excel no lleva el indicador', () => {
  it.each(['pedidos', 'todas'])('la exportación de "%s" son las solicitudes originales, sin campos nuevos', async (pestana) => {
    lista(pestana);
    await esperar();
    await act(async () => { screen.getByRole('button', { name: 'Exportar movimientos' }).click(); });
    expect(exportarTodosLosMovimientosExcel).toHaveBeenCalledTimes(1);
    const [filas] = exportarTodosLosMovimientosExcel.mock.calls[0];
    expect(filas.length).toBeGreaterThan(0);
    filas.forEach((f) => expect(DATOS.includes(f)).toBe(true));
    expect(JSON.stringify(filas)).not.toContain('Según ítems');
    expect(JSON.stringify(exportarTodosLosMovimientosExcel.mock.calls[0])).not.toContain('Según ítems');
  });
});
