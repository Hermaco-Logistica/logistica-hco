// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CalendarioRango, ModalRango } from './index';
import { reiniciarCapasParaPruebas } from './capasAtras';

/**
 * Teclado de CalendarioRango: roving tabindex, flechas, Inicio/Fin, AvPág/RePág, tope `max`, foco al montar y al cerrar el modal.
 * La fecha de hoy se congela en el 11 de noviembre de 2026.
 */
const d = (a, m, dia) => new Date(a, m - 1, dia);
const esperar = (ms = 40) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 11, 12, 0, 0)); });
afterEach(async () => { cleanup(); vi.useRealTimers(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.history.replaceState(null, ''); });

const Calendario = ({ mesInicial = d(2026, 11, 1), ...props }) => {
  const [mes, setMes] = useState(mesInicial);
  return <CalendarioRango mes={mes} onCambiarMes={(o) => setMes((m) => new Date(m.getFullYear(), m.getMonth() + o, 1))} onElegirDia={() => {}} {...props} />;
};
const dia = (clave) => document.querySelector(`[data-dia="${clave}"]`);
const tabulables = () => [...document.querySelectorAll('[data-dia]')].filter((b) => b.getAttribute('tabindex') === '0').map((b) => b.getAttribute('data-dia'));
const tecla = async (el, key, extra = {}) => { fireEvent.keyDown(el, { key, ...extra }); await esperar(); };
const enfocado = () => document.activeElement.getAttribute('data-dia');

describe('CalendarioRango: roving tabindex', () => {
  it('solo un día está en el orden de tabulación: el inicio, si lo hay', () => {
    render(<Calendario inicio={d(2026, 11, 8)} fin={d(2026, 11, 9)} />);
    expect(tabulables()).toEqual(['2026-11-08']);
  });
  it('sin selección, hoy', () => {
    render(<Calendario />);
    expect(tabulables()).toEqual(['2026-11-11']);
  });
  it('sin selección y en otro mes, el primer día elegible; con max, nunca uno posterior', () => {
    render(<Calendario mesInicial={d(2026, 10, 1)} />);
    expect(tabulables()).toEqual(['2026-10-01']);
    cleanup();
    render(<Calendario max={d(2026, 11, 5)} />);
    expect(tabulables()).toEqual(['2026-11-05']);
  });
  it('al enfocar otro día (por ejemplo con un clic) ese pasa a ser el de la tabulación; un día deshabilitado no', () => {
    render(<Calendario max={d(2026, 11, 20)} />);
    fireEvent.focus(dia('2026-11-15'));
    expect(tabulables()).toEqual(['2026-11-15']);
    fireEvent.focus(dia('2026-11-25'));
    expect(tabulables()).toEqual(['2026-11-15']);
    expect(dia('2026-11-25').getAttribute('tabindex')).toBe('-1');
  });
});

describe('CalendarioRango: flechas, Inicio/Fin y AvPág/RePág', () => {
  it('izquierda y derecha mueven un día; arriba y abajo, una semana', async () => {
    render(<Calendario />);
    dia('2026-11-11').focus();
    await tecla(document.activeElement, 'ArrowRight'); expect(enfocado()).toBe('2026-11-12');
    await tecla(document.activeElement, 'ArrowLeft'); expect(enfocado()).toBe('2026-11-11');
    await tecla(document.activeElement, 'ArrowDown'); expect(enfocado()).toBe('2026-11-18');
    await tecla(document.activeElement, 'ArrowUp'); expect(enfocado()).toBe('2026-11-11');
    expect(tabulables()).toEqual(['2026-11-11']);
  });
  it('al salir del mes con las flechas, cambia de mes (onCambiarMes) y el foco sigue al día', async () => {
    render(<Calendario mesInicial={d(2026, 11, 1)} />);
    dia('2026-11-30').focus();
    await tecla(document.activeElement, 'ArrowRight');
    expect(screen.getByText('diciembre de 2026')).toBeTruthy();
    expect(enfocado()).toBe('2026-12-01');
    await tecla(document.activeElement, 'ArrowLeft');
    expect(screen.getByText('noviembre de 2026')).toBeTruthy();
    expect(enfocado()).toBe('2026-11-30');
    await tecla(document.activeElement, 'ArrowUp'); await tecla(document.activeElement, 'ArrowUp'); await tecla(document.activeElement, 'ArrowUp'); await tecla(document.activeElement, 'ArrowUp'); await tecla(document.activeElement, 'ArrowUp');
    expect(screen.getByText('octubre de 2026')).toBeTruthy();
    expect(enfocado()).toBe('2026-10-26');
  });
  it('Inicio y Fin van al primer y último día de su fila (domingo y sábado), sin salir del mes', async () => {
    render(<Calendario />);
    dia('2026-11-11').focus();
    await tecla(document.activeElement, 'Home'); expect(enfocado()).toBe('2026-11-08');
    await tecla(document.activeElement, 'End'); expect(enfocado()).toBe('2026-11-14');
    dia('2026-11-30').focus();
    await tecla(document.activeElement, 'End'); expect(enfocado()).toBe('2026-11-30');
    expect(screen.getByText('noviembre de 2026')).toBeTruthy();
  });
  it('AvPág y RePág cambian de mes conservando el día (o el último del mes)', async () => {
    render(<Calendario mesInicial={d(2026, 1, 1)} />);
    dia('2026-01-31').focus();
    await tecla(document.activeElement, 'PageDown');
    expect(screen.getByText('febrero de 2026')).toBeTruthy();
    expect(enfocado()).toBe('2026-02-28');
    await tecla(document.activeElement, 'PageUp');
    expect(screen.getByText('enero de 2026')).toBeTruthy();
    expect(enfocado()).toBe('2026-01-28');
  });
  it('las teclas con Ctrl, Alt o Meta no se interceptan', async () => {
    render(<Calendario />);
    dia('2026-11-11').focus();
    const sinCancelar = fireEvent.keyDown(document.activeElement, { key: 'ArrowRight', ctrlKey: true });
    expect(sinCancelar).toBe(true);
    expect(enfocado()).toBe('2026-11-11');
  });
  it('Enter y Espacio no se interceptan: eligen con la activación nativa del botón (un clic), una sola vez', () => {
    const onElegirDia = vi.fn();
    render(<Calendario onElegirDia={onElegirDia} />);
    const boton = dia('2026-11-11');
    boton.focus();
    expect(fireEvent.keyDown(boton, { key: 'Enter' })).toBe(true);
    expect(fireEvent.keyDown(boton, { key: ' ' })).toBe(true);
    fireEvent.click(boton);
    expect(onElegirDia).toHaveBeenCalledTimes(1);
    expect(onElegirDia).toHaveBeenCalledWith(d(2026, 11, 11));
  });
});

describe('CalendarioRango: tope max con el teclado', () => {
  it('derecha en max no se mueve; abajo que pasa de max se queda en max; AvPág a un mes posterior no se mueve', async () => {
    render(<Calendario max={d(2026, 11, 11)} />);
    dia('2026-11-11').focus();
    await tecla(document.activeElement, 'ArrowRight'); expect(enfocado()).toBe('2026-11-11');
    dia('2026-11-08').focus();
    await tecla(document.activeElement, 'ArrowDown'); expect(enfocado()).toBe('2026-11-11');
    await tecla(document.activeElement, 'PageDown');
    expect(screen.getByText('noviembre de 2026')).toBeTruthy();
    expect(enfocado()).toBe('2026-11-11');
    await tecla(document.activeElement, 'End'); expect(enfocado()).toBe('2026-11-11');
  });
  it('los días posteriores a max no reciben el foco con el teclado ni están en la tabulación', async () => {
    render(<Calendario max={d(2026, 11, 11)} />);
    for (const n of ['12', '20', '30']) expect(dia(`2026-11-${n}`).getAttribute('tabindex')).toBe('-1');
    dia('2026-11-10').focus();
    await tecla(document.activeElement, 'ArrowRight');
    await tecla(document.activeElement, 'ArrowRight');
    await tecla(document.activeElement, 'ArrowRight');
    expect(enfocado()).toBe('2026-11-11');
  });
  it('RePág desde el mes de max sí navega hacia atrás y AvPág vuelve hasta el mes de max', async () => {
    render(<Calendario max={d(2026, 11, 11)} />);
    dia('2026-11-11').focus();
    await tecla(document.activeElement, 'PageUp');
    expect(screen.getByText('octubre de 2026')).toBeTruthy();
    expect(enfocado()).toBe('2026-10-11');
    await tecla(document.activeElement, 'PageDown');
    expect(screen.getByText('noviembre de 2026')).toBeTruthy();
    expect(enfocado()).toBe('2026-11-11');
  });
});

describe('CalendarioRango: aspecto del foco y movimiento reducido', () => {
  it('los días y las flechas de mes tienen foco visible con separación, y los días no animan con movimiento reducido', () => {
    render(<Calendario />);
    const boton = dia('2026-11-11');
    expect(boton.className).toContain('focus-visible:outline-2');
    expect(boton.className).toContain('focus-visible:outline-offset-2');
    expect(boton.className).toContain('focus-visible:outline-primary');
    expect(boton.className).toContain('motion-reduce:transition-none');
    expect(screen.getByRole('button', { name: 'Mes anterior' }).className).toContain('focus-visible:outline-offset-2');
  });
  it('el aspecto no cambia: mismas clases de color, tamaño y forma que antes del teclado', () => {
    render(<Calendario inicio={d(2026, 11, 3)} fin={d(2026, 11, 6)} />);
    expect(dia('2026-11-03').className).toContain('bg-slate-900 text-white rounded-full font-black');
    expect(dia('2026-11-04').className).toContain('bg-slate-100 text-slate-900 rounded-none');
    expect(dia('2026-11-08').className).toContain('hover:bg-slate-100 text-slate-700');
    expect(dia('2026-11-08').className).toContain('text-[11px]');
  });
});

describe('CalendarioRango autoFoco y ModalRango: foco al abrir y al cerrar', () => {
  it('autoFoco lleva el foco al día de la selección o, sin ella, a hoy', async () => {
    render(<Calendario autoFoco inicio={d(2026, 11, 8)} />);
    await esperar();
    expect(enfocado()).toBe('2026-11-08');
    cleanup();
    render(<Calendario autoFoco />);
    await esperar();
    expect(enfocado()).toBe('2026-11-11');
  });

  const Abridor = ({ desde = '', hasta = '' }) => {
    const [abierto, setAbierto] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setAbierto(true)}>abrir</button>
        {abierto && <ModalRango desde={desde} hasta={hasta} max="2026-11-11" onAplicar={() => {}} onCerrar={() => setAbierto(false)} />}
      </>
    );
  };

  it('al abrir el modal el foco queda en el día seleccionado, o en hoy sin selección', async () => {
    render(<Abridor desde="2026-11-03" hasta="2026-11-06" />);
    screen.getByRole('button', { name: 'abrir' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    await esperar(80);
    expect(enfocado()).toBe('2026-11-03');
    cleanup();
    await esperar(60);
    reiniciarCapasParaPruebas();
    render(<Abridor />);
    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    await esperar(80);
    expect(enfocado()).toBe('2026-11-11');
  });

  it('al cerrar (Cancelar, Escape o atrás) el foco vuelve a quien abrió el modal', async () => {
    render(<Abridor desde="2026-11-03" hasta="2026-11-06" />);
    const abrir = screen.getByRole('button', { name: 'abrir' });
    for (const cerrar of [
      () => fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })),
      () => fireEvent.keyDown(document, { key: 'Escape' }),
      () => { window.history.back(); }
    ]) {
      abrir.focus();
      fireEvent.click(abrir);
      await esperar(80);
      expect(screen.getByRole('dialog')).toBeTruthy();
      await act(async () => { cerrar(); });
      await esperar(320);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(abrir);
      reiniciarCapasParaPruebas();
    }
  });

  it('con el teclado se puede elegir un rango completo dentro del modal y aplicarlo', async () => {
    const onAplicar = vi.fn();
    render(<ModalRango max="2026-11-11" onAplicar={onAplicar} onCerrar={() => {}} />);
    await esperar(80);
    expect(enfocado()).toBe('2026-11-11');
    await tecla(document.activeElement, 'ArrowLeft'); await tecla(document.activeElement, 'ArrowLeft'); await tecla(document.activeElement, 'ArrowLeft');
    expect(enfocado()).toBe('2026-11-08');
    fireEvent.click(document.activeElement);
    await tecla(document.activeElement, 'ArrowRight'); await tecla(document.activeElement, 'ArrowRight');
    fireEvent.click(document.activeElement);
    expect(document.querySelector('[data-resumen-rango]').textContent).toBe('08/11/2026 — 10/11/2026');
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onAplicar).toHaveBeenCalledWith({ desde: '2026-11-08', hasta: '2026-11-10' });
  });
});
