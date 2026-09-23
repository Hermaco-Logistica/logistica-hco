import { db } from '../firebase';
import { runTransaction, doc, collection, serverTimestamp, Timestamp, updateDoc, getDoc } from 'firebase/firestore';
import { construirCorreoActualizacion } from '../utils/emailNegociacion';

export class ConflictoVersionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictoVersionError';
  }
}

export function derivarNegociacion(item) {
  const estado = item.estadoItem || 'Pendiente';
  let resultado = 'pendiente';
  if (estado === 'Pedido' || estado === 'Comprado') resultado = 'acordado';
  else if (estado === 'Denegado') resultado = 'denegado';
  else if (estado === 'Cancelado' || estado === 'Rechazado') resultado = 'cancelado';

  if (item.negociacion) {
    return { ...item.negociacion, resultado };
  }

  let turno = null;
  if (estado === 'Pendiente') turno = 'compras';
  else if (estado === 'Cotizado') turno = 'vendedor';

  const precio = Number(item.fob || 0);
  const ofertaInicial = {
    precio,
    tiempoEntrega: item.fechaCompromiso || item.tiempoEntrega || '',
    modalidad: item.modalidad || 'Aéreo',
    autorRol: 'vendedor',
    creadaEn: Timestamp.now(),
    mensajeId: null
  };

  let ofertaAnterior = null;
  if (item.fobAnterior !== undefined || item.precioAnterior !== undefined) {
    ofertaAnterior = {
      precio: Number(item.fobAnterior !== undefined ? item.fobAnterior : (item.precioAnterior || 0)),
      tiempoEntrega: item.tiempoEntregaAnterior || ofertaInicial.tiempoEntrega,
      modalidad: item.modalidadAnterior || ofertaInicial.modalidad,
      autorRol: 'compras',
      creadaEn: Timestamp.now()
    };
  }

  return {
    version: 0,
    turno,
    resultado,
    ronda: 1,
    ofertaVigente: ofertaInicial,
    ofertaAnterior,
    sinNotificar: false,
    ultimoCambio: null
  };
}

export function calcularEstadoGlobal(productos) {
  let todosResueltos = true;
  let todosDenegados = true;
  let algunAcordado = false;
  let turnoVendedor = false;

  for (const p of productos) {
    const neg = derivarNegociacion(p);
    
    if (neg.resultado === 'acordado') {
      algunAcordado = true;
      todosDenegados = false;
    } else if (neg.resultado === 'denegado' || neg.resultado === 'cancelado') {
      // Sigue estando resuelto, pero como denegado. No rompe `todosResueltos`.
    } else {
      todosResueltos = false;
      todosDenegados = false;
      if (neg.turno === 'vendedor') {
        turnoVendedor = true;
      }
    }
  }

  if (todosResueltos && todosDenegados) return 'Denegado';
  if (todosResueltos && algunAcordado) return 'Pedido';
  if (!todosResueltos && algunAcordado) return 'Pedido Parcial';
  if (!algunAcordado && turnoVendedor) return 'Cotizado Parcial';
  return 'Enviado a Compras';
}

export function calcularResumenNegociacion(productos) {
  let turnoCompras = 0;
  let turnoVendedor = 0;
  let acordados = 0;
  let denegados = 0;
  let sinNotificarCompras = 0;
  let sinNotificarVendedor = 0;

  for (const p of productos) {
    const neg = derivarNegociacion(p);
    if (neg.turno === 'compras') turnoCompras++;
    if (neg.turno === 'vendedor') turnoVendedor++;
    if (neg.resultado === 'acordado') acordados++;
    if (neg.resultado === 'denegado' || neg.resultado === 'cancelado') denegados++;
    
    if (neg.sinNotificar && neg.ultimoCambio) {
      if (neg.ultimoCambio.rol === 'compras') sinNotificarCompras++;
      if (neg.ultimoCambio.rol === 'vendedor') sinNotificarVendedor++;
    }
  }

  return {
    turnoCompras,
    turnoVendedor,
    acordados,
    denegados,
    sinNotificarCompras,
    sinNotificarVendedor
  };
}

