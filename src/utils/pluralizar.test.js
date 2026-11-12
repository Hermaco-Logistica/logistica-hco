import { describe, expect, it } from 'vitest';
import { pluralizar } from './pluralizar';

describe('pluralizar', () => {
  it('singular solo con 1; 0 y el resto van en plural', () => {
    expect(pluralizar(1, 'solicitud', 'solicitudes')).toBe('solicitud');
    expect(pluralizar(0, 'solicitud', 'solicitudes')).toBe('solicitudes');
    expect(pluralizar(2, 'ítem', 'ítems')).toBe('ítems');
    expect(pluralizar('1', 'mov', 'movs')).toBe('mov');
    expect(pluralizar(3, 'pedido')).toBe('pedidos');
  });
});
