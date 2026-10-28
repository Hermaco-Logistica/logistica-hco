import React, { useEffect, useRef, useState } from 'react';
import { Loader2, PlusCircle, X, Package } from 'lucide-react';
import { auth, db } from '../../firebase';
import { serverTimestamp, collection, doc, runTransaction } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  buscarClientesGuardados,
  guardarClienteSiNoExiste,
  normalizarNombreCliente,
} from '../../services/clientesService';
import {
  buscarMarcasGuardadas,
  guardarMarcaSiNoExiste,
  normalizarNombreMarca,
} from '../../services/marcasService';
import { buscarProductos, guardarProductoLocal } from '../../services/productosSearchService';
import { generarPlantillaNuevaRFQ } from '../../utils/emailTemplates';
import { emailConfig } from '../../config/emailConfig';
import { StickyActionBar } from '../../components/mobile';
import { NuevoPedidoMobileCard } from '../../components/pedidos/NuevoPedidoMobileCard';
import { calcularFechaEstimada } from '../../utils/itemHelpers';
import { useCotizacionesEstancadas } from '../../hooks/useCotizacionesEstancadas';
import { ModalBloqueoCotizaciones } from '../../components/vendedor/ModalBloqueoCotizaciones';
import { NuevoPedidoView } from './nuevo-pedido/NuevoPedidoView';
import { extraerDiasValidez } from '../../utils/cotizacionesEstancadasHelpers';

