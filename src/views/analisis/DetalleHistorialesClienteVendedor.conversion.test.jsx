// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'u1', email: 'yo@hermaco.net' } }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}) }));
vi.mock('../../utils/exportarExcel', () => ({ exportarMovimientosExcel: vi.fn(), exportarTodosLosMovimientosExcel: vi.fn(), extraerTodosLosMovimientos: vi.fn(() => []) }));

import { DetalleClienteHistorial } from './DetalleClienteHistorial';
import { DetalleVendedorHistorial } from './DetalleVendedorHistorial';
import { DetalleProductosAnalisis as Directorio } from './DetalleProductosAnalisis';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';
import { reiniciarPopoverUnico } from '../../utils/popoverUnico';

/**
 * Historiales de Cliente y de Vendedor (F8c, commit 3): tarjeta "Conversión" por ítems, columna "Resultado" por ítem, unidades en pedido y
 * (en Vendedor) "Monto en Pedidos" con el estado final de cada ítem, y paridad con el Directorio de productos con los mismos filtros.
 *
 * Datos (cliente "Bombas del Sur", vendedor Ana, precio 10 por unidad):
 *  RFQ-1 Pedido: BOMBA 5 u. y TUBO 3 u. ganados · RFQ-2 venta perdida · RFQ-3 rechazo (Cancelado) · RFQ-4 anulado · RFQ-5 cotizado
 *  RFQ-6 pendiente · RFQ-7 Pedido Parcial: BOMBA 2 u. ganado y TUBO venta perdida · RFQ-8 Pedido con un BOMBA Cotizado (no cuenta como ganado)
 * Ganados 3 (BOMBA 5 u., TUBO 3 u. y BOMBA 2 u.), cerrados 7 (3 ganados, 2 ventas perdidas, 1 rechazo y 1 anulado): 42,9 %.
 * Unidades en pedido 5 + 3 + 2 = 10 y monto en pedidos $100.00 ($113.00 con IVA). Solicitudes de las filas: 1 ganada y 1 parcial (RFQ-7).
 * Hoy (código anterior): 1 ganada ÷ 8 solicitudes = 12,5 %.
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
const l = (desc, estadoItem, extra = {}) => ({ desc, marca: 'X', cant: 1, estadoItem, precio: 10, fob: 10, ...extra });
const s = (id, estado, productos, extra = {}) => ({
  id, correlativo: `RFQ-${id}`, cliente: 'Bombas del Sur', estado, vendedorNombre: 'Ana', vendedorId: 'u1', tipo: 'RFQ', fechaS: dia(1), fechaCreacion: dia(1), modalidad: 'Aéreo', productos, ...extra
});
const DATOS = [
  s('1', 'Pedido', [l('bomba', 'Pedido', { cant: 5 }), l('tubo', 'Pedido', { cant: 3 })]),
  s('2', 'Venta Perdida', [l('codo', 'Venta Perdida')], { modalidad: 'Marítimo' }),
  s('3', 'Denegado', [l('codo', 'Cancelado')], { modalidad: 'Marítimo' }),
  s('4', 'Anulado', [l('valvula', 'Anulado')]),
  s('5', 'Cotizado', [l('bomba', 'Cotizado')]),
  s('6', 'Pendiente', [l('tubo', 'Pendiente', { fob: 0, precio: 0 })]),
  s('7', 'Pedido Parcial', [l('bomba', 'Pedido', { cant: 2 }), l('tubo', 'Venta Perdida')]),
  s('8', 'Pedido', [l('bomba', 'Cotizado', { cant: 4 })])
];
const OTRO_VENDEDOR = [s('9', 'Pedido', [l('bomba', 'Pedido', { cant: 6 })], { vendedorNombre: 'Luis', vendedorId: 'u2', cliente: 'Holcim' })];

const PAGINAS = [
  { nombre: 'Cliente', Vista: DetalleClienteHistorial, ruta: '/analisis/cliente/:clienteId', url: '/analisis/cliente/Bombas%20del%20Sur', filtroContexto: { analisis_vendedor_filter: 'Ana' } },
  { nombre: 'Vendedor', Vista: DetalleVendedorHistorial, ruta: '/analisis/vendedor/:vendedorId', url: '/analisis/vendedor/Ana', filtroContexto: { analisis_cliente_search: 'bombas' } }
];

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const guardar = (clave, valor) => sessionStorage.setItem(clave, JSON.stringify(valor));
const montar = ({ Vista, ruta, url }, { solicitudes = DATOS, soloAnulados = false, movil = false } = {}) => {
  mm(movil);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path={ruta} element={React.createElement(Vista, { role: "comprador", solicitudes, ordenesCompra: [], soloAnulados })} /></Routes>
    </MemoryRouter>
  );
};
const tarjeta = (nombre) => screen.getByText(nombre).closest('.surface');
const valor = (el) => el.querySelector('.font-mono').textContent.replace(/\s+/g, '');
const subtitulo = (el) => el.querySelector('[title]').textContent.replace(/\s+/g, ' ').trim();
const tituloConversion = () => tarjeta('Conversión').querySelector('[title]').getAttribute('title');
const contador = () => document.querySelector('[aria-live="polite"]').textContent;
const columna = (nombre) => [...document.querySelectorAll('thead th')].findIndex((th) => th.textContent.trim() === nombre);
const celdaResultado = (correlativo, indice = 0) => {
  const filas = [...document.querySelectorAll('tbody tr')].filter((tr) => tr.textContent.includes(correlativo));
  return filas[indice].querySelectorAll('td')[columna('Resultado')].textContent.replace(/\s+/g, ' ').trim();
};

beforeEach(() => {
  sessionStorage.clear();
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); reiniciarCapasParaPruebas(); reiniciarPopoverUnico(); sessionStorage.clear(); window.matchMedia = matchMediaOriginal; });

describe.each(PAGINAS)('Historial de $nombre: tarjeta "Conversión" por ítems', (pagina) => {
  it('se llama Conversión (ya no Efectividad) y da ganados ÷ cerrados por ítems: 43 % con 3 ganados / 7 cerrados', async () => {
    montar(pagina);
    await esperar();
    expect(screen.queryByText('Efectividad')).toBeNull();
    expect(valor(tarjeta('Conversión'))).toBe('43%');
    expect(subtitulo(tarjeta('Conversión'))).toBe('3 ganados / 7 cerrados');
  });

  it('el title lleva el decimal con coma y las solicitudes ganadas y parciales de esas filas (1 ganada + 1 parcial)', async () => {
    montar(pagina);
    await esperar();
    expect(tituloConversion()).toBe('Conversión 42,9 %: 3 ítems ganados de 7 cerrados (1 solicitud ganada + 1 parcial)');
  });

  it('los textos viejos ya no están: ni "gan.", "pc.", "solicitudes totales", "cots." ni "cotizaciones totales"', async () => {
    montar(pagina);
    await esperar();
    const texto = `${tarjeta('Conversión').textContent} ${tituloConversion()}`;
    ['gan.', 'pc.', 'solicitudes totales', 'cots.', 'cotizaciones totales', 'adjudicadas'].forEach((viejo) => expect(texto).not.toContain(viejo));
  });

  it('sin ítems cerrados muestra un guion y 0 ganados / 0 cerrados', async () => {
    montar(pagina, { solicitudes: [s('5', 'Cotizado', [l('bomba', 'Cotizado')]), s('6', 'Pendiente', [l('tubo', 'Pendiente', { fob: 0, precio: 0 })])] });
    await esperar();
    expect(valor(tarjeta('Conversión'))).toBe('—');
    expect(subtitulo(tarjeta('Conversión'))).toBe('0 ganados / 0 cerrados');
    expect(tituloConversion()).toMatch(/^Sin ítems cerrados: no hay conversión/);
  });

  it('sin ningún movimiento no rompe: guion y ceros', async () => {
    montar(pagina, { solicitudes: [] });
    await esperar();
    expect(valor(tarjeta('Conversión'))).toBe('—');
    expect(subtitulo(tarjeta('Conversión'))).toBe('0 ganados / 0 cerrados');
  });

  it('un Cotizado dentro de un Pedido es abierto: no suma ganados ni cerrados (hoy contaba la solicitud como ganada)', async () => {
    montar(pagina, { solicitudes: [s('8', 'Pedido', [l('bomba', 'Cotizado', { cant: 4 })]), s('1', 'Pedido', [l('bomba', 'Pedido')])] });
    await esperar();
    expect(subtitulo(tarjeta('Conversión'))).toBe('1 ganado / 1 cerrado');
  });

  it('cifras grandes: separador de miles en el subtítulo', async () => {
    const ganadas = Array.from({ length: 1234 }, (_, i) => s(`g${i}`, 'Pedido', [l('bomba', 'Pedido')]));
    const perdidas = Array.from({ length: 4444 }, (_, i) => s(`p${i}`, 'Venta Perdida', [l('bomba', 'Venta Perdida')]));
    montar(pagina, { solicitudes: [...ganadas, ...perdidas] });
    await esperar(300);
    expect(subtitulo(tarjeta('Conversión'))).toBe(`${(1234).toLocaleString()} ganados / ${(5678).toLocaleString()} cerrados`);
  });

  it('el filtro de estado recorta las filas y la tarjeta las usa: "Pedido" deja RFQ-1 (2 ganados) y RFQ-8 (1 abierto)', async () => {
    guardar(pagina.nombre === 'Cliente' ? 'analisis_cli_hist_estado' : 'analisis_vend_hist_estado', 'Pedido');
    montar(pagina);
    await esperar();
    expect(contador()).toBe('Mostrando 3 movimientos');
    expect(subtitulo(tarjeta('Conversión'))).toBe('2 ganados / 2 cerrados');
    expect(valor(tarjeta('Conversión'))).toBe('100%');
  });

  it('el filtro de modalidad Marítimo deja la venta perdida y el rechazo: 0 ganados / 2 cerrados', async () => {
    guardar(pagina.nombre === 'Cliente' ? 'analisis_cli_hist_modalidad' : 'analisis_vend_hist_modalidad', 'Marítimo');
    montar(pagina);
    await esperar();
    expect(contador()).toBe('Mostrando 2 movimientos');
    expect(subtitulo(tarjeta('Conversión'))).toBe('0 ganados / 2 cerrados');
    expect(valor(tarjeta('Conversión'))).toBe('0%');
  });

  it('estado "Cotizado" deja solo ítems abiertos: guion', async () => {
    guardar(pagina.nombre === 'Cliente' ? 'analisis_cli_hist_estado' : 'analisis_vend_hist_estado', 'Cotizado');
    montar(pagina);
    await esperar();
    expect(valor(tarjeta('Conversión'))).toBe('—');
  });

  it('el seguimiento (?seguimiento=1) también recorta las filas', async () => {
    montar({ ...pagina, url: `${pagina.url}?seguimiento=1` });
    await esperar();
    expect(contador()).toBe('Mostrando 0 movimientos');
    expect(valor(tarjeta('Conversión'))).toBe('—');
  });

  it('las vistas de decisión (soloAnulados) no llevan la tarjeta: quedan cuatro y la rejilla de cuatro columnas', async () => {
    montar(pagina, { soloAnulados: true });
    await esperar();
    expect(screen.queryByText('Conversión')).toBeNull();
    expect(screen.queryByText('Efectividad')).toBeNull();
    const rejilla = document.querySelector('.grid.grid-cols-2');
    expect(rejilla.children).toHaveLength(4);
    expect(rejilla.className).toMatch(/lg:grid-cols-4/);
    expect(rejilla.className).not.toMatch(/lg:grid-cols-5/);
  });

  it('la vista normal tiene cinco tarjetas y la rejilla de cinco columnas', async () => {
    montar(pagina);
    await esperar();
    const rejilla = document.querySelector('.grid.grid-cols-2');
    expect(rejilla.children).toHaveLength(5);
    expect(rejilla.className).toMatch(/lg:grid-cols-5/);
  });
});

describe.each(PAGINAS)('Historial de $nombre: columna "Resultado" por ítem', (pagina) => {
  it.each([
    ['RFQ-2', 'Venta perdida'], ['RFQ-3', 'Rechazo'], ['RFQ-4', 'Anulado'], ['RFQ-5', 'Cotizado'], ['RFQ-6', 'Pendiente']
  ])('la fila de %s dice "%s" por el estado final del ítem', async (correlativo, texto) => {
    montar(pagina);
    await esperar();
    expect(celdaResultado(correlativo)).toMatch(new RegExp(`^${texto}`));
  });

  it('los ítems de RFQ-1 son Ganado, y en RFQ-7 BOMBA es Ganado y TUBO Venta perdida (el Pedido Parcial no mancha al ganado)', async () => {
    montar(pagina);
    await esperar();
    expect(celdaResultado('RFQ-1', 0)).toMatch(/^Ganado/);
    expect(celdaResultado('RFQ-1', 1)).toMatch(/^Ganado/);
    expect(celdaResultado('RFQ-7', 0)).toMatch(/^Ganado/);
    expect(celdaResultado('RFQ-7', 1)).toMatch(/^Venta perdida/);
  });

  it('el Cotizado de una solicitud Pedido (RFQ-8) se muestra como Cotizado, no como Ganado', async () => {
    montar(pagina);
    await esperar();
    expect(celdaResultado('RFQ-8')).toMatch(/^Cotizado/);
  });

  it('no queda ninguna etiqueta antigua en la columna: Ganada, Ganado Parcial, Cotizada, Cancelado, Denegado', async () => {
    montar(pagina);
    await esperar();
    [...document.querySelectorAll('tbody tr')].forEach((tr) => {
      expect(tr.querySelectorAll('td')[columna('Resultado')].textContent).not.toMatch(/Ganada|Ganado Parcial|Cotizada|Cancelado|Denegado/);
    });
  });

  it('móvil: la tarjeta lleva la etiqueta del ítem y "Parcial" solo en las filas de una solicitud Pedido Parcial', async () => {
    montar(pagina, { movil: true });
    await esperar();
    const tarjetas = [...document.querySelectorAll('.md\\:hidden .surface')];
    expect(tarjetas).toHaveLength(10);
    const parcial = (t) => [...t.querySelectorAll('button span')].some((e) => e.children.length === 0 && e.textContent.trim() === 'Parcial');
    const de = (correlativo) => tarjetas.filter((t) => t.textContent.includes(correlativo));
    expect(de('RFQ-3')[0].textContent).toMatch(/Rechazo/);
    expect(parcial(de('RFQ-3')[0])).toBe(false);
    expect(de('RFQ-1').map(parcial)).toEqual([false, false]);
    expect(de('RFQ-7').map(parcial)).toEqual([true, true]);
    expect(de('RFQ-7').map((t) => /Ganado/.test(t.textContent))).toEqual([true, false]);
  });

  it('móvil en las vistas de decisión: la etiqueta "Parcial" de la solicitud no se pinta', async () => {
    montar(pagina, { movil: true, soloAnulados: true, solicitudes: [s('9', 'Pedido Parcial', [l('bomba', 'Anulado'), l('tubo', 'Pedido')])] });
    await esperar();
    const tarjetas = [...document.querySelectorAll('.md\\:hidden .surface')];
    expect(tarjetas).toHaveLength(1);
    expect([...tarjetas[0].querySelectorAll('button span')].some((e) => e.children.length === 0 && e.textContent.trim() === 'Parcial')).toBe(false);
  });
});

describe('Historial de Cliente: unidades en pedido por estado final', () => {
  const enPedido = () => screen.getByText(/en pedido/).textContent;
  const cliente = PAGINAS[0];

  it('suma las unidades de los ítems Ganado (5 + 3 + 2 = 10): ni el Cotizado de un Pedido (4 u.) ni el ítem perdido de un Pedido Parcial', async () => {
    montar(cliente);
    await esperar();
    expect(enPedido()).toBe('10 en pedido');
  });

  it('una solicitud Pedido Parcial suma solo sus ítems ganados', async () => {
    montar(cliente, { solicitudes: [s('1', 'Pedido Parcial', [l('bomba', 'Pedido', { cant: 3 }), l('tubo', 'Cotizado', { cant: 9 })])] });
    await esperar();
    expect(enPedido()).toBe('3 en pedido');
  });

  it('un ítem Pedido en una solicitud Pedido con un ítem anulado suma (hoy una solicitud con ítems anulados dejaba de ser ganada y no sumaba)', async () => {
    montar(cliente, { solicitudes: [s('1', 'Pedido', [l('bomba', 'Pedido', { cant: 6 }), l('tubo', 'Anulado', { cant: 2 })])] });
    await esperar();
    expect(enPedido()).toBe('6 en pedido');
  });
});

describe('Historial de Vendedor: unidades y Monto en Pedidos por estado final', () => {
  const vendedor = PAGINAS[1];
  const textoMonto = () => tarjeta('Monto en Pedidos').textContent.replace(/\s+/g, ' ').trim();

  it('"Prods. Cotizados" muestra 10 ped y "Monto en Pedidos" $100.00 con $113.00 c/IVA', async () => {
    montar(vendedor);
    await esperar();
    expect(tarjeta('Prods. Cotizados').textContent).toMatch(/\(10 ped\)/);
    expect(textoMonto()).toContain('$100.00');
    expect(textoMonto()).toContain('$113.00 c/IVA');
  });

  it('el Cotizado de un Pedido y los ítems perdidos de un Pedido Parcial no suman al monto', async () => {
    montar(vendedor, { solicitudes: [s('8', 'Pedido', [l('bomba', 'Cotizado', { cant: 40 })]), s('7', 'Pedido Parcial', [l('bomba', 'Pedido', { cant: 2 }), l('tubo', 'Venta Perdida', { cant: 50 })])] });
    await esperar();
    expect(textoMonto()).toContain('$20.00');
    expect(textoMonto()).toContain('$22.60 c/IVA');
  });

  it('sin ganados el monto es "---" (formatoMoneda de cero) y las unidades 0 ped', async () => {
    montar(vendedor, { solicitudes: [s('2', 'Venta Perdida', [l('codo', 'Venta Perdida')])] });
    await esperar();
    expect(tarjeta('Prods. Cotizados').textContent).toMatch(/\(0 ped\)/);
    expect(textoMonto()).toContain('---');
  });

  it('el filtro de modalidad recorta también el monto: con Marítimo no hay ganados y el monto es "---"', async () => {
    guardar('analisis_vend_hist_modalidad', 'Marítimo');
    montar(vendedor);
    await esperar();
    expect(textoMonto()).toContain('---');
  });
});

/**
 * Paridad con el Directorio de productos: la conversión del Historial de un cliente o de un vendedor (todos sus productos) es la suma de los
 * ganados y de los cerrados de cada fila del Directorio con el mismo filtro de contexto. Los títulos del Directorio dan "N ítems ganados de M
 * cerrados" por producto.
 */
