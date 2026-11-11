// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CalendarioRango, elegirDiaRango } from './index';

afterEach(cleanup);

const d = (a, m, dia) => new Date(a, m - 1, dia);

describe('elegirDiaRango', () => {
  it('sin inicio: el toque es el inicio y no cierra (un solo toque equivale a un día)', () => {
    expect(elegirDiaRango(null, null, d(2026, 11, 5))).toEqual({ inicio: d(2026, 11, 5), fin: null, cerrar: false });
  });
  it('con inicio y sin fin: un día posterior es el fin y cierra', () => {
    expect(elegirDiaRango(d(2026, 11, 3), null, d(2026, 11, 12))).toEqual({ inicio: d(2026, 11, 3), fin: d(2026, 11, 12), cerrar: true });
  });
  it('con inicio y sin fin: el mismo día es el fin (rango de un día) y cierra', () => {
    expect(elegirDiaRango(d(2026, 11, 3), null, d(2026, 11, 3))).toEqual({ inicio: d(2026, 11, 3), fin: d(2026, 11, 3), cerrar: true });
  });
  it('con inicio y sin fin: un día anterior reemplaza el inicio y no cierra', () => {
    expect(elegirDiaRango(d(2026, 11, 10), null, d(2026, 11, 2))).toEqual({ inicio: d(2026, 11, 2), fin: null, cerrar: false });
  });
  it('con el rango completo: el tercer toque empieza otro rango', () => {
    expect(elegirDiaRango(d(2026, 11, 3), d(2026, 11, 12), d(2026, 11, 20))).toEqual({ inicio: d(2026, 11, 20), fin: null, cerrar: false });
  });
});

