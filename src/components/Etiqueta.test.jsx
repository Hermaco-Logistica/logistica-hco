// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Etiqueta } from './Etiqueta';
import { resolverEtiqueta, tonoDe, TONOS, TEXTO_TONO } from '../utils/etiquetas';

describe('Etiqueta', () => {
  it('pinta texto, tono e ícono del catálogo sin borde', () => {
    const { container } = render(<Etiqueta dominio="faseSeguimiento" valor="vencida" />);
    const chip = container.firstChild;
    expect(chip.textContent).toBe('Vencida');
    expect(chip.className).toContain('bg-tag-peligro-soft');
    expect(chip.className).not.toContain('border');
    expect(chip.querySelector('svg')).not.toBeNull();
  });

  it('children reemplaza el texto y sinIcono oculta el ícono', () => {
    const { container } = render(<Etiqueta dominio="estadoItem" valor="Pedido" sinIcono>Listo</Etiqueta>);
    expect(container.firstChild.textContent).toBe('Listo');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('no pinta nada sin texto', () => {
    const { container } = render(<Etiqueta dominio="faseSeguimiento" valor={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('el tono "seguimiento" usa el color único de seguimiento, distinto de "violeta"', () => {
    const { container } = render(<Etiqueta tono="seguimiento">3</Etiqueta>);
    const clases = container.firstChild.className;
    expect(clases).toContain('bg-seguimiento');
    expect(clases).toContain('text-seguimiento-soft');
    expect(clases).not.toContain('tag-violeta');
    expect(TEXTO_TONO.seguimiento).toBe('text-seguimiento');
    expect(TONOS.violeta).toBe('bg-tag-violeta-soft text-tag-violeta');
  });

  it('el color de "cotizado" depende del rol', () => {
    expect(resolverEtiqueta('estadoSolicitud', 'Cotizado', { rol: 'vendedor' }).tono).toBe('morado');
    expect(resolverEtiqueta('estadoSolicitud', 'Cotizado', { rol: 'gerente' }).tono).toBe('turquesa');
    expect(tonoDe('decision', 'rechazo')).toBe('peligro');
  });
});
