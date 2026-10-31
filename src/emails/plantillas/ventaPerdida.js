import { boton, cuadriculaDatos, etiquetaCorreo, etiquetaDeDominio, layout, subtitulo, tabla } from '../html/bloques';
import { urlSolicitud } from '../html/enlaces';
import { cantidadItem, descripcionItem, esc, fechaHora } from '../html/texto';

/** Aviso a Compras de que el vendedor marcó ítems como venta perdida (sin pedido asociado). */
export const ventaPerdida = ({ solicitud, items = [], registradoPor }) => {
  const filas = items.map((p) => {
    const motivo = p.motivoVentaPerdida && typeof p.motivoVentaPerdida === 'object' ? p.motivoVentaPerdida : {};
    return [
      `<strong>${esc(descripcionItem(p).toUpperCase())}</strong><div style="font-size:11px;color:#64748b;">Marca: ${esc(p.marca || 'N/A')} · Cant.: ${cantidadItem(p)}</div>`,
      esc(motivo.nombre || p.motivoEstadoItem || 'No especificado'),
      motivo.comentario ? esc(motivo.comentario) : '<span style="color:#94a3b8;">—</span>'
    ];
  });

  return layout({
    categoria: 'Venta perdida registrada',
    titulo: solicitud.correlativo,
    acento: 'naranja',
    etiquetas: [
      etiquetaDeDominio('estadoSolicitud', 'Venta Perdida'),
      etiquetaCorreo(`${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}`, 'naranja')
    ],
    cuerpo: `
      ${cuadriculaDatos([
        { rotulo: 'Cliente', valor: esc(solicitud.cliente) },
        { rotulo: 'Vendedor', valor: esc(solicitud.vendedorNombre), detalle: esc(solicitud.vendedorEmail) },
        { rotulo: 'Registrada por', valor: esc(registradoPor || solicitud.vendedorEmail) },
        { rotulo: 'Fecha', valor: esc(fechaHora(new Date())) }
      ])}
      ${subtitulo('Ítems perdidos y motivo')}
      ${tabla({
        columnas: [{ titulo: 'Ítem' }, { titulo: 'Motivo' }, { titulo: 'Comentario del vendedor' }],
        filas,
        fondoFila: () => '#fff7ed'
      })}
      ${boton({ texto: 'Ir al sitio', url: urlSolicitud(solicitud) })}`
  });
};
