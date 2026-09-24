import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { sintetizarMensajesLegados } from '../hooks/useHiloItem';

export const construirCorreoActualizacion = async ({ pedido, items, indicesModificados, rol, comentarioGeneral }) => {
  const qMensajes = query(collection(db, `solicitudes/${pedido.id || pedido.idCotizacion}/mensajes`), orderBy("createdAt", "asc"));
  const snapMensajes = await getDocs(qMensajes);
  const todosMensajesDB = snapMensajes.docs.map(d => d.data());

  const formatearFechaHora = (ts) => {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-HN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  let detallesHtml = '';
  
  const itemsAMostrar = indicesModificados 
    ? indicesModificados.map(idx => ({ item: items[idx], idx }))
    : items.map((item, idx) => ({ item, idx })).filter(({item}) => item.estadoItem !== 'Pendiente');

  itemsAMostrar.forEach(({ item, idx }) => {
    const p = item;
    const fobActual = Number(p.fob || 0);
    const fobPrevio = p.fobAnterior !== undefined ? Number(p.fobAnterior) : (p.precioAnterior !== undefined ? Number(p.precioAnterior) : fobActual);
    const hayCambioPrecio = fobPrevio > 0 && fobPrevio !== fobActual;

    const mensajesItemDB = todosMensajesDB.filter(m => m.itemId === idx);
    const mensajesItem = sintetizarMensajesLegados(p, idx, mensajesItemDB);
    
    let estadoLabel = 'MODIFICADO';
    if (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') { estadoLabel = 'APROBADO'; }
    else if (p.estadoItem === 'Cotizado') { estadoLabel = 'NUEVA OFERTA'; }
    else if (p.estadoItem === 'Denegado') { estadoLabel = 'DENEGADO'; }
    else if (p.estadoItem === 'Cancelado') { estadoLabel = 'CANCELADO'; }

    let historialHtml = '';
    if (mensajesItem.length > 0) {
      historialHtml = '<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0;">';
      historialHtml += '<div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Historial de correspondencia</div>';
      
      mensajesItem.forEach(m => {
        const autorNombre = m.autor?.nombre || 'Usuario';
        const rolTexto = m.autor?.rol ? ` (${m.autor.rol.charAt(0).toUpperCase() + m.autor.rol.slice(1)})` : '';
        const fechaStr = formatearFechaHora(m.createdAt);

        if (m.tipo === 'texto') {
          historialHtml += `
            <div style="margin-bottom: 10px; background-color: #f8fafc; border-left: 3px solid #cbd5e1; padding: 10px 14px; border-radius: 0 4px 4px 0;">
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #edf2f7;">
                <strong style="color: #1e293b;">De:</strong> ${autorNombre}${rolTexto}${fechaStr ? ` &nbsp;|&nbsp; <span>${fechaStr}</span>` : ''}
              </div>
              <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                ${m.texto}
              </div>
            </div>
          `;
        } else if (m.tipo === 'propuesta') {
          const precioPropuesto = Number(m.precioPropuesto || 0);
          const precioAnterior = Number(m.precioAnterior || 0);
          const tienePrecioAnterior = precioAnterior > 0 && precioAnterior !== precioPropuesto;
          const modalidadPropuesta = m.modalidad || '';
          const modalidadAnterior = m.modalidadAnterior || '';
          const hayModalidadCambio = modalidadPropuesta && modalidadAnterior && modalidadAnterior !== modalidadPropuesta;
          const tiempoEntregaPropuesto = m.tiempoEntrega || '';
          const tiempoEntregaAnterior = m.tiempoEntregaAnterior || '';
          const hayTiempoCambio = tiempoEntregaPropuesto && tiempoEntregaAnterior && tiempoEntregaAnterior !== tiempoEntregaPropuesto;

          historialHtml += `
            <div style="margin-bottom: 10px; background-color: #f8fafc; border-left: 3px solid #94a3b8; padding: 10px 14px; border-radius: 0 4px 4px 0;">
              <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #edf2f7;">
                <strong style="color: #1e293b;">De:</strong> ${autorNombre}${rolTexto}${fechaStr ? ` &nbsp;|&nbsp; <span>${fechaStr}</span>` : ''}
                <span style="float: right; font-size: 10px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; font-weight: 600;">Propuesta de ajuste</span>
              </div>
              <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                <table style="font-size: 12px; color: #334155; border-collapse: collapse; margin-bottom: 4px;">
                  ${tienePrecioAnterior ? `
                  <tr>
                    <td style="padding: 1px 12px 1px 0; color: #64748b;">Precio anterior:</td>
                    <td style="padding: 1px 0; color: #94a3b8; text-decoration: line-through;">$${precioAnterior.toFixed(2)}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 1px 12px 1px 0; color: #64748b;">Precio propuesto:</td>
                    <td style="padding: 1px 0;"><strong>$${precioPropuesto.toFixed(2)}</strong></td>
                  </tr>
                  ${tiempoEntregaPropuesto ? `
                  <tr>
                    <td style="padding: 1px 12px 1px 0; color: #64748b;">Tiempo de entrega:</td>
                    <td style="padding: 1px 0;">
                      ${hayTiempoCambio ? `<span style="text-decoration: line-through; color: #94a3b8; margin-right: 6px;">${!isNaN(tiempoEntregaAnterior) ? `${tiempoEntregaAnterior} días` : tiempoEntregaAnterior}</span>` : ''}
                      <strong>${!isNaN(tiempoEntregaPropuesto) ? `${tiempoEntregaPropuesto} días` : tiempoEntregaPropuesto}</strong>
                    </td>
                  </tr>` : ''}
                  ${modalidadPropuesta ? `
                  <tr>
                    <td style="padding: 1px 12px 1px 0; color: #64748b;">Modalidad:</td>
                    <td style="padding: 1px 0;">
                      ${hayModalidadCambio ? `<span style="text-decoration: line-through; color: #94a3b8; margin-right: 6px;">${modalidadAnterior}</span>` : ''}
                      <strong>${modalidadPropuesta}</strong>
                    </td>
                  </tr>` : ''}
                </table>
                ${m.texto ? `<div style="margin-top: 6px; font-size: 12px; color: #475569; font-style: italic;">"${m.texto}"</div>` : ''}
              </div>
            </div>
          `;
        } else if (m.tipo === 'aceptacion' || m.tipo === 'evento') {
          let textoEvento = m.texto || '';
          if (m.tipo === 'evento') {
            const acc = { 'aprobar': 'aprobó el ítem', 'ajustar': 'envió una propuesta de ajuste', 'aceptar': 'aceptó los términos', 'contraofertar': 'envió una contraoferta', 'denegar': 'denegó el ítem', 'rechazar': 'rechazó el ítem', 'deshacer': 'deshizo su último cambio' }[m.accion] || m.accion;
            textoEvento = `<strong>${autorNombre}</strong> ${acc}.`;
          }
          historialHtml += `
            <div style="margin-bottom: 10px; background-color: #f8fafc; border-left: 3px solid #64748b; padding: 10px 14px; border-radius: 0 4px 4px 0;">
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #edf2f7;">
                <strong style="color: #1e293b;">De:</strong> ${autorNombre}${rolTexto}${fechaStr ? ` &nbsp;|&nbsp; <span>${fechaStr}</span>` : ''}
              </div>
              <div style="font-size: 12px; color: #1e293b; line-height: 1.5;">
                ✓ <strong>Aviso:</strong> ${textoEvento}
              </div>
            </div>
          `;
        }
      });
      historialHtml += '</div>';
    }

    const modActual = p.modalidad || 'Aéreo';
    const modAnterior = p.modalidadAnterior || modActual;
    const hayModCambio = modAnterior && modAnterior !== modActual;

    const tiempoActual = p.fechaCompromiso || p.tiempoEntrega || 'No definido';
    const tiempoAnterior = p.tiempoEntregaAnterior || tiempoActual;
    const hayTiempoCambioEmail = tiempoAnterior && tiempoAnterior !== tiempoActual;

    detallesHtml += `
      <div style="margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
        <table style="width: 100%; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 15px; border-collapse: collapse;">
          <tr>
            <td style="font-size: 13px; font-weight: bold; color: #0f172a;">${p.descripcion || p.desc} (x${p.cant})</td>
            <td style="text-align: right;">
              <span style="color: #475569; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; letter-spacing: 0.5px;">${estadoLabel}</span>
            </td>
          </tr>
        </table>
        <div style="padding: 15px;">
          <table style="width: 100%; font-size: 12px; color: #334155; border-collapse: collapse;">
            <tr>
              <td style="padding: 0 20px 0 0; vertical-align: top;">
                ${hayCambioPrecio ? `
                  <span style="color: #64748b; margin-right: 4px;">Precio anterior:</span><span style="text-decoration: line-through; color: #94a3b8; margin-right: 8px;">$${fobPrevio.toFixed(2)}</span><br/>
                  <strong>Nuevo precio:</strong> <strong>$${fobActual.toFixed(2)}</strong>
                ` : `
                  <strong>Precio actual:</strong> $${fobActual.toFixed(2)}
                `}
              </td>
              <td style="padding: 0 20px 0 0; vertical-align: top;">
                ${hayTiempoCambioEmail ? `
                  <span style="color: #64748b; margin-right: 4px;">T. anterior:</span><span style="text-decoration: line-through; color: #94a3b8; margin-right: 8px;">${tiempoAnterior}</span><br/>
                  <strong>T. Entrega:</strong> <strong>${tiempoActual}</strong>
                ` : `
                  <strong>T. Entrega:</strong> ${tiempoActual}
                `}
              </td>
              <td style="padding: 0; vertical-align: top;">
                ${hayModCambio ? `
                  <span style="color: #64748b; margin-right: 4px;">Mod. anterior:</span><span style="text-decoration: line-through; color: #94a3b8; margin-right: 8px;">${modAnterior}</span><br/>
                  <strong>Modalidad:</strong> <strong>${modActual}</strong>
                ` : `
                  <strong>Modalidad:</strong> ${modActual}
                `}
              </td>
            </tr>
          </table>
          ${historialHtml}
        </div>
      </div>
    `;
  });

  const tituloHeader = rol === 'compras' ? 'Actualización de Pedido Manual' : 'Pedido Manual Confirmado';

  return `
    <div style="font-family: Arial, sans-serif; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 20px; text-align: center; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
        ${rol === 'vendedor' ? '<p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Sistema Logística Hermaco</p>' : ''}
        <h2 style="color: #0f172a; margin: ${rol === 'vendedor' ? '8px 0 0' : '0'}; font-size: 18px; font-weight: bold; letter-spacing: -0.5px;">${tituloHeader}</h2>
      </div>
      <div style="padding: 20px;">
        ${rol === 'vendedor' ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Vendedor:</strong> ${pedido.vendedorNombre}</p>` : ''}
        <p style="margin: 4px 0; font-size: 14px;"><strong>Correlativo:</strong> ${pedido.correlativo}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Cliente:</strong> ${pedido.cliente}</p>
        ${comentarioGeneral ? `<div style="margin-top: 16px; padding: 12px 16px; border-left: 3px solid #cbd5e1; background:#f8fafc; color:#334155; font-size: 13px;"><strong>Comentarios:</strong><br/><span style="color:#475569;">${comentarioGeneral}</span></div>` : ''}
        
        <h3 style="margin-top: 24px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-weight: bold; letter-spacing: 0.5px;">Detalle de Modificaciones</h3>
        <div style="margin-top: 16px;">
          ${detallesHtml}
        </div>
      </div>
    </div>
  `;
};
