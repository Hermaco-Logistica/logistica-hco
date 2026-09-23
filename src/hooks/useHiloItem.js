import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

export const obtenerTimestamp = (m, defaultTime = 0) => {
  if (!m) return defaultTime;
  const c = m.createdAt;
  if (!c) return m._localTime || defaultTime;
  if (typeof c.toDate === 'function') {
    try {
      return c.toDate().getTime();
    } catch {
      return defaultTime;
    }
  }
  if (typeof c.toMillis === 'function') {
    try {
      return c.toMillis();
    } catch {
      return defaultTime;
    }
  }
  if (c.seconds !== undefined) {
    return c.seconds * 1000 + (c.nanoseconds ? c.nanoseconds / 1000000 : 0);
  }
  if (c instanceof Date) {
    return c.getTime();
  }
  if (typeof c === 'number') {
    return c;
  }
  if (typeof c === 'string') {
    const parsed = Date.parse(c);
    if (!isNaN(parsed)) return parsed;
  }
  return m._localTime || defaultTime;
};

export const sintetizarMensajesLegados = (productoActual, itemId, mensajesDB = []) => {
  const mensajes = [...mensajesDB];
  if (productoActual) {
    const hasLegacyVend = mensajesDB.some(m => m.id === 'legacy-synth-vend');
    const hasLegacyComp = mensajesDB.some(m => m.id === 'legacy-synth-comp');

    // Los mensajes legados son el origen inicial del ítem, por lo que deben situarse antes del historial de chat
    let baseTime = 1;
    if (mensajesDB.length > 0) {
      const minDbTime = Math.min(...mensajesDB.map(m => obtenerTimestamp(m, Date.now())));
      baseTime = Math.max(1, minDbTime - 120000); // 2 minutos antes del primer mensaje registrado
    } else {
      baseTime = Date.now() - 3600000; // 1 hora antes si no hay mensajes
    }

    if (productoActual.comentarioVendedorItem && !hasLegacyVend) {
      mensajes.push({
        id: 'legacy-synth-vend',
        itemId,
        autor: { nombre: 'Vendedor', rol: 'vendedor' },
        tipo: 'texto',
        texto: productoActual.comentarioVendedorItem,
        createdAt: new Date(baseTime)
      });
    }
    if ((productoActual.estadoItem === 'Cotizado' || productoActual.comentarioCompras) && !hasLegacyComp) {
      const hasAceptacion = mensajesDB.some(m => m.tipo === 'aceptacion');
      const hasRealPropuesta = mensajesDB.some(m => m.tipo === 'propuesta');
      
      // Si ya hay una propuesta real en la DB, no crear el sintético para evitar duplicados
      // que se ordenan incorrectamente (el sintético se pone siempre al inicio)
      if (!hasRealPropuesta) {
        let estadoProp = 'pendiente';
        if (hasAceptacion) estadoProp = 'aceptada';

        const propuesto = Number(productoActual.fob || 0);
        const anterior = Number(
          productoActual.fobAnterior !== undefined 
            ? productoActual.fobAnterior 
            : (productoActual.precioAnterior !== undefined ? productoActual.precioAnterior : propuesto)
        );

        mensajes.push({
          id: 'legacy-synth-comp',
          itemId,
          autor: { nombre: 'Compras', rol: 'comprador' },
          tipo: productoActual.estadoItem === 'Cotizado' ? 'propuesta' : 'texto',
          texto: productoActual.comentarioCompras || 'Ajuste de compras',
          precioPropuesto: propuesto,
          precioAnterior: anterior,
          tiempoEntrega: productoActual.fechaCompromiso || productoActual.diasPrometidos || '',
          estadoPropuesta: estadoProp,
          createdAt: new Date(baseTime + 30000)
        });
      }
    }
  }
  
  mensajes.sort((a, b) => {
    const timeA = obtenerTimestamp(a, Date.now());
    const timeB = obtenerTimestamp(b, Date.now());
    return timeA - timeB;
  });
  
  return mensajes;
};

