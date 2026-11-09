// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BarraFiltros, FiltroBusqueda, FiltroSelect } from './index';
import { abrirCapa, cerrarCapaDesdeUI, reiniciarCapasParaPruebas } from './capasAtras';

/**
 * Historial que imita el de Chrome en lo que importa aquí: `history.go(delta)` resuelve su destino en el momento de LLAMARLO (relativo a
 * la entrada actual de ese instante) y se ejecuta después; un `pushState` hecho entre medias añade una entrada pero el `go` pendiente
 * aterriza en el destino ya calculado (jsdom, en cambio, lo resuelve al ejecutarlo y no reproduce el fallo). Las entradas previas
 * (`dashboard`, `detalle`) permiten detectar un retroceso de más: la entrada final debe seguir siendo `detalle`.
 */
let entradas;
let actual;
const instalarHistorial = () => {
  entradas = [{ state: { pagina: 'dashboard' } }, { state: { pagina: 'detalle' } }];
  actual = 1;
  const h = window.history;
  vi.spyOn(h, 'pushState').mockImplementation((state) => {
    entradas.splice(actual + 1);
    entradas.push({ state });
    actual += 1;
  });
  vi.spyOn(h, 'go').mockImplementation((delta) => {
    const destino = actual + delta;
    setTimeout(() => {
      if (destino < 0 || destino >= entradas.length) return;
      actual = destino;
      window.dispatchEvent(new PopStateEvent('popstate', { state: entradas[actual].state }));
    }, 0);
  });
  vi.spyOn(h, 'back').mockImplementation(() => h.go(-1));
  Object.defineProperty(h, 'state', { configurable: true, get: () => entradas[actual].state });
};
const desinstalarHistorial = () => {
  vi.restoreAllMocks();
  delete window.history.state;
};

const esperar = (ms = 40) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
// Espera a que la hoja termine de cerrarse (animación de salida del modal) y a que el historial se asiente (reconciliación + popstates).
const estable = async () => {
  if (screen.queryByRole('dialog')) await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 3000 });
  await esperar(400);
};
const filtros = () => (window.history.state && window.history.state.filtros) || 0;

const mm = (matches) => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }); };
const matchMediaOriginal = window.matchMedia;

const Barra = ({ dosFilas = false }) => (
  <BarraFiltros
    busqueda={<FiltroBusqueda value="" onChange={() => {}} ariaLabel="buscar" />}
    filtros={(
      <>
        <FiltroSelect value="" onChange={() => {}} opciones={['A', 'B']} prefijo="Estado:" ariaLabel="estado" />
        {dosFilas && <FiltroSelect value="" onChange={() => {}} opciones={['X', 'Y']} prefijo="Tipo:" ariaLabel="tipo" />}
      </>
    )}
    resultados={3}
  />
);
const montar = (props, estricto) => render(estricto ? <StrictMode><Barra {...props} /></StrictMode> : <Barra {...props} />);
const abrirHoja = async () => { fireEvent.click(screen.getByRole('button', { name: /Filtros/ })); await esperar(); };

beforeEach(() => { instalarHistorial(); mm(true); });
afterEach(async () => {
  cleanup();
  await new Promise((r) => setTimeout(r, 40));
  reiniciarCapasParaPruebas();
  desinstalarHistorial();
  window.matchMedia = matchMediaOriginal;
});

