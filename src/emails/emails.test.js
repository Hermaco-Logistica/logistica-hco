// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

// Las plantillas del pedido manual consultan Firestore; en estas pruebas solo se necesita su armado.
vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] }))
}));

import { construirCorreo, EVENTOS } from './eventos';
import { REGLAS_ENVIO, resolverEnvio } from './destinatarios';

const solicitud = {
  id: 's1',
  correlativo: 'RFQ-0001',
  cliente: 'Cliente <b>Prueba</b>',
  tipo: 'RFQ',
  vendedorNombre: 'Pablo',
  vendedorEmail: 'pablo@hermaco.net',
  validez: '5 días hábiles',
  comentariosVendedor: 'Ojo <script>alert(1)</script>',
  productos: [{ descripcion: 'Contactor', marca: 'ABB', cant: 2, fob: 10 }]
};
const actor = { email: 'pablo@hermaco.net', nombre: 'Pablo' };

describe('destinatarios', () => {
  it('en localhost todo va solo al correo de pruebas', () => {
    Object.keys(REGLAS_ENVIO).forEach((evento) => {
      const envio = resolverEnvio(evento, { solicitud, actor, local: true });
      expect(envio.to).toEqual(['rvides@hermaco.net']);
      expect(envio.cc).toEqual([]);
    });
  });

  it('el vendedor escribe a Compras con copia a él mismo y a Logística, sin repetidos ni excluidos', () => {
    const envio = resolverEnvio('solicitud_creada', { solicitud, actor: { ...actor, email: 'Pablo@hermaco.net' }, local: false });
    expect(envio.to).toEqual(['compras@hermaco.net']);
    expect(envio.cc).toEqual(['Pablo@hermaco.net', 'logisticahco@hermaco.net']);
    expect(envio.from).toBe('Pablo <Pablo@hermaco.net>');
    const excluido = resolverEnvio('anulacion', { solicitud, actor: { email: 'oventura@hermaco.net' }, local: false });
    expect(excluido.cc).not.toContain('oventura@hermaco.net');
  });

  it('Compras responde al vendedor', () => {
    expect(resolverEnvio('prorroga_respondida', { solicitud, actor: { email: 'compras1@hermaco.net' }, local: false }).to).toEqual(['pablo@hermaco.net']);
    expect(resolverEnvio('negociacion_compras', { solicitud, local: false }).from).toContain('Compras Hermaco');
  });

  it('lanza error con un evento desconocido', () => {
    expect(() => resolverEnvio('no_existe', { solicitud })).toThrow();
  });
});