describe('CalendarioRango', () => {
  const montar = (props = {}) => {
    const onElegirDia = vi.fn();
    const onCambiarMes = vi.fn();
    const r = render(<CalendarioRango mes={d(2026, 11, 1)} onCambiarMes={onCambiarMes} onElegirDia={onElegirDia} {...props} />);
    return { onElegirDia, onCambiarMes, ...r };
  };
  const dia = (n) => screen.getAllByRole('button').find((b) => b.textContent === String(n));

  it('pinta el mes, las iniciales de los días y los números en filas de siete con el aspecto de la hoja', () => {
    const { container } = montar();
    expect(screen.getByText('noviembre de 2026').className).toContain('uppercase');
    expect([...container.querySelectorAll('[aria-hidden="true"] span')].map((s) => s.textContent)).toEqual(['D', 'L', 'M', 'M', 'J', 'V', 'S']);
    const cuadricula = container.querySelectorAll('.grid-cols-7')[1];
    expect(cuadricula.className).toContain('gap-1');
    expect(cuadricula.querySelectorAll('button')).toHaveLength(30);
    expect(dia(15).className).toContain('text-[11px]');
    expect(screen.getByRole('button', { name: 'Mes anterior' }).className).toContain('rounded-lg');
  });

  it('deja huecos al inicio según el día de la semana (octubre de 2026 empieza en jueves)', () => {
    const { container } = montar({ mes: d(2026, 10, 1) });
    const cuadricula = container.querySelectorAll('.grid-cols-7')[1];
    expect(cuadricula.children.length).toBe(4 + 31);
  });

  it('flechasRedondeo cambia solo el radio de las flechas de mes', () => {
    montar({ flechasRedondeo: 'xl' });
    expect(screen.getByRole('button', { name: 'Mes anterior' }).className).toContain('rounded-xl');
    expect(screen.getByRole('button', { name: 'Mes siguiente' }).className).toContain('rounded-xl');
  });

  it('inicio y fin son un círculo oscuro con texto blanco y los del medio un fondo claro sin radio', () => {
    montar({ inicio: d(2026, 11, 3), fin: d(2026, 11, 6) });
    for (const n of [3, 6]) {
      expect(dia(n).className).toContain('bg-slate-900');
      expect(dia(n).className).toContain('text-white');
      expect(dia(n).className).toContain('rounded-full');
    }
    for (const n of [4, 5]) {
      expect(dia(n).className).toContain('bg-slate-100');
      expect(dia(n).className).toContain('rounded-none');
    }
    expect(dia(7).className).not.toContain('bg-slate-900');
  });

  it('elegir un día llama a onElegirDia con ese Date; las flechas de mes llaman a onCambiarMes(±1)', () => {
    const { onElegirDia, onCambiarMes } = montar();
    fireEvent.click(dia(9));
    expect(onElegirDia).toHaveBeenCalledWith(d(2026, 11, 9));
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(onCambiarMes.mock.calls.map((c) => c[0])).toEqual([-1, 1]);
  });

  it('sin max no hay límite: los días futuros se eligen y la flecha ">" está activa', () => {
    const { onElegirDia } = montar();
    expect(screen.getByRole('button', { name: 'Mes siguiente' }).disabled).toBe(false);
    fireEvent.click(dia(28));
    expect(onElegirDia).toHaveBeenCalledTimes(1);
  });

  it('con max, los días posteriores quedan aria-disabled y sin efecto; el propio max y los anteriores se eligen', () => {
    const { onElegirDia } = montar({ max: d(2026, 11, 11) });
    expect(dia(12).getAttribute('aria-disabled')).toBe('true');
    expect(dia(30).getAttribute('aria-disabled')).toBe('true');
    expect(dia(11).getAttribute('aria-disabled')).toBeNull();
    expect(dia(1).getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(dia(12));
    expect(onElegirDia).not.toHaveBeenCalled();
    fireEvent.click(dia(11));
    expect(onElegirDia).toHaveBeenCalledWith(d(2026, 11, 11));
  });

  it('con max, la flecha ">" se deshabilita en el mes actual y no en los anteriores', () => {
    const a = montar({ max: d(2026, 11, 11) });
    const siguiente = screen.getByRole('button', { name: 'Mes siguiente' });
    expect(siguiente.disabled).toBe(true);
    fireEvent.click(siguiente);
    expect(a.onCambiarMes).not.toHaveBeenCalled();
    a.unmount();
    montar({ mes: d(2026, 9, 1), max: d(2026, 11, 11) });
    expect(screen.getByRole('button', { name: 'Mes siguiente' }).disabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Mes anterior' }).disabled).toBe(false);
  });

  it('cada día lleva aria-label con la fecha completa y su papel en la selección; aria-pressed solo si está seleccionado', () => {
    montar({ inicio: d(2026, 11, 3), fin: d(2026, 11, 5) });
    expect(dia(1).getAttribute('aria-label')).toBe('1 de noviembre de 2026');
    expect(dia(3).getAttribute('aria-label')).toBe('3 de noviembre de 2026, inicio del rango');
    expect(dia(4).getAttribute('aria-label')).toBe('4 de noviembre de 2026, dentro del rango');
    expect(dia(5).getAttribute('aria-label')).toBe('5 de noviembre de 2026, fin del rango');
    expect(['3', '4', '5'].map((n) => dia(n).getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);
    expect(dia(1).getAttribute('aria-pressed')).toBe('false');
    expect(dia(6).getAttribute('aria-pressed')).toBe('false');
  });

  it('un solo día elegido (inicio = fin) se anuncia como "un día"', () => {
    montar({ inicio: d(2026, 11, 8), fin: d(2026, 11, 8) });
    expect(dia(8).getAttribute('aria-label')).toBe('8 de noviembre de 2026, un día');
  });

  it('el título del mes se anuncia (aria-live polite) y las flechas de mes tienen nombre y foco visible', () => {
    montar();
    expect(screen.getByText('noviembre de 2026').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('button', { name: 'Mes anterior' }).className).toContain('focus-visible:outline-2');
    expect(dia(1).className).toContain('focus-visible:outline-2');
  });
});
