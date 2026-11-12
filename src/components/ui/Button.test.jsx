import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';

const clases = (el) => el.className.split(/\s+/);

const VARIANTES = {
  primary: ['bg-primary', 'hover:bg-primary-strong', 'text-primary-foreground'],
  secondary: ['bg-white', 'text-slate-700', 'hover:bg-slate-50'],
  secondaryBrand: ['bg-primary-soft', 'text-primary-strong', 'hover:bg-primary/15'],
  danger: ['bg-danger', 'hover:bg-danger-strong', 'text-white'],
  dangerSoft: ['bg-danger-soft', 'text-danger', 'hover:bg-danger/10'],
  link: ['text-analysis-accent', 'hover:text-nav-accent-hover'],
};

const TAMANOS = {
  sm: ['px-2.5', 'py-1', 'rounded-lg', 'text-[11px]'],
  md: ['px-3', 'py-1.5', 'rounded-xl', 'text-[10px]', 'uppercase'],
  lg: ['px-5', 'py-2', 'rounded-xl', 'text-[10px]', 'font-black', 'uppercase'],
  cta: ['px-4', 'py-2.5', 'sm:px-5', 'rounded-xl', 'text-[11px]', 'sm:text-xs', 'uppercase', 'tracking-wider'],
  block: ['w-full', 'py-2', 'rounded-xl', 'text-xs'],
  xl: ['px-4', 'sm:px-8', 'py-2.5', 'sm:py-3', 'rounded-xl', 'text-xs', 'font-black', 'uppercase', 'tracking-wide', 'min-h-[48px]'],
  pill: ['px-5', 'py-2.5', 'rounded-full', 'text-[10px]', 'uppercase', 'tracking-wider'],
  icon: ['w-10', 'h-10', 'rounded-xl'],
  iconSm: ['w-[34px]', 'h-[34px]', 'rounded-xl'],
};

describe('Button', () => {
  it.each(Object.entries(VARIANTES))('variante %s genera sus clases', (variant, esperadas) => {
    render(<Button variant={variant}>Texto</Button>);
    const c = clases(screen.getByRole('button', { name: 'Texto' }));
    esperadas.forEach((cl) => expect(c).toContain(cl));
  });

  it.each(Object.entries(TAMANOS))('tamaño %s genera sus clases', (size, esperadas) => {
    render(<Button size={size}>Texto</Button>);
    const c = clases(screen.getByRole('button', { name: 'Texto' }));
    esperadas.forEach((cl) => expect(c).toContain(cl));
  });

  it('por defecto es primary, md y type="button"', () => {
    render(<Button>Texto</Button>);
    const b = screen.getByRole('button', { name: 'Texto' });
    expect(b.getAttribute('type')).toBe('button');
    expect(clases(b)).toContain('bg-primary');
    expect(clases(b)).toContain('px-3');
  });

  it('no usa clases de paleta (emerald, blue, rose…): solo tokens y neutros', () => {
    Object.keys(VARIANTES).forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>x</Button>);
      expect(screen.getByRole('button').className).not.toMatch(/(emerald|blue|indigo|violet|purple|rose|teal)-\d/);
      unmount();
    });
  });

  it('todas las variantes menos link llevan la sombra de botón y ninguna lleva borde decorativo', () => {
    Object.keys(VARIANTES).forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>x</Button>);
      const c = clases(screen.getByRole('button'));
      if (variant === 'link') expect(c).not.toContain('shadow-boton');
      else {
        ['shadow-boton', 'hover:shadow-boton-hover', 'active:shadow-boton-activo', 'disabled:shadow-none'].forEach((cl) => expect(c).toContain(cl));
        expect(c).not.toContain('border');
      }
      unmount();
    });
  });

  it('click llama onClick cuando está activo', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Texto</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Texto' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled aplica el estilo gris y bloquea onClick', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Texto</Button>);
    const b = screen.getByRole('button', { name: 'Texto' });
    expect(b.disabled).toBe(true);
    ['disabled:bg-slate-200', 'disabled:text-slate-400', 'disabled:cursor-not-allowed'].forEach((cl) => expect(clases(b)).toContain(cl));
    fireEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('pasa title, type y className extra', () => {
    render(<Button type="submit" title="Ayuda" className="flex-1 sm:flex-none">Texto</Button>);
    const b = screen.getByRole('button', { name: 'Texto' });
    expect(b.getAttribute('type')).toBe('submit');
    expect(b.getAttribute('title')).toBe('Ayuda');
    expect(clases(b)).toEqual(expect.arrayContaining(['flex-1', 'sm:flex-none']));
  });
});
