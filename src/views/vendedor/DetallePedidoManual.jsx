import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { 
  ChevronLeft, CheckCircle2, MessageSquare, ArrowLeftRight, Check, X,
  ChevronDown, Link as LinkIcon, Save, AlertCircle, TrendingDown, MessageCircleQuestion, Undo2, RotateCcw
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { HiloComentariosItem } from '../../components/hilos/HiloComentariosItem';
import { DetallePedidoMobileCard } from '../../components/pedidos/DetallePedidoMobileCard';
import { useMensajesResumen } from '../../hooks/useMensajesResumen';
import { useNegociacionItems } from '../../hooks/useNegociacionItems';
import { EstadoItemChip } from '../../components/pedidos/negociacion/EstadoItemChip';
import { OfertaDiff } from '../../components/pedidos/negociacion/OfertaDiff';
import { FormularioOferta } from '../../components/pedidos/negociacion/FormularioOferta';
import { AccionItemButton, AccionesItemInteractiva } from '../../components/pedidos/negociacion/AccionesItemInteractiva';
import { ResumenTurnos } from '../../components/pedidos/negociacion/ResumenTurnos';
import { BarraNotificar } from '../../components/pedidos/negociacion/BarraNotificar';
import { getRoleColors } from '../../utils/roleColors';
import { esItemEstancado } from '../../utils/cotizacionesEstancadasHelpers';
import { SeguimientoClienteBanner } from '../../components/seguimiento/SeguimientoClienteBanner';
import { SeguimientoItemCondicion } from '../../components/seguimiento/SeguimientoItemCondicion';
import { prepararDatosConsultaVentaPerdida, tieneMotivoConsultaItem } from '../../utils/ventasPerdidasHelpers';
import { esDecisionItem, prepararDatosDecisionItem, prepararDatosDecisionSolicitud, esItemCerrado } from '../../utils/decisionItemHelpers';
import { ContextBar } from '../../components/detalle/ContextBar';
import { DetallePedidoManualModales } from './pedido-manual/components/DetallePedidoManualModales';
import { useRechazarOferta } from './pedido-manual/hooks/useRechazarOferta';
import { useSeguimientoSolicitud } from '../../hooks/useSeguimientoSolicitud';
import { useSolicitudScopedMap } from './pedido-manual/hooks/useSolicitudScopedMap';
import './pedido-manual/detallePedidoManual.css';
import { Etiqueta } from '../../components/Etiqueta';

export const DetallePedidoManual = ({ role = 'vendedor' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hiloAbierto, setHiloAbierto] = useState(null);
  const [modalVentaPerdidaOpen, setModalVentaPerdidaOpen] = useState(false);
  const [itemsVentaPerdidaSeleccionados, setItemsVentaPerdidaSeleccionados] = useState(null);
  const [itemsSeleccionados, setItemsSeleccionados] = useSolicitudScopedMap(id);
  const [ventasPerdidasPendientes, setVentasPerdidasPendientes] = useSolicitudScopedMap(id);
  const [notificandoTodo, setNotificandoTodo] = useState(false);
  const [consultaVentaPerdidaData, setConsultaVentaPerdidaData] = useState(null);
  const [consultaDecisionData, setConsultaDecisionData] = useState(null);
  const colors = getRoleColors(role);
  const [filtroTurno, setFiltroTurno] = useState(null);
  const [linkOC, setLinkOC] = useState('');
  const [comentariosVendedor, setComentariosVendedor] = useState('');
  const [documentacionOpen, setDocumentacionOpen] = useState(false);
  const [editandoDocs, setEditandoDocs] = useState(false);
  const isFirstLoad = useRef(true);

  const currentUser = {
    uid: auth.currentUser?.uid,
    nombre: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Vendedor',
    email: auth.currentUser?.email || '',
    rol: 'vendedor'
  };

  const {
    solicitud: solicitudBase,
    itemsServer,
    borradores,
    loading,
    unnotifiedCount,
    notificacionPendienteEmail,
    resumenAcciones,
    turnoCompras,
    turnoVendedor,
    cerrados,
    actions,
    updateBorrador,
    clearBorrador
  } = useNegociacionItems(id, currentUser);

  const { conteos, noLeidos } = useMensajesResumen(id, itemsServer, currentUser.rol);

  const email = auth.currentUser?.email || '';
  const esDuenio = solicitudBase && (
    (solicitudBase.vendedorId && solicitudBase.vendedorId === auth.currentUser?.uid) ||
    (solicitudBase.vendedorEmail && email && solicitudBase.vendedorEmail.toLowerCase() === email.toLowerCase())
  );

  const puedeVerCualquierSolicitud = role === 'gerente' || role === 'administrador' || role === 'comprador' ||
    Boolean(email.toLowerCase().match(/admin|gerente|compras/));

  const esAnulado = solicitudBase?.estado === 'Anulado';
  const esVentaPerdida = solicitudBase?.estado === 'Venta Perdida';
  const puedeResponder = Boolean(esDuenio) && !esAnulado && !esVentaPerdida;
  const { modalRechazar, setModalRechazar, handleAbrirModalRechazar, handleConfirmarRechazo } = useRechazarOferta({
    puedeResponder,
    actions,
    setItemsSeleccionados
  });
  const puedeGestionarSeguimiento = Boolean(esDuenio) && !esAnulado && !esVentaPerdida;
  const indicesSeleccionados = Object.keys(itemsSeleccionados)
    .filter((indice) => itemsSeleccionados[indice])
    .map(Number);
  const indicesVentaPerdidaPendientes = Object.keys(ventasPerdidasPendientes)
    .filter((indice) => ventasPerdidasPendientes[indice])
    .map(Number);
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
    solicitud: solicitudBase,
    productos: itemsServer,
    indicesSeleccionados,
    indicesVentaPerdidaPendientes,
    puedeGestionar: puedeGestionarSeguimiento,
    setItemsSeleccionados
  });
  const puedeRegistrarVentaPerdida = Boolean(esDuenio) && !esAnulado && !esVentaPerdida;
  const hayDecisionesEnParcial = Boolean(solicitudBase?.estado?.includes('Parcial') && itemsServer.some((p) => esDecisionItem(p)));
  const hayVentaPerdidaEnParcial = Boolean(solicitudBase?.estado?.includes('Parcial') && itemsServer.some((p) => p.estadoItem === 'Venta Perdida' || p.motivoVentaPerdida));
  const motivoAnulacion = solicitudBase?.motivoAnulacion
    || solicitudBase?.productos?.find(p => p.motivoAnulacion)?.motivoAnulacion
    || '';

  useEffect(() => {
    if (!loading && solicitudBase) {
      if (!puedeVerCualquierSolicitud && !esDuenio) {
        alert('Acceso Denegado: Este pedido pertenece a otro vendedor.');
        navigate('/vendedor');
      }
    }
  }, [loading, solicitudBase, puedeVerCualquierSolicitud, esDuenio, navigate]);

  useEffect(() => {
    if (isFirstLoad.current && solicitudBase && !loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (solicitudBase.linkOC) setLinkOC(solicitudBase.linkOC);
       
      if (solicitudBase.comentariosVendedor) setComentariosVendedor(solicitudBase.comentariosVendedor);
      isFirstLoad.current = false;
    }
  }, [solicitudBase, loading]);

  const handleGuardarDocumentacion = async () => {
    if (!puedeResponder) return;
    setEditandoDocs(true);
    try {
      await updateDoc(doc(db, 'solicitudes', id), {
        linkOC: linkOC.trim(),
        comentariosVendedor: comentariosVendedor.trim()
      });
      alert("Documentación guardada (visible para Compras)");
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    } finally {
      setEditandoDocs(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (unnotifiedCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unnotifiedCount]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] py-24 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!solicitudBase) return null;

  const filteredItems = itemsServer.map((item, idx) => ({ item, idx })).filter(({ item }) => {
    if (!filtroTurno) return true;
    const cerrado = esItemCerrado(item);
    const turno = cerrado ? null : item.negociacion?.turno;
    const res = item.negociacion?.resultado;
    if (filtroTurno === 'compras') return turno === 'compras';
    if (filtroTurno === 'vendedor') return turno === 'vendedor';
    if (filtroTurno === 'cerrados') return cerrado || res != null;
    return true;
  });

  const mostrarColumnaAcciones = filteredItems.some(({ item, idx }) => {
    const negociacion = item.negociacion || {};
    const cerrado = esItemCerrado(item);
    const ventaPerdidaPendiente = Boolean(ventasPerdidasPendientes[idx]);
    const borrador = borradores[idx];

    return ventaPerdidaPendiente
      || (negociacion.turno === 'vendedor' && puedeResponder && !cerrado && !ventaPerdidaPendiente)
      || (negociacion.sinNotificar && negociacion.ultimoCambio?.rol === currentUser.rol && !borrador)
      || (puedeRegistrarVentaPerdida && !cerrado && !ventaPerdidaPendiente);
  });

  const allClosed = itemsServer.length > 0 && itemsServer.every(p => esItemCerrado(p) && !p.negociacion?.sinNotificar);

  const toggleSeleccionItem = (idx) => {
    const item = itemsServer[idx];
    if (esItemCerrado(item)) return;
    const quedaraSeleccionado = !itemsSeleccionados[idx];
    console.info('[SeguimientoPedidoManual] cambio de selección de ítem', {
      solicitudId: id,
      indice: idx,
      seleccionado: quedaraSeleccionado,
      elegibleRevision: resumenSeguimientoCliente.indicesRevisionDisponible.includes(idx),
      elegibleProrroga: resumenSeguimientoCliente.indicesProrrogaDisponible.includes(idx)
    });
    setItemsSeleccionados(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const totalItemsSeleccionados = indicesSeleccionados.length;

  const itemsPendientes = itemsServer
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !esItemCerrado(p));

  const tieneItemsSeleccionadosValidos = indicesSeleccionados.some(idx => {
    const item = itemsServer[idx];
    return item && !esItemCerrado(item);
  });

  const hayItemsPendientes = itemsPendientes.length > 0;

  const debeMostrarBotonVentaPerdida = puedeRegistrarVentaPerdida && (
    (totalItemsSeleccionados > 0 && tieneItemsSeleccionadosValidos) ||
    (totalItemsSeleccionados === 0 && hayItemsPendientes)
  );

  const handleAbrirVentaPerdida = (indices = null) => {
    if (!puedeRegistrarVentaPerdida) return;
    if (Array.isArray(indices) && indices.length > 0) {
      setItemsVentaPerdidaSeleccionados(indices);
      setModalVentaPerdidaOpen(true);
      return;
    }

    if (totalItemsSeleccionados > 0) {
      setItemsVentaPerdidaSeleccionados(indicesSeleccionados);
      setModalVentaPerdidaOpen(true);
      return;
    }

    if (itemsPendientes.length > 0) {
      const indicesPendientes = itemsPendientes.map(({ idx }) => idx);
      setItemsVentaPerdidaSeleccionados(indicesPendientes);
      setModalVentaPerdidaOpen(true);
      return;
    }

    alert('Selecciona con la casilla los ítems específicos para registrar venta perdida.');
  };

  const handleConfirmarVentaPerdidaStaged = ({ motivo, comentario, itemsSeleccionados: itemsParam }) => {
    if (!puedeRegistrarVentaPerdida) return;
    let indices = itemsParam;
    if (!Array.isArray(indices) || indices.length === 0) {
      indices = itemsPendientes
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

    setItemsSeleccionados(prev => {
      const next = { ...prev };
      indices.forEach(idx => {
        delete next[idx];
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

  const totalVentasPerdidasPendientes = Object.keys(ventasPerdidasPendientes).length;
  const totalPendientesNotificar = unnotifiedCount + totalVentasPerdidasPendientes;

  const handleNotificarComprasCompleto = async () => {
    if (!puedeResponder) return;
    if (Object.keys(ventasPerdidasPendientes).length > 0 && !puedeRegistrarVentaPerdida) return;
    setNotificandoTodo(true);
    try {
      await actions.notificar({
        ventasPerdidasPendientes
      });
      setVentasPerdidasPendientes({});
    } catch (err) {
      console.error('Error al notificar compras o ventas perdidas:', err);
    } finally {
      setNotificandoTodo(false);
    }
  };

  const abrirConsultaVentaPerdida = (p = null, idx = null) => {
    const staged = idx !== null ? ventasPerdidasPendientes[idx] : null;
    setConsultaVentaPerdidaData(prepararDatosConsultaVentaPerdida({
      solicitud: solicitudBase,
      item: p,
      staged,
      items: itemsServer,
      currentUserEmail: auth.currentUser?.email || currentUser.nombre
    }));
  };

  const handleAbrirConsultaItem = (p, idx = 0) => {
    const staged = idx !== null ? ventasPerdidasPendientes[idx] : null;
    if (staged || p?.estadoItem === 'Venta Perdida') {
      abrirConsultaVentaPerdida(p, idx);
    } else if (esDecisionItem(p)) {
      setConsultaDecisionData(prepararDatosDecisionItem({
        solicitud: { ...solicitudBase, id: solicitudBase?.id || id },
        item: { ...p, idx, solicitudId: id },
        fallbackIndex: idx
      }));
    }
  };

  return (
    <div className="@container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Encabezado Superior */}
      <div className="pedido-detail-header flex flex-wrap items-start justify-between gap-3 mb-4 md:mb-8">
        <div className="pedido-detail-heading flex min-w-0 flex-[1_1_24rem] items-center gap-2 md:gap-4">
          <button onClick={() => navigate(-1)} className="p-1.5 md:p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 shrink-0">
            <ChevronLeft size={24} className="hidden md:block" />
            <ChevronLeft size={20} className="md:hidden" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-black text-slate-800 italic uppercase tracking-tighter leading-none md:leading-normal">
              <span className="hidden md:inline">Detalle de Pedido</span>
              <span className="md:hidden">Pedido Manual</span>
            </h1>
            <p className="pedido-detail-reference text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest hidden md:block">
              Ref: {solicitudBase.correlativo} — Cliente: {solicitudBase.cliente}
            </p>
          </div>
        </div>
        <div className="pedido-detail-actions flex flex-wrap items-center gap-2">
          {hayDecisionesEnParcial && (
            <button
              type="button"
              onClick={() => setConsultaDecisionData(prepararDatosDecisionSolicitud({ ...solicitudBase, id: solicitudBase?.id || id }))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Consultar motivos de los ítems afectados"
            >
              <MessageCircleQuestion size={13} /> <span className="hidden md:inline">Consultar motivo</span><span className="md:hidden">Consulta</span>
            </button>
          )}
          {hayVentaPerdidaEnParcial && (
            <button type="button" onClick={() => abrirConsultaVentaPerdida()} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-50 cursor-pointer" title="Consultar motivos de ventas perdidas">
              <MessageCircleQuestion size={13} /> <span className="hidden md:inline">Consultar VP</span><span className="md:hidden">VP</span>
            </button>
          )}
          {debeMostrarBotonVentaPerdida && (
            <button
              onClick={() => handleAbrirVentaPerdida()}
              className="pedido-loss-button hidden md:flex bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-md text-[11px] font-semibold uppercase items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <TrendingDown size={13} className="text-slate-500" />
              <span>
                {totalItemsSeleccionados > 0
                  ? `Registrar Venta Perdida (${totalItemsSeleccionados} sel.)`
                  : 'Registrar Venta Perdida'}
              </span>
            </button>
          )}
          {allClosed && (
            <div className="bg-slate-800 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="hidden md:inline">Pedido Finalizado</span>
              <span className="md:hidden">Finalizado</span>
            </div>
          )}
        </div>
      </div>

      <SeguimientoClienteBanner
        resumen={resumenSeguimientoCliente}
        solicitud={{ ...solicitudBase, id: solicitudBase?.id || id }}
        role={role}
        puedeMarcarRevision={accionSeguimiento.disponible}
        onMarcarRevision={handleAbrirSeguimientoCliente}
        etiquetaAccion={accionSeguimiento.etiqueta}
        cantidadItemsAccion={accionSeguimiento.cantidad}
        prorrogaPendiente={resumenSeguimientoCliente.prorrogaPendiente}
      />

      {/* Resumen Móvil (< md): Correlativo, estado e info del cliente */}
      {debeMostrarBotonVentaPerdida && totalItemsSeleccionados > 1 && (
        <div
          className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:hidden"
        >
          <button
            type="button"
            onClick={() => handleAbrirVentaPerdida()}
            aria-label={`Registrar ventas perdidas (${totalItemsSeleccionados})`}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-600 px-4 text-xs font-black uppercase tracking-wide text-white shadow-xl shadow-rose-900/20 transition-transform active:scale-[0.98]"
          >
            <TrendingDown size={16} aria-hidden="true" />
            <span>VP ({totalItemsSeleccionados})</span>
          </button>
        </div>
      )}

      <div className="md:hidden bg-white rounded-lg p-3.5 border border-slate-200 shadow-2xs mb-4 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-bold text-base text-slate-900 tracking-tight">
            {solicitudBase.correlativo || '---'}
          </span>
          <Etiqueta tono="neutral">
            {cerrados} de {itemsServer.length} cerrados
          </Etiqueta>
        </div>
        <p className={`text-xs font-semibold uppercase leading-snug line-clamp-2 wrap-break-word ${colors.text}`}>
          {solicitudBase.cliente || 'Sin cliente'}
        </p>
      </div>

      {/* Banner anulación */}
      {esAnulado && (
        <div className="mb-5 border border-slate-300 border-l-4 border-l-slate-800 rounded-r-lg px-5 py-3.5 bg-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Pedido anulado · solo lectura</p>
          {motivoAnulacion ? (
            <p className="text-sm font-semibold text-slate-800 leading-snug">{motivoAnulacion}</p>
          ) : (
            <p className="text-xs text-slate-400 italic">Sin motivo registrado.</p>
          )}
        </div>
      )}

      {/* Banner Venta Perdida */}
      {solicitudBase?.estado === 'Venta Perdida' && (
        <div className="mb-5 border border-slate-300 border-l-4 border-l-slate-700 rounded-r-lg px-5 py-3.5 bg-slate-50/70 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              Pedido cerrado como venta perdida
            </p>
            <p className="text-xs font-semibold text-slate-700">
              {(solicitudBase?.productos || []).filter(p => p.estadoItem === 'Venta Perdida').length > 0
                ? `${(solicitudBase?.productos || []).filter(p => p.estadoItem === 'Venta Perdida').length} ítems registrados como venta perdida`
                : 'Todos los ítems cerrados como venta perdida'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => abrirConsultaVentaPerdida()}
            className="inline-flex min-h-7 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-xs cursor-pointer shrink-0"
          >
            <MessageCircleQuestion size={13} /> Consulta
          </button>
        </div>
      )}

      {/* Banner solo lectura — solo si no es dueño y no está anulado */}
      {!puedeResponder && !esAnulado && !esDuenio && (
        <div className="mb-4 md:mb-6 bg-blue-50/80 border border-blue-200/80 text-blue-900 rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-500 shrink-0" />
            <span className="hidden md:inline">
              <strong>Modo de solo lectura:</strong> Este pedido pertenece a <u>{solicitudBase.vendedorNombre || solicitudBase.vendedorEmail || 'otro vendedor'}</u>. Puedes revisarlo, pero solo su creador puede interactuar.
            </span>
            <span className="md:hidden font-bold uppercase tracking-tight">
              Modo Solo Lectura
            </span>
          </div>
          <Etiqueta tono="azul" mono className="md:text-[10px] shrink-0">
            Auditando
          </Etiqueta>
        </div>
      )}

      <div className="mb-6 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
        <button 
          type="button" 
          onClick={() => setDocumentacionOpen(!documentacionOpen)}
          className="w-full p-4 sm:p-6 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left focus:outline-none"
        >
          <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
            <LinkIcon size={18} className="text-emerald-500" /> Documentación Extra
          </h2>
          <div className={`transform transition-transform duration-300 text-slate-400 ${documentacionOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={20} />
          </div>
        </button>
        
        <div className={`grid transition-all duration-300 ease-in-out ${documentacionOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="p-4 sm:p-6 pt-0 border-t border-slate-100 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Enlace a Orden de Compra</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-slate-700 disabled:opacity-60"
                    placeholder="https://..."
                    value={linkOC}
                    onChange={(e) => setLinkOC(e.target.value)}
                    disabled={!puedeResponder}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block italic">Notas para Compras</label>
                  </div>
                  <textarea
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-slate-700 min-h-20 disabled:opacity-60"
                    placeholder="Comentarios sobre el pedido..."
                    value={comentariosVendedor}
                    onChange={(e) => setComentariosVendedor(e.target.value)}
                    disabled={!puedeResponder}
                  />
                </div>
              </div>
              {puedeResponder && (
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={handleGuardarDocumentacion}
                    disabled={editandoDocs}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-[10px] uppercase transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Save size={14} /> Guardar Documentación
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ResumenTurnos 
        turnoCompras={turnoCompras}
        turnoVendedor={turnoVendedor}
        cerrados={cerrados}
        filtroActual={filtroTurno}
        onFiltrar={setFiltroTurno}
      />

      <div className="@container/pedido pedido-items-container w-full min-w-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 bg-slate-900 flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Listado de Ítems</span>
        </div>

        {/* La presentación cambia según los 55rem útiles del contenedor, no el ancho de ventana. */}
        <div className="pedido-items-mobile">
          {filteredItems.map(({ item, idx }) => (
            <DetallePedidoMobileCard
              key={idx}
              idx={idx}
              solicitudId={id}
              itemServer={item}
              borrador={borradores[idx]}
              updateBorrador={updateBorrador}
              clearBorrador={clearBorrador}
              actions={actions}
              conteos={conteos}
              noLeidos={noLeidos}
              hiloAbierto={hiloAbierto}
              setHiloAbierto={setHiloAbierto}
              puedeResponder={puedeResponder}
              puedeRegistrarVentaPerdida={puedeRegistrarVentaPerdida}
              esEstancado={esItemEstancado(item, solicitudBase)}
              estaSeleccionado={Boolean(itemsSeleccionados[idx])}
              stagedVP={Boolean(ventasPerdidasPendientes[idx])}
              onToggleSeleccion={() => toggleSeleccionItem(idx)}
              onVentaPerdida={() => handleAbrirVentaPerdida([idx])}
              onConsultaVentaPerdida={() => handleAbrirConsultaItem(item, idx)}
              onDeshacerVentaPerdida={() => handleCancelarVentaPerdidaPendiente(idx)}
              onRechazar={(index, vEsperada) => handleAbrirModalRechazar(index, vEsperada)}
              seguimiento={obtenerPropsSeguimientoItem(item, idx)}
            />
          ))}
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm font-medium">No hay ítems en esta vista.</div>
          )}
        </div>

        {/* Mínimos de columnas principales: Sel. 3rem + Producto 18rem + Mensajes 7rem + Estado 10rem + Acciones 18rem = 56rem. */}
        <div className="pedido-items-desktop">
          <div className="pedido-items-table-scroll">
          <table className="pedido-items-table w-full text-left">
            <colgroup>
              <col className="w-12" />
              <col className="w-72" />
              <col className="w-28" />
              <col className="w-40" />
              {mostrarColumnaAcciones && <col className="w-72" />}
            </colgroup>
            <thead className="text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
              <tr>
                <th className="p-4 text-center">Sel. ítem</th>
                <th className="p-4">Producto</th>
                <th className="p-4 text-center">Mensajes</th>
                <th className="p-4 text-center">Estado</th>
                {mostrarColumnaAcciones && <th className="p-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={mostrarColumnaAcciones ? 5 : 4} className="p-8 text-center text-slate-500 text-sm font-medium">No hay ítems en esta vista.</td>
                </tr>
              )}
              {filteredItems.map(({ item: p, idx }) => {
                const neg = p.negociacion || {};
                const tiempoEntrega = neg.ofertaVigente?.tiempoEntrega || p.tiempoEntrega || p.diasPrometidos || '';
                const versionEsperada = neg.version || 0;
                const esCerrado = esItemCerrado(p);
                const stagedVP = Boolean(ventasPerdidasPendientes[idx]);
                const isMyTurn = neg.turno === 'vendedor' && !esCerrado && !stagedVP;
                const currentFob = neg.ofertaVigente?.precio || p.fob || 0;
                
                const draft = borradores[idx];
                const msgCount = conteos[idx] || 0;
                const unreadCount = noLeidos[idx] || 0;

                const isUnchanged = draft && 
                  Number(draft.precio) === Number(neg.ofertaVigente?.precio || p.fob) &&
                  String(draft.tiempoEntrega) === String(tiempoEntrega) &&
                  String(draft.modalidad) === String(neg.ofertaVigente?.modalidad || p.modalidad || 'Aéreo');

                const puedeSeleccionar = !esCerrado && puedeResponder && !stagedVP;

                return (
                  <React.Fragment key={idx}>
                    <tr className={`pedido-item-main transition-colors ${esCerrado ? 'opacity-60 bg-slate-50/50' : isMyTurn ? 'bg-amber-50/20' : stagedVP ? 'bg-rose-50/20' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 text-center align-top">
                        {stagedVP ? (
                          <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto shadow-xs" title="Venta Perdida por enviar">
                            <TrendingDown size={14} />
                          </div>
                        ) : puedeSeleccionar ? (
                          <button
                            type="button"
                            onClick={() => toggleSeleccionItem(idx)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center mx-auto transition-all cursor-pointer ${
                              itemsSeleccionados[idx]
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                : 'border-slate-300 text-transparent hover:border-slate-400 bg-white'
                            }`}
                            aria-label={itemsSeleccionados[idx] ? "Deseleccionar ítem" : "Seleccionar ítem para seguimiento o venta perdida"}
                            title={itemsSeleccionados[idx] ? "Deseleccionar ítem" : "Seleccionar ítem para seguimiento o venta perdida"}
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                        ) : (
                          <div className="w-6 h-6 mx-auto" />
                        )}
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-bold text-sm uppercase text-slate-700 leading-tight pr-4">{p.descripcion}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Marca: {p.marca}</div>
                      </td>
                      
                      <td className="p-4 text-center align-top">
                        <button 
                          onClick={() => setHiloAbierto(hiloAbierto === idx ? null : idx)} 
                          className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] uppercase transition-colors mt-2 ${hiloAbierto === idx ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} 
                        >
                          <MessageSquare size={14} className={msgCount === 0 ? 'opacity-50' : ''} />
                          <span className={msgCount === 0 ? 'opacity-50' : ''}>Msgs</span>
                          {msgCount > 0 && <span className="ml-0.5 opacity-70">({msgCount})</span>}
                          {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{unreadCount}</span>}
                        </button>
                      </td>

                      {/* Columna dedicada: Estado */}
                      <td className="p-4 align-top text-center">
                        <div className="flex flex-col items-center gap-1.5 mt-1">
                          {stagedVP ? (
                            <>
                              <Etiqueta tono="peligro">
                                <TrendingDown size={11} />
                                <span>Por enviar</span>
                              </Etiqueta>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => abrirConsultaVentaPerdida(p, idx)}
                                  className="inline-flex min-h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[9px] cursor-pointer"
                                  title="Consultar motivo de venta perdida"
                                >
                                  <MessageCircleQuestion size={11} /> Consulta
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelarVentaPerdidaPendiente(idx)}
                                  className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer"
                                >
                                  Deshacer
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <EstadoItemChip estado={p.estadoItem} pendingRole={p.estadoItem === 'Anulado' ? null : neg.turno} stacked />
                              {p.estadoItem === 'Anulado' && p.motivoAnulacion && (
                                <span className="text-[9px] text-slate-400 italic text-center max-w-[130px] leading-tight mt-0.5" title={p.motivoAnulacion}>
                                  {p.motivoAnulacion.length > 40 ? p.motivoAnulacion.slice(0, 40) + '…' : p.motivoAnulacion}
                                </span>
                              )}
                              {tieneMotivoConsultaItem(p) && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirConsultaItem(p, idx)}
                                  className="inline-flex min-h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[9px] cursor-pointer mt-0.5"
                                  title="Consultar motivo de la decisión"
                                >
                                  <MessageCircleQuestion size={11} /> Consulta
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      
                      {/* Columna dedicada: Acciones */}
                      {mostrarColumnaAcciones && <td className="p-4 align-top">
                        {(stagedVP
                          || (isMyTurn && puedeResponder && !esCerrado && !stagedVP)
                          || (neg.sinNotificar && neg.ultimoCambio?.rol === currentUser.rol && !draft)
                        || (puedeRegistrarVentaPerdida && !esCerrado && !stagedVP)) && <AccionesItemInteractiva className="justify-center">
                          {stagedVP ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-rose-600 uppercase">Venta Perdida pendiente</span>
                              <AccionItemButton id="cancelar-vp" label="Deshacer venta perdida pendiente" text="Deshacer VP" icon={<Undo2 size={14} />} className="border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-rose-700" onConfirm={() => handleCancelarVentaPerdidaPendiente(idx)} />
                            </div>
                          ) : (
                            <>
                              {/* Bloque de Negociación */}
                              {isMyTurn && puedeResponder && !esCerrado && !stagedVP ? (
                                <div className="flex min-w-0 flex-row items-center gap-1.5">
                                  {!draft ? (
                                    <>
                                      {/* Acciones Principales: Aceptar y Contraofertar */}
                                      <div className="pedido-item-action-buttons">
                                        <AccionItemButton id="aceptar" label={`Aceptar oferta vigente de $${Number(currentFob).toFixed(2)}`} text="Aceptar" icon={<Check size={14} />} className="border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700" onConfirm={() => actions.aceptar(idx, versionEsperada)} />
                                        <AccionItemButton id="contraofertar" label="Contraofertar" text="Contraofertar" icon={<ArrowLeftRight size={14} />} className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200" onConfirm={() => updateBorrador(idx, { precio: currentFob, tiempoEntrega, modalidad: neg.ofertaVigente?.modalidad || p.modalidad || 'Aéreo' })} />
                                      </div>

                                      {/* Rechazar oferta de Compras (negociación interna) */}
                                      <div className="flex justify-center pt-0.5">
                                        <AccionItemButton id="rechazar" label="Rechazar oferta de Compras" text="Rechazar" icon={<X size={13} />} className="border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200" onConfirm={() => handleAbrirModalRechazar(idx, versionEsperada)} />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="pedido-item-action-buttons">
                                      <AccionItemButton id="enviar-contraoferta" label="Enviar contraoferta" text="Enviar" icon={<Check size={13} />} className="border-amber-600 bg-amber-500 text-white hover:bg-amber-600" disabled={!draft.precio || isUnchanged} onConfirm={() => { actions.contraofertar(idx, versionEsperada, draft); clearBorrador(idx); }} />
                                      <AccionItemButton id="cancelar-borrador" label="Cancelar borrador de contraoferta" text="Cancelar" icon={<RotateCcw size={13} />} className="border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200" onConfirm={() => clearBorrador(idx)} />
                                    </div>
                                  )}
                                </div>
                              ) : neg.sinNotificar && neg.ultimoCambio?.rol === currentUser.rol && !draft ? (
                                <div className="flex justify-center">
                                  <AccionItemButton id="deshacer" label="Deshacer cambios" text="Deshacer" icon={<Undo2 size={14} />} className="border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200" onConfirm={() => actions.deshacer(idx, versionEsperada)} />
                                </div>
                              ) : null}

                              {/* Acción Comercial: Venta Perdida */}
                              {puedeRegistrarVentaPerdida && !esCerrado && !stagedVP && (
                                <AccionItemButton id="venta-perdida" label={esItemEstancado(p, solicitudBase) ? 'Registrar Venta Perdida comercial (>5 días hábiles sin cierre)' : 'Registrar Venta Perdida de este ítem'} text="Venta perdida" icon={<TrendingDown size={12} />} className="border-rose-700 bg-rose-600 text-white hover:border-rose-800 hover:bg-rose-700" onConfirm={() => handleAbrirVentaPerdida([idx])} />
                              )}
                            </>
                          )}
                        </AccionesItemInteractiva>}
                      </td>}
                    </tr>

                    <tr className="pedido-item-conditions-row bg-slate-50/40">
                      <td colSpan={mostrarColumnaAcciones ? 5 : 4} className="px-4 pb-3 pt-0">
                        <section className="pedido-item-conditions bg-slate-50 border border-slate-200/80 p-3 rounded-lg" aria-label={`Condiciones de ${p.descripcion || `ítem ${idx + 1}`}`}>
                          <h3 className="pedido-item-conditions__heading">Condiciones</h3>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Cant.</span>
                            <span className="pedido-condition-value font-black text-slate-800 text-sm">{p.cant}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Oferta vigente</span>
                            {draft && isMyTurn ? (
                              <input type="number" min="0.01" step="0.01" value={draft.precio !== undefined ? draft.precio : ''} onChange={(event) => updateBorrador(idx, { ...draft, precio: event.target.value })} className="w-full min-w-0 max-w-40 rounded-md border border-slate-200 bg-white p-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500" aria-label="Precio de contraoferta" />
                            ) : (
                              <>
                                <span className="pedido-condition-value font-bold text-slate-700 text-sm">${Number(currentFob).toFixed(2)}</span>
                                {Number(p.fob || 0) !== Number(currentFob) && <span className="mt-0.5 block text-[9px] font-medium text-slate-500">Precio base OC: ${Number(p.fob || 0).toFixed(2)}</span>}
                              </>
                            )}
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Entrega</span>
                            {draft && isMyTurn ? (
                              <input type="text" value={draft.tiempoEntrega || ''} onChange={(event) => updateBorrador(idx, { ...draft, tiempoEntrega: event.target.value })} placeholder="Ej: 5 días" className="w-full min-w-0 max-w-40 rounded-md border border-slate-200 bg-white p-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500" aria-label="Tiempo de entrega de contraoferta" />
                            ) : <span className="pedido-condition-value font-bold text-slate-700 text-sm">{tiempoEntrega || 'No definido'}</span>}
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Modalidad</span>
                            {draft && isMyTurn ? (
                              <select value={draft.modalidad || 'Aéreo'} onChange={(event) => updateBorrador(idx, { ...draft, modalidad: event.target.value })} className="w-full min-w-0 max-w-40 rounded-md border border-slate-200 bg-white p-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500">
                                <option value="Aéreo">Aéreo</option><option value="Marítimo">Marítimo</option>
                              </select>
                            ) : <span className="pedido-condition-value font-bold text-slate-700 text-sm">{p.modalidad || 'Aéreo'}</span>}
                          </div>
                          <SeguimientoItemCondicion {...obtenerPropsSeguimientoItem(p, idx)} />
                        </section>
                      </td>
                    </tr>

                    {(neg.ofertaVigente && neg.ofertaAnterior) && (
                      <tr className={p.estadoItem === 'Anulado' ? 'opacity-50 bg-slate-50/40' : 'bg-slate-50/40'}>
                        <td colSpan={mostrarColumnaAcciones ? 5 : 4} className="px-5 pt-3 pb-5">
                          <OfertaDiff actual={neg.ofertaVigente} anterior={neg.ofertaAnterior} label="Ajuste de Compras" />
                        </td>
                      </tr>
                    )}

                    {hiloAbierto === idx && (
                      <tr className="bg-slate-50">
                        <td colSpan={mostrarColumnaAcciones ? 5 : 4} className="p-0 border-t border-slate-100">
                          <HiloComentariosItem
                            solicitudId={id}
                            itemId={idx}
                            productoActual={p}
                            currentUser={currentUser}
                            todosLosProductos={[]}
                            onClose={() => setHiloAbierto(null)}
                            accionesHabilitadas={false}
                            soloLectura={!puedeResponder || esCerrado}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {puedeResponder && (
        <BarraNotificar 
          unnotifiedCount={totalPendientesNotificar}
          notificacionPendienteEmail={notificacionPendienteEmail}
          onNotificar={handleNotificarComprasCompleto}
          onReintentar={() => actions.reintentarCorreo()}
          isLoading={notificandoTodo}
          isVendedor={true}
          resumenAcciones={{ ...resumenAcciones, ventasPerdidas: totalVentasPerdidasPendientes }}
        />
      )}

      <DetallePedidoManualModales
        id={id}
        navigate={navigate}
        modalVentaPerdidaOpen={modalVentaPerdidaOpen}
        setModalVentaPerdidaOpen={setModalVentaPerdidaOpen}
        itemsVentaPerdidaSeleccionados={itemsVentaPerdidaSeleccionados}
        setItemsVentaPerdidaSeleccionados={setItemsVentaPerdidaSeleccionados}
        setItemsSeleccionados={setItemsSeleccionados}
        consultaVentaPerdidaData={consultaVentaPerdidaData}
        setConsultaVentaPerdidaData={setConsultaVentaPerdidaData}
        consultaDecisionData={consultaDecisionData}
        setConsultaDecisionData={setConsultaDecisionData}
        modalSeguimientoClienteOpen={modalSeguimientoClienteOpen}
        setModalSeguimientoClienteOpen={setModalSeguimientoClienteOpen}
        planSeguimientoCliente={planSeguimientoCliente}
        guardandoSeguimientoCliente={guardandoSeguimientoCliente}
        modalRechazar={modalRechazar}
        setModalRechazar={setModalRechazar}
        handleConfirmarRechazo={handleConfirmarRechazo}
        solicitudBase={solicitudBase}
        handleConfirmarPlanSeguimiento={handleConfirmarPlanSeguimiento}
        handleConfirmarVentaPerdidaStaged={handleConfirmarVentaPerdidaStaged}
      />
    </div>
  );
};