async function ejecutarMutacion({ solicitudId, idx, versionEsperada, actor, accionNombre, mutador }) {
  const docRef = doc(db, 'solicitudes', solicitudId);
  return await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) throw new Error('Solicitud no encontrada');
    
    const solicitud = docSnap.data();
    if (solicitud.tipo !== 'Pedido Manual') {
      throw new Error('Esta operación solo es válida para Pedidos Manuales.');
    }
    const productos = [...solicitud.productos];
    const itemActual = productos[idx];
    
    if (itemActual.estadoItem === 'Comprado') {
      throw new Error('El ítem ya fue comprado y no puede ser modificado.');
    }

    const negActual = derivarNegociacion(itemActual);
    
    if (negActual.version !== versionEsperada) {
      throw new ConflictoVersionError('Este ítem cambió, revisa');
    }

    const estadoPrevioSnapshot = {
      negociacion: JSON.parse(JSON.stringify(negActual)),
      estadoItem: itemActual.estadoItem,
      fob: itemActual.fob,
      fechaCompromiso: itemActual.fechaCompromiso,
      modalidad: itemActual.modalidad,
      fobAnterior: itemActual.fobAnterior,
      tiempoEntregaAnterior: itemActual.tiempoEntregaAnterior,
      modalidadAnterior: itemActual.modalidadAnterior
    };

    const prevMensajeId = negActual.ofertaVigente?.mensajeId;
    const mutacion = mutador(negActual, itemActual);
    if (!mutacion) return; // No hay cambios reales

    const nuevaVersion = negActual.version + 1;
    mutacion.negociacion.version = nuevaVersion;
    mutacion.negociacion.sinNotificar = true;
    
    // 2. Strip ultimoCambio from estadoPrevio to prevent nesting
    const estadoPrevioLimpio = JSON.parse(JSON.stringify(estadoPrevioSnapshot));
    if (estadoPrevioLimpio.negociacion && estadoPrevioLimpio.negociacion.ultimoCambio) {
      delete estadoPrevioLimpio.negociacion.ultimoCambio;
    }

    mutacion.negociacion.ultimoCambio = {
      rol: actor.rol,
      uid: actor.uid,
      nombre: actor.nombre,
      accion: accionNombre,
      en: Timestamp.now(),
      estadoPrevio: estadoPrevioLimpio
    };
    
    let nuevoMensajeId = null;
    let mensajeRef = null;

    if (accionNombre === 'ajustar' || accionNombre === 'contraofertar') {
      mensajeRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
      nuevoMensajeId = mensajeRef.id;
      mutacion.negociacion.ofertaVigente.mensajeId = nuevoMensajeId;
    }

    const itemActualizado = { ...itemActual, ...mutacion.itemUpdate, negociacion: mutacion.negociacion };
    productos[idx] = itemActualizado;

    const estadoGlobal = calcularEstadoGlobal(productos);
    const resumen = calcularResumenNegociacion(productos);

    transaction.update(docRef, {
      productos,
      estado: estadoGlobal,
      resumenNegociacion: resumen
    });
    
    if (accionNombre === 'ajustar' || accionNombre === 'contraofertar') {
      if (prevMensajeId) {
        transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, prevMensajeId), {
          estadoPropuesta: 'contraofertada'
        });
      }
      const propuestaInfo = {
        itemId: idx,
        tipo: 'propuesta',
        estadoPropuesta: 'vigente',
        precioPropuesto: mutacion.oferta.precio,
        precioAnterior: negActual.ofertaAnterior ? negActual.ofertaAnterior.precio : itemActual.fob,
        tiempoEntrega: mutacion.oferta.tiempoEntrega,
        tiempoEntregaAnterior: negActual.ofertaAnterior ? negActual.ofertaAnterior.tiempoEntrega : itemActual.fechaCompromiso,
        modalidad: mutacion.oferta.modalidad,
        modalidadAnterior: negActual.ofertaAnterior ? negActual.ofertaAnterior.modalidad : itemActual.modalidad,
        autor: actor,
        createdAt: Timestamp.now()
      };
      transaction.set(mensajeRef, propuestaInfo);
    } else {
      if ((accionNombre === 'aprobar' || accionNombre === 'aceptar') && prevMensajeId) {
        transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, prevMensajeId), {
          estadoPropuesta: 'aceptada'
        });
      } else if ((accionNombre === 'rechazar' || accionNombre === 'denegar') && prevMensajeId) {
        transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, prevMensajeId), {
          estadoPropuesta: 'rechazada'
        });
      }
      mensajeRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
      const eventoInfo = {
        itemId: idx,
        tipo: 'evento',
        accion: accionNombre,
        ronda: mutacion.negociacion.ronda,
        autor: actor,
        createdAt: Timestamp.now()
      };
      transaction.set(mensajeRef, eventoInfo);
    }

    if (mutacion.comentario) {
      const comentarioRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
      transaction.set(comentarioRef, {
        itemId: idx,
        tipo: 'texto',
        autor: actor,
        texto: mutacion.comentario,
        createdAt: Timestamp.now()
      });
    }

    return itemActualizado;
  });
}

