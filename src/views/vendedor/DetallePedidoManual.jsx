import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { 
  ChevronLeft, CheckCircle2, MessageSquare, ArrowLeftRight, Check, X,
  ChevronDown, Link as LinkIcon, Save, AlertCircle, TrendingDown, MessageCircleQuestion
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
import { ResumenTurnos } from '../../components/pedidos/negociacion/ResumenTurnos';
import { BarraNotificar } from '../../components/pedidos/negociacion/BarraNotificar';
import { getRoleColors } from '../../utils/roleColors';
import { ModalVentaPerdida } from '../../components/vendedor/ModalVentaPerdida';
import { ModalConsultaVentaPerdida } from '../../components/vendedor/ModalConsultaVentaPerdida';
import { ModalConsultaDecisionItem } from '../../components/pedidos/negociacion/ModalConsultaDecisionItem';
import { esItemEstancado } from '../../utils/cotizacionesEstancadasHelpers';
import { prepararDatosConsultaVentaPerdida, tieneMotivoConsultaItem } from '../../utils/ventasPerdidasHelpers';
import { esDecisionItem, prepararDatosDecisionItem, prepararDatosDecisionSolicitud, esItemCerrado } from '../../utils/decisionItemHelpers';

export const DetallePedidoManual = ({ role = 'vendedor' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hiloAbierto, setHiloAbierto] = useState(null);
  const [modalVentaPerdidaOpen, setModalVentaPerdidaOpen] = useState(false);
  const [itemsVentaPerdidaSeleccionados, setItemsVentaPerdidaSeleccionados] = useState(null);
  const [itemsSeleccionados, setItemsSeleccionados] = useState({});
  const [ventasPerdidasPendientes, setVentasPerdidasPendientes] = useState({});
  const [notificandoTodo, setNotificandoTodo] = useState(false);
  const [consultaVentaPerdidaData, setConsultaVentaPerdidaData] = useState(null);
  const [consultaDecisionData, setConsultaDecisionData] = useState(null);
  const [modalRechazar, setModalRechazar] = useState({ open: false, index: null, versionEsperada: null, motivo: '' });

  const handleAbrirModalRechazar = (index, versionEsperada) => {
    setModalRechazar({ open: true, index, versionEsperada, motivo: '' });
  };

  const handleConfirmarRechazo = () => {
    if (!modalRechazar.motivo.trim()) return;
    const { index, versionEsperada, motivo } = modalRechazar;
    actions.rechazar(index, versionEsperada, motivo.trim());
    if (index !== null) {
      setItemsSeleccionados(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
    setModalRechazar({ open: false, index: null, versionEsperada: null, motivo: '' });
  };
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
  const puedeResponder = (Boolean(esDuenio) || role === 'gerente' || role === 'administrador') && !esAnulado && !esVentaPerdida;
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

  const allClosed = itemsServer.length > 0 && itemsServer.every(p => esItemCerrado(p) && !p.negociacion?.sinNotificar);

  const toggleSeleccionItem = (idx) => {
    const item = itemsServer[idx];
    if (esItemCerrado(item)) return;
    setItemsSeleccionados(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const indicesSeleccionados = Object.keys(itemsSeleccionados)
    .filter(idx => itemsSeleccionados[idx])
    .map(Number);
  const totalItemsSeleccionados = indicesSeleccionados.length;

  const esVendedorOGerente = role === 'vendedor' || role === 'gerente';

  const itemsPendientes = itemsServer
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !esItemCerrado(p));

  const tieneItemsSeleccionadosValidos = indicesSeleccionados.some(idx => {
    const item = itemsServer[idx];
    return item && !esItemCerrado(item);
  });

  const hayItemsPendientes = itemsPendientes.length > 0;

  const debeMostrarBotonVentaPerdida = esVendedorOGerente && puedeResponder && !esAnulado && solicitudBase?.estado !== 'Venta Perdida' && (
    (totalItemsSeleccionados > 0 && tieneItemsSeleccionadosValidos) ||
    (totalItemsSeleccionados === 0 && hayItemsPendientes)
  );

  const handleAbrirVentaPerdida = (indices = null) => {
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
      <div className="flex flex-row items-center justify-between gap-4 mb-4 md:mb-8">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => navigate(-1)} className="p-1.5 md:p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 shrink-0">
            <ChevronLeft size={24} className="hidden md:block" />
            <ChevronLeft size={20} className="md:hidden" />
          </button>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-800 italic uppercase tracking-tighter leading-none md:leading-normal">
              <span className="hidden md:inline">Detalle de Pedido</span>
              <span className="md:hidden">Pedido Manual</span>
            </h1>
            <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest hidden md:block">
              Ref: {solicitudBase.correlativo} — Cliente: {solicitudBase.cliente}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              className="hidden md:flex bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-md text-[11px] font-semibold uppercase items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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
          <span className="text-[10px] font-semibold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200">
            {cerrados} de {itemsServer.length} cerrados
          </span>
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
          <span className="text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md bg-blue-100 text-blue-800 uppercase tracking-widest shrink-0 font-mono">
            Auditando
          </span>
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 bg-slate-900 flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Listado de Ítems</span>
        </div>

        {/* Vista móvil/tablet (lg: 1024px) */}
        <div className="lg:hidden divide-y divide-slate-100">
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
              esEstancado={esItemEstancado(item, solicitudBase)}
              estaSeleccionado={Boolean(itemsSeleccionados[idx])}
              stagedVP={Boolean(ventasPerdidasPendientes[idx])}
              onToggleSeleccion={() => toggleSeleccionItem(idx)}
              onVentaPerdida={() => handleAbrirVentaPerdida([idx])}
              onConsultaVentaPerdida={() => handleAbrirConsultaItem(item, idx)}
              onDeshacerVentaPerdida={() => handleCancelarVentaPerdidaPendiente(idx)}
              onRechazar={(index, vEsperada) => handleAbrirModalRechazar(index, vEsperada)}
            />
          ))}
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm font-medium">No hay ítems en esta vista.</div>
          )}
        </div>

        {/* Vista escritorio (>1024px) */}
        <div className="hidden lg:block">
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
              <tr>
                <th className="p-4 w-12 text-center">Sel.</th>
                <th className="p-4 w-[22%]">Producto</th>
                <th className="p-4 w-[28%]">Condiciones</th>
                <th className="p-4 w-24 text-center">Mensajes</th>
                <th className="p-4 w-36 text-center">Estado</th>
                <th className="p-4 w-[30%] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-sm font-medium">No hay ítems en esta vista.</td>
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
                    <tr className={`transition-colors ${esCerrado ? 'opacity-60 bg-slate-50/50' : isMyTurn ? 'bg-amber-50/20' : stagedVP ? 'bg-rose-50/20' : 'hover:bg-slate-50'}`}>
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
                            title={itemsSeleccionados[idx] ? "Deseleccionar ítem" : "Seleccionar ítem para venta perdida"}
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
                      
                      <td className="p-4 align-top">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-50 border border-slate-100 p-3 rounded-xl max-w-xl">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Cant</span>
                            <span className="font-black text-slate-800 text-sm">{p.cant}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Precio (OC)</span>
                            {draft && isMyTurn ? (
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">$</span>
                                <input 
                                  type="number" 
                                  min="0.01" step="0.01"
                                  value={draft.precio !== undefined ? draft.precio : ''} 
                                  onChange={(e) => updateBorrador(idx, { ...draft, precio: e.target.value })} 
                                  className="w-full pl-6 p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold text-slate-700 text-sm" 
                                />
                              </div>
                            ) : (
                              <span className="font-bold text-slate-700 text-sm">${Number(p.fob || 0).toFixed(2)}</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Días de entrega</span>
                            {draft && isMyTurn ? (
                              <input 
                                type="text" 
                                value={draft.tiempoEntrega || ''} 
                                onChange={(e) => updateBorrador(idx, { ...draft, tiempoEntrega: e.target.value })} 
                                placeholder="Ej: 5 días" 
                                className="w-full max-w-40 p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold text-slate-700 text-sm" 
                              />
                            ) : (
                              <span className="font-bold text-slate-700 text-sm">{tiempoEntrega || 'No definido'}</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Modalidad</span>
                            {draft && isMyTurn ? (
                              <select 
                                value={draft.modalidad || 'Aéreo'} 
                                onChange={(e) => updateBorrador(idx, { ...draft, modalidad: e.target.value })} 
                                className="w-full max-w-40 p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold text-slate-700 text-sm cursor-pointer"
                              >
                                <option value="Aéreo">Aéreo</option>
                                <option value="Marítimo">Marítimo</option>
                              </select>
                            ) : (
                              <span className="font-bold text-slate-700 text-sm">{p.modalidad || 'Aéreo'}</span>
                            )}
                          </div>
                        </div>
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
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-sm">
                                <TrendingDown size={11} />
                                <span>Por enviar</span>
                              </span>
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
                              <EstadoItemChip estado={p.estadoItem} pendingRole={p.estadoItem === 'Anulado' ? null : neg.turno} />
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
                      <td className="p-4 align-top">
                        <div className="flex flex-col items-end gap-2">
                          {stagedVP ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-bold text-rose-600 uppercase">Venta Perdida pendiente</span>
                              <button
                                type="button"
                                onClick={() => handleCancelarVentaPerdidaPendiente(idx)}
                                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer"
                              >
                                Deshacer
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* Bloque de Negociación */}
                              {isMyTurn && puedeResponder && !esCerrado && !stagedVP ? (
                                <div className="flex flex-col gap-2 w-full bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg shadow-2xs">
                                  {!draft ? (
                                    <>
                                      {/* Acciones Principales: Aceptar y Contraofertar */}
                                      <div className="grid grid-cols-2 gap-2">
                                        <button 
                                          type="button"
                                          onClick={() => actions.aceptar(idx, versionEsperada)} 
                                          className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                        >
                                          <Check size={14} /> Aceptar ${Number(currentFob).toFixed(2)}
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            updateBorrador(idx, {
                                              precio: currentFob,
                                              tiempoEntrega,
                                              modalidad: neg.ofertaVigente?.modalidad || p.modalidad || 'Aéreo'
                                            });
                                          }} 
                                          className="py-2.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-md font-bold text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                          <ArrowLeftRight size={14} /> Contraofertar
                                        </button>
                                      </div>

                                      {/* Rechazar oferta de Compras (negociación interna) */}
                                      <div className="flex justify-end pt-0.5">
                                        <button 
                                          type="button"
                                          onClick={() => handleAbrirModalRechazar(idx, versionEsperada)} 
                                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer"
                                          title="Rechazar la oferta interna enviada por Compras"
                                        >
                                          <X size={13} className="text-slate-400" />
                                          <span>Rechazar oferta de Compras</span>
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          actions.contraofertar(idx, versionEsperada, draft);
                                          clearBorrador(idx);
                                        }} 
                                        disabled={!draft.precio || isUnchanged}
                                        className="py-2 px-2 bg-amber-500 text-white hover:bg-amber-600 rounded-md font-bold text-[10px] uppercase tracking-wide transition-colors flex items-center justify-center gap-1 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        <Check size={13} /> Enviar
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => clearBorrador(idx)} 
                                        className="py-2 px-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-md font-bold text-[10px] uppercase tracking-wide transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <X size={13} /> Cancelar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : neg.sinNotificar && neg.ultimoCambio?.rol === currentUser.rol && !draft ? (
                                <div className="flex justify-end">
                                  <button 
                                    type="button"
                                    onClick={() => actions.deshacer(idx, versionEsperada)} 
                                    className="text-[10px] text-slate-400 hover:text-slate-700 underline font-bold px-1 py-1 cursor-pointer"
                                  >
                                    Deshacer cambios
                                  </button>
                                </div>
                              ) : null}

                              {/* Acción Comercial: Venta Perdida */}
                              {esVendedorOGerente && !esCerrado && puedeResponder && !stagedVP && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirVentaPerdida([idx])}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[9px] uppercase tracking-wide transition-colors cursor-pointer shadow-xs ${
                                    esItemEstancado(p, solicitudBase)
                                      ? 'border border-rose-300 bg-rose-100 hover:bg-rose-200 text-rose-800'
                                      : 'border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  }`}
                                  title={esItemEstancado(p, solicitudBase) ? "Registrar Venta Perdida comercial (>5 días hábiles sin cierre)" : "Registrar Venta Perdida de este ítem"}
                                >
                                  <TrendingDown size={12} />
                                  <span>VP</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {(neg.ofertaVigente && neg.ofertaAnterior) && (
                      <tr className={p.estadoItem === 'Anulado' ? 'opacity-50 bg-slate-50/40' : 'bg-slate-50/40'}>
                        <td colSpan={6} className="px-5 pt-3 pb-5">
                          <OfertaDiff actual={neg.ofertaVigente} anterior={neg.ofertaAnterior} label="Ajuste de Compras" />
                        </td>
                      </tr>
                    )}

                    {hiloAbierto === idx && (
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="p-0 border-t border-slate-100">
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

      {/* Modal de Registro de Venta Perdida */}
      <ModalVentaPerdida
        isOpen={modalVentaPerdidaOpen}
        onClose={() => {
          setModalVentaPerdidaOpen(false);
          setItemsVentaPerdidaSeleccionados(null);
          setItemsSeleccionados({});
        }}
        solicitud={{ id, ...solicitudBase }}
        itemsSeleccionados={itemsVentaPerdidaSeleccionados}
        onConfirmarStaged={handleConfirmarVentaPerdidaStaged}
        onExito={() => {
          setModalVentaPerdidaOpen(false);
          setItemsVentaPerdidaSeleccionados(null);
          setItemsSeleccionados({});
          navigate('/vendedor');
        }}
      />

      {/* Modal de Consulta de Motivo de Venta Perdida (Comercial) */}
      <ModalConsultaVentaPerdida
        isOpen={consultaVentaPerdidaData !== null}
        onClose={() => setConsultaVentaPerdidaData(null)}
        data={consultaVentaPerdidaData}
      />

      {/* Modal de Consulta de Decisión de Ítem (Rechazo, Denegación, Anulación) */}
      <ModalConsultaDecisionItem
        isOpen={consultaDecisionData !== null}
        onClose={() => setConsultaDecisionData(null)}
        data={consultaDecisionData}
      />

      {/* Modal Rechazar Oferta de Compras */}
      {modalRechazar.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-2">Rechazar Oferta de Compras</h3>
            <p className="text-sm text-slate-500 mb-4 leading-snug">
              Ingresa el motivo del rechazo de la oferta de Compras. Esta información quedará registrada en el historial de negociación.
            </p>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none text-sm font-medium h-24 mb-4 outline-none"
              placeholder="Motivo del rechazo (obligatorio)..."
              value={modalRechazar.motivo}
              onChange={e => setModalRechazar(prev => ({ ...prev, motivo: e.target.value }))}
              autoFocus
            />
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setModalRechazar({ open: false, index: null, versionEsperada: null, motivo: '' })}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmarRechazo}
                disabled={!modalRechazar.motivo.trim()}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm cursor-pointer shadow-sm"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
