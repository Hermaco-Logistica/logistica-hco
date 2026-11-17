// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { abrirPopoverUnico, alternarPopoverUnico, cerrarPopoverUnico, reiniciarPopoverUnico, useEsPopoverActivo } from './popoverUnico';

afterEach(() => { cleanup(); reiniciarPopoverUnico(); });

describe('popoverUnico', () => {
  it('abrir uno lo marca activo y abrir otro desactiva el anterior (solo uno a la vez)', () => {
    const a = renderHook(() => useEsPopoverActivo('a'));
    const b = renderHook(() => useEsPopoverActivo('b'));
    expect([a.result.current, b.result.current]).toEqual([false, false]);
    act(() => abrirPopoverUnico('a'));
    expect([a.result.current, b.result.current]).toEqual([true, false]);
    act(() => abrirPopoverUnico('b'));
    expect([a.result.current, b.result.current]).toEqual([false, true]);
  });

  it('cerrar solo cierra si el id es el activo', () => {
    const a = renderHook(() => useEsPopoverActivo('a'));
    act(() => abrirPopoverUnico('a'));
    act(() => cerrarPopoverUnico('otro'));
    expect(a.result.current).toBe(true);
    act(() => cerrarPopoverUnico('a'));
    expect(a.result.current).toBe(false);
  });

  it('alternar abre y cierra', () => {
    const a = renderHook(() => useEsPopoverActivo('a'));
    act(() => alternarPopoverUnico('a'));
    expect(a.result.current).toBe(true);
    act(() => alternarPopoverUnico('a'));
    expect(a.result.current).toBe(false);
  });

  it('al abrir un popover solo se vuelven a pintar el que se abre y el que se cierra, no los demás', () => {
    let pintadas = 0;
    renderHook(() => { pintadas += 1; return useEsPopoverActivo('ajeno'); });
    act(() => abrirPopoverUnico('a'));
    act(() => abrirPopoverUnico('b'));
    act(() => cerrarPopoverUnico('b'));
    expect(pintadas).toBe(1);
  });

  it('abrir el que ya está abierto no avisa a nadie', () => {
    let pintadas = 0;
    renderHook(() => { pintadas += 1; return useEsPopoverActivo('a'); });
    act(() => abrirPopoverUnico('a'));
    const antes = pintadas;
    act(() => abrirPopoverUnico('a'));
    expect(pintadas).toBe(antes);
  });
});
