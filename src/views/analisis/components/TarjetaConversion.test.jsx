import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { TarjetaConversion } from './TarjetaConversion';

afterEach(cleanup);

const pintar = (props) => {
  const { container } = render(<TarjetaConversion conversion={40} itemsGanados={2} itemsCerrados={5} titulo="Conversión 40 %: 2 ítems ganados de 5 cerrados (1 solicitud ganada + 0 parciales)" {...props} />);
  return container.querySelector('[title]');
};
const texto = (el) => el.textContent.replace(/\s+/g, ' ').trim();

describe('TarjetaConversion: subtítulo y abiertos', () => {
  it('plural: "2 de 5 ítems cerrados"', () => {
    expect(texto(pintar({}))).toBe('2 de 5 ítems cerrados');
  });

  it('singular: "1 de 1 ítem cerrado"', () => {
    expect(texto(pintar({ itemsGanados: 1, itemsCerrados: 1 }))).toBe('1 de 1 ítem cerrado');
  });

  it('sin cerrados: guion y "0 de 0 ítems cerrados"', () => {
    const el = pintar({ conversion: null, itemsGanados: 0, itemsCerrados: 0, titulo: 'Sin ítems cerrados: no hay conversión' });
    expect(texto(el)).toBe('0 de 0 ítems cerrados');
    expect(document.body.textContent).toContain('—');
  });

  it('el subtítulo ya no dice "ganados / cerrados"', () => {
    expect(texto(pintar({}))).not.toMatch(/ganados|\//);
  });

  it('con abiertos: title y aria-label llevan "N ítems abiertos no cuentan", y el subtítulo visible no cambia', () => {
    const el = pintar({ itemsAbiertos: 3 });
    expect(el.getAttribute('title')).toBe('Conversión 40 %: 2 ítems ganados de 5 cerrados (1 solicitud ganada + 0 parciales). 3 ítems abiertos no cuentan');
    expect(el.getAttribute('aria-label')).toBe('2 de 5 ítems cerrados. 3 ítems abiertos no cuentan');
    expect(texto(el)).toBe('2 de 5 ítems cerrados');
  });

  it('un solo abierto va en singular: "1 ítem abierto no cuenta"', () => {
    const el = pintar({ itemsAbiertos: 1 });
    expect(el.getAttribute('title')).toMatch(/\. 1 ítem abierto no cuenta$/);
    expect(el.getAttribute('aria-label')).toMatch(/\. 1 ítem abierto no cuenta$/);
  });

  it('sin abiertos (0 o sin la prop) no hay frase ni aria-label', () => {
    [pintar({ itemsAbiertos: 0 }), pintar({})].forEach((el) => {
      expect(el.getAttribute('title')).not.toMatch(/abierto/);
      expect(el.hasAttribute('aria-label')).toBe(false);
    });
  });

  it('las cifras grandes llevan separador de miles y no se parten (nowrap)', () => {
    const el = pintar({ itemsGanados: 1234, itemsCerrados: 5678 });
    expect(texto(el)).toBe(`${(1234).toLocaleString()} de ${(5678).toLocaleString()} ítems cerrados`);
    expect(el.querySelector('.whitespace-nowrap').textContent).toBe(`${(1234).toLocaleString()} de ${(5678).toLocaleString()}`);
  });
});
