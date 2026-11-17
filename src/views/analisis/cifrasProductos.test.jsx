// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'u1', email: 'yo@hermaco.net' } }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}) }));
vi.mock('../../utils/faseSeguimiento', async (importarOriginal) => ({ ...(await importarOriginal()), obtenerFaseItemCacheada: (solicitud, indice) => (solicitud.id === '1' && indice === 0 ? 'en_revision' : null) }));
vi.mock('../../utils/exportarExcel', () => ({ extraerTodosLosMovimientos: vi.fn(() => []), exportarMovimientosExcel: vi.fn(), exportarTodosLosMovimientosExcel: vi.fn() }));

import { DetalleProductosAnalisis as Directorio } from './DetalleProductosAnalisis';
import { AnalisisEstadisticas as Dashboard } from './AnalisisEstadisticas';
import { reiniciarCapasParaPruebas } from '../../components/filtros/capasAtras';
import { reiniciarPopoverUnico } from '../../utils/popoverUnico';

/**
 * Conversión, ganadas, clientes distintos y columnas de decisión de Productos y de la tarjeta Top (F8b, commit 4): las mismas cifras en el
 * Directorio (tabla y tarjeta móvil) y en la tarjeta Top (escritorio y móvil), y coinciden con la barra del mismo producto.
 * Cada línea vale 1 unidad: así las unidades de la barra son iguales a los ítems de las columnas.
 *
 * BOMBA, por estado final: 3 ganadas (una con la bandera de venta perdida en la raíz de su solicitud y otra con un motivoRechazo suelto),
 * 2 abiertas (una de ellas con la bandera en la raíz), 1 venta perdida, 1 rechazo (Cancelado) y 1 anulada: 6 cerradas, conversión 50 %.
 * Cuatro clientes distintos (dos de ellos escritos de dos formas).
 * HOY (el código anterior a este commit con los mismos datos): ganadas 2 de 3 "cotizadas" (67 %), 3 ventas perdidas, 1 rechazo,
 * 1 anulación y 5 clientes.
 */
const dia = (n) => new Date(Date.now() - n * 86400000);
const l = (desc, estadoItem, extra = {}) => ({ desc, marca: 'X', cant: 1, estadoItem, precio: 10, fob: 10, ...extra });
const s = (id, estado, cliente, productos, extra = {}) => ({ id, correlativo: `RFQ-${id}`, cliente, estado, vendedorNombre: 'Ana', tipo: 'Aéreo', fechaS: dia(1), fechaCreacion: dia(1), productos, ...extra });
const DATOS = [
  s('1', 'Pedido', 'Cliente Uno, S.A.', [l('bomba', 'Pedido')]),
  s('2', 'Pedido Parcial', 'CLIENTE UNO SA', [l('bomba', 'Pedido'), l('bomba', 'Cotizado')]),
  s('3', 'Venta Perdida', 'Cliente Dos', [l('bomba', 'Venta Perdida')]),
  s('4', 'Denegado', 'Cliente Tres', [l('bomba', 'Cancelado')]),
  s('5', 'Anulado', 'Cliente Tres', [l('bomba', 'Anulado')]),
  s('6', 'Pedido', 'Cliente Cuatro', [l('bomba', 'Pedido', { motivoRechazo: 'Residuo' })], { motivoVentaPerdida: { motivo: 'Precio' } }),
  s('7', 'Cotizado', 'Cliente Cuatro', [l('bomba', 'Cotizado')], { motivoVentaPerdida: { motivo: 'Precio' } }),
  s('8', 'Cotizado', 'Cliente Cinco', [l('tubo', 'Cotizado'), l('tubo', 'Pendiente', { fob: 0, precio: 0 })]),
  s('9', 'Pedido', 'Cliente Seis', [l('codo', 'Pedido'), l('codo', 'Pedido')]),
  s('10', 'Pedido', 'Cliente Seis', [l('codo', 'Pedido'), l('codo', 'Pedido')])
];
const BOMBA = { ganadas: 3, conversion: '50%', anulaciones: 1, ventasPerdidas: 1, rechazos: 1, clientes: 4, barra: 'Volumen por estado: Ganado 3 u., Cotizado 2 u., Anulado 1 u., Venta perdida 1 u., Rechazo 1 u.' };
const HOY_BOMBA = { ganadas: 2, conversion: '67%', ventasPerdidas: 3, rechazos: 1, anulaciones: 1, clientes: 5 };

