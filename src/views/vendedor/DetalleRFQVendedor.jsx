import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  ChevronLeft, ChevronDown, Clock, Tag, CheckCircle2, ShoppingCart, Link as LinkIcon, 
  Pencil, AlertCircle, Printer, X, Paperclip, Minus, Plus, FileText, Trash2, Ban,
  Plane, Ship, MessageSquare, Calendar, CheckSquare, Square, Package, TrendingDown,
  MessageCircleQuestion
} from 'lucide-react';
import CotizacionDocumento from '../../components/CotizacionDocumento';
import { generarPlantillaNuevoPedido } from '../../utils/emailTemplates';
import { emailConfig } from '../../config/emailConfig';
import { getRoleColors } from '../../utils/roleColors';
import { DetalleRFQVista } from './detalle-rfq/DetalleRFQVista';
import { clasificarSolicitud } from '../../utils/clasificarSolicitud';
import { prepararDatosConsultaVentaPerdida } from '../../utils/ventasPerdidasHelpers';
import { esDecisionItem, prepararDatosDecisionSolicitud } from '../../utils/decisionItemHelpers';
import { obtenerDiasValidez } from '../../utils/cotizacionesEstancadasHelpers';
import { useSeguimientoSolicitud } from '../../hooks/useSeguimientoSolicitud';

