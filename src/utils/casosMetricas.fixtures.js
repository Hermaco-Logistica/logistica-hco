/**
 * Datos de prueba de F8a (docs/metricas.md, sección 6), anonimizados. Solo los usan las pruebas de estadoFinalItem y resultadoSolicitud.
 */

/** PED-0030 real, anonimizado: pedido manual con la bandera de venta perdida en la raíz y tres ítems con estados distintos. */
export const PED_0030 = {
  id: 'ped-0030',
  correlativo: 'PED-0030',
  tipo: 'Pedido Manual',
  estado: 'Pedido',
  cliente: 'Cliente A',
  vendedorEmail: 'vendedor@ejemplo.test',
  vendedorId: 'uid-1',
  motivoVentaPerdida: { motivo: 'Precio', comentario: 'Anonimizado' },
  resumenNegociacion: { acordados: 1, denegados: 2 },
  productos: [
    {
      desc: 'Producto 0', cant: 3, estadoItem: 'Cancelado', fechaRechazo: '2026-01-10', rechazadoPor: 'uid-1', ultimoCambio: { accion: 'rechazar' }
    },
    { desc: 'Producto 1', cant: 3, estadoItem: 'Venta Perdida', motivoVentaPerdida: { motivo: 'Precio' } },
    { desc: 'Producto 2', cant: 3, estadoItem: 'Pedido', negociacion: { resultado: 'acordado' }, pedidoGenerado: true }
  ]
};

/** Caso tipo (no es PED-0030): bandera en la raíz y tres ítems [Pedido, Pedido, Venta Perdida]. */
export const CASO_TIPO = {
  id: 'caso-tipo',
  tipo: 'Pedido Manual',
  estado: 'Pedido Parcial',
  cliente: 'Cliente B',
  motivoVentaPerdida: { motivo: 'Precio' },
  productos: [
    { desc: 'Producto 0', cant: 1, estadoItem: 'Pedido' },
    { desc: 'Producto 1', cant: 1, estadoItem: 'Pedido' },
    { desc: 'Producto 2', cant: 1, estadoItem: 'Venta Perdida' }
  ]
};

/**
 * "Cliente K" reconstruido con los totales de la auditoría de desarrollo (39 solicitudes y 69 ítems; con la regla única: 29 ganados,
 * 15 ventas perdidas, 2 rechazos, 20 anulados y 3 abiertos; solicitudes "16 (+2 parc.)"). La **composición** de cada solicitud está
 * inventada para reproducir esos totales: los datos reales no están en el repositorio.
 */
const ITEM = { G: 'Pedido', V: 'Venta Perdida', R: 'Rechazado', A: 'Anulado', C: 'Cotizado' };
const COMPOSICION_CLIENTE_K = [
  ...Array(10).fill('G'), ...Array(6).fill('GG'), // 16 solicitudes Ganada (22 ítems ganados)
  'GGGGV', 'GGGV', // 2 solicitudes Ganada parcial (7 ganados y 2 ventas perdidas)
  'C', 'C', 'C', // 3 solicitudes En curso
  ...Array(5).fill('A'), ...Array(3).fill('AAAAA'), // 8 solicitudes Anulada (20 anulados)
  'VR', 'VR', // 2 Perdida (2 ventas perdidas y 2 rechazos)
  ...Array(5).fill('V'), ...Array(3).fill('VV') // 8 Perdida (11 ventas perdidas)
];

export const CLIENTE_K = COMPOSICION_CLIENTE_K.map((letras, i) => ({
  id: `k-${i + 1}`,
  tipo: i % 2 ? 'Pedido Manual' : 'RFQ',
  estado: letras.includes('G') ? 'Pedido Parcial' : 'Cotizado',
  cliente: 'Cliente K',
  productos: [...letras].map((letra, j) => ({ desc: `Producto ${i}-${j}`, cant: 1, estadoItem: ITEM[letra] }))
}));
