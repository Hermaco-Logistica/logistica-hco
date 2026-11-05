import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AccionesItemInteractiva, AccionItemButton } from './AccionesItemInteractiva';
import { VARIANTES_ACCION } from './variantesAccion';

const clases = (el) => el.className.split(/\s+/);

const ESPERADAS = {
  approve: ['border-transparent', 'bg-success', 'text-white', 'hover:bg-success-strong', 'focus-visible:ring-success'],
  counter: ['border-transparent', 'bg-amber-200', 'text-warning', 'hover:bg-amber-300', 'hover:text-amber-900', 'focus-visible:ring-warning'],
  reject: ['border-transparent', 'bg-slate-200', 'text-slate-600', 'hover:bg-slate-300', 'focus-visible:ring-slate-500'],
  lost: ['border-transparent', 'bg-danger', 'text-white', 'hover:bg-danger-strong', 'focus-visible:ring-danger']
};

const renderBoton = (props = {}) => render(
  <AccionesItemInteractiva>
    <AccionItemButton id="a" label="Aceptar oferta" text="Aceptar" variant="approve" onConfirm={() => {}} {...props} />
    <AccionItemButton id="b" label="Rechazar oferta" text="Rechazar" variant="reject" onConfirm={() => {}} />
  </AccionesItemInteractiva>
);

describe('AccionItemButton', () => {
  it.each(Object.entries(ESPERADAS))('variante %s lleva sus clases y no lleva borde visible', (variant, esperadas) => {
    render(
      <AccionesItemInteractiva>
        <AccionItemButton id="x" label="Acción" text="Acción" variant={variant} />
      </AccionesItemInteractiva>
    );
    const c = clases(screen.getByRole('button'));
    esperadas.forEach((cl) => expect(c).toContain(cl));
    expect(c).toContain('focus-visible:ring-2');
  });

  it('las clases de las variantes salen de un solo lugar', () => {
    Object.entries(VARIANTES_ACCION).forEach(([variant, texto]) => {
      ESPERADAS[variant].forEach((cl) => expect(texto.split(/\s+/)).toContain(cl));
    });
  });

  it('colapsado: aria-label con el texto de la interfaz, title y aria-expanded en false', () => {
    renderBoton();
    const b = screen.getByRole('button', { name: 'Aceptar oferta' });
    expect(b.getAttribute('aria-label')).toBe('Aceptar oferta');
    expect(b.getAttribute('title')).toBe('Aceptar oferta');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(b.style.width).toBe('');
  });

  it('el primer clic expande sin ejecutar; el segundo confirma', () => {
    const onConfirm = vi.fn();
    renderBoton({ onConfirm });
    const b = screen.getByRole('button', { name: 'Aceptar oferta' });
    fireEvent.click(b);
    expect(onConfirm).not.toHaveBeenCalled();
    const abierto = screen.getByRole('button', { name: 'Aceptar oferta. Vuelve a tocar para confirmar.' });
    expect(abierto.getAttribute('aria-expanded')).toBe('true');
    expect(abierto.style.width).not.toBe('');
    expect(clases(abierto)).toContain('pedido-item-action-button--active');
    fireEvent.click(abierto);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Aceptar oferta' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('al abrir uno, el otro queda atenuado', () => {
    renderBoton();
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar oferta' }));
    const otro = screen.getByRole('button', { name: 'Rechazar oferta' });
    expect(clases(otro)).toContain('opacity-50');
    expect(otro.getAttribute('aria-expanded')).toBe('false');
  });

  it('deshabilitado: estilo apagado y sin ejecutar', () => {
    const onConfirm = vi.fn();
    renderBoton({ disabled: true, onConfirm });
    const b = screen.getByRole('button', { name: 'Aceptar oferta' });
    expect(b.disabled).toBe(true);
    expect(clases(b)).toEqual(expect.arrayContaining(['cursor-not-allowed', 'opacity-40']));
    fireEvent.click(b);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