export const aprobarItem = ({ solicitudId, idx, versionEsperada, actor }) => {
  return ejecutarMutacion({
    solicitudId, idx, versionEsperada, actor, accionNombre: 'aprobar',
    mutador: (neg) => {
      if (neg.turno !== 'compras') throw new Error('Turno incorrecto');
      neg.turno = null;
      neg.resultado = 'acordado';
      return {
        negociacion: neg,
        itemUpdate: { estadoItem: 'Pedido' }
      };
    }
  });
};

export const ajustarItem = ({ solicitudId, idx, versionEsperada, actor, oferta, comentario }) => {
  return ejecutarMutacion({
    solicitudId, idx, versionEsperada, actor, accionNombre: 'ajustar',
    mutador: (neg) => {
      if (neg.turno !== 'compras') throw new Error('Turno incorrecto');
      if (Number(oferta.precio) <= 0) throw new Error('El precio debe ser mayor a 0');
      const ofertaVigente = neg.ofertaVigente;
      if (oferta.precio === ofertaVigente.precio && oferta.tiempoEntrega === ofertaVigente.tiempoEntrega && oferta.modalidad === ofertaVigente.modalidad) {
        return null; // Sin cambios
      }
      neg.ofertaAnterior = { ...ofertaVigente };
      neg.ofertaVigente = { ...oferta, autorRol: actor.rol, autorNombre: actor.nombre, autorUid: actor.uid, creadaEn: Timestamp.now() };
      neg.turno = 'vendedor';
      neg.ronda += 1;
      return {
        negociacion: neg,
        itemUpdate: {
          estadoItem: 'Cotizado',
          fob: oferta.precio,
          fechaCompromiso: oferta.tiempoEntrega,
          modalidad: oferta.modalidad,
          fobAnterior: neg.ofertaAnterior.precio,
          tiempoEntregaAnterior: neg.ofertaAnterior.tiempoEntrega,
          modalidadAnterior: neg.ofertaAnterior.modalidad
        },
        oferta: oferta,
        comentario
      };
    }
  });
};

export const denegarItem = ({ solicitudId, idx, versionEsperada, actor, motivo }) => {
  return ejecutarMutacion({
    solicitudId, idx, versionEsperada, actor, accionNombre: 'denegar',
    mutador: (neg) => {
      if (neg.turno !== 'compras') throw new Error('Turno incorrecto');
      neg.turno = null;
      neg.resultado = 'denegado';
      return {
        negociacion: neg,
        itemUpdate: { estadoItem: 'Denegado' },
        comentario: motivo
      };
    }
  });
};

export const aceptarOferta = ({ solicitudId, idx, versionEsperada, actor }) => {
  return ejecutarMutacion({
    solicitudId, idx, versionEsperada, actor, accionNombre: 'aceptar',
    mutador: (neg) => {
      if (neg.turno !== 'vendedor') throw new Error('Turno incorrecto');
      neg.turno = null;
      neg.resultado = 'acordado';
      return {
        negociacion: neg,
        itemUpdate: { estadoItem: 'Pedido' }
      };
    }
  });
};