describe('plantillas', () => {
  const prorroga = { ronda: 2, diasSolicitados: 5, motivo: 'Necesita <i>más</i> tiempo', estado: 'pendiente' };
  const item = { descripcion: 'Contactor', marca: 'ABB', cant: 2 };
  const contextos = {
    solicitud_creada: { solicitud },
    cotizacion_enviada: { solicitud, esParcial: true, itemsCotizados: 1, totalItems: 2 },
    pedido_confirmado: { pedido: { solicitudId: 's1', correlativoRFQ: 'RFQ-0001', cliente: 'Cliente', vendedorNombre: 'Pablo', vendedorEmail: 'pablo@hermaco.net', esPedidoParcial: true, linkOC: 'https://oc', notasPedido: 'nota', productos: [{ descripcion: 'A', cant: 1, estadoItem: 'Pedido', modalidad: 'Aéreo', subtotal: 10 }, { descripcion: 'B', cant: 1, estadoItem: 'Venta Perdida', motivoVentaPerdida: { nombre: 'Precio', comentario: 'caro' } }, { descripcion: 'C', cant: 1, estadoItem: 'Anulado', motivoAnulacion: 'x' }] } },
    venta_perdida: { solicitud, items: [{ ...item, motivoVentaPerdida: { nombre: 'Precio', comentario: 'Muy caro para el cliente' } }], registradoPor: 'pablo@hermaco.net' },
    anulacion: { solicitud, motivo: 'Duplicada <b>x</b>', anuladoPor: 'compras@hermaco.net', esParcial: false },
    oc_asignada: { numOC: 'OC-1', itemsVendedor: [{ correlativo: 'RFQ-0001', descripcion: 'Contactor', fechaCompromiso: '2026-11-10' }] },
    revision_registrada: { solicitud, items: [{ item, indice: 0, numero: 1, hasta: new Date() }], comentario: 'Cliente pide esperar', registradoPor: 'pablo@hermaco.net' },
    prorroga_solicitada: { solicitud, prorroga, items: [{ item, indice: 0, vence: new Date() }] },
    prorroga_respondida: { solicitud, prorroga, accion: 'aprobada', comentario: 'Ok', respondidoPor: 'compras@hermaco.net', items: [{ item, indice: 0 }], fechasAprobadas: { 0: new Date() } },
    negociacion_compras: { pedido: { ...solicitud, id: 'p1', tipo: 'Pedido Manual', estado: 'Cotizado' }, items: [{ ...item, estadoItem: 'Cotizado', fob: 12 }], indicesModificados: [0], rol: 'compras', comentarioGeneral: 'Revisa' },
    negociacion_vendedor: { pedido: { ...solicitud, id: 'p1', tipo: 'Pedido Manual', estado: 'Pedido' }, items: [{ ...item, estadoItem: 'Pedido', fob: 12 }], indicesModificados: [0], rol: 'vendedor', comentarioGeneral: '' }
  };

  it('todos los eventos del catálogo tienen regla de envío y un contexto de prueba', () => {
    expect(Object.keys(EVENTOS).sort()).toEqual(Object.keys(REGLAS_ENVIO).sort());
    expect(Object.keys(contextos).sort()).toEqual(Object.keys(EVENTOS).sort());
  });

  it.each(Object.keys(contextos))('%s arma un correo completo, sin datos vacíos', async (evento) => {
    const correo = await construirCorreo(evento, { actor, ...contextos[evento] });
    expect(correo.subject).toBeTruthy();
    expect(correo.to.length).toBeGreaterThan(0);
    expect(correo.html).toContain('Centro Industrial Hermaco');
    expect(correo.html).not.toContain('undefined');
    expect(correo.html).not.toContain('NaN');
  });

  it('escapa el texto escrito por personas', async () => {
    const correo = await construirCorreo('solicitud_creada', { actor, solicitud });
    expect(correo.html).not.toContain('<script>');
    expect(correo.html).not.toContain('<b>Prueba</b>');
    expect(correo.html).toContain('&lt;script&gt;');
  });

  it('todo correo de una solicitud lleva el botón "Ir al sitio" con el enlace inteligente', async () => {
    const conSolicitud = Object.keys(contextos).filter((evento) => evento !== 'oc_asignada');
    for (const evento of conSolicitud) {
      const correo = await construirCorreo(evento, { actor, ...contextos[evento] });
      expect(correo.html, evento).toContain('Ir al sitio');
      expect(correo.html, evento).toMatch(/href="[^"]*\/ir\/solicitud\/(s1|p1)"/);
    }
    const oc = await construirCorreo('oc_asignada', { actor, ...contextos.oc_asignada });
    expect(oc.html).toContain('Ir al sitio');
  });

  it('el aviso de prórroga solicitada usa el diseño sobrio y trae el motivo y los días', async () => {
    const correo = await construirCorreo('prorroga_solicitada', { actor, ...contextos.prorroga_solicitada });
    expect(correo.html).toContain('Nueva solicitud de prórroga');
    expect(correo.html).toContain('Días hábiles solicitados');
    expect(correo.html).toContain('Necesita &lt;i&gt;más&lt;/i&gt; tiempo');
    expect(correo.html).not.toContain('background-color:#0f172a;padding:24px'); // sin la banda oscura del diseño completo
  });

  it('las etiquetas usan la paleta de la app (fase vencida = tono peligro)', async () => {
    const correo = await construirCorreo('prorroga_solicitada', { actor, ...contextos.prorroga_solicitada });
    expect(correo.html).toContain('Prórroga pendiente');
    expect(correo.html).toContain('#e0f2fe'); // tono "info" de PALETA_CORREO
    expect(correo.subject).toContain('Prórroga solicitada');
  });
});