describe.each(PAGINAS)('Paridad Historial de $nombre – Directorio de productos con el mismo filtro', (pagina) => {
  const sumarDirectorio = () => {
    let ganados = 0;
    let cerrados = 0;
    let filas = 0;
    document.querySelectorAll('tbody tr').forEach((tr) => {
      const t = tr.querySelector('[title^="Conversión"], [title^="Sin ítems cerrados"]');
      if (!t) return;
      filas += 1;
      const m = t.getAttribute('title').match(/(\d+) ítems? ganados? de (\d+) cerrados?/);
      if (m) { ganados += Number(m[1]); cerrados += Number(m[2]); }
    });
    return { ganados, cerrados, filas };
  };
  const del = (el) => { const m = subtitulo(el).match(/^([\d.,]+) ganados? \/ ([\d.,]+) cerrados?$/); return { ganados: Number(m[1].replace(/\D/g, '')), cerrados: Number(m[2].replace(/\D/g, '')) }; };
  const CASOS = [
    ['sin filtros de contexto', {}, DATOS],
    ['con otro cliente y otro vendedor en los datos', {}, [...DATOS, ...OTRO_VENDEDOR]],
    ['el período histórico completo con una solicitud vieja', { analisis_filtro_periodo: { periodo: 'historico', anioHistorico: 'todos' } }, [...DATOS, s('10', 'Pedido', [l('bomba', 'Pedido')], { fechaS: dia(200), fechaCreacion: dia(200) })]]
  ];

  it.each(CASOS)('%s: mismos ganados y cerrados', async (_nombre, sesion, solicitudes) => {
    const contexto = pagina.nombre === 'Cliente' ? { analisis_cliente_search: 'bombas del sur', analisis_vendedor_filter: 'Ana' } : { analisis_vendedor_filter: 'Ana', analisis_cliente_search: 'bombas' };
    const aplicar = () => { sessionStorage.clear(); Object.entries({ ...contexto, ...sesion }).forEach(([k, v]) => guardar(k, v)); };
    aplicar();
    mm(false);
    const { unmount } = render(<MemoryRouter initialEntries={['/analisis/productos']}><Directorio role="comprador" solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>);
    await esperar();
    const d = sumarDirectorio();
    unmount();
    cleanup();
    aplicar();
    montar(pagina, { solicitudes });
    await esperar();
    const h = del(tarjeta('Conversión'));
    expect(d.filas).toBeGreaterThan(0);
    expect(h).toEqual({ ganados: d.ganados, cerrados: d.cerrados });
    expect(h.cerrados).toBeGreaterThan(0);
  });
});

