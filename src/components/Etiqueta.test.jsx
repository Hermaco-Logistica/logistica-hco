// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Etiqueta } from './Etiqueta';
import { clasesSegmento, PALETA_CORREO, resolverEtiqueta, tonoDe, TONOS, TEXTO_TONO } from '../utils/etiquetas';

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

  it('el tono "rol" sigue el color del rol del usuario (tokens primary), sin colores tag-* ni fijos', () => {
    const { container } = render(<Etiqueta tono="rol">Éxito</Etiqueta>);
    const clases = container.firstChild.className;
    expect(clases).toContain('bg-primary-soft');
    expect(clases).toContain('text-primary-strong');
    expect(clases).not.toMatch(/tag-|emerald|slate/);
    expect(container.firstChild.className).not.toContain('border');
  });

  it('el tono "rol" tiene su color de texto en TEXTO_TONO y no cae al tono neutral', () => {
    expect(TONOS.rol).toBe('bg-primary-soft text-primary-strong');
    expect(TEXTO_TONO.rol).toBe('text-primary-strong');
    expect(TONOS.rol).not.toBe(TONOS.neutral);
  });

  it('el color de "cotizado" depende del rol', () => {
    expect(resolverEtiqueta('estadoSolicitud', 'Cotizado', { rol: 'vendedor' }).tono).toBe('morado');
    expect(resolverEtiqueta('estadoSolicitud', 'Cotizado', { rol: 'gerente' }).tono).toBe('turquesa');
    expect(tonoDe('decision', 'rechazo')).toBe('peligro');
  });
});

describe('clasesSegmento', () => {
  it('da a cada tono de la barra solo el fondo suave de su Etiqueta, sin contorno', () => {
    expect(clasesSegmento('exito')).toBe('bg-tag-exito-soft');
    expect(clasesSegmento('aviso')).toBe('bg-tag-aviso-soft');
    expect(clasesSegmento('info')).toBe('bg-tag-info-soft');
    expect(clasesSegmento('apagado')).toBe('bg-tag-apagado-soft');
    expect(clasesSegmento('peligro')).toBe('bg-tag-peligro-soft');
    ['exito', 'aviso', 'info', 'apagado', 'peligro'].forEach((tono) => expect(clasesSegmento(tono)).not.toContain('inset-ring'));
  });

  it('el fondo del segmento es el mismo de TONOS (misma paleta que la pastilla)', () => {
    ['exito', 'aviso', 'info', 'apagado', 'peligro'].forEach((tono) => expect(clasesSegmento(tono)).toBe(TONOS[tono].split(' ')[0]));
  });

  it('con la opción contorno recupera la variante A: un contorno interior de 1 px con el color de TEXTO_TONO del mismo tono', () => {
    expect(clasesSegmento('exito', { contorno: true })).toBe('bg-tag-exito-soft inset-ring-1 inset-ring-tag-exito-text');
    expect(clasesSegmento('aviso', { contorno: true })).toBe('bg-tag-aviso-soft inset-ring-1 inset-ring-tag-aviso-text');
    expect(clasesSegmento('info', { contorno: true })).toBe('bg-tag-info-soft inset-ring-1 inset-ring-tag-info');
    expect(clasesSegmento('apagado', { contorno: true })).toBe('bg-tag-apagado-soft inset-ring-1 inset-ring-tag-apagado');
    expect(clasesSegmento('peligro', { contorno: true })).toBe('bg-tag-peligro-soft inset-ring-1 inset-ring-tag-peligro-text');
    ['exito', 'aviso', 'info', 'apagado', 'peligro'].forEach((tono) => {
      const [fondo, grosor, contorno] = clasesSegmento(tono, { contorno: true }).split(' ');
      expect(fondo).toBe(TONOS[tono].split(' ')[0]);
      expect(grosor).toBe('inset-ring-1');
      expect(contorno).toBe(TEXTO_TONO[tono].replace('text-', 'inset-ring-'));
    });
    expect(clasesSegmento('inventado', { contorno: true })).toBe(clasesSegmento('apagado', { contorno: true }));
  });

  it('no usa el relleno fuerte ni tokens de barra', () => {
    ['exito', 'aviso', 'info', 'apagado', 'peligro'].forEach((tono) => expect(clasesSegmento(tono)).not.toContain('-barra'));
  });

  it('cae en "apagado" con un tono desconocido o ausente', () => {
    expect(clasesSegmento('inventado')).toBe(clasesSegmento('apagado'));
    expect(clasesSegmento()).toBe(clasesSegmento('apagado'));
  });

  it('no añade tonos nuevos: TONOS y PALETA_CORREO no tienen "rechazo"', () => {
    expect(TONOS.rechazo).toBeUndefined();
    expect(PALETA_CORREO.rechazo).toBeUndefined();
  });
});
