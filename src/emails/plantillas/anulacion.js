import { boton, cita, cuadriculaDatos, etiquetaCorreo, layout, subtitulo, tabla } from '../html/bloques';
import { urlSolicitud } from '../html/enlaces';
import { cantidadItem, descripcionItem, esc } from '../html/texto';

/** Aviso al vendedor de que Compras anuló una solicitud completa o un ítem. */
export const anulacion = ({ solicitud, motivo, anuladoPor, esParcial = false, itemAnulado = null }) => {
  const esPedidoManual = solicitud.tipo === 'Pedido Manual';
  const tipoDocumento = esPedidoManual ? 'pedido manual' : 'solicitud de compra (RFQ)';
  const productos = esParcial && itemAnulado ? [itemAnulado] : (solicitud.productos || []);

  return layout({
    categoria: esParcial ? `Anulación parcial de ${tipoDocumento}` : `Anulación de ${tipoDocumento}`,
    titulo: solicitud.correlativo,
    acento: 'peligro',
    etiquetas: [etiquetaCorreo(esParcial ? 'Anulación parcial' : 'Anulada', 'peligro')],
    cuerpo: `
      ${cuadriculaDatos([
        { rotulo: 'Cliente', valor: esc(solicitud.cliente) },
        { rotulo: 'Anulado por', valor: esc(anuladoPor) }
      ])}
      ${cita({ titulo: 'Motivo de la anulación', texto: motivo, tono: 'peligro' })}
      ${subtitulo(esParcial ? 'Ítem anulado' : 'Ítems anulados')}
      ${tabla({
        columnas: [{ titulo: 'Producto' }, { titulo: 'Marca' }, { titulo: 'Cant.', alinear: 'center' }],
        filas: productos.map((p) => [
          `<span style="text-decoration:line-through;color:#be123c;">${esc(descripcionItem(p).toUpperCase())}</span>`,
          esc(p.marca || '-'),
          `<strong>${cantidadItem(p)}</strong>`
        ]),
        fondoFila: () => '#fff1f2'
      })}
      ${boton({ texto: 'Ir al sitio', url: urlSolicitud(solicitud) })}`
  });
};
