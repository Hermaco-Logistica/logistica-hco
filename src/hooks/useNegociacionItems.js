import { useState, useEffect, useMemo, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../components/ui/Toast';
import { 
  aprobarItem, ajustarItem, aceptarOferta, contraofertarItem, 
  denegarItem, rechazarOferta,
  deshacerUltimoCambio, notificarCambios, reenviarCorreoPendiente,
  derivarNegociacion, ConflictoVersionError
} from '../services/pedidoManualNegociacionService';

export const useNegociacionItems = (solicitudId, actor) => {
  const [solicitud, setSolicitud] = useState(null);
  const [itemsServer, setItemsServer] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borradores, setBorradores] = useState({});
  const borradoresRef = useRef(borradores);
  useEffect(() => {
    borradoresRef.current = borradores;
  }, [borradores]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { addToast } = useToast();

  useEffect(() => {
    if (!solicitudId) return;

    const docRef = doc(db, 'solicitudes', solicitudId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSolicitud(data);
        
        const serverProds = (data.productos || []).map((p, idx) => {
          const neg = derivarNegociacion(p);
          // Si hay un cambio sin notificar realizado por la OTRA parte, mostramos a este usuario el estado previo
          if (neg.sinNotificar && neg.ultimoCambio && neg.ultimoCambio.rol !== actor.rol && neg.ultimoCambio.estadoPrevio) {
            const previo = neg.ultimoCambio.estadoPrevio;
            return {
              ...p,
              _idx: idx,
              negociacion: previo.negociacion,
              estadoItem: previo.estadoItem,
              fob: previo.fob,
              fechaCompromiso: previo.fechaCompromiso,
              modalidad: previo.modalidad,
              fobAnterior: previo.fobAnterior,
              tiempoEntregaAnterior: previo.tiempoEntregaAnterior,
              modalidadAnterior: previo.modalidadAnterior
            };
          }
          return {
            ...p,
            _idx: idx,
            negociacion: neg
          };
        });
        
        setItemsServer(prevItems => {
          // Detectar si un cambio remoto pisó un borrador local
          if (prevItems.length > 0) {
            serverProds.forEach((sp, idx) => {
              const pp = prevItems[idx];
              if (pp && sp.negociacion.version !== pp.negociacion.version && sp.negociacion.ultimoCambio?.uid !== actor.uid) {
                if (borradoresRef.current[idx]) {
                  addToast({
                    type: 'warning',
                    title: 'Cambio remoto',
                    message: `El ítem ${idx + 1} fue modificado por la otra parte. Tu borrador ha sido descartado para evitar conflictos.`,
                    duration: 6000
                  });
                  setBorradores(b => {
                    const next = { ...b };
                    delete next[idx];
                    return next;
                  });
                }
              }
            });
          }
          return serverProds;
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching solicitud:', error);
      addToast({ type: 'error', message: 'Error cargando datos del servidor' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [solicitudId, addToast]);

  const unnotifiedCount = useMemo(() => {
    return itemsServer.filter(p => 
      p.negociacion?.sinNotificar && 
      p.negociacion?.ultimoCambio?.rol === actor.rol
    ).length;
  }, [itemsServer, actor.rol]);

  const resumenAcciones = useMemo(() => {
    let aprobados = 0;
    let ajustes = 0;
    let denegados = 0;
    itemsServer.forEach(p => {
      const neg = p.negociacion;
      if (neg?.sinNotificar && neg?.ultimoCambio?.rol === actor.rol) {
        const accion = neg.ultimoCambio.accion;
        if (accion === 'aprobar' || accion === 'aceptar') aprobados++;
        else if (accion === 'ajustar' || accion === 'contraofertar') ajustes++;
        else if (accion === 'denegar' || accion === 'rechazar') denegados++;
      }
    });
    return { aprobados, ajustes, denegados };
  }, [itemsServer, actor.rol]);

  const turnoCompras = itemsServer.filter(p => p.negociacion?.turno === 'compras').length;
  const turnoVendedor = itemsServer.filter(p => p.negociacion?.turno === 'vendedor').length;
  const cerrados = itemsServer.filter(p => p.negociacion?.resultado != null).length;

  const notificacionPendienteEmail = solicitud?.notificacionPendienteEmail || false;
  const resumenNegociacion = solicitud?.resumenNegociacion || null;

  const handleAction = async (actionFn, args, successMessage) => {
    setIsProcessing(true);
    try {
      await actionFn(args);
      if (successMessage) {
        addToast({ type: 'success', message: successMessage, duration: 3000 });
      }
    } catch (error) {
      if (error instanceof ConflictoVersionError) {
        addToast({
          type: 'error',
          title: 'Conflicto de versión',
          message: 'Este ítem fue modificado recientemente. Revisa los datos actualizados.'
        });
      } else {
        addToast({ type: 'error', message: error.message || 'Error en la operación' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAprobar = (idx, versionEsperada) => 
    handleAction(aprobarItem, { solicitudId, idx, versionEsperada, actor });

  const handleAceptar = (idx, versionEsperada) => 
    handleAction(aceptarOferta, { solicitudId, idx, versionEsperada, actor });

  const handleAjustar = (idx, versionEsperada, oferta) => {
    const ofertaNumber = { ...oferta, precio: Number(oferta.precio) };
    handleAction(ajustarItem, { solicitudId, idx, versionEsperada, actor, oferta: ofertaNumber }, 'Ajuste propuesto guardado');
    setBorradores(b => {
      const next = { ...b };
      delete next[idx];
      return next;
    });
  };

  const handleContraofertar = (idx, versionEsperada, oferta) => {
    const ofertaNumber = { ...oferta, precio: Number(oferta.precio) };
    handleAction(contraofertarItem, { solicitudId, idx, versionEsperada, actor, oferta: ofertaNumber }, 'Contraoferta registrada localmente');
    setBorradores(b => {
      const next = { ...b };
      delete next[idx];
      return next;
    });
  };

  const handleDenegar = (idx, versionEsperada, motivo) => {
    return handleAction(denegarItem, { solicitudId, idx, versionEsperada, actor, motivo }, 'Ítem denegado localmente');
  };

  const handleRechazar = (idx, versionEsperada, motivo) => {
    return handleAction(rechazarOferta, { solicitudId, idx, versionEsperada, actor, motivo }, 'Oferta rechazada localmente');
  };

  const handleDeshacer = (idx, versionEsperada) => 
    handleAction(deshacerUltimoCambio, { solicitudId, idx, versionEsperada, actor }, 'Cambio deshecho');

  const handleNotificar = async () => {
    setIsProcessing(true);
    try {
      await notificarCambios({ solicitudId, actor });
      addToast({ type: 'success', message: 'Cambios notificados correctamente' });
    } catch (error) {
      if (error.message === 'notificacion_fallida') {
        addToast({ type: 'warning', title: 'Notificación parcial', message: 'Los cambios se guardaron pero falló el correo.' });
      } else {
        addToast({ type: 'error', message: 'Error al notificar cambios' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReintentarCorreo = async () => {
    setIsProcessing(true);
    try {
      await reenviarCorreoPendiente({ solicitudId, actor });
      addToast({ type: 'success', message: 'Correo enviado correctamente' });
    } catch {
      addToast({ type: 'error', message: 'Volvió a fallar el envío del correo' });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateBorrador = (idx, fieldOrObject, value) => {
    setBorradores(prev => {
      const current = prev[idx] || {};
      const updates = typeof fieldOrObject === 'object' ? fieldOrObject : { [fieldOrObject]: value };
      return {
        ...prev,
        [idx]: { ...current, ...updates }
      };
    });
  };

  const clearBorrador = (idx) => {
    setBorradores(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  return {
    solicitud,
    itemsServer,
    loading,
    borradores,
    updateBorrador,
    clearBorrador,
    isProcessing,
    unnotifiedCount,
    notificacionPendienteEmail,
    resumenNegociacion,
    resumenAcciones,
    turnoCompras,
    turnoVendedor,
    cerrados,
    actions: {
      aprobar: handleAprobar,
      aceptar: handleAceptar,
      ajustar: handleAjustar,
      contraofertar: handleContraofertar,
      denegar: handleDenegar,
      rechazar: handleRechazar,
      deshacer: handleDeshacer,
      notificar: handleNotificar,
      reintentarCorreo: handleReintentarCorreo
    }
  };
};