export const useHiloItem = (solicitudId, itemId, productoActual) => {
  const [mensajesDB, setMensajesDB] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!solicitudId) return;

    const q = query(
      collection(db, `solicitudes/${solicitudId}/mensajes`),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      // Filtrar por itemId en el cliente para evitar requerir índice compuesto
      const data = snap.docs
        .map(d => {
          const docData = d.data();
          return {
            id: d.id,
            ...docData,
            _localTime: docData.createdAt ? undefined : Date.now()
          };
        })
        .filter(m => m.itemId === itemId);
      setMensajesDB(data);
      setLoading(false);
    });

    return () => unsub();
  }, [solicitudId, itemId]);

  const mensajes = sintetizarMensajesLegados(productoActual, itemId, mensajesDB);

  const enviarTexto = async (texto, autor) => {
    if (!texto.trim()) return;
    await addDoc(collection(db, `solicitudes/${solicitudId}/mensajes`), {
      itemId,
      autor,
      tipo: 'texto',
      texto,
      createdAt: serverTimestamp()
    });
  };

  const enviarPropuesta = async (texto, precioNuevo, precioAnterior, autor, propuestaIdAContraofertar = null, tiempoEntrega = null, modalidad = null, tiempoEntregaAnterior = null, modalidadAnterior = null) => {
    const batch = writeBatch(db);
    
    // Si estamos contraofertando una propuesta específica, la marcamos como contraofertada
    if (propuestaIdAContraofertar && !propuestaIdAContraofertar.startsWith('legacy')) {
      const oldRef = doc(db, `solicitudes/${solicitudId}/mensajes`, propuestaIdAContraofertar);
      batch.update(oldRef, { estadoPropuesta: 'contraofertada' });
    }

    const nuevoRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
    const propuestaData = {
      itemId,
      autor,
      tipo: 'propuesta',
      texto: texto || 'Propone un nuevo precio ajustado.',
      precioPropuesto: Number(precioNuevo),
      precioAnterior: Number(precioAnterior),
      estadoPropuesta: 'pendiente',
      createdAt: serverTimestamp()
    };
    if (tiempoEntrega) propuestaData.tiempoEntrega = tiempoEntrega;
    if (tiempoEntregaAnterior) propuestaData.tiempoEntregaAnterior = tiempoEntregaAnterior;
    if (modalidad) propuestaData.modalidad = modalidad;
    if (modalidadAnterior) propuestaData.modalidadAnterior = modalidadAnterior;
    
    batch.set(nuevoRef, propuestaData);
    await batch.commit();
  };

  const aceptarPropuesta = async (propuestaId, precioPropuesto, todosLosProductos, autor, tiempoEntrega = null, modalidad = null) => {
    const batch = writeBatch(db);
    
    // 1. Marcar propuesta como aceptada
    if (propuestaId && !propuestaId.startsWith('legacy')) {
      const msgRef = doc(db, `solicitudes/${solicitudId}/mensajes`, propuestaId);
      batch.update(msgRef, { estadoPropuesta: 'aceptada' });
    }

    // 2. Crear mensaje de aceptación
    const nuevoMsgRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
    batch.set(nuevoMsgRef, {
      itemId,
      autor,
      tipo: 'aceptacion',
      texto: 'Ha aceptado la propuesta de precio.',
      createdAt: serverTimestamp()
    });

    // 3. Escribir el FOB al array de productos y cambiar estado a 'Cotizado' (acuerdo de precio, pero falta aprobación final)
    const docRef = doc(db, 'solicitudes', solicitudId);
    const productosActualizados = [...todosLosProductos];
    
    productosActualizados[itemId] = {
      ...productosActualizados[itemId],
      fob: Number(precioPropuesto),
      estadoItem: 'Cotizado'
    };
    if (tiempoEntrega) {
      productosActualizados[itemId].fechaCompromiso = tiempoEntrega;
    }
    if (modalidad) {
      productosActualizados[itemId].modalidad = modalidad;
    }

    // Evaluar estado global (ya no finalizamos a 'Pedido' automáticamente)
    const algunDevueltoOCotizado = productosActualizados.some(p => p.estadoItem === 'Cotizado');
    const todosDenegados = productosActualizados.every(p => 
      p.estadoItem === 'Denegado' || p.estadoItem === 'Cancelado' || p.estadoItem === 'Rechazado'
    );

    let nuevoEstado = 'Enviado a Compras';
    if (todosDenegados) {
      nuevoEstado = 'Denegado';
    } else if (algunDevueltoOCotizado) {
      nuevoEstado = 'Cotizado Parcial';
    }

    const updateData = { 
      productos: productosActualizados,
      estado: nuevoEstado 
    };

    batch.update(docRef, updateData);
    await batch.commit();
  };

  const reenviarACompras = async (texto, precioNuevo, precioAnterior, autor, enviarConPrecio, todosLosProductos) => {
    const batch = writeBatch(db);
    
    if (enviarConPrecio || texto.trim()) {
      const nuevoRef = doc(collection(db, `solicitudes/${solicitudId}/mensajes`));
      if (enviarConPrecio) {
        batch.set(nuevoRef, {
          itemId,
          autor,
          tipo: 'propuesta',
          texto: texto || 'Propone un nuevo precio ajustado.',
          precioPropuesto: Number(precioNuevo),
          precioAnterior: Number(precioAnterior),
          estadoPropuesta: 'pendiente',
          createdAt: serverTimestamp()
        });
      } else {
        batch.set(nuevoRef, {
          itemId,
          autor,
          tipo: 'texto',
          texto,
          createdAt: serverTimestamp()
        });
      }
    }

    const docRef = doc(db, 'solicitudes', solicitudId);
    const productosActualizados = [...todosLosProductos];
    productosActualizados[itemId] = {
      ...productosActualizados[itemId],
      estadoItem: 'Pendiente'
    };
    
    const algunPendiente = productosActualizados.some(p => p.estadoItem === 'Pendiente');
    let nuevoEstado = algunPendiente ? 'Enviado a Compras' : undefined; // Simplified

    const updateData = { productos: productosActualizados };
    if (nuevoEstado) updateData.estado = nuevoEstado;

    batch.update(docRef, updateData);
    await batch.commit();
  };

  const marcarMensajesComoLeidos = async (uid) => {
    const noLeidos = mensajesDB.filter(m => 
      !m.id?.startsWith('legacy') && m.autor?.uid !== uid && (!m.leidoPor || !m.leidoPor.includes(uid))
    );
    
    if (noLeidos.length === 0) return;

    try {
      const batch = writeBatch(db);
      noLeidos.forEach(m => {
        const ref = doc(db, `solicitudes/${solicitudId}/mensajes/${m.id}`);
        batch.update(ref, { leidoPor: arrayUnion(uid) });
      });
      await batch.commit();
    } catch (e) {
      console.error("Error marcando mensajes como leídos:", e);
    }
  };

  return { 
    mensajes, 
    loading, 
    enviarTexto, 
    enviarPropuesta, 
    aceptarPropuesta,
    reenviarACompras,
    marcarMensajesComoLeidos
  };
};
