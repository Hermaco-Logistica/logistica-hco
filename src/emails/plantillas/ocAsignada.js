import { boton, etiquetaCorreo, layout, subtitulo } from '../html/bloques';
import { urlPedidos } from '../html/enlaces';
import { esc } from '../html/texto';

/** Aviso al vendedor de que Compras vinculó ítems de sus solicitudes a una orden de compra. itemsVendedor: [{ correlativo, idRFQ, descripcion, fechaCompromiso }] */
export const ocAsignada = ({ numOC, itemsVendedor = [] }) => {
  const porSolicitud = itemsVendedor.reduce((acc, item) => {
    const clave = item.correlativo || item.idRFQ || 'S/N';
    (acc[clave] ||= []).push({
      descripcion: item.descripcion || item.desc || 'Ítem sin descripción',
      fechaCompromiso: item.fechaCompromiso || null
    });
    return acc;
  }, {});

  const bloques = Object.entries(porSolicitud).map(([solicitud, productos]) => `
    ${subtitulo(solicitud)}
    <ul style="margin:0;padding-left:18px;">
      ${productos.map((p) => `<li style="font-size:13px;color:#334155;margin-bottom:6px;">${esc(p.descripcion)}${p.fechaCompromiso ? ` ${etiquetaCorreo(`Entrega prometida: ${p.fechaCompromiso}`, 'info')}` : ''}</li>`).join('')}
    </ul>`).join('');

  return layout({
    categoria: 'Compras · Orden de compra',
    titulo: `OC asignada: ${numOC}`,
    acento: 'exito',
    etiquetas: [etiquetaCorreo(`OC ${numOC}`, 'exito'), etiquetaCorreo(`${itemsVendedor.length} ${itemsVendedor.length === 1 ? 'ítem' : 'ítems'}`, 'neutral')],
    cuerpo: `
      <p style="margin:0 0 6px;font-size:14px;line-height:1.5;">Estos productos de tus solicitudes quedaron vinculados a la orden de compra <strong>${esc(numOC)}</strong>:</p>
      ${bloques}
      ${boton({ texto: 'Ir al sitio', url: urlPedidos() })}`
  });
};