export const NuevoPedido = ({ role }) => {
  const navigate = useNavigate();
  const { cotizacionesEstancadas, tieneBloqueo, loading: loadingBloqueo } = useCotizacionesEstancadas({ role });
  const [cliente, setCliente] = useState('');
  const [sugerenciasCliente, setSugerenciasCliente] = useState([]);
  const [indiceSugerenciaActiva, setIndiceSugerenciaActiva] = useState(-1);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [productos, setProductos] = useState([{ desc: '', marca: '', cant: 1, precio: 0, tiempoEntrega: '', modalidad: 'Aéreo' }]);
  const [sugerenciasMarca, setSugerenciasMarca] = useState([[]]);
  const [indiceSugerenciaMarca, setIndiceSugerenciaMarca] = useState([-1]);
  const [buscandoMarca, setBuscandoMarca] = useState([false]);
  const [errorMarca, setErrorMarca] = useState(['']);
  const [mostrarSugerenciasMarca, setMostrarSugerenciasMarca] = useState([false]);
  const [sugerenciasProducto, setSugerenciasProducto] = useState([[]]);
  const [indiceSugerenciaProducto, setIndiceSugerenciaProducto] = useState([-1]);
  const [buscandoProducto, setBuscandoProducto] = useState([false]);
  const [mostrarSugerenciasProducto, setMostrarSugerenciasProducto] = useState([false]);
  const [loading, setLoading] = useState(false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const erroresValidacion = productos.map(p => ({
    desc: !p.desc || p.desc.trim() === '',
    cant: !p.cant || Number(p.cant) <= 0,
    precio: p.precio === '' || p.precio === undefined || Number(p.precio) < 0,
    tiempoEntrega: !p.tiempoEntrega || !/^\d+$/.test(String(p.tiempoEntrega).trim())
  }));

  const [validez, setValidez] = useState('10 días hábiles');
  const [comentariosVendedor, setComentariosVendedor] = useState('');
  const [modalNuevoProd, setModalNuevoProd] = useState({ isOpen: false, idx: null, sku: '', producto: '', marca: '', saving: false });
  const debounceRef = useRef(null);
  const marcasDebounceRef = useRef([]);
  const productosDebounceRef = useRef([]);
  const isSubmittingRef = useRef(false);

  // Ir al inicio al entrar a la vista
  useEffect(() => { (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' }); }, []);

  useEffect(() => {
    const termino = cliente.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (termino.length < 2) {
      debounceRef.current = setTimeout(() => {
        setSugerenciasCliente([]);
        setIndiceSugerenciaActiva(-1);
        setBuscandoCliente(false);
        setErrorCliente('');
      }, 0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setBuscandoCliente(true);
        setErrorCliente('');
        const resultados = await buscarClientesGuardados(termino);
        setSugerenciasCliente(resultados);
        setIndiceSugerenciaActiva(resultados.length > 0 ? 0 : -1);
      } catch {
        setErrorCliente('No se pudo buscar clientes guardados.');
        setSugerenciasCliente([]);
        setIndiceSugerenciaActiva(-1);
      } finally {
        setBuscandoCliente(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cliente]);

  // Añadir una nueva fila de producto
  const addFila = () => {
    setProductos([...productos, { desc: '', marca: '', cant: 1, precio: 0, tiempoEntrega: '', modalidad: 'Aéreo' }]);
    setSugerenciasMarca((prev) => [...prev, []]);
    setIndiceSugerenciaMarca((prev) => [...prev, -1]);
    setBuscandoMarca((prev) => [...prev, false]);
    setErrorMarca((prev) => [...prev, '']);
    setMostrarSugerenciasMarca((prev) => [...prev, false]);
    setSugerenciasProducto((prev) => [...prev, []]);
    setIndiceSugerenciaProducto((prev) => [...prev, -1]);
    setBuscandoProducto((prev) => [...prev, false]);
    setMostrarSugerenciasProducto((prev) => [...prev, false]);
  };

  // Eliminar una fila
  const removeFila = (index) => {
    const nuevos = productos.filter((_, i) => i !== index);
    setProductos(nuevos);
    if (marcasDebounceRef.current[index]) {
      clearTimeout(marcasDebounceRef.current[index]);
    }
    if (productosDebounceRef.current[index]) {
      clearTimeout(productosDebounceRef.current[index]);
    }
    setSugerenciasMarca((prev) => prev.filter((_, i) => i !== index));
    setIndiceSugerenciaMarca((prev) => prev.filter((_, i) => i !== index));
    setBuscandoMarca((prev) => prev.filter((_, i) => i !== index));
    setErrorMarca((prev) => prev.filter((_, i) => i !== index));
    setMostrarSugerenciasMarca((prev) => prev.filter((_, i) => i !== index));
    setSugerenciasProducto((prev) => prev.filter((_, i) => i !== index));
    setIndiceSugerenciaProducto((prev) => prev.filter((_, i) => i !== index));
    setBuscandoProducto((prev) => prev.filter((_, i) => i !== index));
    setMostrarSugerenciasProducto((prev) => prev.filter((_, i) => i !== index));
  };

  // Actualizar campos específicos
  const updateProducto = (index, campo, valor) => {
    const nuevos = [...productos];
    nuevos[index][campo] = valor;
    setProductos(nuevos);
  };

  const updateMarcaState = (setter, index, value) => {
    setter((prev) => {
      const next = [...prev];
      const resolved = typeof value === 'function' ? value(next[index]) : value;
      next[index] = resolved;
      return next;
    });
  };

  const seleccionarSugerenciaMarca = (index, nombre) => {
    updateProducto(index, 'marca', nombre || '');
    updateMarcaState(setMostrarSugerenciasMarca, index, false);
    updateMarcaState(setIndiceSugerenciaMarca, index, -1);
  };

  const manejarTeclasMarca = (e, index) => {
    const mostrar = mostrarSugerenciasMarca[index];
    const buscando = buscandoMarca[index];
    const sugerencias = sugerenciasMarca[index] || [];

    if (!mostrar || buscando || sugerencias.length === 0) {
      if (e.key === 'Escape') {
        updateMarcaState(setMostrarSugerenciasMarca, index, false);
        updateMarcaState(setIndiceSugerenciaMarca, index, -1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateMarcaState(setIndiceSugerenciaMarca, index, (prev) => {
        const base = prev < 0 ? 0 : prev;
        return Math.min(base + 1, sugerencias.length - 1);
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateMarcaState(setIndiceSugerenciaMarca, index, (prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
      return;
    }

    if (e.key === 'Enter') {
      if (indiceSugerenciaMarca[index] >= 0 && indiceSugerenciaMarca[index] < sugerencias.length) {
        e.preventDefault();
        seleccionarSugerenciaMarca(index, sugerencias[indiceSugerenciaMarca[index]].nombre || '');
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      updateMarcaState(setMostrarSugerenciasMarca, index, false);
      updateMarcaState(setIndiceSugerenciaMarca, index, -1);
    }
  };

  const buscarMarcasConDebounce = (index, texto) => {
    const termino = texto.trim();

    if (marcasDebounceRef.current[index]) {
      clearTimeout(marcasDebounceRef.current[index]);
    }

    if (termino.length < 2) {
      updateMarcaState(setSugerenciasMarca, index, []);
      updateMarcaState(setIndiceSugerenciaMarca, index, -1);
      updateMarcaState(setBuscandoMarca, index, false);
      updateMarcaState(setErrorMarca, index, '');
      return;
    }

    marcasDebounceRef.current[index] = setTimeout(async () => {
      try {
        updateMarcaState(setBuscandoMarca, index, true);
        updateMarcaState(setErrorMarca, index, '');
        const resultados = await buscarMarcasGuardadas(termino);
        updateMarcaState(setSugerenciasMarca, index, resultados);
        updateMarcaState(setIndiceSugerenciaMarca, index, resultados.length > 0 ? 0 : -1);
      } catch {
        updateMarcaState(setErrorMarca, index, 'No se pudo buscar marcas guardadas.');
        updateMarcaState(setSugerenciasMarca, index, []);
        updateMarcaState(setIndiceSugerenciaMarca, index, -1);
      } finally {
        updateMarcaState(setBuscandoMarca, index, false);
      }
    }, 250);
  };

  const buscarProductosConDebounce = (index, texto) => {
    const termino = texto.trim();

    if (productosDebounceRef.current[index]) {
      clearTimeout(productosDebounceRef.current[index]);
    }

    if (termino.length < 3) {
      updateMarcaState(setSugerenciasProducto, index, []);
      updateMarcaState(setIndiceSugerenciaProducto, index, -1);
      updateMarcaState(setBuscandoProducto, index, false);
      return;
    }

    productosDebounceRef.current[index] = setTimeout(async () => {
      updateMarcaState(setBuscandoProducto, index, true);
      try {
        const resultados = await buscarProductos(termino);
        updateMarcaState(setSugerenciasProducto, index, resultados);
        updateMarcaState(setIndiceSugerenciaProducto, index, resultados.length > 0 ? 0 : -1);
      } catch (error) {
        console.error(error);
        updateMarcaState(setSugerenciasProducto, index, []);
      } finally {
        updateMarcaState(setBuscandoProducto, index, false);
      }
    }, 400); // 400ms debounce como en ExcessStockModal
  };

  const seleccionarSugerenciaProducto = (index, producto) => {
    updateProducto(index, 'desc', producto.s || '');
    updateProducto(index, 'marca', producto.m || '');
    updateMarcaState(setMostrarSugerenciasProducto, index, false);
    updateMarcaState(setIndiceSugerenciaProducto, index, -1);
  };

  const manejarTeclasProducto = (e, index) => {
    const mostrar = mostrarSugerenciasProducto[index];
    const buscando = buscandoProducto[index];
    const sugerencias = sugerenciasProducto[index] || [];

    if (!mostrar || buscando || sugerencias.length === 0) {
      if (e.key === 'Escape') {
        updateMarcaState(setMostrarSugerenciasProducto, index, false);
        updateMarcaState(setIndiceSugerenciaProducto, index, -1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateMarcaState(setIndiceSugerenciaProducto, index, (prev) => {
        const base = prev < 0 ? 0 : prev;
        return Math.min(base + 1, sugerencias.length - 1);
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateMarcaState(setIndiceSugerenciaProducto, index, (prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
      return;
    }

    if (e.key === 'Enter') {
      if (indiceSugerenciaProducto[index] >= 0 && indiceSugerenciaProducto[index] < sugerencias.length) {
        e.preventDefault();
        seleccionarSugerenciaProducto(index, sugerencias[indiceSugerenciaProducto[index]]);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      updateMarcaState(setMostrarSugerenciasProducto, index, false);
      updateMarcaState(setIndiceSugerenciaProducto, index, -1);
    }
  };

  const seleccionarSugerenciaCliente = (nombre) => {
    setCliente(nombre || '');
    setMostrarSugerencias(false);
    setIndiceSugerenciaActiva(-1);
  };

  const manejarTeclasCliente = (e) => {
    if (!mostrarSugerencias || buscandoCliente || sugerenciasCliente.length === 0) {
      if (e.key === 'Escape') {
        setMostrarSugerencias(false);
        setIndiceSugerenciaActiva(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSugerenciaActiva((prev) => {
        const base = prev < 0 ? 0 : prev;
        return Math.min(base + 1, sugerenciasCliente.length - 1);
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSugerenciaActiva((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
      return;
    }

    if (e.key === 'Enter') {
      if (indiceSugerenciaActiva >= 0 && indiceSugerenciaActiva < sugerenciasCliente.length) {
        e.preventDefault();
        seleccionarSugerenciaCliente(sugerenciasCliente[indiceSugerenciaActiva].nombre || '');
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setMostrarSugerencias(false);
      setIndiceSugerenciaActiva(-1);
    }
  };

  const submittedRef = useRef(false);

  const guardarRFQ = async (e) => {
    e.preventDefault();
    setIntentoGuardar(true);
    const hayErrores = !cliente || erroresValidacion.some(e => Object.values(e).some(Boolean));
    if (hayErrores) {
      return;
    }
    if (submittedRef.current) return; // evitar doble-envío
    submittedRef.current = true;

    setLoading(true);
    // Flag para saber si la transacción de Firestore ya completó.
    // Si es true y hay un error posterior (ej: updateDoc), NO se resetea submittedRef
    // para evitar que el usuario cree un pedido duplicado al reintentar.
    let transaccionCompletada = false;
    try {
      const clienteNormalizado = normalizarNombreCliente(cliente);
      await guardarClienteSiNoExiste(clienteNormalizado, auth.currentUser);
      const marcasNormalizadas = Array.from(
        new Set(productos.map((p) => normalizarNombreMarca(p.marca)).filter(Boolean))
      );
      if (marcasNormalizadas.length > 0) {
        await Promise.all(marcasNormalizadas.map((marca) => guardarMarcaSiNoExiste(marca, auth.currentUser)));
      }

      // Generar ID de forma atómica y segura mediante transacciones
      const counterRef = doc(db, 'metadata', 'pedido_counter');
      const nuevaSolicitudRef = doc(collection(db, 'solicitudes'));

      const savedData = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists()) {
          nextNum = (counterDoc.data().lastNum || 0) + 1;
        }

        const correlativo = `PED-${nextNum.toString().padStart(4, '0')}`;
        
        const dataParaGuardar = {
          cliente: clienteNormalizado,
          correlativo,
          validez,
          diasValidez: extraerDiasValidez(validez, 'Pedido Manual'),
          comentariosVendedor: comentariosVendedor.trim(),
          vendedorId: auth.currentUser.uid,
          vendedorEmail: auth.currentUser.email,
          vendedorNombre: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
          estado: 'Pendiente',
          tipo: 'Pedido Manual',
          fechaS: serverTimestamp(),
      // Guardamos false por defecto; se actualiza a true solo si el correo se envía exitosamente.
      // Esto evita que quede como `undefined` si updateDoc falla, causando que el ícono de
      // advertencia en el Dashboard aparezca siempre aunque el correo sí llegó.
          emailEnviado: false,
          productos: productos.map(p => ({
            ...p,
            marca: normalizarNombreMarca(p.marca),
            descripcion: p.desc, 
            disponible: false,
            fob: p.precio || 0,
            fechaCompromiso: calcularFechaEstimada(p.tiempoEntrega),
            modalidad: p.modalidad || 'Aéreo',
            fva: 1,
            fvm: 1,
            factorA: 1,
            factorM: 1,
            selected: true,
            estadoItem: 'Pendiente'
          }))
        };

        transaction.set(counterRef, { lastNum: nextNum }, { merge: true });
        transaction.set(nuevaSolicitudRef, dataParaGuardar);
        return { ...dataParaGuardar, id: nuevaSolicitudRef.id };
      });
      // El pedido ya fue creado en Firestore de forma atómica.
      // A partir de aquí, si hay un error NO se permite reintentar para evitar duplicados.
      transaccionCompletada = true;

      // --- Envío de correo automático ---
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const destinatarioTo = isLocal ? ["rvides@hermaco.net"] : (emailConfig.nuevaRFQ.to || []);
      const ccEmails = isLocal 
        ? [auth.currentUser.email]
        : [
            auth.currentUser.email,
            ...(emailConfig.nuevaRFQ.cc || [])
          ].filter(email => !["oventura@hermaco.net", "dhernandez@hermaco.net"].includes(email?.toLowerCase()));
      
      const htmlBody = generarPlantillaNuevaRFQ(savedData);
      
      let emailExitoso = false;
      try {
        const mailRes = await fetch('/.netlify/functions/send-email-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${auth.currentUser.displayName || auth.currentUser.email.split('@')[0]} <${auth.currentUser.email}>`,
            replyTo: auth.currentUser.email,
            to: destinatarioTo,
            cc: ccEmails,
            subject: `Nuevo Pedido Manual: ${savedData.correlativo} - ${savedData.cliente}`,
            bodyHtml: htmlBody
          })
        });
        if (mailRes.ok) {
          emailExitoso = true;
        } else {
          const resBody = await mailRes.json().catch(() => ({}));
          console.warn('[NuevoPedido] Correo no enviado:', mailRes.status, resBody);
        }
      } catch (e) {
        console.error("Error enviando correo de notificación:", e);
      }
      
      // Actualizamos la solicitud con el estado del correo (importar updateDoc)
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'solicitudes', savedData.id), { emailEnviado: emailExitoso });

      // navigate se ejecuta SOLO cuando el usuario presiona OK en el modal
      const msg = emailExitoso ? "Solicitud Creada" : "Solicitud Creada (Advertencia: Correo no enviado)";
      window.alert(msg, () => navigate('/vendedor'));
      
    } catch (error) {
      // Solo permitir reintentar si el pedido AÚN NO fue creado en Firestore.
      // Si transaccionCompletada es true, el documento ya existe → no resetear el lock
      // para evitar que el usuario cree un pedido duplicado al reintentar.
      if (!transaccionCompletada) {
        submittedRef.current = false;
      }
      isSubmittingRef.current = false;

      const errorMsg = error?.message || 'Error desconocido';
      let etapa = 'desconocida';
      let mensajeUsuario;

      if (transaccionCompletada) {
        etapa = 'firestore_update';
        mensajeUsuario = 'Tu pedido fue creado y ya aparece en tu panel.\nSi el correo de notificación no llegó a Compras, podés reenviarlo desde el botón de advertencia en el Dashboard.';
      } else if (errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('permission-denied')) {
        etapa = 'firebase_transaction';
        mensajeUsuario = 'No tienes permisos para realizar esta acción. Intentá cerrar sesión y volver a ingresar. Si el problema persiste, contactá al administrador.';
      } else if (errorMsg.includes('unavailable') || errorMsg.includes('network') || errorMsg.includes('Failed to fetch')) {
        etapa = 'firebase_transaction';
        mensajeUsuario = 'No se pudo conectar con el servidor. Verificá tu conexión a internet e intentá de nuevo.';
      } else if (errorMsg.includes('transaction') || errorMsg.includes('Transaction')) {
        etapa = 'firebase_transaction';
        mensajeUsuario = 'Ocurrió un problema al guardar el pedido. Por favor, intentá de nuevo en unos momentos.';
      } else {
        etapa = 'desconocida';
        mensajeUsuario = 'Ocurrió un error inesperado al procesar el pedido. Por favor, intentá de nuevo. Si el problema persiste, contactá al administrador.';
      }

      console.error(`[NuevoPedido] Error en etapa "${etapa}":`, error);

      if (transaccionCompletada) {
        alert(mensajeUsuario);
        navigate('/vendedor');
      } else {
        alert(mensajeUsuario);
      }

      fetch('/.netlify/functions/send-error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'Pedido Manual',
          correlativo: null,
          vendedorEmail: auth.currentUser?.email || 'desconocido',
          vendedorNombre: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'desconocido',
          cliente: cliente || '—',
          errorMessage: errorMsg,
          errorStack: error?.stack || null,
          etapa,
          detailLog: {
            transaccionCompletada,
            cantidadProductos: productos?.length,
            userAgent: navigator.userAgent,
            url: window.location.href,
          },
          fechaHora: new Date().toISOString(),
        }),
      }).catch((reportErr) => console.error('[NuevoPedido] No se pudo enviar reporte de error:', reportErr));

    } finally {
      setLoading(false);
    }
  };

  if (!loadingBloqueo && tieneBloqueo) {
    return <ModalBloqueoCotizaciones cotizaciones={cotizacionesEstancadas} onVolver={() => navigate('/vendedor')} />;
  }

  return <NuevoPedidoView viewModel={{ Loader2, PlusCircle, X, Package, StickyActionBar, NuevoPedidoMobileCard, ModalBloqueoCotizaciones, guardarProductoLocal, addFila, buscandoCliente, buscandoMarca, buscandoProducto, buscarMarcasConDebounce, buscarProductosConDebounce, cliente, comentariosVendedor, errorCliente, errorMarca, erroresValidacion, indiceSugerenciaActiva, indiceSugerenciaMarca, indiceSugerenciaProducto, intentoGuardar, loading, manejarTeclasCliente, manejarTeclasMarca, manejarTeclasProducto, modalNuevoProd, mostrarSugerencias, mostrarSugerenciasMarca, mostrarSugerenciasProducto, productos, removeFila, seleccionarSugerenciaCliente, seleccionarSugerenciaMarca, seleccionarSugerenciaProducto, setCliente, setComentariosVendedor, setIndiceSugerenciaActiva, setIndiceSugerenciaMarca, setIndiceSugerenciaProducto, setIntentoGuardar, setModalNuevoProd, setMostrarSugerencias, setMostrarSugerenciasMarca, setMostrarSugerenciasProducto, setValidez, sugerenciasCliente, sugerenciasMarca, sugerenciasProducto, updateMarcaState, updateProducto, validez, guardarRFQ }} />;
};