const mm = (m) => { window.matchMedia = () => ({ matches: m, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;
const esperar = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const directorio = (url = '/analisis/productos', movil = false, solicitudes = DATOS) => { mm(movil); return render(<MemoryRouter initialEntries={[url]}><Directorio role="comprador" solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>); };
const dashboard = (movil = false, sesion = {}, solicitudes = DATOS) => {
  sessionStorage.clear();
  Object.entries(sesion).forEach(([k, v]) => sessionStorage.setItem(k, JSON.stringify(v)));
  window.innerWidth = movil ? 400 : 1280; mm(movil);
  return render(<MemoryRouter><Dashboard role={movil ? 'vendedor' : 'comprador'} solicitudes={solicitudes} ordenesCompra={[]} /></MemoryRouter>);
};
const nombres = (c) => [...c.querySelectorAll('h3')].map((h) => h.textContent.trim());
const tarjeta = (c, desc, clase) => [...c.querySelectorAll('h3')].find((h) => h.textContent.trim() === desc).closest(clase);
const texto = (el, etiqueta) => within(el).getByText(etiqueta).parentElement.textContent.replace(/\s+/g, '');
const entero = (t) => Number(t.match(/\d+/)[0]);
const porcentaje = (t) => t.match(/\(([^)]*)\)/)[1];

beforeEach(() => {
  sessionStorage.clear();
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); reiniciarCapasParaPruebas(); reiniciarPopoverUnico(); sessionStorage.clear(); window.matchMedia = matchMediaOriginal; });

describe('Directorio de productos (tabla): ganadas, conversión, decisiones y clientes distintos por estado final', () => {
  const fila = (c, desc) => [...c.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(desc));
  const celda = (c, desc, columna) => {
    const cabeceras = [...c.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    return fila(c, desc).querySelectorAll('td')[cabeceras.indexOf(columna)].textContent.replace(/\s+/g, '');
  };

  it('los encabezados son Ganadas, Unidades ganadas y Clientes distintos (antes Cotizaciones Ganadas, Unidades Pedidas y Clientes)', async () => {
    const { container } = directorio();
    await esperar();
    const cabeceras = [...container.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    expect(cabeceras).toEqual(expect.arrayContaining(['Ganadas', 'Unidades ganadas', 'Clientes distintos', 'Anulaciones', 'Ventas perdidas', 'Rechazos', 'Volumen']));
    ['Cotizaciones Ganadas', 'Unidades Pedidas', 'Clientes', 'Unidades Cotizadas'].forEach((viejo) => expect(cabeceras).not.toContain(viejo));
  });

  it('BOMBA: 3 ganadas con 50 % de conversión, 1 anulación, 1 venta perdida, 1 rechazo y 4 clientes distintos', async () => {
    const { container } = directorio();
    await esperar();
    expect(entero(celda(container, 'BOMBA', 'Ganadas'))).toBe(BOMBA.ganadas);
    expect(porcentaje(celda(container, 'BOMBA', 'Ganadas'))).toBe(BOMBA.conversion);
    expect(entero(celda(container, 'BOMBA', 'Anulaciones'))).toBe(BOMBA.anulaciones);
    expect(entero(celda(container, 'BOMBA', 'Ventas perdidas'))).toBe(BOMBA.ventasPerdidas);
    expect(entero(celda(container, 'BOMBA', 'Rechazos'))).toBe(BOMBA.rechazos);
    expect(entero(celda(container, 'BOMBA', 'Clientes distintos'))).toBe(BOMBA.clientes);
    expect(entero(celda(container, 'BOMBA', 'Unidades ganadas'))).toBe(3);
  });

  it('las cifras cambian frente a las de hoy: ganadas 2 → 3, conversión 67 % → 50 %, ventas perdidas 3 → 1 y clientes 5 → 4', async () => {
    const { container } = directorio();
    await esperar();
    expect(entero(celda(container, 'BOMBA', 'Ganadas'))).not.toBe(HOY_BOMBA.ganadas);
    expect(porcentaje(celda(container, 'BOMBA', 'Ganadas'))).not.toBe(HOY_BOMBA.conversion);
    expect(entero(celda(container, 'BOMBA', 'Ventas perdidas'))).not.toBe(HOY_BOMBA.ventasPerdidas);
    expect(entero(celda(container, 'BOMBA', 'Clientes distintos'))).not.toBe(HOY_BOMBA.clientes);
    expect(entero(celda(container, 'BOMBA', 'Rechazos'))).toBe(HOY_BOMBA.rechazos);
    expect(entero(celda(container, 'BOMBA', 'Anulaciones'))).toBe(HOY_BOMBA.anulaciones);
  });

  it('un producto sin ítems cerrados (TUBO) muestra 0 con un guion en lugar de un porcentaje', async () => {
    const { container } = directorio();
    await esperar();
    expect(celda(container, 'TUBO', 'Ganadas')).toBe('0(—)');
  });

  it('el title de la conversión da la cuenta: ganados de cerrados con un decimal y coma', async () => {
    const { container } = directorio();
    await esperar();
    const etiqueta = fila(container, 'BOMBA').querySelector('[title^="Conversión"]');
    expect(etiqueta.getAttribute('title')).toBe('Conversión 50 %: 3 ítems ganados de 6 cerrados');
    expect(fila(container, 'TUBO').querySelector('[title^="Sin ítems cerrados"]')).not.toBeNull();
  });

  it('el encabezado de Ganadas explica la conversión y los datos a revisar no se muestran en ninguna parte', async () => {
    const { container } = directorio();
    await esperar();
    expect([...container.querySelectorAll('thead th')].find((th) => th.textContent.trim() === 'Ganadas').getAttribute('title')).toMatch(/conversión: ganados ÷ cerrados/);
    expect(document.body.textContent.toLowerCase()).not.toMatch(/a revisar|dato a revisar|datosarevisar/);
  });
});

describe('Directorio de productos: lo que no cambia con el estado final', () => {
  it('En seguimiento sigue sumándose línea a línea (BOMBA tiene 1 ítem en revisión; TUBO ninguno)', async () => {
    const { container } = directorio();
    await esperar();
    const cabeceras = [...container.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    const fila = (desc) => [...container.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(desc));
    expect(fila('BOMBA').querySelectorAll('td')[cabeceras.indexOf('En seguimiento')].textContent.trim()).toBe('1');
    expect(fila('TUBO').querySelectorAll('td')[cabeceras.indexOf('En seguimiento')].textContent.trim()).toBe('---');
  });

  it('la columna Marca junta todas las marcas del producto en el orden en que aparecen, y dice "Sin marca" si no hay ninguna', async () => {
    const { container } = directorio('/analisis/productos', false, [
      s('m1', 'Cotizado', 'Cliente Uno', [l('valvula', 'Cotizado', { marca: 'ABB' }), l('valvula', 'Cotizado', { marca: 'WEG' })]),
      s('m2', 'Cotizado', 'Cliente Dos', [l('codo', 'Cotizado', { marca: '' })])
    ]);
    await esperar();
    const filas = [...container.querySelectorAll('tbody tr')];
    const marca = (desc) => filas.find((tr) => tr.textContent.includes(desc)).querySelectorAll('td')[2].textContent.trim();
    expect(marca('VALVULA')).toBe('ABB, WEG');
    expect(marca('CODO')).toBe('Sin marca');
  });
});

describe('Directorio de productos (tarjeta móvil)', () => {
  it('las etiquetas son Ganadas, Und. ganadas y Clientes distintos, con las mismas cifras que la tabla', async () => {
    const { container } = directorio('/analisis/productos', true);
    await esperar();
    const t = tarjeta(container, 'BOMBA', '.surface');
    expect(entero(texto(t, 'Ganadas'))).toBe(BOMBA.ganadas);
    expect(porcentaje(texto(t, 'Ganadas'))).toBe(BOMBA.conversion);
    expect(entero(texto(t, 'Anulaciones'))).toBe(BOMBA.anulaciones);
    expect(entero(texto(t, 'Ventas perdidas'))).toBe(BOMBA.ventasPerdidas);
    expect(entero(texto(t, 'Rechazos'))).toBe(BOMBA.rechazos);
    expect(entero(texto(t, 'Clientes distintos'))).toBe(BOMBA.clientes);
    expect(entero(texto(t, 'Und. ganadas'))).toBe(3);
    ['Ganados', 'Und. Pedidas', 'Clientes'].forEach((viejo) => expect(within(t).queryByText(viejo)).toBeNull());
  });
});

describe('Tarjeta Top Productos: las mismas cifras', () => {
  it('escritorio: Ganados 3 (50 %), anulaciones, ventas perdidas y rechazos del estado final; la etiqueta ya no dice "Cotizaciones Ganadas"', () => {
    const { container } = dashboard();
    const t = tarjeta(container, 'BOMBA', '.cursor-pointer');
    expect(entero(texto(t, 'Ganados'))).toBe(BOMBA.ganadas);
    expect(porcentaje(texto(t, 'Ganados'))).toBe(BOMBA.conversion);
    expect(entero(texto(t, 'Anulaciones'))).toBe(BOMBA.anulaciones);
    expect(entero(texto(t, 'Ventas perdidas'))).toBe(BOMBA.ventasPerdidas);
    expect(entero(texto(t, 'Rechazos'))).toBe(BOMBA.rechazos);
    expect(within(t).queryByText('Cotizaciones Ganadas')).toBeNull();
    expect(texto(tarjeta(container, 'TUBO', '.cursor-pointer'), 'Ganados')).toBe('Ganados0(—)');
  });

  it('móvil: Ganados 3x (50 %) y el guion sin cerrados', () => {
    const { container } = dashboard(true);
    const t = tarjeta(container, 'BOMBA', '.snap-start');
    expect(texto(t, 'Ganados')).toBe('Ganados3x(50%)');
    expect(within(t).queryByText('Ganado')).toBeNull();
    expect(within(tarjeta(container, 'TUBO', '.snap-start')).getByText('Ganados').parentElement.textContent.replace(/\s+/g, '')).toBe('Ganados0');
  });

  it('el chip "Ganado" aparece solo si el producto no tiene ningún ítem abierto (CODO sí; BOMBA, con 2 abiertos, no)', () => {
    const { container } = dashboard();
    expect(within(tarjeta(container, 'CODO', '.cursor-pointer')).queryByText('Ganado')).not.toBeNull();
    expect(within(tarjeta(container, 'BOMBA', '.cursor-pointer')).queryByText('Ganado')).toBeNull();
  });
});

describe('Tarjeta Top Productos: title de la conversión, chip "Ganado" y marca', () => {
  const MEZCLA = [
    s('z1', 'Pedido', 'Cliente Uno', [l('valvula', 'Pedido', { marca: 'ABB' }), l('valvula', 'Venta Perdida', { marca: 'WEG' })]),
    s('z2', 'Cotizado', 'Cliente Dos', [l('codo2', 'Pedido'), l('codo2', 'Cotizado')])
  ];

  it('escritorio: el title de ganados da la cuenta (3 de 6 cerrados) y el del 0 sin cerrados dice que no hay conversión', () => {
    const { container } = dashboard();
    expect(within(tarjeta(container, 'BOMBA', '.cursor-pointer')).getByTitle('Conversión 50 %: 3 ítems ganados de 6 cerrados')).not.toBeNull();
    expect(within(tarjeta(container, 'TUBO', '.cursor-pointer')).getByTitle('Sin ítems cerrados: no hay conversión')).not.toBeNull();
  });

  it('móvil: el title de ganados da la cuenta', () => {
    const { container } = dashboard(true);
    expect(within(tarjeta(container, 'BOMBA', '.snap-start')).getByTitle('Conversión 50 %: 3 ítems ganados de 6 cerrados')).not.toBeNull();
  });

  it('el chip "Ganado" sale con ítems cerrados que no son ganados (una venta perdida) mientras no quede ninguno abierto, en escritorio y en móvil', () => {
    const esc = dashboard(false, {}, MEZCLA);
    expect(within(tarjeta(esc.container, 'VALVULA', '.cursor-pointer')).queryByText('Ganado')).not.toBeNull();
    expect(within(tarjeta(esc.container, 'CODO2', '.cursor-pointer')).queryByText('Ganado')).toBeNull();
    cleanup();
    const mov = dashboard(true, {}, MEZCLA);
    expect(within(tarjeta(mov.container, 'VALVULA', '.snap-start')).queryByText('Ganado')).not.toBeNull();
    expect(within(tarjeta(mov.container, 'CODO2', '.snap-start')).queryByText('Ganado')).toBeNull();
  });

  it('la marca de la tarjeta es la primera que aparece', () => {
    const { container } = dashboard(false, {}, MEZCLA);
    const t = tarjeta(container, 'VALVULA', '.cursor-pointer');
    expect(within(t).queryByText('ABB')).not.toBeNull();
    expect(within(t).queryByText('WEG')).toBeNull();
  });
});

describe('Tarjeta Top Productos: lista y marca', () => {
  it('muestra como mucho 5 productos y la marca de cada uno', () => {
    const siete = Array.from({ length: 7 }, (_, i) => s(`t${i}`, 'Cotizado', `Cliente ${i}`, [l(`prod ${i}`, 'Cotizado', { marca: 'MARCA-X' })]));
    const { container } = dashboard(false, {}, siete);
    const tarjetas = nombres(container).filter((n) => n.startsWith('PROD '));
    expect(tarjetas).toHaveLength(5);
    expect(within(tarjeta(container, tarjetas[0], '.cursor-pointer')).getByText('MARCA-X')).not.toBeNull();
  });
});

describe('Cruce de pantallas: la misma cifra en el Directorio, la tarjeta Top y la barra del mismo producto', () => {
  const cifrasDeLaBarra = (aria) => Object.fromEntries([...aria.matchAll(/(Ganado|Pendiente|Cotizado|Anulado|Venta perdida|Rechazo) (\d+) u\./g)].map((m) => [m[1], Number(m[2])]));

  it('escritorio: ganadas, anulaciones, ventas perdidas y rechazos del Directorio = los de la tarjeta Top = las unidades de la barra de cada una', async () => {
    const dir = directorio();
    await esperar();
    const filaDir = [...dir.container.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes('BOMBA'));
    const cabeceras = [...dir.container.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    const delDir = (col) => entero(filaDir.querySelectorAll('td')[cabeceras.indexOf(col)].textContent);
    const barraDir = cifrasDeLaBarra(filaDir.querySelector('.barra-apilada').getAttribute('aria-label'));
    cleanup();
    const top = dashboard();
    const t = tarjeta(top.container, 'BOMBA', '.cursor-pointer');
    const delTop = (etiqueta) => entero(texto(t, etiqueta));
    const barraTop = cifrasDeLaBarra(t.querySelector('.barra-apilada').getAttribute('aria-label'));
    expect([delDir('Ganadas'), delDir('Anulaciones'), delDir('Ventas perdidas'), delDir('Rechazos')]).toEqual([delTop('Ganados'), delTop('Anulaciones'), delTop('Ventas perdidas'), delTop('Rechazos')]);
    [barraDir, barraTop].forEach((barra) => expect([barra.Ganado, barra.Anulado, barra['Venta perdida'], barra.Rechazo]).toEqual([BOMBA.ganadas, BOMBA.anulaciones, BOMBA.ventasPerdidas, BOMBA.rechazos]));
    expect(filaDir.querySelector('.barra-apilada').getAttribute('aria-label')).toBe(BOMBA.barra);
    expect(t.querySelector('.barra-apilada').getAttribute('aria-label')).toBe(BOMBA.barra);
  });

  it('móvil: la tarjeta del Directorio y la de la tarjeta Top dan la misma cifra de ganadas y la misma conversión que la barra', async () => {
    const dir = directorio('/analisis/productos', true);
    await esperar();
    const tDir = tarjeta(dir.container, 'BOMBA', '.surface');
    const ganadasDir = entero(texto(tDir, 'Ganadas')); const convDir = porcentaje(texto(tDir, 'Ganadas'));
    expect(tDir.querySelector('.barra-apilada').getAttribute('aria-label')).toBe(BOMBA.barra);
    cleanup();
    const top = dashboard(true);
    const tTop = tarjeta(top.container, 'BOMBA', '.snap-start');
    expect([entero(texto(tTop, 'Ganados')), porcentaje(texto(tTop, 'Ganados'))]).toEqual([ganadasDir, convDir]);
    expect(tTop.querySelector('.barra-apilada').getAttribute('aria-label')).toBe(BOMBA.barra);
  });
});

describe('Claves de orden: no cambian de nombre, cambian las cifras que ordenan', () => {
  it('Directorio: ?orden=ganadas y ?orden=pedidos ordenan por ítems ganados (CODO con 4 antes que BOMBA con 3); ?orden=veces y una clave desconocida, por solicitudes (BOMBA antes)', async () => {
    const primero = async (url) => { const d = directorio(url); await esperar(); const p = [...d.container.querySelectorAll('tbody tr')][0].textContent; cleanup(); return p.includes('CODO') ? 'CODO' : p.includes('BOMBA') ? 'BOMBA' : p; };
    expect(await primero('/analisis/productos?orden=ganadas')).toBe('CODO');
    expect(await primero('/analisis/productos?orden=pedidos')).toBe('CODO');
    expect(await primero('/analisis/productos?orden=veces')).toBe('BOMBA');
    expect(await primero('/analisis/productos?orden=cotizados')).toBe('BOMBA');
    expect(await primero('/analisis/productos')).toBe('BOMBA');
  });

  it('Directorio: el botón de orden marcado sale de la clave normalizada: "ganadas" y "pedidos" marcan "Más ganados" y una clave desconocida marca "Más solicitados"', async () => {
    const marcado = async (url) => { const d = directorio(url); await esperar(); const b = [...d.container.querySelectorAll('button[aria-pressed="true"]')].map((x) => x.textContent.trim()).filter((x) => x.startsWith('Más')); cleanup(); return b; };
    expect(await marcado('/analisis/productos?orden=ganadas')).toEqual(['Más ganados']);
    expect(await marcado('/analisis/productos?orden=pedidos')).toEqual(['Más ganados']);
    expect(await marcado('/analisis/productos?orden=cotizados')).toEqual(['Más solicitados']);
    expect(await marcado('/analisis/productos')).toEqual(['Más solicitados']);
  });

  it('Directorio: las claves de decisión (ventasPerdidas, rechazos, anulaciones, decisiones) ordenan por el estado final', async () => {
    const primero = async (clave) => { const d = directorio(`/analisis/productos?orden=${clave}`); await esperar(); const p = [...d.container.querySelectorAll('tbody tr')][0].textContent; cleanup(); return p.includes('BOMBA'); };
    for (const clave of ['ventasPerdidas', 'rechazos', 'anulaciones', 'decisiones']) expect(await primero(clave)).toBe(true);
  });

  it('tarjeta Top: la clave guardada "ganadas" ordena por ganados (CODO primero), "veces" por solicitudes (BOMBA primero) y una desconocida cae en "veces"', () => {
    const primero = (orden) => { const d = dashboard(false, { analisis_top_prod_orden: orden }); const n = nombres(d.container).find((x) => ['CODO', 'BOMBA', 'TUBO'].includes(x)); cleanup(); return n; };
    expect(primero('ganadas')).toBe('CODO');
    expect(primero('veces')).toBe('BOMBA');
    expect(primero('clave-vieja-que-no-existe')).toBe('BOMBA');
  });
});