export const contraofertarItem = ({ solicitudId, idx, versionEsperada, actor, oferta, comentario }) => {
  return ejecutarMutacion({
    solicitudId, idx, versionEsperada, actor, accionNombre: 'contraofertar',
    mutador: (neg) => {
      if (neg.turno !== 'vendedor') throw new Error('Turno incorrecto');
      if (Number(oferta.precio) <= 0) throw new Error('El precio debe ser mayor a 0');
      const ofertaVigente = neg.ofertaVigente;
      if (oferta.precio === ofertaVigente.precio && oferta.tiempoEntrega === ofertaVigente.tiempoEntrega && oferta.modalidad === ofertaVigente.modalidad) {
        return null;
      }
      neg.ofertaAnterior = { ...ofertaVigente };
      neg.ofertaVigente = { ...oferta, autorRol: actor.rol, autorNombre: actor.nombre, autorUid: actor.uid, creadaEn: Timestamp.now() };
      neg.turno = 'compras';
      neg.ronda += 1;
      return {
        negociacion: neg,
        itemUpdate: {
          estadoItem: 'Pendiente',
          fob: oferta.precio,
          fechaCompromiso: oferta.tiempoEntrega,
          modalidad: oferta.modalidad,
          fobAnterior: neg.ofertaAnterior.precio,
          tiempoEntregaAnterior: neg.ofertaAnterior.tiempoEntrega,
          modalidadAnterior: neg.ofertaAnterior.modalidad
        },
        oferta: oferta,
        comentario
      };
    }
  });
};

export const rechazarOferta = ({ solicitudId, idx, versionEsperada, actor, motivo }) => {
  return ejecutarMutacion({
    solicitudId, idx, versionEsperada, actor, accionNombre: 'rechazar',
    mutador: (neg) => {
      if (neg.turno !== 'vendedor') throw new Error('Turno incorrecto');
      if (!motivo) throw new Error('El motivo es obligatorio para rechazar.');
      neg.turno = null;
      neg.resultado = 'cancelado';
      return {
        negociacion: neg,
        itemUpdate: { estadoItem: 'Cancelado' },
        comentario: motivo
      };
    }
  });
};

export const deshacerUltimoCambio = ({ solicitudId, idx, versionEsperada, actor }) => {
  const docRef = doc(db, 'solicitudes', solicitudId);
  return runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) throw new Error('Solicitud no encontrada');
    
    const solicitud = docSnap.data();
    if (solicitud.tipo !== 'Pedido Manual') {
      throw new Error('Esta operación solo es válida para Pedidos Manuales.');
    }
    const productos = [...solicitud.productos];
    const itemActual = productos[idx];
    const negActual = derivarNegociacion(itemActual);
    
    if (negActual.version !== versionEsperada) {
      throw new ConflictoVersionError('Este ítem cambió, revisa');
    }
    if (!negActual.sinNotificar) {
      throw new Error('No se puede deshacer un cambio ya notificado.');
    }
    if (!negActual.ultimoCambio || negActual.ultimoCambio.uid !== actor.uid) {
      throw new Error('No puedes deshacer este cambio.');
    }

    const previo = negActual.ultimoCambio.estadoPrevio;
    const itemRestaurado = {
      ...itemActual,
      negociacion: previo.negociacion,
      estadoItem: previo.estadoItem,
      fob: previo.fob,
      fechaCompromiso: previo.fechaCompromiso,
      modalidad: previo.modalidad,
      fobAnterior: previo.fobAnterior,
      tiempoEntregaAnterior: previo.tiempoEntregaAnterior,
      modalidadAnterior: previo.modalidadAnterior
    };
    productos[idx] = itemRestaurado;

    const estadoGlobal = calcularEstadoGlobal(productos);
    const resumen = calcularResumenNegociacion(productos);

    transaction.update(docRef, {
      productos,
      estado: estadoGlobal,
      resumenNegociacion: resumen
    });

    const mensajeRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
    transaction.set(mensajeRef, {
      itemId: idx,
      tipo: 'evento',
      accion: 'deshacer',
      autor: actor,
      createdAt: Timestamp.now()
    });
    
    const currMensajeId = negActual.ofertaVigente?.mensajeId;
    const prevMensajeId = previo.negociacion?.ofertaVigente?.mensajeId;

    if (negActual.ultimoCambio.accion === 'ajustar' || negActual.ultimoCambio.accion === 'contraofertar') {
      if (currMensajeId) {
        transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, currMensajeId), {
          estadoPropuesta: 'retirada'
        });
      }
      if (prevMensajeId) {
        transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, prevMensajeId), {
          estadoPropuesta: 'vigente'
        });
      }
    } else if (negActual.ultimoCambio.accion === 'aprobar' || negActual.ultimoCambio.accion === 'aceptar') {
       if (currMensajeId) {
         transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, currMensajeId), {
           estadoPropuesta: 'vigente'
         });
       }
    }

    return itemRestaurado;
  });
};

