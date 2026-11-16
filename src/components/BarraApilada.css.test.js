// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('BarraApilada: CSS de la animación (index.css)', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const bloque = (inicio) => { const i = css.indexOf(inicio); return css.slice(i, css.indexOf('}', i) + 1); };

  it('los keyframes solo tocan transform y opacity', () => {
    const k = css.split('\n').find((linea) => linea.startsWith('@keyframes barra-crecer')).replace(/\s+/g, ' ');
    expect(k).toBe('@keyframes barra-crecer { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }');
  });

  it('crece desde la izquierda con los tokens --anim-abrir y --ease-abrir y una escalonada de 35 ms', () => {
    expect(bloque('.barra-seg {')).toContain('transform-origin: left center');
    const activa = bloque(".barra-apilada[data-anim='activa'] .barra-seg");
    expect(activa).toContain('animation: barra-crecer var(--anim-abrir) var(--ease-abrir) both');
    expect(activa).toContain('animation-delay: calc(var(--i, 0) * 35ms)');
  });

  it('en espera los segmentos están a escala 0 y transparentes, y con prefers-reduced-motion no se anima nada', () => {
    expect(bloque(".barra-apilada[data-anim='espera'] .barra-seg")).toMatch(/transform: scaleX\(0\); opacity: 0/);
    const i = css.indexOf('@media (prefers-reduced-motion: reduce) {\n  .barra-apilada .barra-seg');
    expect(i).toBeGreaterThan(-1);
    expect(css.slice(i, i + 220)).toContain('animation: none !important');
  });
});

describe('BarraApilada: CSS del resalte y del popover (index.css)', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const bloque = (inicio) => { const i = css.indexOf(inicio); return css.slice(i, css.indexOf('}', i) + 1); };

  it('el segmento resaltado o seleccionado se engrosa con `scale` (no choca con el transform de la entrada) y se aviva', () => {
    const b = bloque(".barra-seg[data-hover='true']");
    expect(b).toContain(".barra-seg[data-seleccion='true']");
    expect(b).toContain('scale: 1 var(--escala-resalte, 1.34)');
    expect(b).toContain('filter: brightness(1.1)');
    expect(bloque('.barra-seg {')).toContain('transition: scale 120ms');
  });

  it('el popover entra con escala de 0,96 a 1 y opacidad: solo transform y opacity', () => {
    const k = css.split('\n').find((linea) => linea.startsWith('@keyframes popover-barra-in')).replace(/\s+/g, ' ');
    expect(k).toBe('@keyframes popover-barra-in { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }');
  });

  it('usa los tokens --anim-abrir y --ease-abrir y nace desde el lado de la barra', () => {
    const b = bloque('.popover-barra {');
    expect(b).toContain('animation: popover-barra-in var(--anim-abrir) var(--ease-abrir) backwards');
    expect(b).toContain('transform-origin: var(--origen-x, 50%) 0');
    expect(bloque(".popover-barra[data-dir='arriba']")).toContain('var(--origen-x, 50%) 100%');
  });

  it('con prefers-reduced-motion el popover no se anima', () => {
    const i = css.indexOf('@media (prefers-reduced-motion: reduce) {\n  .popover-barra');
    expect(i).toBeGreaterThan(-1);
    expect(css.slice(i, i + 120)).toContain('animation: none !important');
  });

  it('la zona de pulsación de la barra es 6 px más alta por cada lado sin tocar el layout (pseudo-elemento absoluto)', () => {
    const b = bloque('.barra-apilada::before');
    expect(b).toContain('position: absolute');
    expect(b).toContain('inset: -6px 0');
  });
});
