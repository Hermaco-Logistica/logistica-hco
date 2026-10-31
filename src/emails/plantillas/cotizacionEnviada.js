import { boton, cita, cuadriculaDatos, etiquetaDeDominio, layout } from '../html/bloques';
import { urlSolicitud } from '../html/enlaces';
import { esc } from '../html/texto';

/** Cuerpo del correo que acompaña la cotización en PDF cuando Compras termina (total o parcialmente) una solicitud. */
export const cotizacionEnviada = ({ solicitud, esParcial = false, itemsCotizados = null, totalItems = null, comentarios = '' }) => {
  const cobertura = itemsCotizados !== null && totalItems !== null
    ? `${itemsCotizados} de ${totalItems} ítems cotizados`
    : null;
  return layout({
    categoria: esParcial ? 'Avance de cotización' : 'Cotización lista',
    titulo: solicitud.correlativo,
    acento: esParcial ? 'azul' : 'exito',
    etiquetas: [etiquetaDeDominio('estadoSolicitud', esParcial ? 'Cotizado Parcial' : 'Cotizado', { rol: 'vendedor' })],
    cuerpo: `
      <p style="margin:0 0 14px;font-size:14px;line-height:1.5;">Estimado/a ${esc(solicitud.vendedorNombre || 'vendedor')}, adjunto encontrará su ${esParcial ? 'avance de cotización' : 'cotización'} en PDF.</p>
      ${cuadriculaDatos([
        { rotulo: 'Cliente', valor: esc(solicitud.cliente) },
        ...(cobertura ? [{ rotulo: 'Cobertura', valor: esc(cobertura) }] : [{ rotulo: 'Tipo', valor: esc(solicitud.tipo || 'RFQ') }])
      ])}
      ${cita({ titulo: 'Comentarios de Compras', texto: comentarios })}
      ${esParcial ? '<p style="margin:12px 0 0;font-size:13px;color:#475569;">Los ítems restantes se enviarán en un siguiente avance.</p>' : ''}
      ${boton({ texto: 'Ir al sitio', url: urlSolicitud(solicitud) })}`
  });
};
