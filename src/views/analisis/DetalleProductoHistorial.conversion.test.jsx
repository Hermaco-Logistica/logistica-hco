// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'u1', email: 'yo@hermaco.net' } }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}) }));
vi.mock('../../utils/exportarExcel', () => ({ exportarMovimientosExcel: vi.fn(), exportarTodosLosMovimientosExcel: vi.fn(), extraerTodosLosMovimientos: vi.fn(() => []) }));

import { DetalleProductoHistorial as Historial } from './DetalleProductoHistorial';
import { DetalleProductosAnalisis as Directorio } from './DetalleProductosAnalisis';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';
import { reiniciarPopoverUnico } from '../../utils/popoverUnico';

/**
 * Historial de producto (F8c, commit 2): tarjeta "Conversión" por ítems con el estado final de cada ítem, columna "Resultado" por ítem,
 * unidades en pedido y paridad con el Directorio de productos con los mismos filtros de período, vendedor y cliente.
 *
 * BOMBA tiene 7 líneas, cada una en su solicitud: Ganado (5 u.), Venta perdida, Rechazo (Cancelado), Anulado, Cotizado, Pendiente y un
 * Ganado (2 u.) dentro de una solicitud "Pedido Parcial" cuyo otro ítem (TUBO) es una venta perdida. Ganados 2 de 5 cerrados = 40 %;
 * solicitudes: una Ganada y una Ganada parcial. Hoy el código anterior daba 28,6 % (2 de 7 solicitudes) y 6 unidades en pedido.
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
const l = (desc, estadoItem, extra = {}) => ({ desc, marca: 'X', cant: 1, estadoItem, precio: 10, fob: 10, ...extra });
const s = (id, estado, productos, extra = {}) => ({
  id, correlativo: `RFQ-${id}`, cliente: 'Bombas del Sur', estado, vendedorNombre: 'Ana', tipo: 'RFQ', fechaS: dia(1), fechaCreacion: dia(1), modalidad: 'Aéreo', productos, ...extra
});
const MIXTO = [
  s('1', 'Pedido', [l('bomba', 'Pedido', { cant: 5 })]),
  s('2', 'Venta Perdida', [l('bomba', 'Venta Perdida')], { modalidad: 'Marítimo' }),
  s('3', 'Denegado', [l('bomba', 'Cancelado')], { modalidad: 'Marítimo' }),
  s('4', 'Anulado', [l('bomba', 'Anulado')]),
  s('5', 'Cotizado', [l('bomba', 'Cotizado')]),
  s('6', 'Pendiente', [l('bomba', 'Pendiente', { fob: 0, precio: 0 })], { modalidad: 'Marítimo' }),
  s('7', 'Pedido Parcial', [l('bomba', 'Pedido', { cant: 2 }), l('tubo', 'Venta Perdida')])
];

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const guardar = (clave, valor) => sessionStorage.setItem(clave, JSON.stringify(valor));
const historial = ({ solicitudes = MIXTO, url = '/analisis/producto/bomba', soloAnulados = false, movil = false } = {}) => {
  mm(movil);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/analisis/producto/:productId" element={<Historial role="comprador" solicitudes={solicitudes} ordenesCompra={[]} soloAnulados={soloAnulados} />} /></Routes>
    </MemoryRouter>
  );
};
const directorio = (solicitudes) => {
  mm(false);
  return render(<MemoryRouter initialEntries={['/analisis/productos']}><Directorio role="comprador" solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>);
};
const tarjeta = (nombre) => screen.getByText(nombre).closest('.surface');
const tarjetaConversion = () => tarjeta('Conversión');
const valor = (el) => el.querySelector('.font-mono').textContent.replace(/\s+/g, '');
const subtitulo = (el) => el.querySelector('[title]').textContent.replace(/\s+/g, ' ').trim();
const tituloConversion = (el) => el.querySelector('[title]').getAttribute('title');
const contador = () => document.querySelector('[aria-live="polite"]').textContent;
const columna = (nombre) => [...document.querySelectorAll('thead th')].findIndex((th) => th.textContent.trim() === nombre);
const celdaResultado = (correlativo) => {
  const fila = [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(correlativo));
  return fila.querySelectorAll('td')[columna('Resultado')].textContent.replace(/\s+/g, ' ').trim();
};

beforeEach(() => {
  sessionStorage.clear();
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); reiniciarCapasParaPruebas(); reiniciarPopoverUnico(); sessionStorage.clear(); window.matchMedia = matchMediaOriginal; });

describe('Historial de producto: tarjeta "Conversión" por ítems', () => {
  it('se llama Conversión (ya no Efectividad) y da ganados ÷ cerrados con 0 decimales en la celda', async () => {
    historial();
    await esperar();
    expect(screen.queryByText('Efectividad')).toBeNull();
    expect(valor(tarjetaConversion())).toBe('40%');
    expect(subtitulo(tarjetaConversion())).toBe('2 ganados / 5 cerrados');
  });

  it('el title lleva el decimal y la cuenta de solicitudes ganadas más parciales, con solo las filas del producto', async () => {
    historial();
    await esperar();
    // RFQ-7 es Pedido Parcial por su otro producto (TUBO, venta perdida), pero con las filas de BOMBA es una solicitud ganada: 2 + 0
    expect(tituloConversion(tarjetaConversion())).toBe('Conversión 40 %: 2 ítems ganados de 5 cerrados (2 solicitudes ganadas + 0 parciales)');
  });

  it('una solicitud con el producto ganado en una línea y perdido en otra cuenta como parcial; el resultado de los otros productos no pesa', async () => {
    historial({ solicitudes: [
      s('1', 'Pedido Parcial', [l('bomba', 'Pedido'), l('bomba', 'Venta Perdida'), l('tubo', 'Pedido')]),
      s('2', 'Pedido', [l('bomba', 'Pedido'), l('tubo', 'Anulado')])
    ] });
    await esperar();
    expect(tituloConversion(tarjetaConversion())).toBe('Conversión 66,7 %: 2 ítems ganados de 3 cerrados (1 solicitud ganada + 1 parcial)');
  });

  it('el filtro de estado también recorta las filas que cuentan para el title', async () => {
    guardar('analisis_prod_hist_estado', 'Pedido');
    historial();
    await esperar();
    expect(tituloConversion(tarjetaConversion())).toBe('Conversión 100 %: 1 ítem ganado de 1 cerrado (1 solicitud ganada + 0 parciales)');
  });

  it('con 0 decimales redondea y el title conserva el decimal con coma (1 ganado de 3 cerrados: 33 % y 33,3 %)', async () => {
    historial({ solicitudes: [s('1', 'Pedido', [l('bomba', 'Pedido')]), s('2', 'Venta Perdida', [l('bomba', 'Venta Perdida')]), s('3', 'Anulado', [l('bomba', 'Anulado')])] });
    await esperar();
    expect(valor(tarjetaConversion())).toBe('33%');
    expect(tituloConversion(tarjetaConversion())).toBe('Conversión 33,3 %: 1 ítem ganado de 3 cerrados (1 solicitud ganada + 0 parciales)');
    expect(subtitulo(tarjetaConversion())).toBe('1 ganado / 3 cerrados');
  });

  it('el producto repetido en una misma solicitud son dos ítems pero una sola solicitud en el title', async () => {
    historial({ solicitudes: [s('1', 'Pedido', [l('bomba', 'Pedido'), l('bomba', 'Pedido')])] });
    await esperar();
    expect(subtitulo(tarjetaConversion())).toBe('2 ganados / 2 cerrados');
    expect(tituloConversion(tarjetaConversion())).toBe('Conversión 100 %: 2 ítems ganados de 2 cerrados (1 solicitud ganada + 0 parciales)');
  });

  it('regla de género: "ganados" y "cerrados" para ítems; "solicitudes ganadas" solo en el title', async () => {
    historial();
    await esperar();
    expect(subtitulo(tarjetaConversion())).not.toMatch(/ganadas|gan\./);
    expect(tituloConversion(tarjetaConversion())).toMatch(/ítems ganados/);
    expect(tituloConversion(tarjetaConversion())).toMatch(/solicitudes ganadas/);
  });

  it('un Cotizado dentro de un Pedido es abierto: no cuenta ni como ganado ni como cerrado', async () => {
    historial({ solicitudes: [s('1', 'Pedido', [l('bomba', 'Cotizado')]), s('2', 'Pedido', [l('bomba', 'Pedido')])] });
    await esperar();
    expect(subtitulo(tarjetaConversion())).toBe('1 ganado / 1 cerrado');
    expect(valor(tarjetaConversion())).toBe('100%');
  });

  it('sin ítems cerrados muestra un guion (no 0 %) y la cuenta 0 ganados / 0 cerrados', async () => {
    historial({ solicitudes: [s('5', 'Cotizado', [l('bomba', 'Cotizado')]), s('6', 'Pendiente', [l('bomba', 'Pendiente', { fob: 0, precio: 0 })])] });
    await esperar();
    expect(valor(tarjetaConversion())).toBe('—');
    expect(subtitulo(tarjetaConversion())).toBe('0 ganados / 0 cerrados');
    expect(tituloConversion(tarjetaConversion())).toMatch(/^Sin ítems cerrados: no hay conversión/);
  });

  it('sin ningún movimiento también muestra el guion y no rompe', async () => {
    historial({ solicitudes: [] });
    await esperar();
    expect(valor(tarjetaConversion())).toBe('—');
    expect(subtitulo(tarjetaConversion())).toBe('0 ganados / 0 cerrados');
  });

  it('cifras grandes: separador de miles y números enteros en el subtítulo', async () => {
    const muchas = Array.from({ length: 1234 }, (_, i) => s(`g${i}`, 'Pedido', [l('bomba', 'Pedido')]));
    const perdidas = Array.from({ length: 4444 }, (_, i) => s(`p${i}`, 'Venta Perdida', [l('bomba', 'Venta Perdida')]));
    historial({ solicitudes: [...muchas, ...perdidas] });
    await esperar(200);
    expect(subtitulo(tarjetaConversion())).toBe(`${(1234).toLocaleString()} ganados / ${(5678).toLocaleString()} cerrados`);
    expect(valor(tarjetaConversion())).toBe('22%');
  });
});

describe('Historial de producto: la conversión sigue a las filas filtradas', () => {
  it('el filtro de estado recorta las filas y la tarjeta se recalcula con ellas', async () => {
    guardar('analisis_prod_hist_estado', 'Pedido');
    historial();
    await esperar();
    expect(contador()).toBe('Mostrando 1 movimiento');
    expect(subtitulo(tarjetaConversion())).toBe('1 ganado / 1 cerrado');
    expect(valor(tarjetaConversion())).toBe('100%');
  });

  it('el filtro de modalidad (Marítimo: venta perdida, rechazo y pendiente) da 0 ganados de 2 cerrados', async () => {
    guardar('analisis_prod_hist_modalidad', 'Marítimo');
    historial();
    await esperar();
    expect(contador()).toBe('Mostrando 3 movimientos');
    expect(subtitulo(tarjetaConversion())).toBe('0 ganados / 2 cerrados');
    expect(valor(tarjetaConversion())).toBe('0%');
  });

  it('estado y modalidad juntos, y la búsqueda por texto, también', async () => {
    guardar('analisis_prod_hist_estado', 'Venta Perdida');
    guardar('analisis_prod_hist_modalidad', 'Marítimo');
    historial();
    await esperar();
    expect(contador()).toBe('Mostrando 1 movimiento');
    expect(subtitulo(tarjetaConversion())).toBe('0 ganados / 1 cerrado');
    cleanup();
    sessionStorage.clear();
    guardar('analisis_prod_hist_search', 'RFQ-4');
    historial();
    await esperar();
    expect(subtitulo(tarjetaConversion())).toBe('0 ganados / 1 cerrado');
  });

  it('el filtro de estado "Cotizado" deja solo abiertas: guion', async () => {
    guardar('analisis_prod_hist_estado', 'Cotizado');
    historial();
    await esperar();
    expect(valor(tarjetaConversion())).toBe('—');
  });

  it('el seguimiento (?seguimiento=1) también recorta las filas: sin ítems en seguimiento no hay movimientos ni conversión', async () => {
    historial({ url: '/analisis/producto/bomba?seguimiento=1' });
    await esperar();
    expect(contador()).toBe('Mostrando 0 movimientos');
    expect(valor(tarjetaConversion())).toBe('—');
  });

  it('el chip de vendedor y el de cliente (claves compartidas) recortan las solicitudes antes de contar', async () => {
    const otras = [s('8', 'Pedido', [l('bomba', 'Pedido')], { vendedorNombre: 'Luis', cliente: 'Holcim' })];
    guardar('analisis_vendedor_filter', 'Luis');
    historial({ solicitudes: [...MIXTO, ...otras] });
    await esperar();
    expect(subtitulo(tarjetaConversion())).toBe('1 ganado / 1 cerrado');
    cleanup();
    sessionStorage.clear();
    guardar('analisis_cliente_search', 'holcim');
    historial({ solicitudes: [...MIXTO, ...otras] });
    await esperar();
    expect(subtitulo(tarjetaConversion())).toBe('1 ganado / 1 cerrado');
  });
});

describe('Historial de producto: vistas de decisión (soloAnulados)', () => {
  it('no llevan la tarjeta de conversión: quedan cuatro tarjetas', async () => {
    historial({ soloAnulados: true });
    await esperar();
    expect(screen.queryByText('Conversión')).toBeNull();
    expect(screen.queryByText('Efectividad')).toBeNull();
    const rejilla = screen.getByText('Veces solicitadas').closest('.surface').parentElement;
    expect(rejilla.children).toHaveLength(4);
    expect(rejilla.className).toMatch(/lg:grid-cols-4/);
    expect(rejilla.className).not.toMatch(/lg:grid-cols-5/);
  });

  it('con la vista normal hay cinco tarjetas y la rejilla de cinco columnas', async () => {
    historial();
    await esperar();
    const rejilla = screen.getByText('Veces solicitadas').closest('.surface').parentElement;
    expect(rejilla.children).toHaveLength(5);
    expect(rejilla.className).toMatch(/lg:grid-cols-5/);
  });
});

describe('Historial de producto: unidades en pedido por estado final', () => {
  const enPedido = () => within(tarjeta('Unid. Solicitadas')).getByText(/en pedido/).textContent;

  it('suma las unidades de los ítems Ganado (5 + 2 = 7); no suma las de las otras líneas', async () => {
    historial();
    await esperar();
    expect(enPedido()).toBe('7 en pedido');
  });

  it('un ítem Cotizado dentro de una solicitud Pedido no suma (hoy sumaba como pedido)', async () => {
    historial({ solicitudes: [s('1', 'Pedido', [l('bomba', 'Cotizado', { cant: 4 })])] });
    await esperar();
    expect(enPedido()).toBe('0 en pedido');
  });

  it('una solicitud Pedido Parcial suma solo los ítems ganados, no los demás ítems de la misma solicitud', async () => {
    historial({ solicitudes: [s('1', 'Pedido Parcial', [l('bomba', 'Pedido', { cant: 3 }), l('bomba', 'Cotizado', { cant: 9 })])] });
    await esperar();
    expect(enPedido()).toBe('3 en pedido');
  });

  it('un ítem Pedido con una anulación suelta en otro ítem sigue sumando (el estado propio gana)', async () => {
    historial({ solicitudes: [s('1', 'Pedido', [l('bomba', 'Pedido', { cant: 6 }), l('tubo', 'Anulado')])] });
    await esperar();
    expect(enPedido()).toBe('6 en pedido');
  });
});

describe('Historial de producto: columna "Resultado" por ítem', () => {
  it.each([
    ['RFQ-1', 'Ganado'], ['RFQ-2', 'Venta perdida'], ['RFQ-3', 'Rechazo'], ['RFQ-4', 'Anulado'], ['RFQ-5', 'Cotizado'], ['RFQ-6', 'Pendiente'], ['RFQ-7', 'Ganado']
  ])('la fila de %s (tabla) dice "%s" por el estado final del ítem', async (correlativo, texto) => {
    guardar('analisis_prod_hist_search', correlativo);
    historial();
    await esperar();
    expect(celdaResultado(correlativo)).toMatch(new RegExp(`^${texto}`));
  });

  it('el Cancelado crudo de hoy se llama Rechazo, y no queda ninguna etiqueta "Cancelado" en la columna', async () => {
    historial();
    await esperar();
    expect(celdaResultado('RFQ-3')).toBe('Rechazo');
    const celdas = [...document.querySelectorAll('tbody tr')].map((tr) => tr.querySelectorAll('td')[columna('Resultado')].textContent);
    celdas.forEach((t) => expect(t).not.toMatch(/Cancelado|Ganada|Cotizada/));
  });

  it('el ítem de otra solicitud con una venta perdida no cambia el resultado del ítem de BOMBA (Ganado, no "Ganada parcial")', async () => {
    historial();
    await esperar();
    expect(celdaResultado('RFQ-7')).toMatch(/^Ganado/);
    expect(celdaResultado('RFQ-7')).not.toMatch(/parcial/i);
  });

  it('móvil: la tarjeta de cada movimiento lleva la misma etiqueta y "Parcial" solo cuando la solicitud es Pedido Parcial', async () => {
    historial({ movil: true });
    await esperar();
    const tarjetas = [...document.querySelectorAll('.md\\:hidden .surface')];
    expect(tarjetas).toHaveLength(7);
    const de = (correlativo) => tarjetas.find((t) => t.textContent.includes(correlativo));
    // La etiqueta "Parcial" de la cabecera (el detalle colapsado ya dice "Pedido Parcial" en otro lugar)
    const etiquetaParcial = (t) => [...t.querySelectorAll('button span')].some((e) => e.children.length === 0 && e.textContent.trim() === 'Parcial');
    expect(de('RFQ-3').textContent).toMatch(/Rechazo/);
    expect(etiquetaParcial(de('RFQ-3'))).toBe(false);
    expect(etiquetaParcial(de('RFQ-1'))).toBe(false);
    expect(de('RFQ-7').textContent).toMatch(/Ganado/);
    expect(etiquetaParcial(de('RFQ-7'))).toBe(true);
    expect(de('RFQ-2').textContent).toMatch(/Venta perdida/);
  });
});

describe('Historial de producto: móvil en las vistas de decisión', () => {
  it('la tarjeta de un ítem anulado lleva su etiqueta de decisión y no la etiqueta "Parcial" de la solicitud', async () => {
    const solicitudes = [s('9', 'Pedido Parcial', [l('bomba', 'Anulado'), l('tubo', 'Pedido')])];
    historial({ solicitudes, soloAnulados: true, movil: true });
    await esperar();
    const tarjetas = [...document.querySelectorAll('.md\\:hidden .surface')];
    expect(tarjetas).toHaveLength(1);
    expect([...tarjetas[0].querySelectorAll('button span')].some((e) => e.children.length === 0 && e.textContent.trim() === 'Parcial')).toBe(false);
    expect(tarjetas[0].textContent).toMatch(/Anulado/);
  });
});

/**
 * Paridad Historial–Directorio: el mismo producto con los mismos filtros de período, vendedor y cliente da las mismas cifras. El Directorio
 * las muestra en el title de la conversión y en "Unidades ganadas"; el Historial, en el title de su tarjeta y en "en pedido".
 * Quedan fuera por diseño los filtros que solo tiene uno de los dos (resultado del dashboard en el Directorio; estado, modalidad, búsqueda,
 * seguimiento y decisión en el Historial).
 */
