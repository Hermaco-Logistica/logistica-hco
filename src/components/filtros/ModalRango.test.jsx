// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ModalRango } from './index';
import { reiniciarCapasParaPruebas } from './capasAtras';

/** ModalRango suelto: calendario en lugar de campos, resumen "(un día)", sin días futuros y cierres que no aplican nada. */
const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.history.replaceState(null, ''); });

const montar = (props = {}) => {
  const onAplicar = vi.fn();
  const onCerrar = vi.fn();
  render(<ModalRango max="2026-05-15" desde="2026-05-01" hasta="2026-05-10" onAplicar={onAplicar} onCerrar={onCerrar} {...props} />);
  return { onAplicar, onCerrar };
};
const dia = (n) => screen.getAllByRole('button').find((b) => b.hasAttribute('aria-pressed') && b.textContent === String(n));
const resumen = () => document.querySelector('[data-resumen-rango]').textContent;
const aplicar = () => screen.getByRole('button', { name: 'Aplicar' });

describe('ModalRango', () => {
  it('es un diálogo con encabezado, resumen, calendario y los botones Cancelar y Aplicar, sin campos de fecha nativos', () => {
    montar();
    const dialogo = screen.getByRole('dialog', { name: 'Rango de fechas' });
    expect(dialogo.tagName).toBe('FORM');
    expect(within(dialogo).getByRole('heading', { name: 'Rango de fechas' })).toBeTruthy();
    expect(within(dialogo).getByText('mayo de 2026')).toBeTruthy();
    expect(dialogo.querySelector('input')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar' }).type).toBe('button');
    expect(aplicar().type).toBe('submit');
    expect(aplicar().className).toContain('bg-primary');
  });

  it('abre prellenado con el rango actual: resumen, calendario en su mes e inicio, medio y fin marcados', () => {
    montar();
    expect(resumen()).toBe('01/05/2026 — 10/05/2026');
    expect(dia(1).getAttribute('aria-label')).toBe('1 de mayo de 2026, inicio del rango');
    expect(dia(5).getAttribute('aria-label')).toBe('5 de mayo de 2026, dentro del rango');
    expect(dia(10).getAttribute('aria-label')).toBe('10 de mayo de 2026, fin del rango');
    expect(dia(1).className).toContain('bg-slate-900');
    expect(dia(5).className).toContain('bg-slate-100');
    expect(aplicar().disabled).toBe(false);
  });

  it('sin fechas: resumen de ayuda y Aplicar deshabilitado hasta elegir un día', () => {
    montar({ desde: '', hasta: '' });
    expect(resumen()).toBe('Elige un día o un rango');
    expect(aplicar().disabled).toBe(true);
    expect(screen.queryByText(/Se aplicará solo este día/)).toBeNull();
    fireEvent.click(dia(5));
    expect(aplicar().disabled).toBe(false);
  });

  it('un toque es un día: el resumen dice "(un día)", una ayuda avisa que se aplicará solo ese día y Aplicar manda desde = hasta', async () => {
    const { onAplicar, onCerrar } = montar();
    fireEvent.click(dia(5));
    expect(resumen()).toBe('05/05/2026 (un día)');
    expect(screen.getByText(/Se aplicará solo este día\. Toca otro día para elegir un rango\./)).toBeTruthy();
    expect(dia(5).className).toContain('bg-slate-900');
    expect(dia(1).className).not.toContain('bg-slate-900');
    fireEvent.click(aplicar());
    expect(onAplicar).toHaveBeenCalledWith({ desde: '2026-05-05', hasta: '2026-05-05' });
    await esperar(260);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('dos toques son un rango: el segundo posterior es el fin y la ayuda desaparece; el anterior reemplaza el inicio', () => {
    const { onAplicar } = montar();
    fireEvent.click(dia(5));
    fireEvent.click(dia(12));
    expect(resumen()).toBe('05/05/2026 — 12/05/2026');
    expect(screen.queryByText(/Se aplicará solo este día/)).toBeNull();
    fireEvent.click(aplicar());
    expect(onAplicar).toHaveBeenCalledWith({ desde: '2026-05-05', hasta: '2026-05-12' });
  });

  it('el segundo toque anterior al inicio lo reemplaza, y tocar el mismo día dos veces sigue siendo un día', () => {
    montar();
    fireEvent.click(dia(10));
    fireEvent.click(dia(3));
    expect(resumen()).toBe('03/05/2026 (un día)');
    fireEvent.click(dia(3));
    expect(resumen()).toBe('03/05/2026 (un día)');
    expect(screen.queryByText(/Se aplicará solo este día/)).toBeNull();
  });

  it('con el rango completo, un tercer toque empieza otro', () => {
    montar();
    fireEvent.click(dia(5));
    fireEvent.click(dia(8));
    fireEvent.click(dia(12));
    expect(resumen()).toBe('12/05/2026 (un día)');
  });

  it('los días posteriores a max no se eligen, la flecha ">" está deshabilitada en el mes de max y "<" navega', () => {
    const { onAplicar } = montar();
    expect(dia(16).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(dia(16));
    expect(resumen()).toBe('01/05/2026 — 10/05/2026');
    expect(screen.getByRole('button', { name: 'Mes siguiente' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(screen.getByText('abril de 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mes siguiente' }).disabled).toBe(false);
    expect(onAplicar).not.toHaveBeenCalled();
  });

  it('con un rango inválido (por ejemplo, fechas futuras que llegan de fuera) Aplicar no se habilita ni envía', () => {
    const { onAplicar } = montar({ desde: '2999-01-01', hasta: '2999-01-05', max: undefined });
    expect(aplicar().disabled).toBe(true);
    fireEvent.submit(screen.getByRole('dialog', { name: 'Rango de fechas' }));
    expect(onAplicar).not.toHaveBeenCalled();
  });

  it('Cancelar, la X, Escape, el fondo y el botón atrás cierran sin aplicar', async () => {
    const cierres = [
      () => fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })),
      () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar' })),
      () => fireEvent.keyDown(document, { key: 'Escape' }),
      () => { const fondo = screen.getByRole('dialog').parentElement; fireEvent.mouseDown(fondo); fireEvent.click(fondo); },
      async () => { window.history.back(); }
    ];
    for (const cerrar of cierres) {
      const { onAplicar, onCerrar } = montar();
      await esperar();
      fireEvent.click(dia(7));
      await cerrar();
      await esperar(300);
      expect(onCerrar).toHaveBeenCalledTimes(1);
      expect(onAplicar).not.toHaveBeenCalled();
      cleanup();
      await esperar(60);
      reiniciarCapasParaPruebas();
    }
  });
});