/**
 * Una solicitud sin productos aparece en estos Historiales como una fila de relleno ("Sin productos detallados") y se sigue mostrando en la
 * tabla, pero no es un ítem: no cuenta en la conversión, en las unidades en pedido ni en el monto (como en el Directorio de productos, que
 * ignora esas solicitudes). Lo que sí sigue leyendo esa fila son las cifras de la propia fila: movimientos, solicitudes, unidades solicitadas y
 * "productos" (la fila cuenta 1 unidad y un producto llamado "SIN PRODUCTOS DETALLADOS").
 */
describe.each(PAGINAS)('Solicitud sin productos en el Historial de $nombre', (pagina) => {
  const vacia = (estado, id = 'v1') => s(id, estado, []);

  it('la fila se muestra, pero una solicitud Pedido sin productos no cuenta como ítem ganado ni cerrado', async () => {
    montar(pagina, { solicitudes: [vacia('Pedido')] });
    await esperar();
    expect(contador()).toBe('Mostrando 1 movimiento');
    expect(valor(tarjeta('Conversión'))).toBe('—');
    expect(subtitulo(tarjeta('Conversión'))).toBe('0 ganados / 0 cerrados');
    expect(tituloConversion()).toBe('Sin ítems cerrados: no hay conversión (0 solicitudes ganadas + 0 parciales)');
  });

  it('no suma unidades en pedido ni monto', async () => {
    montar(pagina, { solicitudes: [vacia('Pedido')] });
    await esperar();
    if (pagina.nombre === 'Cliente') expect(screen.getByText(/en pedido/).textContent).toBe('0 en pedido');
    else {
      expect(tarjeta('Prods. Cotizados').textContent).toMatch(/\(0 ped\)/);
      expect(tarjeta('Monto en Pedidos').textContent).toContain('---');
    }
  });

  it('añadida a los datos de siempre no cambia ninguna cifra de conversión, unidades ni monto', async () => {
    montar(pagina, { solicitudes: [...DATOS, vacia('Pedido'), vacia('Venta Perdida', 'v2'), vacia('Anulado', 'v3')] });
    await esperar();
    expect(subtitulo(tarjeta('Conversión'))).toBe('3 ganados / 7 cerrados');
    expect(tituloConversion()).toBe('Conversión 42,9 %: 3 ítems ganados de 7 cerrados (1 solicitud ganada + 1 parcial)');
    if (pagina.nombre === 'Cliente') expect(screen.getByText(/en pedido/).textContent).toBe('10 en pedido');
    else expect(tarjeta('Monto en Pedidos').textContent).toContain('$100.00');
  });

  it('sigue contando en las cifras de la propia fila: 4 movimientos más, y el filtro de estado la recorta como a cualquier fila', async () => {
    montar(pagina, { solicitudes: [...DATOS, vacia('Pedido')] });
    await esperar();
    expect(contador()).toBe('Mostrando 11 movimientos');
  });

  it('paridad con el Directorio de productos: los mismos ganados y cerrados con y sin la solicitud vacía', async () => {
    const contexto = pagina.nombre === 'Cliente' ? { analisis_cliente_search: 'bombas del sur', analisis_vendedor_filter: 'Ana' } : { analisis_vendedor_filter: 'Ana', analisis_cliente_search: 'bombas' };
    const solicitudes = [...DATOS, vacia('Pedido')];
    Object.entries(contexto).forEach(([k, v]) => guardar(k, v));
    mm(false);
    const { unmount } = render(<MemoryRouter initialEntries={['/analisis/productos']}><Directorio role="comprador" solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>);
    await esperar();
    const titulos = [...document.querySelectorAll('tbody tr [title^="Conversión"]')].map((e) => e.getAttribute('title').match(/(\d+) ítems? ganados? de (\d+) cerrados?/)).filter(Boolean);
    const ganados = titulos.reduce((a, m) => a + Number(m[1]), 0);
    const cerrados = titulos.reduce((a, m) => a + Number(m[2]), 0);
    unmount();
    cleanup();
    Object.entries(contexto).forEach(([k, v]) => guardar(k, v));
    montar(pagina, { solicitudes });
    await esperar();
    expect(subtitulo(tarjeta('Conversión'))).toBe(`${ganados} ganados / ${cerrados} cerrados`);
  });
});