export const notificarCambios = async ({ solicitudId, actor, comentarioGeneral }) => {
  const docRef = doc(db, 'solicitudes', solicitudId);
  let payloadParaCorreo = null;

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) throw new Error('Solicitud no encontrada');
    const solicitud = docSnap.data();
    if (solicitud.tipo !== 'Pedido Manual') {
      throw new Error('Esta operación solo es válida para Pedidos Manuales.');
    }

    const productos = [...solicitud.productos];

    let itemsProcesados = 0;
    const productosParaPedido = [];
    const indicesModificados = [];

    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      const neg = derivarNegociacion(p);
      if (neg.sinNotificar && neg.ultimoCambio && neg.ultimoCambio.rol === actor.rol) {
        neg.sinNotificar = false;
        if (neg.ultimoCambio.estadoPrevio) {
          delete neg.ultimoCambio.estadoPrevio;
        }
        productos[i] = { ...p, negociacion: neg };
        indicesModificados.push(i);
        itemsProcesados++;
      }
      
      if (p.estadoItem === 'Pedido' && !p.pedidoGenerado) {
        productosParaPedido.push({
          descripcion: p.descripcion || p.desc,
          marca: p.marca || 'N/A',
          cantidad: p.cant,
          precioUnitario: Number(p.fob || 0),
          subtotal: Number(p.fob || 0) * p.cant,
          modalidad: p.modalidad || 'Aéreo',
          diasPrometidos: parseInt(p.fechaCompromiso) || 0,
          fechaCompromiso: p.fechaCompromiso || 'Pendiente',
          estadoItem: 'Pedido',
          fechaConfirmacion: Timestamp.now(), 
          fob: p.fob
        });
        productos[i].pedidoGenerado = true;
      }
    }

    if (itemsProcesados === 0 && productosParaPedido.length === 0) return;

    if (productosParaPedido.length > 0) {
      const pedidoRef = doc(collection(db, 'pedidos'));
      transaction.set(pedidoRef, {
        idCotizacion: solicitudId,
        correlativoRFQ: solicitud.correlativo,
        cliente: solicitud.cliente,
        vendedorNombre: solicitud.vendedorNombre,
        productos: productosParaPedido,
        linkOC: solicitud.linkOC || '',
        notasPedido: solicitud.notasPedido || '',
        fechaCreacion: serverTimestamp(),
        estadoGeneral: 'Procesando'
      });
    }

    const estadoCalculado = calcularEstadoGlobal(productos);
    const updateData = {
      productos,
      estado: estadoCalculado,
      resumenNegociacion: calcularResumenNegociacion(productos),
      ultimaNotificacion: {
        rol: actor.rol,
        idxs: indicesModificados,
        comentarioGeneral: comentarioGeneral || '',
        en: Timestamp.now()
      }
    };
    if (estadoCalculado === 'Pedido' || estadoCalculado === 'Pedido Parcial') {
      updateData.fechaPedido = serverTimestamp();
    }
    if (actor.rol === 'compras' && comentarioGeneral) {
      updateData.comentariosComprador = comentarioGeneral;
    }

    transaction.update(docRef, updateData);

    payloadParaCorreo = {
      solicitud: { ...solicitud, ...updateData },
      indicesModificados
    };
  });

  if (payloadParaCorreo) {
    try {
      const { solicitud, indicesModificados } = payloadParaCorreo;
      const htmlBody = await construirCorreoActualizacion({
        pedido: solicitud,
        items: solicitud.productos,
        indicesModificados,
        rol: actor.rol,
        comentarioGeneral
      });
      
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const vendedorEmail = solicitud.vendedorEmail || '';
      const vendedorNombre = solicitud.vendedorNombre || vendedorEmail.split('@')[0] || '';
      
      let destinatarioTo, ccEmails, senderFrom, replyTo;
      
      if (actor.rol === 'compras') {
        destinatarioTo = isLocal ? ['rvides@hermaco.net'] : [vendedorEmail];
        ccEmails = isLocal ? [] : ['compras@hermaco.net'];
        senderFrom = 'Compras Hermaco <compras@hermaco.net>';
        replyTo = 'compras@hermaco.net';
      } else {
        senderFrom = isLocal ? 'rvides@hermaco.net <rvides@hermaco.net>' : `${vendedorNombre} <${vendedorEmail}>`;
        replyTo = vendedorEmail;
        destinatarioTo = isLocal ? ["rvides@hermaco.net"] : ["compras@hermaco.net"];
        ccEmails = [];
      }

      const res = await fetch('/.netlify/functions/send-email-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: senderFrom,
          replyTo,
          to: destinatarioTo,
          cc: ccEmails,
          subject: actor.rol === 'compras' 
            ? `Actualización Pedido Manual: ${solicitud.correlativo} - ${solicitud.cliente}`
            : `Nuevo Pedido Manual Confirmado: ${solicitud.correlativo} - ${solicitud.cliente}`,
          bodyHtml: htmlBody
        })
      });
      
      if (!res.ok) {
        throw new Error('No se pudo enviar el correo');
      }
      
      if (solicitud.notificacionPendienteEmail) {
        // Clear flag if it previously failed but now succeeded
        await updateDoc(docRef, { notificacionPendienteEmail: false }).catch(() => {});
      }
    } catch (error) {
      console.error('Error enviando correo post-transacción', error);
      await updateDoc(docRef, { notificacionPendienteEmail: true }).catch(() => {});
      throw new Error('notificacion_fallida');
    }
  }
};

