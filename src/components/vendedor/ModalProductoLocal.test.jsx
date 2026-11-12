// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ModalProductoLocal } from './ModalProductoLocal';

afterEach(cleanup);

const estadoBase = { sku: 'A1', producto: 'BOMBA', marca: '', saving: false };

describe('ModalProductoLocal', () => {
  it('el icono, los campos y el botón "Guardar" siguen el color del rol, no el azul fijo', () => {
    render(<ModalProductoLocal estado={estadoBase} onCambiar={() => {}} onGuardar={() => {}} onCerrar={() => {}} />);
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo producto local' });

    const caja = dialogo.querySelector('h2').parentElement.previousElementSibling;
    expect(caja.className).toContain('bg-primary/15');
    expect(caja.className).not.toContain('blue');

    ['SKU', 'Descripción', 'Marca'].forEach((placeholder) => {
      const campo = screen.getByPlaceholderText(placeholder);
      expect(campo.className).toContain('focus:border-primary');
      expect(campo.className).not.toContain('blue');
    });

    const guardar = screen.getByRole('button', { name: 'Guardar' });
    expect(guardar.className).toContain('bg-primary');
    expect(guardar.className).toContain('hover:bg-primary-strong');
    expect(guardar.className).not.toContain('blue');
  });

  it('"Guardar" sigue deshabilitado sin SKU o sin descripción y llama a onGuardar cuando están', () => {
    const onGuardar = vi.fn();
    const { rerender } = render(<ModalProductoLocal estado={{ ...estadoBase, sku: '' }} onCambiar={() => {}} onGuardar={onGuardar} onCerrar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Guardar' }).disabled).toBe(true);

    rerender(<ModalProductoLocal estado={estadoBase} onCambiar={() => {}} onGuardar={onGuardar} onCerrar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onGuardar).toHaveBeenCalledTimes(1);
  });
});
