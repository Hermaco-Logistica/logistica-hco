// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';
import { TONOS, TEXTO_TONO } from '../../utils/etiquetas';

afterEach(() => {
  cleanup();
  delete document.body.dataset.role;
});

const Disparador = ({ type }) => {
  const { addToast } = useToast();
  return <button type="button" onClick={() => addToast({ type, message: `Mensaje ${type}`, duration: 0 })}>lanzar</button>;
};

const lanzar = (type) => {
  render(<ToastProvider><Disparador type={type} /></ToastProvider>);
  act(() => { screen.getByText('lanzar').click(); });
  const aviso = screen.getByRole('alert');
  return { aviso, icono: aviso.querySelector('svg') };
};

describe('Toast', () => {
  it('el éxito usa el tono fijo "exito" de las etiquetas, sin borde ni clases del rol', () => {
    const { aviso } = lanzar('success');
    TONOS.exito.split(' ').forEach((clase) => expect(aviso.className).toContain(clase));
    expect(aviso.className).not.toMatch(/\bborder\b/);
    expect(aviso.className).not.toMatch(/primary|emerald-50|emerald-200/);
  });

  it('error, advertencia e información conservan sus colores fijos con borde', () => {
    const esperado = {
      error: ['bg-rose-50', 'text-rose-800', 'border-rose-200', 'text-rose-500'],
      warning: ['bg-amber-50', 'text-amber-800', 'border-amber-200', 'text-amber-500'],
      info: ['bg-blue-50', 'text-blue-800', 'border-blue-200', 'text-blue-500']
    };
    Object.entries(esperado).forEach(([tipo, clases]) => {
      const { aviso, icono } = lanzar(tipo);
      expect(aviso.className).toMatch(/\bborder\b/);
      clases.slice(0, 3).forEach((clase) => expect(aviso.className).toContain(clase));
      expect(icono.getAttribute('class')).toContain(clases[3]);
      cleanup();
    });
  });

  it('el icono de éxito es un verde fijo: no depende del rol ni usa text-emerald-500, que index.css remapea al rol', () => {
    ['comprador', 'vendedor', 'administrador', 'gerente'].forEach((rol) => {
      document.body.dataset.role = rol;
      const { icono } = lanzar('success');
      const clases = icono.getAttribute('class');
      expect(clases).toContain(TEXTO_TONO.exito);
      expect(clases).not.toMatch(/emerald-(400|500|600)|primary/);
      cleanup();
    });
  });
});