export const reenviarCorreoPendiente = async ({ solicitudId, actor }) => {
  const docRef = doc(db, 'solicitudes', solicitudId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) throw new Error('Solicitud no encontrada');
  const solicitud = docSnap.data();
  
  if (!solicitud.notificacionPendienteEmail) {
    return; // No hace nada si no hay flag
  }
  
  const { ultimaNotificacion } = solicitud;
  if (!ultimaNotificacion) throw new Error('No hay datos de última notificación');
  
  const htmlBody = await construirCorreoActualizacion({
    pedido: solicitud,
    items: solicitud.productos,
    indicesModificados: ultimaNotificacion.idxs || [],
    rol: ultimaNotificacion.rol || actor.rol,
    comentarioGeneral: ultimaNotificacion.comentarioGeneral || ''
  });
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const vendedorEmail = solicitud.vendedorEmail || '';
  const vendedorNombre = solicitud.vendedorNombre || vendedorEmail.split('@')[0] || '';
  
  let destinatarioTo, ccEmails, senderFrom, replyTo;
  
  if ((ultimaNotificacion.rol || actor.rol) === 'compras') {
    destinatarioTo = isLocal ? ['rvides@hermaco.net'] : [vendedorEmail];
    ccEmails = isLocal ? [] : ['compras@hermaco.net'];
    senderFrom = 'Compras Hermaco <compras@hermaco.net>';
    replyTo = 'compras@hermaco.net';
  } else {
    senderFrom = isLocal ? 'rvides@hermaco.net <rvides@hermaco.net>' : `${vendedorNombre} <${vendedorEmail}>`;
    replyTo = vendedorEmail;
    destinatarioTo = isLocal ? ["rvides@hermaco.net"] : ["compras@hermaco.net"];
    ccEmails = [];
  }

  const res = await fetch('/.netlify/functions/send-email-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: senderFrom,
      replyTo,
      to: destinatarioTo,
      cc: ccEmails,
      subject: (ultimaNotificacion.rol || actor.rol) === 'compras' 
        ? `Actualización Pedido Manual: ${solicitud.correlativo} - ${solicitud.cliente}`
        : `Nuevo Pedido Manual Confirmado: ${solicitud.correlativo} - ${solicitud.cliente}`,
      bodyHtml: htmlBody
    })
  });
  
  if (!res.ok) {
    throw new Error('No se pudo reenviar el correo');
  }
  
  await updateDoc(docRef, { notificacionPendienteEmail: false });
};
