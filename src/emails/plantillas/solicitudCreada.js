import { boton, cita, cuadriculaDatos, etiquetaCorreo, etiquetaDeDominio, layout, subtitulo, tabla } from '../html/bloques';
import { urlSolicitud } from '../html/enlaces';
import { cantidadItem, descripcionItem, esc, moneda } from '../html/texto';

/** Aviso a Compras de una RFQ o un Pedido Manual recién creado por el vendedor. */
export const solicitudCreada = ({ solicitud }) => {
  const esPedidoManual = solicitud.tipo === 'Pedido Manual';
  const productos = solicitud.productos || [];
  const cantidadTotal = productos.reduce((acc, p) => acc + cantidadItem(p), 0);

  const columnas = [
    { titulo: 'Producto' },
    { titulo: 'Marca' },
    { titulo: 'Cant.', alinear: 'center' },
    ...(esPedidoManual ? [{ titulo: 'Precio de venta', alinear: 'right' }] : [])
  ];
  const filas = productos.map((p) => [
    `<strong>${esc(descripcionItem(p).toUpperCase())}</strong>`,
    esc(p.marca || '-'),
    `<strong>${cantidadItem(p)}</strong>`,
    ...(esPedidoManual ? [moneda(p.fob || p.precio)] : [])
  ]);

  return layout({
    categoria: esPedidoManual ? 'Nuevo pedido manual' : 'Nueva solicitud de compra (RFQ)',
    titulo: solicitud.correlativo,
    acento: 'info',
    etiquetas: [
      etiquetaCorreo(esPedidoManual ? 'Pedido manual' : 'RFQ', 'info'),
      etiquetaDeDominio('estadoSolicitud', 'Pendiente', { rol: 'comprador' })
    ],
    cuerpo: `
      ${cuadriculaDatos([
        { rotulo: 'Cliente', valor: esc(solicitud.cliente) },
        { rotulo: 'Vendedor', valor: esc(solicitud.vendedorNombre), detalle: esc(solicitud.vendedorEmail) },
        { rotulo: 'Cantidad total', valor: String(cantidadTotal) },
        { rotulo: 'Validez solicitada', valor: esc(solicitud.validez || '—') }
      ])}
      ${cita({ titulo: 'Comentarios del vendedor', texto: solicitud.comentariosVendedor })}
      ${subtitulo('Productos solicitados')}
      ${tabla({ columnas, filas })}
      ${boton({ texto: 'Ir al sitio', url: urlSolicitud(solicitud) })}`
  });
};
