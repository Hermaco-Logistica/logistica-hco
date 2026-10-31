/**
 * Ruta de la aplicación que le corresponde a cada rol para ver una solicitud.
 * La usan el enlace "Ir al sitio" de los correos (vista IrASolicitud) y cualquier otro acceso directo.
 */
export function rutaParaSolicitud({ role, solicitud, id = solicitud?.id }) {
  if (!id) return null;
  const esPedidoManual = solicitud?.tipo === 'Pedido Manual';

  if (role === 'comprador') {
    if (esPedidoManual) return `/compras/revision-pedido/${id}`;
    // Una RFQ pendiente se cotiza en la calculadora; una ya cotizada se consulta en su detalle.
    return (solicitud?.estado || 'Pendiente') === 'Pendiente' ? `/calculadora/${id}` : `/vendedor/detalle/${id}`;
  }

  return esPedidoManual ? `/vendedor/pedido-manual/${id}` : `/vendedor/detalle/${id}`;
}

/** Enlace permanente que se pone en los correos; resuelve la ruta según quien lo abre. */
export const rutaEnlaceSolicitud = (id) => `/ir/solicitud/${id}`;