for (const [titulo, estricto] of [['con StrictMode', true], ['sin StrictMode', false]]) {
  describe(`hoja móvil y botón atrás por capas ${titulo}`, () => {
    it('abrir la hoja añade una sola entrada de historial (filtros === 1)', async () => {
      montar({}, estricto);
      await abrirHoja();
      await esperar(200);
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(filtros()).toBe(1);
      expect(entradas.length).toBe(3);
      expect(actual).toBe(2);
    });

    it('cerrar con el botón del pie vuelve a la entrada base', async () => {
      montar({}, estricto);
      await abrirHoja();
      fireEvent.click(screen.getByRole('button', { name: /^Ver / }));
      await estable();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(actual).toBe(1);
      expect(filtros()).toBe(0);
    });

    it('cerrar con la X vuelve a la entrada base', async () => {
      montar({}, estricto);
      await abrirHoja();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar filtros' }));
      await estable();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(actual).toBe(1);
      expect(filtros()).toBe(0);
    });

    it('cerrar tocando el fondo vuelve a la entrada base', async () => {
      montar({}, estricto);
      await abrirHoja();
      const fondo = document.querySelector('.modal-fondo');
      fireEvent.mouseDown(fondo);
      fireEvent.mouseUp(fondo);
      fireEvent.click(fondo);
      await estable();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(actual).toBe(1);
      expect(filtros()).toBe(0);
    });

    it('el botón atrás del sistema cierra la hoja sin salir de la pantalla', async () => {
      montar({}, estricto);
      await abrirHoja();
      window.history.back();
      await estable();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(actual).toBe(1);
    });

    it('doble cierre seguido (doble toque) no retrocede de más', async () => {
      montar({}, estricto);
      await abrirHoja();
      const x = screen.getByRole('button', { name: 'Cerrar filtros' });
      fireEvent.click(x);
      fireEvent.click(x);
      await estable();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(actual).toBe(1);
      expect(filtros()).toBe(0);
    });

    it('hoja con una fila: elegir una opción y cerrar la hoja vuelve a la entrada base', async () => {
      montar({}, estricto);
      await abrirHoja();
      fireEvent.click(screen.getByRole('combobox', { name: 'estado' }));
      await esperar(200);
      expect(filtros()).toBe(2);
      fireEvent.click(screen.getByRole('option', { name: 'B' }));
      await esperar(200);
      expect(filtros()).toBe(1);
      fireEvent.click(screen.getByRole('button', { name: /^Ver / }));
      await estable();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(actual).toBe(1);
    });

    it('cerrar la hoja con una fila abierta retira las dos entradas', async () => {
      montar({}, estricto);
      await abrirHoja();
      fireEvent.click(screen.getByRole('combobox', { name: 'estado' }));
      await esperar(200);
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar filtros' }));
      await estable();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(actual).toBe(1);
      expect(filtros()).toBe(0);
    });

    it('cambio de una fila a otra (acordeón): el historial coincide con las capas abiertas y al cerrar se vuelve a la base', async () => {
      montar({ dosFilas: true }, estricto);
      await abrirHoja();
      fireEvent.click(screen.getByRole('combobox', { name: 'estado' }));
      await esperar(200);
      expect(filtros()).toBe(2);
      fireEvent.click(screen.getByRole('combobox', { name: 'tipo' }));
      await esperar(300);
      expect(screen.getByRole('combobox', { name: 'tipo' }).getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByRole('combobox', { name: 'estado' }).getAttribute('aria-expanded')).toBe('false');
      expect(filtros()).toBe(2); // hoja + fila abierta
      fireEvent.click(screen.getByRole('option', { name: 'Y' }));
      await esperar(300);
      expect(filtros()).toBe(1);
      fireEvent.click(screen.getByRole('button', { name: /^Ver / }));
      await estable();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(actual).toBe(1);
      expect(filtros()).toBe(0);
    });

    it('abrir y cerrar la hoja varias veces seguidas deja siempre la entrada base', async () => {
      montar({}, estricto);
      for (let i = 0; i < 3; i += 1) {
        await abrirHoja();
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar filtros' }));
        await estable();
        expect(actual).toBe(1);
      }
    });
  });
}

describe('capas apiladas (hoja, fila y calendario) abriendo y cerrando en distinto orden', () => {
  const cerrados = [];
  const abrir = (nombre) => abrirCapa(() => cerrados.push(nombre));
  beforeEach(() => { cerrados.length = 0; });

  it('cerrar de arriba abajo: calendario, fila y hoja', async () => {
    const hoja = abrir('hoja'); const fila = abrir('fila'); const cal = abrir('calendario');
    await esperar(100);
    expect(filtros()).toBe(3);
    cerrarCapaDesdeUI(cal); await esperar(150);
    expect(filtros()).toBe(2);
    cerrarCapaDesdeUI(fila); await esperar(150);
    expect(filtros()).toBe(1);
    cerrarCapaDesdeUI(hoja); await esperar(150);
    expect(filtros()).toBe(0);
    expect(actual).toBe(1);
  });

  it('cerrar la hoja primero retira todas las entradas de golpe', async () => {
    const hoja = abrir('hoja'); abrir('fila'); abrir('calendario');
    await esperar(100);
    cerrarCapaDesdeUI(hoja);
    await esperar(200);
    expect(filtros()).toBe(0);
    expect(actual).toBe(1);
  });

  it('cerrar la fila (capa del medio) retira también el calendario que está encima', async () => {
    const hoja = abrir('hoja'); const fila = abrir('fila'); abrir('calendario');
    await esperar(100);
    cerrarCapaDesdeUI(fila);
    await esperar(200);
    expect(filtros()).toBe(1);
    cerrarCapaDesdeUI(hoja);
    await esperar(200);
    expect(filtros()).toBe(0);
    expect(actual).toBe(1);
  });

  it('cerrar la fila y abrir otra en el mismo instante (cambio de fila) mantiene la profundidad', async () => {
    abrir('hoja'); const filaA = abrir('filaA');
    await esperar(100);
    expect(filtros()).toBe(2);
    cerrarCapaDesdeUI(filaA);
    abrir('filaB');
    await esperar(200);
    expect(filtros()).toBe(2);
    expect(actual).toBe(3);
  });

  it('un cierre seguido de otro cierre de la misma capa solo retira una vez', async () => {
    const hoja = abrir('hoja');
    await esperar(100);
    cerrarCapaDesdeUI(hoja);
    cerrarCapaDesdeUI(hoja);
    await esperar(200);
    expect(filtros()).toBe(0);
    expect(actual).toBe(1);
  });

  it('abrir y cerrar en el mismo instante (doble montaje) no deja entradas ni retrocede', async () => {
    const a = abrir('hoja');
    cerrarCapaDesdeUI(a);
    abrir('hoja');
    await esperar(200);
    expect(filtros()).toBe(1);
    expect(entradas.length).toBe(3);
  });
});