describe('Paridad Historial–Directorio con los mismos filtros', () => {
  const DATOS = [
    s('1', 'Pedido', [l('bomba', 'Pedido', { cant: 4 })]),
    s('2', 'Venta Perdida', [l('bomba', 'Venta Perdida')]),
    s('3', 'Denegado', [l('bomba', 'Cancelado')], { vendedorNombre: 'Luis', cliente: 'Holcim' }),
    s('4', 'Pedido', [l('bomba', 'Pedido', { cant: 2 })], { vendedorNombre: 'Luis', cliente: 'Bombas del Sur' }),
    s('5', 'Cotizado', [l('bomba', 'Cotizado')], { vendedorNombre: 'Luis', cliente: 'Holcim' }),
    s('6', 'Pedido Parcial', [l('bomba', 'Pedido', { cant: 7 }), l('bomba', 'Cotizado')], { cliente: 'Holcim' }),
    s('7', 'Pedido', [l('bomba', 'Pedido', { cant: 5 })], { fechaS: dia(100), fechaCreacion: dia(100) }),
    s('8', 'Anulado', [l('bomba', 'Anulado')], { fechaS: dia(100), fechaCreacion: dia(100), cliente: 'Holcim' }),
    s('9', 'Pedido', [l('bomba', 'Pedido'), l('bomba', 'Venta Perdida')], { fechaS: dia(100), fechaCreacion: dia(100), vendedorNombre: 'Luis' })
  ];
  const CASOS = [
    ['sin filtros de contexto (período por defecto: 30 días)', {}],
    ['vendedor Ana', { analisis_vendedor_filter: 'Ana' }],
    ['cliente "holcim"', { analisis_cliente_search: 'holcim' }],
    ['vendedor Luis y cliente "bombas"', { analisis_vendedor_filter: 'Luis', analisis_cliente_search: 'bombas' }],
    ['histórico completo', { analisis_filtro_periodo: { periodo: 'historico', anioHistorico: 'todos' } }],
    ['histórico completo y vendedor Luis', { analisis_filtro_periodo: { periodo: 'historico', anioHistorico: 'todos' }, analisis_vendedor_filter: 'Luis' }],
    ['90 días y cliente "holcim"', { analisis_filtro_periodo: { periodo: '90d' }, analisis_cliente_search: 'holcim' }],
    ['un vendedor que no existe', { analisis_vendedor_filter: 'Nadie' }]
  ];
  const aplicar = (sesion) => { sessionStorage.clear(); Object.entries(sesion).forEach(([k, v]) => guardar(k, v)); };

  const cifrasDirectorio = () => {
    const fila = [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes('BOMBA'));
    if (!fila) return null;
    const cabeceras = [...document.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    return {
      titulo: fila.querySelector('[title^="Conversión"], [title^="Sin ítems cerrados"]').getAttribute('title'),
      unidadesGanadas: Number(fila.querySelectorAll('td')[cabeceras.indexOf('Unidades ganadas')].textContent.replace(/\D/g, ''))
    };
  };
  const cifrasHistorial = () => {
    const unidades = Number(within(tarjeta('Unid. Solicitadas')).getByText(/en pedido/).textContent.replace(/\D/g, ''));
    return { titulo: tituloConversion(tarjetaConversion()), unidadesGanadas: unidades };
  };

  it.each(CASOS)('%s: mismo ganados ÷ cerrados y mismas unidades ganadas', async (_nombre, sesion) => {
    aplicar(sesion);
    const { unmount } = directorio(DATOS);
    await esperar();
    const d = cifrasDirectorio();
    unmount();
    cleanup();
    aplicar(sesion);
    historial({ solicitudes: DATOS });
    await esperar();
    const h = cifrasHistorial();
    if (d === null) {
      // Sin solicitudes del producto con esos filtros el Directorio no tiene fila y el Historial no tiene movimientos
      expect(h.titulo).toMatch(/^Sin ítems cerrados/);
      expect(h.unidadesGanadas).toBe(0);
      return;
    }
    // El Directorio da "Conversión 50 %: 3 ítems ganados de 6 cerrados"; el Historial añade al final la cuenta de solicitudes
    expect(h.titulo.startsWith(d.titulo)).toBe(true);
    expect(h.unidadesGanadas).toBe(d.unidadesGanadas);
  });

  it('el caso sin filtros no es trivial: hay ganados, cerrados distintos de cero y unidades ganadas', async () => {
    aplicar({});
    directorio(DATOS);
    await esperar();
    const d = cifrasDirectorio();
    expect(d.titulo).toBe('Conversión 60 %: 3 ítems ganados de 5 cerrados');
    expect(d.unidadesGanadas).toBe(13);
  });

  it('con el filtro de resultado del dashboard el Directorio recorta y el Historial no: diferencia conocida (se documenta, no se arregla)', async () => {
    aplicar({ analisis_resultado_filter: 'completo' });
    directorio(DATOS);
    await esperar();
    const d = cifrasDirectorio();
    cleanup();
    aplicar({ analisis_resultado_filter: 'completo' });
    historial({ solicitudes: DATOS });
    await esperar();
    expect(cifrasHistorial().titulo.startsWith(d?.titulo ?? '\u0000')).toBe(false);
  });
});
