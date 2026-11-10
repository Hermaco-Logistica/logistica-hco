// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ModalRango } from './index';
import { reiniciarCapasParaPruebas } from './capasAtras';

/** ModalRango suelto: campos, validación por campo, Aplicar solo con las dos fechas válidas y cierres que no aplican nada. */
const esperar = (ms = 60) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
afterEach(async () => { cleanup(); await new Promise((r) => setTimeout(r, 40)); reiniciarCapasParaPruebas(); window.history.replaceState(null, ''); });

const montar = (props = {}) => {
  const onAplicar = vi.fn();
  const onCerrar = vi.fn();
  render(<ModalRango max="2026-06-15" onAplicar={onAplicar} onCerrar={onCerrar} {...props} />);
  return { onAplicar, onCerrar };
};
const desde = () => screen.getByLabelText('Desde');
const hasta = () => screen.getByLabelText('Hasta');
const aplicar = () => screen.getByRole('button', { name: 'Aplicar' });

describe('ModalRango', () => {
  it('es un diálogo con encabezado, dos campos de fecha con tope y los botones Cancelar y Aplicar', () => {
    montar({ desde: '2026-05-01', hasta: '2026-05-10' });
    const dialogo = screen.getByRole('dialog', { name: 'Rango de fechas' });
    expect(dialogo.tagName).toBe('FORM');
    expect(within(dialogo).getByRole('heading', { name: 'Rango de fechas' })).toBeTruthy();
    expect(desde().type).toBe('date');
    expect(desde().value).toBe('2026-05-01');
    expect(hasta().value).toBe('2026-05-10');
    expect(hasta().max).toBe('2026-06-15');
    expect(hasta().min).toBe('2026-05-01');
    expect(screen.getByRole('button', { name: 'Cancelar' }).type).toBe('button');
    expect(aplicar().type).toBe('submit');
    expect(aplicar().className).toContain('bg-primary');
  });

  it('Aplicar solo se habilita con las dos fechas válidas y cada error sale en su campo', () => {
    montar();
    expect(aplicar().disabled).toBe(true);
    fireEvent.change(desde(), { target: { value: '2026-05-10' } });
    expect(aplicar().disabled).toBe(true);
    fireEvent.change(hasta(), { target: { value: '2026-05-01' } });
    expect(aplicar().disabled).toBe(true);
    expect(hasta().getAttribute('aria-invalid')).toBe('true');
    expect(desde().getAttribute('aria-invalid')).toBeNull();
    fireEvent.change(hasta(), { target: { value: '2999-01-01' } });
    expect(aplicar().disabled).toBe(true);
    expect(hasta().getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(hasta(), { target: { value: '2026-05-10' } });
    expect(aplicar().disabled).toBe(false);
    expect(hasta().getAttribute('aria-invalid')).toBeNull();
  });

  it('Aplicar llama a onAplicar con el rango y cierra con la animación de salida', async () => {
    const { onAplicar, onCerrar } = montar({ desde: '2026-05-01', hasta: '2026-05-10' });
    fireEvent.change(hasta(), { target: { value: '2026-05-12' } });
    fireEvent.click(aplicar());
    expect(onAplicar).toHaveBeenCalledWith({ desde: '2026-05-01', hasta: '2026-05-12' });
    await esperar(260);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('con un rango inválido, enviar el formulario (Enter) no aplica nada', () => {
    const { onAplicar } = montar({ desde: '2026-05-10', hasta: '2026-05-01' });
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
      const { onAplicar, onCerrar } = montar({ desde: '2026-05-01', hasta: '2026-05-10' });
      await esperar();
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
