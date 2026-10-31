import { db } from '../firebase';
import { runTransaction, doc, collection, serverTimestamp, Timestamp, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { enviarEvento } from '../emails';
import { calcularFechaEstimada } from '../utils/itemHelpers';

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
  else if (estado === 'Cancelado' || estado === 'Rechazado' || estado === 'Venta Perdida') resultado = 'cancelado';

  if (item.negociacion) {
    return {
      version: 0,
      turno: null,
      sinNotificar: false,
      ultimoCambio: null,
      ...item.negociacion,
      ronda: Number(item.negociacion.ronda) || 1,
      resultado: item.negociacion.resultado || resultado
    };
  }

  let turno = null;
  if (estado === 'Pendiente') turno = 'compras';
  else if (estado === 'Cotizado') turno = 'vendedor';

  const precio = Number(item.fob || 0);
  const ofertaInicial = {
    precio,
    tiempoEntrega: item.tiempoEntrega || item.diasPrometidos || item.fechaCompromiso || '',
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

  const noAnulados = productos.filter(p => p.estadoItem !== 'Anulado');
  const todosVentaPerdida = noAnulados.length > 0 && noAnulados.every(p => p.estadoItem === 'Venta Perdida');
  if (todosResueltos && todosVentaPerdida && !algunAcordado) return 'Venta Perdida';

  if (todosResueltos && todosDenegados) return 'Denegado';
  if (todosResueltos && algunAcordado) return 'Pedido';
  if (!todosResueltos && algunAcordado) return 'Pedido Parcial';
  if (!algunAcordado && turnoVendedor) return 'Cotizado Parcial';
  return 'Pendiente';
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
      if (neg.ultimoCambio.rol === 'compras' || neg.ultimoCambio.rol === 'comprador') sinNotificarCompras++;
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
    if (actor?.rol === 'vendedor') {
      const esPropietario = (solicitud.vendedorId && solicitud.vendedorId === actor.uid)
        || (solicitud.vendedorEmail && actor.email
          && solicitud.vendedorEmail.toLowerCase() === actor.email.toLowerCase());
      if (!esPropietario) {
        throw new Error('Solo el vendedor propietario puede responder la negociación de este pedido.');
      }
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
      modalidadAnterior: itemActual.modalidadAnterior,
      motivoEstadoItem: itemActual.motivoEstadoItem,
      motivoDenegacion: itemActual.motivoDenegacion,
      motivoRechazo: itemActual.motivoRechazo,
      fechaDenegacion: itemActual.fechaDenegacion,
      fechaRechazo: itemActual.fechaRechazo,
      denegadoPor: itemActual.denegadoPor,
      rechazadoPor: itemActual.rechazadoPor
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

    let nuevoMensajeId = null;
    let mensajeRef = null;

    if (accionNombre === 'ajustar' || accionNombre === 'contraofertar') {
      mensajeRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
      nuevoMensajeId = mensajeRef.id;
      mutacion.negociacion.ofertaVigente.mensajeId = nuevoMensajeId;
    } else {
      mensajeRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
      nuevoMensajeId = mensajeRef.id;
    }

    const autorLimpio = {
      uid: actor?.uid || '',
      nombre: actor?.nombre || '',
      rol: actor?.rol || 'vendedor'
    };

    mutacion.negociacion.ultimoCambio = {
      rol: autorLimpio.rol,
      uid: autorLimpio.uid,
      nombre: autorLimpio.nombre,
      accion: accionNombre,
      en: Timestamp.now(),
      estadoPrevio: estadoPrevioLimpio,
      mensajeEventoId: nuevoMensajeId
    };

    const itemActualizado = { ...itemActual, ...mutacion.itemUpdate, negociacion: mutacion.negociacion };
    productos[idx] = itemActualizado;

    transaction.update(docRef, {
      productos
    });
    
    if (accionNombre === 'ajustar' || accionNombre === 'contraofertar') {
      if (prevMensajeId) {
        transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, prevMensajeId), {
          unnotifiedEstadoPropuesta: 'contraofertada',
          unnotifiedActorRol: autorLimpio.rol
        });
      }
      const propuestaInfo = {
        itemId: idx,
        tipo: 'propuesta',
        estadoPropuesta: 'vigente',
        precioPropuesto: Number(mutacion.oferta?.precio || 0),
        precioAnterior: negActual.ofertaAnterior ? Number(negActual.ofertaAnterior.precio || 0) : Number(itemActual.fob || 0),
        tiempoEntrega: String(mutacion.oferta?.tiempoEntrega || ''),
        tiempoEntregaAnterior: String(negActual.ofertaAnterior ? negActual.ofertaAnterior.tiempoEntrega : (itemActual.fechaCompromiso || '')),
        modalidad: mutacion.oferta?.modalidad || 'Aéreo',
        modalidadAnterior: negActual.ofertaAnterior ? negActual.ofertaAnterior.modalidad : (itemActual.modalidad || 'Aéreo'),
        autor: autorLimpio,
        sinNotificar: true,
        createdAt: Timestamp.now()
      };
      transaction.set(mensajeRef, propuestaInfo);
    } else {
      if ((accionNombre === 'aprobar' || accionNombre === 'aceptar') && prevMensajeId) {
        transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, prevMensajeId), {
          unnotifiedEstadoPropuesta: 'aceptada',
          unnotifiedActorRol: autorLimpio.rol
        });
      } else if ((accionNombre === 'rechazar' || accionNombre === 'denegar') && prevMensajeId) {
        transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, prevMensajeId), {
          unnotifiedEstadoPropuesta: 'rechazada',
          unnotifiedActorRol: autorLimpio.rol
        });
      }
      const eventoInfo = {
        itemId: idx,
        tipo: 'evento',
        accion: accionNombre,
        ronda: Number(mutacion.negociacion?.ronda || negActual?.ronda || 1),
        autor: autorLimpio,
        sinNotificar: true,
        createdAt: Timestamp.now()
      };
      transaction.set(mensajeRef, eventoInfo);
    }

    if (mutacion.comentario) {
      const comentarioRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
      transaction.set(comentarioRef, {
        itemId: idx,
        tipo: 'texto',
        autor: autorLimpio,
        texto: mutacion.comentario,
        sinNotificar: true,
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
      neg.ronda = (Number(neg.ronda) || 1) + 1;
      return {
        negociacion: neg,
        itemUpdate: {
          estadoItem: 'Cotizado',
          fob: oferta.precio,
          tiempoEntrega: Number.parseInt(oferta.tiempoEntrega, 10),
          diasPrometidos: Number.parseInt(oferta.tiempoEntrega, 10),
          fechaCompromiso: calcularFechaEstimada(oferta.tiempoEntrega),
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
        itemUpdate: {
          estadoItem: 'Denegado',
          motivoEstadoItem: motivo,
          motivoDenegacion: motivo,
          fechaDenegacion: Timestamp.now(),
          denegadoPor: actor?.nombre || 'Compras'
        },
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
      neg.ronda = (Number(neg.ronda) || 1) + 1;
      return {
        negociacion: neg,
        itemUpdate: {
          estadoItem: 'Pendiente',
          fob: oferta.precio,
          tiempoEntrega: Number.parseInt(oferta.tiempoEntrega, 10),
          diasPrometidos: Number.parseInt(oferta.tiempoEntrega, 10),
          fechaCompromiso: calcularFechaEstimada(oferta.tiempoEntrega),
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
        itemUpdate: {
          estadoItem: 'Cancelado',
          motivoEstadoItem: motivo,
          motivoRechazo: motivo,
          fechaRechazo: Timestamp.now(),
          rechazadoPor: actor?.nombre || 'Vendedor'
        },
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
      modalidadAnterior: previo.modalidadAnterior,
      motivoEstadoItem: previo.motivoEstadoItem || null,
      motivoDenegacion: previo.motivoDenegacion || null,
      motivoRechazo: previo.motivoRechazo || null
    };
    
    // Firestore no soporta 'undefined', así que lo eliminamos
    Object.keys(itemRestaurado).forEach(key => {
      if (itemRestaurado[key] === undefined) {
        delete itemRestaurado[key];
      }
    });

    productos[idx] = itemRestaurado;

    transaction.update(docRef, {
      productos
    });

    const mensajeEventoId = negActual.ultimoCambio.mensajeEventoId;
    if (mensajeEventoId) {
      transaction.delete(doc(db, `solicitudes/${solicitudId}/mensajes`, mensajeEventoId));
    }
    
    const currMensajeId = negActual.ofertaVigente?.mensajeId;
    const prevMensajeId = previo.negociacion?.ofertaVigente?.mensajeId;

    if (negActual.ultimoCambio.accion === 'ajustar' || negActual.ultimoCambio.accion === 'contraofertar') {
      if (currMensajeId && currMensajeId !== mensajeEventoId) {
        transaction.delete(doc(db, `solicitudes/${solicitudId}/mensajes`, currMensajeId));
      }
      if (prevMensajeId) {
        transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, prevMensajeId), {
          unnotifiedEstadoPropuesta: null,
          unnotifiedActorRol: null
        });
      }
    } else {
       if (prevMensajeId) {
         transaction.update(doc(db, `solicitudes/${solicitudId}/mensajes`, prevMensajeId), {
           unnotifiedEstadoPropuesta: null,
           unnotifiedActorRol: null
         });
       }
    }

    return itemRestaurado;
  });
};

export const notificarCambios = async ({ solicitudId, actor, comentarioGeneral, ventasPerdidasPendientes = {} }) => {
  const docRef = doc(db, 'solicitudes', solicitudId);
  let payloadParaCorreo = null;

  const actorRolNormalizado = (actor.rol === 'comprador' || actor.rol === 'compras') ? 'compras' : actor.rol;

  // 1. Obtener mensajes sin notificar creados por este actor
  const mensajesSnap = await getDocs(collection(db, `solicitudes/${solicitudId}/mensajes`));
  const mensajesSinNotificarRefs = [];
  const mensajesAActualizarEstadoRefs = [];
  mensajesSnap.docs.forEach(mDoc => {
    const mData = mDoc.data();
    const autorRolNormalizado = (mData.autor?.rol === 'comprador' || mData.autor?.rol === 'compras') ? 'compras' : mData.autor?.rol;
    const propRolNormalizado = (mData.unnotifiedActorRol === 'comprador' || mData.unnotifiedActorRol === 'compras') ? 'compras' : mData.unnotifiedActorRol;

    if (mData.sinNotificar && autorRolNormalizado === actorRolNormalizado) {
      mensajesSinNotificarRefs.push(mDoc.ref);
    }
    if (mData.unnotifiedEstadoPropuesta && propRolNormalizado === actorRolNormalizado) {
      mensajesAActualizarEstadoRefs.push({ ref: mDoc.ref, estado: mData.unnotifiedEstadoPropuesta });
    }
  });

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) throw new Error('Solicitud no encontrada');
    const solicitud = docSnap.data();
    if (solicitud.tipo !== 'Pedido Manual') {
      throw new Error('Esta operación solo es válida para Pedidos Manuales.');
    }

    // Parchar mensajes a sinNotificar: false
    mensajesSinNotificarRefs.forEach(ref => {
      transaction.update(ref, { sinNotificar: false });
    });
    mensajesAActualizarEstadoRefs.forEach(({ ref, estado }) => {
      transaction.update(ref, { estadoPropuesta: estado, unnotifiedEstadoPropuesta: null, unnotifiedActorRol: null });
    });

    const productos = [...solicitud.productos];

    let itemsProcesados = 0;
    const productosParaPedido = [];
    const indicesModificados = [];

    // Procesar ítems con cambios de negociación pendientes de notificar
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      const neg = derivarNegociacion(p);
      const cambioRolNormalizado = (neg.ultimoCambio?.rol === 'comprador' || neg.ultimoCambio?.rol === 'compras') ? 'compras' : neg.ultimoCambio?.rol;

      if (neg.sinNotificar && neg.ultimoCambio && cambioRolNormalizado === actorRolNormalizado) {
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
          fechaCompromiso: calcularFechaEstimada(p.fechaCompromiso),
          estadoItem: 'Pedido',
          fechaConfirmacion: Timestamp.now(), 
          fob: p.fob
        });
        productos[i].pedidoGenerado = true;
      }
    }

    // Procesar ventas perdidas pendientes atómicamente
    const indicesVentaPerdida = Object.keys(ventasPerdidasPendientes || {}).map(Number);
    let ultimoMotivoVentaPerdida = null;
    const ahoraTimestamp = new Date();
    const vendedorUid = actor.uid || solicitud.vendedorId || 'vendedor';

    for (const idx of indicesVentaPerdida) {
      const p = productos[idx];
      const staged = ventasPerdidasPendientes[idx];
      if (!p || !staged) continue;

      const cant = Number(p.cant || 1);
      const fob = Number(p.fob || 0);
      const subtotalItem = fob * cant;

      const registroVP = {
        solicitudId,
        motivoCodigo: staged.motivo?.codigo || 'OTRO',
        comentario: staged.comentario || '',
        vendedorId: vendedorUid,
        fecha: serverTimestamp(),
        tipoSolicitud: solicitud.tipo || 'Pedido Manual',
        correlativo: solicitud.correlativo || 'N/A',
        cliente: solicitud.cliente || 'Desconocido',
        montoAereo: Math.round(subtotalItem * 100) / 100,
        montoMaritimo: Math.round(subtotalItem * 100) / 100,
        itemsIds: [p?.id || p?.codigo || String(idx)],
        motivoNombre: staged.motivo?.nombre || 'Venta Perdida',
        categoriaMotivo: staged.motivo?.categoria || 'Otros'
      };

      const vpDocRef = doc(collection(db, 'ventasPerdidas'));
      transaction.set(vpDocRef, registroVP);

      const infoMotivo = {
        codigo: staged.motivo?.codigo || 'OTRO',
        nombre: staged.motivo?.nombre || 'Venta Perdida',
        categoria: staged.motivo?.categoria || 'Otros',
        comentario: staged.comentario || '',
        fecha: Timestamp.fromDate(ahoraTimestamp),
        registradoPor: actor.nombre || actor.email || ''
      };

      const negActual = derivarNegociacion(p);
      productos[idx] = {
        ...p,
        estadoItem: 'Venta Perdida',
        motivoEstadoItem: `Venta Perdida: ${staged.motivo?.nombre || ''}`,
        motivoVentaPerdida: infoMotivo,
        negociacion: {
          ...negActual,
          resultado: 'cancelado',
          turno: null,
          sinNotificar: false
        }
      };

      ultimoMotivoVentaPerdida = infoMotivo;
      if (!indicesModificados.includes(idx)) {
        indicesModificados.push(idx);
      }
      itemsProcesados++;
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

    const noPedidosNiAnulados = productos.filter(
      p => p.estadoItem !== 'Pedido' && p.estadoItem !== 'Comprado' && p.estadoItem !== 'Anulado'
    );
    const todosEnVentaPerdida = noPedidosNiAnulados.length > 0 && noPedidosNiAnulados.every(p => p.estadoItem === 'Venta Perdida');
    const hayPedidos = productos.some(p => p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado');

    let estadoCalculado = calcularEstadoGlobal(productos);
    if (todosEnVentaPerdida && !hayPedidos) {
      estadoCalculado = 'Venta Perdida';
    }

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
    if (ultimoMotivoVentaPerdida) {
      updateData.motivoVentaPerdida = ultimoMotivoVentaPerdida;
    }
    if (estadoCalculado === 'Denegado') {
      const itemDenegado = productos.find(p => p.estadoItem === 'Denegado' && p.motivoDenegacion);
      if (itemDenegado) {
        updateData.motivoDenegacion = itemDenegado.motivoDenegacion;
        updateData.fechaDenegacion = itemDenegado.fechaDenegacion || Timestamp.now();
        updateData.denegadoPor = itemDenegado.denegadoPor || (actor?.nombre || 'Compras');
      }
      const itemRechazado = productos.find(p => (p.estadoItem === 'Cancelado' || p.estadoItem === 'Rechazado') && p.motivoRechazo);
      if (itemRechazado && !itemDenegado) {
        updateData.motivoRechazo = itemRechazado.motivoRechazo;
        updateData.fechaRechazo = itemRechazado.fechaRechazo || Timestamp.now();
        updateData.rechazadoPor = actor?.nombre || 'Vendedor';
      }
    }
    if (estadoCalculado === 'Pedido' || estadoCalculado === 'Pedido Parcial') {
      updateData.fechaPedido = serverTimestamp();
    }
    if (actorRolNormalizado === 'compras' && comentarioGeneral) {
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
      const evento = actorRolNormalizado === 'compras' ? 'negociacion_compras' : 'negociacion_vendedor';
      const { ok } = await enviarEvento(evento, {
        pedido: solicitud,
        items: solicitud.productos,
        indicesModificados,
        rol: actorRolNormalizado,
        comentarioGeneral,
        actor: { email: solicitud.vendedorEmail || '', nombre: solicitud.vendedorNombre }
      });
      if (!ok) {
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
  
  const rolNotif = ultimaNotificacion.rol || actor.rol;
  const rolNormalizado = (rolNotif === 'comprador' || rolNotif === 'compras') ? 'compras' : rolNotif;

  const evento = rolNormalizado === 'compras' ? 'negociacion_compras' : 'negociacion_vendedor';
  const { ok } = await enviarEvento(evento, {
    pedido: solicitud,
    items: solicitud.productos,
    indicesModificados: ultimaNotificacion.idxs || [],
    rol: rolNormalizado,
    comentarioGeneral: ultimaNotificacion.comentarioGeneral || '',
    actor: { email: solicitud.vendedorEmail || '', nombre: solicitud.vendedorNombre }
  });
  if (!ok) {
    throw new Error('No se pudo reenviar el correo');
  }

  await updateDoc(docRef, { notificacionPendienteEmail: false });
};
