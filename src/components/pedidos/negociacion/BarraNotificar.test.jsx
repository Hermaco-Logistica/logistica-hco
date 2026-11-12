// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BarraNotificar } from './BarraNotificar';

afterEach(cleanup);

const abrirConfirmacion = (props = {}) => {
  const onNotificar = vi.fn();
  render(
    <BarraNotificar
      unnotifiedCount={4}
      notificacionPendienteEmail={false}
      onNotificar={onNotificar}
      onReintentar={() => {}}
      isLoading={false}
      isVendedor
      resumenAcciones={{ aprobados: 1, ajustes: 2, denegados: 3, ventasPerdidas: 4 }}
      {...props}
    />
  );
  // La barra se pinta dos veces (móvil y escritorio): cualquiera de los dos botones abre el modal.
  fireEvent.click(screen.getAllByRole('button', { name: /Confirmar y notificar a Compras|Notificar/ })[0]);
  return { onNotificar, dialogo: screen.getByRole('dialog', { name: 'Confirmar notificación' }) };
};

describe('BarraNotificar: modal "Confirmar notificación"', () => {
  it('el icono del encabezado y el botón "Enviar" siguen el color del rol, no el verde fijo de éxito', () => {
    const { dialogo } = abrirConfirmacion();
    const caja = dialogo.querySelector('h2').parentElement.previousElementSibling;
    expect(caja.className).toContain('bg-primary/15');
    expect(caja.className).toContain('text-primary-strong');
    expect(caja.className).not.toContain('emerald');

    const enviar = screen.getByRole('button', { name: 'Enviar' });
    expect(enviar.className).toContain('bg-primary');
    expect(enviar.className).toContain('hover:bg-primary-strong');
    expect(enviar.className).not.toContain('emerald');
  });

  it('el resumen de decisiones conserva sus colores fijos (aprobados, contraofertas, rechazados y venta perdida)', () => {
    const { dialogo } = abrirConfirmacion();
    const color = (texto) => [...dialogo.querySelectorAll('span')].find((nodo) => nodo.textContent.includes(texto)).className;
    expect(color('1 aprobados')).toContain('text-emerald-700');
    expect(color('2 contraofertas')).toContain('text-amber-700');
    expect(color('3 rechazados')).toContain('text-rose-700');
    expect(color('4 vta. perdida')).toContain('text-rose-700');
  });

  it('"Enviar" cierra el modal y notifica', () => {
    const { onNotificar } = abrirConfirmacion();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onNotificar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Confirmar notificación' })).toBeNull();
  });
});
