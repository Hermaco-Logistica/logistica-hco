import { boton, citaSimple, etiquetaCorreo, etiquetaDeDominio, filasDatos, layoutSimple, listaSimple } from '../html/bloques';
import { urlSolicitud } from '../html/enlaces';
import { descripcionItem, esc, fechaCorta } from '../html/texto';

/**
 * Avisos del seguimiento de cliente (revisión registrada, prórroga solicitada y prórroga respondida) con el
 * diseño sobrio: datos en filas, texto citado y un único botón "Ir al sitio".
 * `items`: [{ item, indice, ... }]; `indice` es la posición del ítem en la solicitud (se muestra como "Ítem n").
 */

const nombreItem = (item, indice) => `<strong>${esc(descripcionItem(item).toUpperCase())}</strong> <span style="color:#64748b;font-weight:400;">· Ítem ${indice + 1}${item?.marca ? ` · ${esc(item.marca)}` : ''}</span>`;

const datosBase = (solicitud) => [
  { rotulo: 'Solicitud', valor: `${esc(solicitud.correlativo)} <span style="color:#64748b;font-weight:400;">· ${esc(solicitud.tipo || 'RFQ')}</span>` },
  { rotulo: 'Cliente', valor: esc(solicitud.cliente) },
  { rotulo: 'Vendedor', valor: `${esc(solicitud.vendedorNombre || solicitud.vendedorEmail)}${solicitud.vendedorNombre && solicitud.vendedorEmail ? ` <span style="color:#64748b;font-weight:400;">· ${esc(solicitud.vendedorEmail)}</span>` : ''}` }
];

/** El vendedor mantuvo ítems en revisión con el cliente. items: [{ item, indice, numero, hasta }] */
export const revisionRegistrada = ({ solicitud, items = [], comentario = '', registradoPor }) => layoutSimple({
  categoria: 'Seguimiento de cliente',
  titulo: 'Solicitud mantenida en revisión',
  etiqueta: etiquetaDeDominio('faseSeguimiento', 'en_revision'),
  cuerpo: `
    <p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:#334155;">El vendedor registró que el cliente mantiene la solicitud en revisión.</p>
    ${filasDatos([...datosBase(solicitud), { rotulo: 'Registrada por', valor: esc(registradoPor || solicitud.vendedorEmail) }])}
    ${citaSimple({ titulo: 'Comentario del vendedor', texto: comentario })}
    ${listaSimple({
      titulo: 'Ítems en revisión',
      elementos: items.map(({ item, indice, numero, hasta }) => ({
        principal: nombreItem(item, indice),
        secundario: `Revisión ${numero}/2 · hasta ${esc(fechaCorta(hasta))}`
      }))
    })}
    ${boton({ texto: 'Ir al sitio', url: urlSolicitud(solicitud) })}`
});

/** El vendedor pidió una prórroga formal que Compras debe responder. items: [{ item, indice, vence }] */
export const prorrogaSolicitada = ({ solicitud, prorroga, items = [] }) => layoutSimple({
  categoria: 'Seguimiento de cliente',
  titulo: 'Nueva solicitud de prórroga',
  etiqueta: etiquetaDeDominio('faseSeguimiento', 'prorroga_pendiente'),
  cuerpo: `
    <p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:#334155;">El vendedor solicita más tiempo para esta solicitud. Necesita tu respuesta.</p>
    ${filasDatos([
      ...datosBase(solicitud),
      { rotulo: 'Días hábiles solicitados', valor: esc(prorroga.diasSolicitados) },
      { rotulo: 'Ronda', valor: esc(prorroga.ronda || 1) }
    ])}
    ${citaSimple({ titulo: 'Motivo', texto: prorroga.motivo })}
    ${listaSimple({
      titulo: items.length === 1 ? 'Ítem incluido' : `Ítems incluidos (${items.length})`,
      elementos: items.map(({ item, indice, vence }) => ({
        principal: nombreItem(item, indice),
        secundario: vence ? `Vence ${esc(fechaCorta(vence))}` : ''
      }))
    })}
    ${boton({ texto: 'Ir al sitio', url: urlSolicitud(solicitud) })}`
});

/** Compras aprobó o rechazó la prórroga. fechasAprobadas: { [indice]: fecha } */
export const prorrogaRespondida = ({ solicitud, prorroga, accion, comentario = '', respondidoPor, items = [], fechasAprobadas = {} }) => {
  const aprobada = accion === 'aprobada';
  return layoutSimple({
    categoria: 'Seguimiento de cliente',
    titulo: aprobada ? 'Prórroga aprobada' : 'Prórroga rechazada',
    etiqueta: etiquetaCorreo(aprobada ? 'Aprobada' : 'Rechazada', aprobada ? 'exito' : 'peligro'),
    cuerpo: `
      <p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:#334155;">${aprobada
        ? 'Compras aprobó la prórroga. Los ítems tienen una nueva fecha límite.'
        : 'Compras rechazó la prórroga. Los ítems conservan su vigencia original y puedes cerrarlos como pedido o venta perdida.'}</p>
      ${filasDatos([
        ...datosBase(solicitud),
        { rotulo: 'Respondida por', valor: esc(respondidoPor || 'Compras') },
        { rotulo: aprobada ? 'Días aprobados' : 'Días solicitados', valor: esc(aprobada ? (prorroga.diasAprobados || prorroga.diasSolicitados) : prorroga.diasSolicitados) }
      ])}
      ${citaSimple({ titulo: aprobada ? 'Comentario de Compras' : 'Motivo del rechazo', texto: comentario })}
      ${aprobada ? listaSimple({
        titulo: 'Nuevas fechas límite',
        elementos: items.map(({ item, indice }) => ({ principal: nombreItem(item, indice), secundario: `<strong style="color:#065f46;">${esc(fechaCorta(fechasAprobadas[indice]))}</strong>` }))
      }) : ''}
      ${boton({ texto: 'Ir al sitio', url: urlSolicitud(solicitud) })}`
  });
};
