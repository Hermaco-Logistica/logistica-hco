import { describe, expect, it } from 'vitest';
import { rutaEnlaceSolicitud, rutaParaSolicitud } from './rutasSolicitud';

describe('rutaParaSolicitud', () => {
  const rfq = (estado) => ({ id: 'a1', tipo: 'RFQ', estado });
  const pedido = { id: 'p1', tipo: 'Pedido Manual', estado: 'Cotizado' };

  it('el comprador cotiza una RFQ pendiente en la calculadora', () => {
    expect(rutaParaSolicitud({ role: 'comprador', solicitud: rfq('Pendiente') })).toBe('/calculadora/a1');
  });

  it('el comprador consulta una RFQ ya cotizada en el detalle', () => {
    expect(rutaParaSolicitud({ role: 'comprador', solicitud: rfq('Cotizado') })).toBe('/vendedor/detalle/a1');
  });

  it('el comprador revisa los pedidos manuales en su vista de revisión', () => {
    expect(rutaParaSolicitud({ role: 'comprador', solicitud: pedido })).toBe('/compras/revision-pedido/p1');
  });

  it.each(['vendedor', 'gerente', 'administrador'])('el rol %s va al detalle de su solicitud', (role) => {
    expect(rutaParaSolicitud({ role, solicitud: rfq('Cotizado') })).toBe('/vendedor/detalle/a1');
    expect(rutaParaSolicitud({ role, solicitud: pedido })).toBe('/vendedor/pedido-manual/p1');
  });

  it('sin id no hay ruta, y el enlace del correo es estable', () => {
    expect(rutaParaSolicitud({ role: 'vendedor', solicitud: {} })).toBeNull();
    expect(rutaEnlaceSolicitud('abc')).toBe('/ir/solicitud/abc');
  });
});
