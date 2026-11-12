// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GlobalAlertModal } from './GlobalAlertModal';
import { avisarExito, TONO_AVISO_EXITO } from './avisarExito';
import { TONOS_MODAL } from '../../utils/modales';

let alertOriginal;
beforeEach(() => { alertOriginal = window.alert; });
afterEach(() => {
  cleanup();
  window.alert = alertOriginal;
  vi.useRealTimers();
});

const abrir = (...argumentos) => {
  render(<GlobalAlertModal />);
  act(() => { window.alert(...argumentos); });
  const dialogo = screen.getByRole('dialog', { name: 'Aviso' });
  const caja = dialogo.querySelector('h2').parentElement.previousElementSibling;
  return { dialogo, caja, icono: caja.querySelector('svg'), ok: screen.getByRole('button', { name: 'OK' }) };
};

describe('GlobalAlertModal: aviso de éxito', () => {
  it('el éxito deja la caja y el icono en el verde fijo, usa un check y solo el botón OK sigue el rol', () => {
    const { caja, icono, ok } = abrir('Solicitud anulada correctamente', undefined, TONO_AVISO_EXITO);
    TONOS_MODAL.exito.icono.split(' ').forEach((clase) => expect(caja.className).toContain(clase));
    expect(icono.getAttribute('class')).toMatch(/check/);
    expect(icono.getAttribute('class')).not.toMatch(/info/);
    expect(ok.className).toContain('bg-primary');
    expect(ok.className).toContain('hover:bg-primary-strong');
    expect(ok.className).not.toContain('emerald');
  });

  it('los demás avisos se quedan como hoy: caja verde, icono de información y botón verde fijo', () => {
    const { caja, icono, ok } = abrir('Error al guardar cotización');
    TONOS_MODAL.exito.icono.split(' ').forEach((clase) => expect(caja.className).toContain(clase));
    expect(icono.getAttribute('class')).toMatch(/info/);
    expect(icono.getAttribute('class')).not.toMatch(/check/);
    TONOS_MODAL.exito.boton.split(' ').forEach((clase) => expect(ok.className).toContain(clase));
    expect(ok.className).not.toContain('bg-primary');
  });

  it('un tercer argumento vacío o desconocido cae en el aspecto actual, y un aviso posterior no hereda el éxito', () => {
    [undefined, null, '', 'otro', true].forEach((tono) => {
      const { icono, ok } = abrir('Aviso', undefined, tono);
      expect(icono.getAttribute('class')).toMatch(/info/);
      expect(ok.className).toContain('bg-emerald-700');
      cleanup();
    });

    render(<GlobalAlertModal />);
    act(() => { window.alert('Hecho', undefined, TONO_AVISO_EXITO); });
    expect(screen.getByRole('button', { name: 'OK' }).className).toContain('bg-primary');
    act(() => { window.alert('Ahora un error'); });
    expect(screen.getByRole('button', { name: 'OK' }).className).toContain('bg-emerald-700');
  });

  it('avisarExito llama a window.alert con el mensaje, el callback y el tono de éxito, y el callback corre al pulsar OK', () => {
    const espia = vi.fn();
    window.alert = espia;
    const alCerrar = vi.fn();
    avisarExito('Solicitud Creada', alCerrar);
    expect(espia).toHaveBeenCalledWith('Solicitud Creada', alCerrar, TONO_AVISO_EXITO);

    window.alert = alertOriginal;
    vi.useFakeTimers();
    render(<GlobalAlertModal />);
    act(() => { avisarExito('Solicitud Creada', alCerrar); });
    expect(alCerrar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });
});
