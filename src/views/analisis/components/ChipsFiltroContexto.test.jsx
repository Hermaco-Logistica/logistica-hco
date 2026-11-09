// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ChipsFiltroContexto } from './ChipsFiltroContexto';

afterEach(cleanup);

describe('ChipsFiltroContexto', () => {
  it('no pinta nada si no hay chips', () => {
    const { container } = render(<ChipsFiltroContexto vendedor="" cliente="" onQuitarVendedor={() => {}} onQuitarCliente={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('con un solo chip muestra solo ese', () => {
    render(<ChipsFiltroContexto vendedor="Ana Martínez" onQuitarVendedor={() => {}} onQuitarCliente={() => {}} />);
    expect(screen.getByText('Ana Martínez')).toBeTruthy();
    expect(screen.getByText('Vendedor:')).toBeTruthy();
    expect(screen.queryByText('Cliente:')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('con dos chips, cada X llama a su callback y a ningún otro', () => {
    const quitarV = vi.fn();
    const quitarC = vi.fn();
    render(<ChipsFiltroContexto vendedor="Ana Martínez" cliente="HOLCIM" onQuitarVendedor={quitarV} onQuitarCliente={quitarC} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de vendedor' }));
    expect(quitarV).toHaveBeenCalledTimes(1);
    expect(quitarC).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de cliente' }));
    expect(quitarC).toHaveBeenCalledTimes(1);
    expect(quitarV).toHaveBeenCalledTimes(1);
  });

  it('la X es un botón accesible (type button, aria-label) con área táctil de 32 px', () => {
    render(<ChipsFiltroContexto vendedor="Ana" cliente="HOLCIM" onQuitarVendedor={() => {}} onQuitarCliente={() => {}} />);
    for (const b of screen.getAllByRole('button')) {
      expect(b.getAttribute('type')).toBe('button');
      expect(b.getAttribute('aria-label')).toMatch(/^Quitar filtro de (vendedor|cliente)$/);
      expect(b.className).toContain('size-6'); // visible: 24 px
      expect(b.className).toContain('before:-inset-1'); // área táctil: 24 + 4 + 4 = 32 px
    }
  });

  it('usa superficie de reposo (o plana) y no lleva bordes, sombras a mano ni colores slate', () => {
    const { container, rerender } = render(<ChipsFiltroContexto vendedor="Ana" cliente="HOLCIM" onQuitarVendedor={() => {}} onQuitarCliente={() => {}} />);
    const clases = () => Array.from(container.querySelectorAll('*')).map((e) => e.getAttribute('class') || '').join(' ');
    expect(clases()).toMatch(/(^|\s)surface(\s|$)/);
    expect(clases()).not.toMatch(/(^|\s)(border|shadow-)|slate-|#[0-9a-f]{3,6}\b/i);
    rerender(<ChipsFiltroContexto plana vendedor="Ana" onQuitarVendedor={() => {}} onQuitarCliente={() => {}} />);
    expect(clases()).toContain('surface-plana');
  });

  it('el archivo no escribe borde, shadow-2xs ni colores slate a mano', () => {
    const fuente = readFileSync('src/views/analisis/components/ChipsFiltroContexto.jsx', 'utf8');
    expect(fuente).not.toMatch(/slate-|shadow-2xs|(^|[\s"'`])border(-|\s|"|'|`)/);
  });
});