export const DetalleRFQVendedor = ({ canGenerarPedido = true, soloPropiasParaPedido = false, role }) => {
  const renderLegacyActions = false;
  const { id } = useParams();
  const navigate = useNavigate();
  const colors = getRoleColors(role);
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [mensajePedido, setMensajePedido] = useState('');
  const [verPreview, setVerPreview] = useState(false);
  const enviandoPedidoRef = useRef(false);

  const [seleccionados, setSeleccionados] = useState({});
  const [contraOfertas, setContraOfertas] = useState({});
  const [enviandoContraOferta, setEnviandoContraOferta] = useState(false);
  const [modalidades, setModalidades] = useState({});
  const [linkOC, setLinkOC] = useState('');
  const [notasPedido, setNotasPedido] = useState('');
  // Adjuntos múltiples: [{ archivo: File, nombre: string, tipo: string }]
  const [archivosAdjuntos, setArchivosAdjuntos] = useState([]);
  const [documentacionOpen, setDocumentacionOpen] = useState(false);
  const [modalidadesOpen, setModalidadesOpen] = useState(false);
  const [modalAnulacion, setModalAnulacion] = useState({ open: false, index: null, motivo: '', enviando: false });
  const [motivoAnulacionVisible, setMotivoAnulacionVisible] = useState(null);
  const [editandoCant, setEditandoCant] = useState({ index: null, value: '' });
  const [modalVentaPerdidaOpen, setModalVentaPerdidaOpen] = useState(false);
  const [itemsVentaPerdidaSeleccionados, setItemsVentaPerdidaSeleccionados] = useState(null);
  const [ventasPerdidasPendientes, setVentasPerdidasPendientes] = useState({});
  const [consultaVentaPerdidaData, setConsultaVentaPerdidaData] = useState(null);
  const [consultaDecisionData, setConsultaDecisionData] = useState(null);

  const handleGuardarCant = async (idx) => {
    try {
      const nuevaCant = Number(editandoCant.value);
      if (!nuevaCant || nuevaCant <= 0) return alert('Cantidad inválida');
      const docRef = doc(db, 'solicitudes', id);
      const updatedProductos = [...rfq.productos];
      updatedProductos[idx] = { ...updatedProductos[idx], cant: nuevaCant };
      await updateDoc(docRef, { productos: updatedProductos });
      setEditandoCant({ index: null, value: '' });
    } catch (error) {
      console.error(error);
      alert('Error al actualizar cantidad');
    }
  };

  const handleAnularItem = async () => {
    if (!modalAnulacion.motivo.trim()) return alert("El motivo es obligatorio");
    setModalAnulacion(prev => ({ ...prev, enviando: true }));
    try {
      const docRef = doc(db, 'solicitudes', id);
      const updatedProductos = [...rfq.productos];
      const idx = modalAnulacion.index;
      
      updatedProductos[idx] = {
        ...updatedProductos[idx],
        estadoItem: 'Anulado',
        motivoAnulacion: modalAnulacion.motivo.trim(),
        fechaAnulacion: new Date(),
        anuladoPor: auth.currentUser.email || 'comprador'
      };

      const clasificacion = clasificarSolicitud(updatedProductos, rfq.estado);
      const nuevoEstado = clasificacion.estado;

      await updateDoc(docRef, {
        productos: updatedProductos,
        estado: nuevoEstado,
        resultado: clasificacion.resultado,
        conteoItems: clasificacion.conteoItems
      });

      alert('Ítem anulado correctamente');
      setModalAnulacion({ open: false, index: null, motivo: '', enviando: false });
    } catch (error) {
      console.error(error);
      alert('Error al anular ítem');
      setModalAnulacion(prev => ({ ...prev, enviando: false }));
    }
  };

  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, []);

  const enviarContraOferta = async (idx) => {
    if (!window.confirm('¿Enviar este nuevo precio/tiempo a compras para su revisión?')) return;
    setEnviandoContraOferta(true);
    try {
      const docRef = doc(db, 'solicitudes', id);
      const updatedProductos = [...rfq.productos];
      const oferta = contraOfertas[idx] || {};
      
      updatedProductos[idx] = {
        ...updatedProductos[idx],
        fob: Number(oferta.fob || updatedProductos[idx].fob),
        fechaCompromiso: oferta.fechaCompromiso || updatedProductos[idx].fechaCompromiso,
        estadoItem: 'Pendiente' // Regresa a compras
      };

      const clasificacion = clasificarSolicitud(updatedProductos, rfq.estado);
      const nuevoEstado = clasificacion.estado;

      await updateDoc(docRef, {
        productos: updatedProductos,
        estado: nuevoEstado,
        resultado: clasificacion.resultado,
        conteoItems: clasificacion.conteoItems
      });

      alert('Contraoferta enviada a Compras');
      
      // Limpiar estado local
      setContraOfertas(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    } catch (error) {
      console.error('Error enviando contraoferta:', error);
      alert('Error al enviar contraoferta');
    } finally {
      setEnviandoContraOferta(false);
    }
  };

  const esItemYaPedido = (p) => {
    if (!p) return false;
    if (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') return true;
    if (p.modalidad && (Number(p.precioUnitario || 0) > 0 || Number(p.precio || 0) > 0 || !!p.fechaConfirmacion)) return true;
    return false;
  };

  const esItemVentaPerdida = (p, idx = null) => Boolean(
    p && (
      p.estadoItem === 'Venta Perdida' ||
      p.motivoEstadoItem?.toLowerCase().includes('venta perdida') ||
      rfq?.estado === 'Venta Perdida' ||
      (idx !== null && ventasPerdidasPendientes[idx])
    )
  );

  const esItemDenegado = (p, idx = null) => Boolean(
    p && !esItemVentaPerdida(p, idx) && (
      p.estadoItem === 'Denegado' ||
      p.estadoItem === 'Cancelado' ||
      p.estadoItem === 'Rechazado'
    )
  );

  const esItemAnulado = (p) => Boolean(p && p.estadoItem === 'Anulado');

  const totalVentasPerdidasPendientes = Object.keys(ventasPerdidasPendientes).length;
  const hayItemsPendientesDePedir = rfq?.productos?.some((p, idx) => Number(p.fob || 0) > 0 && !esItemYaPedido(p) && !esItemDenegado(p, idx) && !esItemVentaPerdida(p, idx) && !esItemAnulado(p));
  const esAnulado = rfq?.estado === 'Anulado';
  const esVentaPerdida = rfq?.estado === 'Venta Perdida';
  const motivoAnulacion = rfq?.motivoAnulacion
    || rfq?.productos?.find(p => p.motivoAnulacion)?.motivoAnulacion
    || '';
  const pedidoYaCreado = (rfq?.estado === 'Pedido' || rfq?.estado === 'Comprado') || (rfq?.estado === 'Pedido Parcial' && !hayItemsPendientesDePedir);
  const esPropietarioDeRFQ = (rfq?.vendedorId && rfq.vendedorId === auth.currentUser?.uid) ||
    (rfq?.vendedorEmail && auth.currentUser?.email && rfq.vendedorEmail.toLowerCase() === auth.currentUser.email.toLowerCase());
  const puedeConfirmarPedido = canGenerarPedido && (!soloPropiasParaPedido || esPropietarioDeRFQ) && hayItemsPendientesDePedir && !esAnulado && !esVentaPerdida;
  const totalItemsSeleccionables = rfq?.productos?.filter((p, idx) => Number(p.fob || 0) > 0 && !esItemYaPedido(p) && !esItemDenegado(p, idx) && !esItemVentaPerdida(p, idx) && !esItemAnulado(p)).length ?? 0;
  const totalItemsSeleccionados = Object.values(seleccionados).filter(Boolean).length;
  const puedeConfirmarOEnviar = ((puedeConfirmarPedido || canGenerarPedido) && (!soloPropiasParaPedido || esPropietarioDeRFQ) && !esAnulado && !esVentaPerdida) && (totalItemsSeleccionados > 0 || totalVentasPerdidasPendientes > 0);
  const seraParcial = puedeConfirmarPedido && totalItemsSeleccionados > 0 && totalItemsSeleccionados < totalItemsSeleccionables;
  const hayDecisionesEnParcial = Boolean(rfq?.estado?.includes('Parcial') && rfq?.productos?.some((p) => esDecisionItem(p)));
  const hayVentaPerdidaEnParcial = Boolean(rfq?.estado?.includes('Parcial') && rfq?.productos?.some((p) => p.estadoItem === 'Venta Perdida' || p.motivoVentaPerdida));

  const abrirConsultaDecisionParcial = () => {
    const data = prepararDatosDecisionSolicitud({ ...rfq, id: rfq?.id || id });
    if (data?.items?.length) setConsultaDecisionData(data);
  };

  const puedeGestionarSeguimiento = Boolean(esPropietarioDeRFQ) && !esAnulado && !esVentaPerdida;
  const puedeRegistrarVentaPerdida = Boolean(esPropietarioDeRFQ) && !esAnulado && !esVentaPerdida;
  const hayItemsElegiblesVentaPerdida = (rfq?.productos || []).some((p, idx) => 
    !esItemYaPedido(p) && !esItemDenegado(p, idx) && !esItemVentaPerdida(p, idx) && !esItemAnulado(p)
  );

  const tieneItemsSeleccionadosValidos = Object.keys(seleccionados)
    .filter(idx => seleccionados[idx])
    .some(idx => {
      const prod = rfq?.productos?.[Number(idx)];
      return prod && !esItemYaPedido(prod) && !esItemDenegado(prod, Number(idx)) && !esItemVentaPerdida(prod, Number(idx)) && !esItemAnulado(prod);
    });

  const debeMostrarBotonVentaPerdida = puedeRegistrarVentaPerdida && (
    (totalItemsSeleccionados > 0 && tieneItemsSeleccionadosValidos) ||
    (totalItemsSeleccionados === 0 && hayItemsElegiblesVentaPerdida)
  );

  const accionesPrincipalesRef = useRef(null);
  const [accionesPrincipalesVisibles, setAccionesPrincipalesVisibles] = useState(false);

  useEffect(() => {
    const element = accionesPrincipalesRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setAccionesPrincipalesVisibles(entry.isIntersecting && entry.intersectionRatio > 0.15);
      },
      { threshold: [0, 0.15, 0.5, 1], rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [debeMostrarBotonVentaPerdida, puedeConfirmarOEnviar, totalVentasPerdidasPendientes]);

  const mostrarStickyMovil = (puedeConfirmarOEnviar || debeMostrarBotonVentaPerdida)
    && !accionesPrincipalesVisibles;

  const productosDelPedido = pedidoYaCreado
    ? (rfq?.productos || [])
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => esItemYaPedido(item))
    : Object.keys(seleccionados)
        .filter((idx) => seleccionados[idx])
        .map((idx) => ({ item: rfq?.productos?.[Number(idx)], idx: Number(idx) }))
        .filter(({ item }) => Boolean(item));

  const getModalidadSeleccionada = (idx, item = null) => {
    if (pedidoYaCreado) {
      const modalidadGuardada = item?.modalidad;
      if (modalidadGuardada === 'Aéreo') return 'A';
      if (modalidadGuardada === 'Marítimo') return 'M';
      return '';
    }

    return modalidades[idx] || '';
  };

  const getTextoModalidad = (idx, item = null) => {
    const mod = getModalidadSeleccionada(idx, item);
    if (mod === 'A') return 'Aéreo';
    if (mod === 'M') return 'Marítimo';
    return 'No seleccionada';
  };

  const getSubtotalItem = (item, idx) => {
    const mod = getModalidadSeleccionada(idx, item);
    if (pedidoYaCreado && Number(item?.subtotal) > 0) {
      return Number(item.subtotal || 0);
    }

    const factor = mod === 'A'
      ? (item?.factorA || rfq?.factorA || 1)
      : (item?.factorM || rfq?.factorM || 1.08);
    const margen = mod === 'A' ? (item?.fva || 1.3) : (item?.fvm || 1.25);
    return Number(item?.fob || 0) * factor * margen * Number(item?.cant || 0);
  };

  const desgloseVendedor = productosDelPedido.reduce((acc, registro) => {
    const subVal = getSubtotalItem(registro.item, registro.idx);
    const mod = getModalidadSeleccionada(registro.idx, registro.item);

    if (mod === 'A') acc.aereo += subVal;
    else if (mod === 'M') acc.maritimo += subVal;
    return acc;
  }, { aereo: 0, maritimo: 0 });

  const totalPedidoActual = desgloseVendedor.aereo + desgloseVendedor.maritimo;

  // Función para calcular fecha omitiendo fines de semana
  const obtenerFechaEstimada = (dias) => {
    if (!dias || isNaN(parseInt(dias))) return 'Pendiente';
    let fecha = new Date();
    let diasRestantes = parseInt(dias);
    while (diasRestantes > 0) {
      fecha.setDate(fecha.getDate() + 1);
      if (fecha.getDay() !== 0 && fecha.getDay() !== 6) diasRestantes--;
    }
    return fecha.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/El_Salvador' });
  };

  useEffect(() => {
    const docRef = doc(db, "solicitudes", id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.tipo === 'Pedido Manual') {
          navigate(`/vendedor/pedido-manual/${id}`, { replace: true });
          return;
        }
        
        // PROTECCIÓN DE RUTA: Solo los vendedores tienen restringido ver solicitudes de otros
        const email = auth.currentUser?.email || '';
        const puedeVerCualquierSolicitud = role === 'gerente' || role === 'administrador' || role === 'comprador' ||
          Boolean(email.toLowerCase().match(/admin|gerente|compras/));

        const esDuenio = (data.vendedorId && data.vendedorId === auth.currentUser?.uid) ||
          (data.vendedorEmail && auth.currentUser?.email && data.vendedorEmail.toLowerCase() === auth.currentUser.email.toLowerCase());

        if (!puedeVerCualquierSolicitud && !esDuenio) {
          alert('Acceso Denegado: Esta solicitud pertenece a otro vendedor.');
          navigate('/vendedor');
          return;
        }

        setRfq({ id: docSnap.id, ...data });
        if (data.linkOC) setLinkOC(data.linkOC);
        if (data.notasPedido) setNotasPedido(data.notasPedido);
        
        const selInit = {};
        const modInit = {};
        data.productos.forEach((p, idx) => {
          if (Number(p.fob) > 0 && !esItemYaPedido(p) && !esItemDenegado(p) && !esItemVentaPerdida(p)) {
            selInit[idx] = false;
            modInit[idx] = 'A';
          }
        });
        // Solo resetear si no había selecciones previas para no borrar el progreso del usuario
        setSeleccionados(prev => Object.keys(prev).length ? prev : selInit);
        setModalidades(prev => Object.keys(prev).length ? prev : modInit);
      } else {
        alert("Solicitud no encontrada.");
        navigate(role === 'comprador' ? '/compras' : '/vendedor');
      }
      setLoading(false);
    }, (error) => {
      console.error("Error obteniendo RFQ:", error);
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, role]);

  // ── Adjuntos múltiples directo a correo, sin límite en frontend ──────────
  const handleAdjuntarArchivos = (event) => {
    const nuevos = Array.from(event.target.files || []);
    event.target.value = '';
    if (!nuevos.length) return;
    setArchivosAdjuntos(prev => [
      ...prev,
      ...nuevos.map(f => ({ archivo: f, nombre: f.name, tipo: f.type || 'application/octet-stream' }))
    ]);
  };

  const handleEliminarArchivo = (index) => {
    setArchivosAdjuntos(prev => prev.filter((_, i) => i !== index));
  };

  const prepararAdjuntosParaCorreo = async () => {
    if (!archivosAdjuntos.length) return undefined;
    return Promise.all(
      archivosAdjuntos.map(({ archivo, nombre }) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ content: String(reader.result || '').split(',')[1] || '', nombre });
          reader.onerror = reject;
          reader.readAsDataURL(archivo);
        })
      )
    );
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleAbrirVentaPerdida = (itemIndices = null) => {
    if (!puedeRegistrarVentaPerdida) return;
    if (Array.isArray(itemIndices) && itemIndices.length > 0) {
      const elegibles = itemIndices.filter(idx => {
        const prod = rfq?.productos?.[idx];
        return prod && !esItemYaPedido(prod) && !esItemDenegado(prod, idx) && !esItemVentaPerdida(prod, idx) && !esItemAnulado(prod);
      });
      if (elegibles.length === 0) {
        alert('Los ítems seleccionados ya no están disponibles para registrar venta perdida.');
        return;
      }
      setItemsVentaPerdidaSeleccionados(elegibles);
      setModalVentaPerdidaOpen(true);
      return;
    }

    const indicesSeleccionados = Object.keys(seleccionados).filter(idx => seleccionados[idx]).map(Number);
    if (indicesSeleccionados.length > 0) {
      const elegibles = indicesSeleccionados.filter(idx => {
        const prod = rfq?.productos?.[idx];
        return prod && !esItemYaPedido(prod) && !esItemDenegado(prod, idx) && !esItemVentaPerdida(prod, idx) && !esItemAnulado(prod);
      });
      if (elegibles.length === 0) {
        alert('Ninguno de los ítems seleccionados está disponible para registrar venta perdida.');
        return;
      }
      setItemsVentaPerdidaSeleccionados(elegibles);
      setModalVentaPerdidaOpen(true);
      return;
    }

    // Si no hay ítems marcados, evaluar si hay ítems pendientes disponibles
    const itemsPendientes = (rfq?.productos || [])
      .map((p, idx) => ({ p, idx }))
      .filter(({ p, idx }) => !esItemYaPedido(p) && !esItemDenegado(p, idx) && !esItemVentaPerdida(p, idx) && !esItemAnulado(p));

    if (itemsPendientes.length > 0) {
      const indicesPendientes = itemsPendientes.map(({ idx }) => idx);
      if (itemsPendientes.length === (rfq?.productos || []).length) {
        setItemsVentaPerdidaSeleccionados(null);
      } else {
        setItemsVentaPerdidaSeleccionados(indicesPendientes);
      }
      setModalVentaPerdidaOpen(true);
      return;
    }

    alert('Selecciona con la casilla los ítems específicos para registrar venta perdida.');
  };

  const handleConfirmarVentaPerdidaStaged = ({ motivo, comentario, itemsSeleccionados: itemsParam }) => {
    if (!puedeRegistrarVentaPerdida) return;
    let indices = itemsParam;
    if (!Array.isArray(indices) || indices.length === 0) {
      indices = (rfq?.productos || [])
        .map((p, idx) => ({ p, idx }))
        .filter(({ p, idx }) => !esItemYaPedido(p) && !esItemDenegado(p, idx) && !esItemVentaPerdida(p, idx) && !esItemAnulado(p))
        .map(({ idx }) => idx);
    }

    setVentasPerdidasPendientes(prev => {
      const next = { ...prev };
      indices.forEach(idx => {
        next[idx] = {
          motivo,
          comentario,
          fecha: new Date()
        };
      });
      return next;
    });

    setSeleccionados(prev => {
      const next = { ...prev };
      indices.forEach(idx => {
        next[idx] = false;
      });
      return next;
    });

    setModalVentaPerdidaOpen(false);
    setItemsVentaPerdidaSeleccionados(null);
  };

  const handleCancelarVentaPerdidaPendiente = (idx) => {
    setVentasPerdidasPendientes(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const indicesSeleccionadosSeguimiento = Object.keys(seleccionados)
    .filter((indice) => seleccionados[indice])
    .map(Number);
  const indicesVentaPerdidaPendientes = Object.keys(ventasPerdidasPendientes).map(Number);
  const {
    modalAbierto: modalSeguimientoClienteOpen,
    setModalAbierto: setModalSeguimientoClienteOpen,
    planModal: planSeguimientoCliente,
    accionBanner: accionSeguimiento,
    obtenerPropsItem: obtenerPropsSeguimientoItem,
    guardando: guardandoSeguimientoCliente,
    resumen: resumenSeguimientoCliente,
    abrirSeguimiento: handleAbrirSeguimientoCliente,
    confirmarPlan: handleConfirmarPlanSeguimiento
  } = useSeguimientoSolicitud({
    id,
    solicitud: rfq,
    productos: rfq?.productos || [],
    indicesSeleccionados: indicesSeleccionadosSeguimiento,
    indicesVentaPerdidaPendientes,
    puedeGestionar: puedeGestionarSeguimiento,
    setItemsSeleccionados: setSeleccionados
  });

  const abrirConsultaVentaPerdida = (p = null, idx = null) => {
    const staged = idx !== null ? ventasPerdidasPendientes[idx] : null;
    setConsultaVentaPerdidaData(prepararDatosConsultaVentaPerdida({
      solicitud: rfq,
      item: p,
      staged,
      currentUserEmail: auth.currentUser?.email
    }));
  };

  const handleCrearPedido = async () => {
    if (!puedeConfirmarOEnviar) {
      alert('No hay ítems seleccionados para pedido ni ventas perdidas por enviar.');
      return;
    }
    const indicesSeleccionados = Object.keys(seleccionados).filter(idx => seleccionados[idx]).map(Number);
    const indicesVentaPerdida = Object.keys(ventasPerdidasPendientes).map(Number);
    if (indicesVentaPerdida.length > 0 && !puedeRegistrarVentaPerdida) return;

    if (indicesSeleccionados.length === 0 && indicesVentaPerdida.length === 0) {
      alert("Selecciona productos para el pedido o registra ventas perdidas.");
      return;
    }

    setEnviandoPedido(true);
    setMensajePedido('Procesando solicitud...');
    try {
      const productosActualizadosParaRFQ = [...rfq.productos];
      const ahoraTimestamp = new Date();

      // 1. Crear Pedido si hay productos seleccionados
      let productosParaPedido = [];
      const valorLinkOC = linkOC || rfq?.linkOC || "";
      const valorNotasPedido = notasPedido || rfq?.notasPedido || "";

      if (indicesSeleccionados.length > 0) {
        setMensajePedido('Creando pedido...');
        productosParaPedido = indicesSeleccionados.map(idx => {
          const p = rfq.productos[idx];
          const mod = modalidades[idx];
          const factor = mod === 'A'
            ? (p.factorA || rfq.factorA || 1)
            : (p.factorM || rfq.factorM || 1.08);
          const margen = mod === 'A' ? (p.fva || 1.3) : (p.fvm || 1.25);
          const precioVenta = p.fob * factor * margen;
          const diasHabiles = mod === 'A' ? p.entregaA : p.entregaM;

          const itemData = {
            descripcion: p.descripcion || p.desc,
            marca: p.marca || 'N/A',
            cantidad: p.cant,
            precioUnitario: precioVenta,
            subtotal: precioVenta * p.cant,
            modalidad: mod === 'A' ? 'Aéreo' : 'Marítimo',
            diasPrometidos: parseInt(diasHabiles),
            fechaCompromiso: obtenerFechaEstimada(diasHabiles),
            estadoItem: 'Pedido',
            fechaConfirmacion: p.fechaConfirmacion || ahoraTimestamp,
            fob: p.fob
          };

          productosActualizadosParaRFQ[idx] = { ...p, ...itemData, precio: precioVenta };
          return itemData;
        });

        await addDoc(collection(db, "pedidos"), {
          idCotizacion: rfq.id,
          correlativoRFQ: rfq.correlativo,
          cliente: rfq.cliente,
          vendedorNombre: rfq.vendedorNombre,
          productos: productosParaPedido,
          linkOC: valorLinkOC,
          notasPedido: valorNotasPedido,
          fechaCreacion: serverTimestamp(),
          estadoGeneral: 'Procesando'
        });
      }

      // 2. Registrar Ventas Perdidas si hay productos marcados
      let ultimoMotivoVentaPerdida = null;
      if (indicesVentaPerdida.length > 0) {
        setMensajePedido('Registrando ventas perdidas...');
        const vendedorUid = auth.currentUser?.uid || rfq.vendedorId || 'vendedor';
        const factorA = Number(rfq.factorA || 1);
        const factorM = Number(rfq.factorM || 1.08);

        for (const idx of indicesVentaPerdida) {
          const p = rfq.productos[idx];
          const staged = ventasPerdidasPendientes[idx];
          const cant = Number(p.cant || 1);
          const fob = Number(p.fob || 0);
          const itemFactorA = Number(p.factorA || factorA);
          const itemFactorM = Number(p.factorM || factorM);
          const fva = Number(p.fva || 1.3);
          const fvm = Number(p.fvm || 1.25);
          const subA = fob * itemFactorA * fva * cant;
          const subM = fob * itemFactorM * fvm * cant;

          const registroVentaPerdida = {
            solicitudId: rfq.id,
            motivoCodigo: staged.motivo.codigo,
            comentario: staged.comentario,
            vendedorId: vendedorUid,
            fecha: serverTimestamp(),
            tipoSolicitud: rfq.tipo || 'RFQ',
            correlativo: rfq.correlativo || 'N/A',
            cliente: rfq.cliente || 'Desconocido',
            montoAereo: Math.round(subA * 100) / 100,
            montoMaritimo: Math.round(subM * 100) / 100,
            itemsIds: [p?.id || p?.codigo || String(idx)],
            motivoNombre: staged.motivo.nombre,
            categoriaMotivo: staged.motivo.categoria || 'Otros'
          };

          await addDoc(collection(db, 'ventasPerdidas'), registroVentaPerdida);

          const infoMotivo = {
            codigo: staged.motivo.codigo,
            nombre: staged.motivo.nombre,
            categoria: staged.motivo.categoria || 'Otros',
            comentario: staged.comentario,
            fecha: ahoraTimestamp,
            registradoPor: auth.currentUser?.email || ''
          };

          productosActualizadosParaRFQ[idx] = {
            ...p,
            estadoItem: 'Venta Perdida',
            motivoEstadoItem: `Venta Perdida: ${staged.motivo.nombre}`,
            motivoVentaPerdida: infoMotivo
          };

          ultimoMotivoVentaPerdida = infoMotivo;
        }
      }

      // 3. Clasificar solicitud y actualizar documento
      const clasificacion = clasificarSolicitud(productosActualizadosParaRFQ, rfq.estado);
      let estadoNuevoSolicitud = clasificacion.estado;

      const noPedidosNiAnulados = productosActualizadosParaRFQ.filter(
        p => p.estadoItem !== 'Pedido' && p.estadoItem !== 'Comprado' && p.estadoItem !== 'Anulado'
      );
      const todosEnVentaPerdida = noPedidosNiAnulados.length > 0 && noPedidosNiAnulados.every(p => p.estadoItem === 'Venta Perdida');
      const hayPedidos = productosActualizadosParaRFQ.some(p => p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado');

      if (todosEnVentaPerdida && !hayPedidos) {
        estadoNuevoSolicitud = 'Venta Perdida';
      }

      setMensajePedido('Actualizando solicitud...');
      const updatePayload = {
        estado: estadoNuevoSolicitud,
        resultado: clasificacion.resultado,
        conteoItems: clasificacion.conteoItems,
        productos: productosActualizadosParaRFQ,
        linkOC: valorLinkOC,
        notasPedido: valorNotasPedido
      };

      if (indicesSeleccionados.length > 0) {
        updatePayload.fechaPedido = serverTimestamp();
        updatePayload.pedidoEmailEnviado = false;
        updatePayload.tieneAdjuntos = archivosAdjuntos.length > 0;
      }

      if (indicesVentaPerdida.length > 0 && ultimoMotivoVentaPerdida) {
        updatePayload.motivoVentaPerdida = ultimoMotivoVentaPerdida;
      }

      await updateDoc(doc(db, "solicitudes", id), updatePayload);

      // 4. Enviar correo si hubo pedido
      if (indicesSeleccionados.length > 0) {
        const productosCotizadosCount = rfq.productos.filter(p => Number(p.fob || 0) > 0 || p.precio > 0).length;
        const esPedidoParcial = estadoNuevoSolicitud === 'Pedido Parcial';

        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        const vendedorEmail = auth.currentUser?.email || rfq.vendedorEmail || '';
        const vendedorNombre = auth.currentUser?.displayName || rfq.vendedorNombre || vendedorEmail.split('@')[0];

        const senderFrom = isLocal ? 'rvides@hermaco.net <rvides@hermaco.net>' : `${vendedorNombre} <${vendedorEmail}>`;
        const replyToEmail = isLocal ? 'rvides@hermaco.net' : vendedorEmail;
        const destinatarioTo = isLocal ? ["rvides@hermaco.net"] : (emailConfig.pedidoGenerado?.to?.filter(Boolean).length ? emailConfig.pedidoGenerado.to : ["compras@hermaco.net"]);
        const ccEmails = isLocal 
          ? ["rvides@hermaco.net"]
          : [
              vendedorEmail,
              ...(emailConfig.pedidoGenerado?.cc || ["logisticahco@hermaco.net"])
            ].filter(email => !["oventura@hermaco.net", "dhernandez@hermaco.net"].includes(email?.toLowerCase()));

        const orderDataForEmail = {
          correlativoRFQ: rfq.correlativo,
          cliente: rfq.cliente,
          vendedorNombre,
          vendedorEmail,
          esPedidoParcial,
          totalItemsCotizacion: productosCotizadosCount,
          productos: productosActualizadosParaRFQ,
          linkOC: linkOC || "",
          notasPedido: notasPedido || "",
        };

        const htmlBody = generarPlantillaNuevoPedido(orderDataForEmail);
        const tipoTag = esPedidoParcial ? 'Parcial' : 'Completo';

        if (archivosAdjuntos.length > 0) {
          setMensajePedido(`Procesando ${archivosAdjuntos.length} adjunto(s)...`);
        }
        const attachments = await prepararAdjuntosParaCorreo();

        setMensajePedido('Enviando correo...');
        try {
          const mailRes = await fetch('/.netlify/functions/send-email-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: senderFrom,
              replyTo: replyToEmail,
              to: destinatarioTo,
              cc: ccEmails,
              subject: `Nuevo Pedido ${tipoTag}: ${rfq.correlativo} - ${rfq.cliente}`,
              bodyHtml: htmlBody,
              attachments,
            })
          });

          if (!mailRes.ok) throw new Error('Fallo al enviar correo de pedido');
          await updateDoc(doc(db, 'solicitudes', id), { pedidoEmailEnviado: true });
        } catch (e) {
          console.error("Error enviando correo de pedido:", e);
        }
      }

      alert("Operación completada con éxito.");
      navigate('/vendedor'); 
    } catch (error) {
      console.error("Error al procesar pedido o ventas perdidas:", error);
      alert("Error al procesar pedido.");
    } finally {
      enviandoPedidoRef.current = false;
      setEnviandoPedido(false);
      setMensajePedido('');
    }
  };

  const handleVolver = () => {
    navigate(role === 'comprador' ? '/compras' : '/vendedor');
  };

  if (loading) return (
    <div className="min-h-[50vh] py-24 flex items-center justify-center font-black text-slate-400 animate-pulse uppercase tracking-widest">
      Cargando Detalle de Cotización...
    </div>
  );

  const itemsCotizadosCount = rfq?.productos?.filter(p => Number(p.fob || 0) > 0).length || 0;
  const totalProductosCount = rfq?.productos?.length || 0;
  const totalGeneralA = rfq?.productos?.reduce((acc, p) => {
    const fob = Number(p.fob || 0);
    if (fob <= 0) return acc;
    return acc + fob * (p.factorA || rfq?.factorA || 1) * (p.fva || 1.30) * Number(p.cant || 1);
  }, 0) || 0;
  const totalGeneralM = rfq?.productos?.reduce((acc, p) => {
    const fob = Number(p.fob || 0);
    if (fob <= 0) return acc;
    return acc + fob * (p.factorM || rfq?.factorM || 1.08) * (p.fvm || 1.25) * Number(p.cant || 1);
  }, 0) || 0;

  const viewModel = {
    renderLegacyActions, id, navigate, colors, rfq, enviandoPedido, mensajePedido, verPreview,
    seleccionados, setSeleccionados, contraOfertas, setContraOfertas, enviandoContraOferta, modalidades, setModalidades, linkOC,
    setLinkOC, notasPedido, setNotasPedido, archivosAdjuntos, setArchivosAdjuntos, documentacionOpen, setDocumentacionOpen, modalidadesOpen,
    setModalidadesOpen, modalAnulacion, setModalAnulacion, motivoAnulacionVisible, setMotivoAnulacionVisible, editandoCant, setEditandoCant, modalVentaPerdidaOpen,
    setModalVentaPerdidaOpen, itemsVentaPerdidaSeleccionados, setItemsVentaPerdidaSeleccionados, ventasPerdidasPendientes, consultaVentaPerdidaData, setConsultaVentaPerdidaData, consultaDecisionData, setConsultaDecisionData,
    handleGuardarCant, handleAnularItem, enviarContraOferta, esItemYaPedido, esItemVentaPerdida, esItemDenegado, esItemAnulado, totalVentasPerdidasPendientes,
    hayItemsPendientesDePedir, esAnulado, esVentaPerdida, motivoAnulacion, pedidoYaCreado, esPropietarioDeRFQ, puedeConfirmarPedido, totalItemsSeleccionables,
    totalItemsSeleccionados, puedeConfirmarOEnviar, seraParcial, hayDecisionesEnParcial, hayVentaPerdidaEnParcial, abrirConsultaDecisionParcial, puedeRegistrarVentaPerdida, hayItemsElegiblesVentaPerdida, tieneItemsSeleccionadosValidos, debeMostrarBotonVentaPerdida, accionesPrincipalesRef, mostrarStickyMovil, productosDelPedido, getModalidadSeleccionada, getTextoModalidad, getSubtotalItem, desgloseVendedor, totalPedidoActual, obtenerFechaEstimada, handleAdjuntarArchivos, handleEliminarArchivo, prepararAdjuntosParaCorreo, handleAbrirVentaPerdida, handleConfirmarVentaPerdidaStaged, handleCancelarVentaPerdidaPendiente, abrirConsultaVentaPerdida, handleCrearPedido, handleVolver, itemsCotizadosCount, totalProductosCount, totalGeneralA, totalGeneralM, role, setVerPreview, canGenerarPedido, soloPropiasParaPedido,
    modalSeguimientoClienteOpen, setModalSeguimientoClienteOpen, planSeguimientoCliente, handleAbrirSeguimientoCliente, handleConfirmarPlanSeguimiento, guardandoSeguimientoCliente, diasValidezSeguimiento: obtenerDiasValidez(rfq), puedeGestionarSeguimiento, accionSeguimiento, obtenerPropsSeguimientoItem, resumenSeguimientoCliente
  };

  return <DetalleRFQVista viewModel={viewModel} />;
};





