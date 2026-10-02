import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Loader2, ArrowLeft, Check, X, ArrowLeftRight, MessageSquare, Save, Ban } from 'lucide-react';
import { HiloComentariosItem } from '../../components/hilos/HiloComentariosItem';
import { RevisionPedidoMobileCard } from '../../components/pedidos/RevisionPedidoMobileCard';
import { useMensajesResumen } from '../../hooks/useMensajesResumen';
import { useNegociacionItems } from '../../hooks/useNegociacionItems';
import { EstadoItemChip } from '../../components/pedidos/negociacion/EstadoItemChip';
import { OfertaDiff } from '../../components/pedidos/negociacion/OfertaDiff';
import { FormularioOferta } from '../../components/pedidos/negociacion/FormularioOferta';
import { ResumenTurnos } from '../../components/pedidos/negociacion/ResumenTurnos';
import { BarraNotificar } from '../../components/pedidos/negociacion/BarraNotificar';
import { getRoleColors } from '../../utils/roleColors';
import { generarPlantillaAnulacion } from '../../utils/emailTemplates';
import { pdf } from '@react-pdf/renderer';
import CotizacionPDF from '../../components/CotizacionPDF';

export const RevisionPedidoManual = ({ role = 'comprador' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comentariosComprador, setComentariosComprador] = useState('');
  const [hiloAbierto, setHiloAbierto] = useState(null);
  const colors = getRoleColors(role);
  const [editandoGeneral, setEditandoGeneral] = useState(false);
  const [filtroTurno, setFiltroTurno] = useState(null);
  const isFirstLoad = useRef(true);

  const currentUser = {
    uid: auth.currentUser?.uid,
    nombre: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Comprador',
    rol: 'comprador'
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

  const { conteos, noLeidos } = useMensajesResumen(id, itemsServer, currentUser?.rol);
  const [modalAnulacion, setModalAnulacion] = useState({ open: false, index: null, motivo: '', enviando: false });

  const handleAnularItem = async () => {
    if (!modalAnulacion.motivo.trim()) return alert("El motivo es obligatorio");
    setModalAnulacion(prev => ({ ...prev, enviando: true }));
    try {
      const docRef = doc(db, 'solicitudes', id);
      const updatedProductos = [...solicitudBase.productos];
      const idx = modalAnulacion.index;
      
      updatedProductos[idx] = {
        ...updatedProductos[idx],
        estadoItem: 'Anulado',
        motivoAnulacion: modalAnulacion.motivo.trim(),
        fechaAnulacion: new Date(),
        anuladoPor: auth.currentUser.email || 'comprador'
      };

      const activos = updatedProductos.filter(p => p.estadoItem !== 'Anulado');
      let nuevoEstado = solicitudBase.estado; 
      
      if (activos.length === 0) {
        nuevoEstado = 'Anulado';
      } else {
        const todosAprobados = activos.every(p => p.estadoItem === 'Pedido');
        const todosDenegados = activos.every(p => p.estadoItem === 'Denegado' || p.estadoItem === 'Rechazado' || p.estadoItem === 'Cancelado');
        const algunDevuelto = activos.some(p => p.estadoItem === 'Cotizado');
        const todosCotizados = activos.every(p => p.estadoItem === 'Cotizado');
        
        if (todosAprobados) nuevoEstado = 'Pedido';
        else if (todosDenegados) nuevoEstado = 'Denegado';
        else if (todosCotizados) nuevoEstado = 'Cotizado';
        else if (algunDevuelto) nuevoEstado = 'Cotizado Parcial';
      }

      await updateDoc(docRef, {
        productos: updatedProductos,
        estado: nuevoEstado
      });

      // --- Enviar correo de anulación al vendedor ---
      if (solicitudBase.vendedorEmail) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const destinatarioTo = isLocal ? ["rvides@hermaco.net"] : [solicitudBase.vendedorEmail];
        const ccEmails = isLocal 
          ? ["rvides@hermaco.net"] 
          : [auth.currentUser.email, "logisticahco@hermaco.net"].filter(e => e && !["oventura@hermaco.net", "dhernandez@hermaco.net"].includes(e.toLowerCase()));
        
        const senderFrom = isLocal ? 'rvides@hermaco.net <rvides@hermaco.net>' : `${auth.currentUser.displayName || auth.currentUser.email?.split('@')[0]} <${auth.currentUser.email}>`;
        
        const bodyHtml = generarPlantillaAnulacion(solicitudBase, modalAnulacion.motivo.trim(), auth.currentUser.email, activos.length > 0, updatedProductos[idx]);
        
        let pdfBase64 = null;
        try {
          const pdfDoc = <CotizacionPDF cotizacionData={{ ...solicitudBase, estado: nuevoEstado, productos: updatedProductos }} />;
          const asPdf = pdf();
          asPdf.updateContainer(pdfDoc);
          const blob = await asPdf.toBlob();
          const reader = new FileReader();
          pdfBase64 = await new Promise((resolve, reject) => {
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
          });
        } catch (err) {
          console.error("Error generando PDF para anulación:", err);
        }

        try {
          const payload = {
            from: senderFrom,
            replyTo: auth.currentUser.email,
            to: destinatarioTo,
            cc: ccEmails,
            subject: `${activos.length > 0 ? 'Anulación Parcial' : 'Anulación'}: ${solicitudBase.correlativo} - ${solicitudBase.cliente}`,
            bodyHtml
          };
          
          if (pdfBase64) {
            payload.attachments = [{ content: pdfBase64, nombre: `Anulacion_${solicitudBase.correlativo}.pdf` }];
          }

          await fetch('/.netlify/functions/send-email-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (e) {
          console.error("Error enviando correo de anulación:", e);
        }
      }

      alert('Ítem anulado correctamente');
      setModalAnulacion({ open: false, index: null, motivo: '', enviando: false });
    } catch (error) {
      console.error(error);
      alert('Error al anular ítem');
      setModalAnulacion(prev => ({ ...prev, enviando: false }));
    }
  };

  useEffect(() => {
    if (isFirstLoad.current && solicitudBase && !loading) {
      if (solicitudBase.comentariosComprador) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setComentariosComprador(solicitudBase.comentariosComprador);
      }
      isFirstLoad.current = false;
    }
  }, [solicitudBase, loading]);

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

  const handleGuardarComentarios = async () => {
    setEditandoGeneral(true);
    try {
      await updateDoc(doc(db, 'solicitudes', id), {
        comentariosComprador: comentariosComprador.trim()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setEditandoGeneral(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
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
    const turno = item.negociacion?.turno;
    const res = item.negociacion?.resultado;
    if (filtroTurno === 'compras') return turno === 'compras';
    if (filtroTurno === 'vendedor') return turno === 'vendedor';
    if (filtroTurno === 'cerrados') return res != null;
    return true;
  });

  const allClosed = itemsServer.length > 0 && itemsServer.every(p => (p.negociacion?.resultado && p.negociacion.resultado !== 'pendiente') && !p.negociacion?.sinNotificar);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-36 fade-in">
      {/* Modal Anulación */}
      {modalAnulacion.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-black text-slate-800 mb-2">Anular Ítem</h3>
            <p className="text-sm text-slate-500 mb-4">Ingresa el motivo de la anulación. Esta acción es irreversible.</p>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none text-sm font-medium h-24 mb-4"
              placeholder="Motivo (obligatorio)..."
              value={modalAnulacion.motivo}
              onChange={e => setModalAnulacion(prev => ({...prev, motivo: e.target.value}))}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setModalAnulacion({open: false, index: null, motivo: '', enviando: false})}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAnularItem}
                disabled={modalAnulacion.enviando || !modalAnulacion.motivo.trim()}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {modalAnulacion.enviando ? 'Anulando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Encabezado Superior */}
      <div className="flex flex-row items-center justify-between gap-4 mb-4 md:mb-8">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => navigate('/compras')} className="p-1.5 md:p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 shrink-0">
            <ArrowLeft size={24} className="hidden md:block" />
            <ArrowLeft size={20} className="md:hidden" />
          </button>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-800 italic uppercase tracking-tighter leading-none md:leading-normal">
              <span className="hidden md:inline">Revisión de Pedido</span>
              <span className="md:hidden">Revisión Pedido</span>
            </h1>
            <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest hidden md:block">
              Ref: {solicitudBase.correlativo} — Cliente: {solicitudBase.cliente}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allClosed && (
            <div className="bg-slate-800 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md">
              <Check size={14} className="text-emerald-400" />
              <span className="hidden md:inline">Pedido Finalizado</span>
              <span className="md:hidden">Finalizado</span>
            </div>
          )}
        </div>
      </div>

      {/* Resumen Móvil (< md): Correlativo, estado e info del cliente */}
      <div className="md:hidden bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm mb-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-black text-base text-slate-900 tracking-tight">
            {solicitudBase.correlativo || '---'}
          </span>
          <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
            {cerrados.length} de {itemsServer.length} cerrados
          </span>
        </div>
        <p className={`text-xs font-bold uppercase leading-snug line-clamp-2 break-words ${colors.text}`}>
          {solicitudBase.cliente || 'Sin cliente'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detalles del Vendedor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vendedor asignado:</span>
                <p className="font-bold text-slate-700">{solicitudBase.vendedorNombre}</p>
              </div>
              {solicitudBase.linkOC && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Orden de Compra:</span>
                  <a href={solicitudBase.linkOC} target="_blank" rel="noreferrer" className={`text-sm font-bold hover:underline break-all ${colors.text} ${colors.hoverText}`}>
                    {solicitudBase.linkOC}
                  </a>
                </div>
              )}
            </div>
            {solicitudBase.comentariosVendedor && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Notas del vendedor:</span>
                <p className="text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-xl">{solicitudBase.comentariosVendedor}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tus Comentarios</h3>
            <button 
              onClick={handleGuardarComentarios}
              disabled={editandoGeneral || allClosed}
              className="text-purple-600 hover:text-purple-700 disabled:opacity-50 p-1 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
              title="Guardar comentario"
            >
              <Save size={16} />
            </button>
          </div>
          <textarea
            value={comentariosComprador}
            onChange={(e) => setComentariosComprador(e.target.value)}
            disabled={allClosed}
            placeholder="Observaciones (visibles en el correo al vendedor)..."
            className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-sm font-medium resize-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed min-h-20"
          />
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
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ítems del Pedido</span>
        </div>

        {/* Vista móvil/tablet (lg: 1024px) */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filteredItems.map(({ item, idx }) => (
            <RevisionPedidoMobileCard
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
              onAnular={() => setModalAnulacion({ open: true, index: idx, motivo: '', enviando: false })}
              estaAnulado={item.estadoItem === 'Anulado'}
              role={role}
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
                <th className="p-4 w-[25%]">Producto</th>
                <th className="p-4 w-[40%]">Condiciones</th>
                <th className="p-4 w-28 text-center">Mensajes</th>
                <th className="p-4 w-[20%] text-right">Estado y Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm font-medium">No hay ítems en esta vista.</td>
                </tr>
              )}
              {filteredItems.map(({ item: p, idx }) => {
                const neg = p.negociacion || {};
                const versionEsperada = neg.version || 0;
                const isPending = neg.turno === 'compras';
                const hasCounterOffer = neg.ofertaVigente && neg.ofertaAnterior && isPending;
                
                const draft = borradores[idx] || {
                  precio: p.fob || 0,
                  tiempoEntrega: p.fechaCompromiso || '',
                  modalidad: p.modalidad || 'Aéreo'
                };
                
                const isUnchanged = Number(draft.precio) === Number(p.fob || 0) &&
                                    String(draft.tiempoEntrega) === String(p.fechaCompromiso || '') &&
                                    draft.modalidad === (p.modalidad || 'Aéreo');

                const msgCount = conteos[idx] || 0;
                const unreadCount = noLeidos[idx] || 0;
                const estaAnulado = p.estadoItem === 'Anulado';

                return (
                  <React.Fragment key={idx}>
                    <tr className={`transition-colors ${isPending ? 'bg-white' : 'hover:bg-slate-50'} ${estaAnulado ? 'opacity-60 bg-slate-50/50' : ''}`}>
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
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Precio</span>
                            {isPending ? (
                              <div className="relative max-w-[120px]">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                <input 
                                  type="number" 
                                  min="0.01" step="0.01"
                                  value={draft.precio !== undefined ? draft.precio : ''} 
                                  onChange={(e) => updateBorrador(idx, { ...draft, precio: e.target.value })} 
                                  className="w-full pl-6 p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700 text-sm" 
                                />
                              </div>
                            ) : (
                              <span className="font-bold text-slate-700 text-sm">${Number(p.fob || 0).toFixed(2)}</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Entrega</span>
                            {isPending ? (
                              <input 
                                type="text" 
                                value={draft.tiempoEntrega || ''} 
                                onChange={(e) => updateBorrador(idx, { ...draft, tiempoEntrega: e.target.value })} 
                                placeholder="Ej: 5 días" 
                                className="w-full max-w-[160px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700 text-sm" 
                              />
                            ) : (
                              <span className="font-bold text-slate-700 text-sm">{p.fechaCompromiso || 'No definido'}</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Modalidad</span>
                            {isPending ? (
                              <select 
                                value={draft.modalidad || 'Aéreo'} 
                                onChange={(e) => updateBorrador(idx, { ...draft, modalidad: e.target.value })}  
                                className="w-full max-w-[160px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700 text-sm cursor-pointer"
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
                      
                      <td className="p-4 align-top">
                        <div className="flex flex-col items-end gap-3">
                          <div className="flex items-center gap-2">
                            <EstadoItemChip estado={p.estadoItem} pendingRole={neg.turno} />
                            {role === 'comprador' && ['Cotizado', 'Pedido'].includes(p.estadoItem) && !p.numOC && !estaAnulado && unnotifiedCount === 0 && (
                              <button
                                type="button"
                                title="Anular"
                                onClick={() => setModalAnulacion({ open: true, index: idx, motivo: '', enviando: false })}
                                className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-full transition-all"
                              >
                                <Ban size={16} />
                              </button>
                            )}
                            {estaAnulado && p.motivoAnulacion && (
                              <span className="text-[9px] text-slate-400 italic max-w-[120px] truncate" title={p.motivoAnulacion}>
                                {p.motivoAnulacion}
                              </span>
                            )}
                          </div>
                          
                          {isPending ? (
                            <div className="flex flex-wrap justify-end gap-1.5 w-full mt-2">
                              {!isUnchanged ? (
                                <>
                                  <button 
                                    onClick={() => actions.ajustar(idx, versionEsperada, draft)} 
                                    disabled={!draft.precio} 
                                    className="px-3 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-lg font-black text-[10px] uppercase transition-colors shadow-sm disabled:opacity-50"
                                  >
                                    Enviar Ajuste
                                  </button>
                                  <button 
                                    onClick={() => clearBorrador(idx)} 
                                    className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-black text-[10px] uppercase transition-colors"
                                  >
                                    Descartar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => actions.aprobar(idx, versionEsperada)} 
                                    className="px-3 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-black text-[10px] uppercase transition-colors flex items-center gap-1 shadow-sm"
                                  >
                                    <Check size={14} /> Aprobar
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const m = window.prompt("Motivo de la denegación (obligatorio):");
                                      if (m === null) return;
                                      if (!m.trim()) {
                                        alert("Debes ingresar un motivo para denegar el ítem.");
                                        return;
                                      }
                                      actions.denegar(idx, versionEsperada, m.trim());
                                    }} 
                                    className="px-2 py-2 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700 rounded-lg font-black text-[10px] uppercase transition-colors"
                                    title="Denegar"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            neg.sinNotificar && neg.ultimoCambio?.rol === 'comprador' && (
                              <button 
                                onClick={() => actions.deshacer(idx, versionEsperada)} 
                                className="text-[10px] text-slate-400 hover:text-slate-600 underline font-bold mt-2"
                              >
                                Deshacer cambios
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>

                    {hasCounterOffer && (
                      <tr className="bg-amber-50/20">
                        <td colSpan={4} className="p-4 border-l-4 border-amber-300">
                          <OfertaDiff 
                            actual={neg.ofertaVigente} 
                            anterior={neg.ofertaAnterior} 
                            label="Contraoferta del Vendedor" 
                          />
                        </td>
                      </tr>
                    )}

                    {hiloAbierto === idx && (
                      <tr className="bg-slate-50">
                        <td colSpan={4} className="p-0 border-t border-slate-100">
                          <HiloComentariosItem
                            solicitudId={id}
                            itemId={idx}
                            productoActual={p}
                            currentUser={currentUser}
                            todosLosProductos={[]}
                            onClose={() => setHiloAbierto(null)}
                            accionesHabilitadas={false}
                            soloLectura={estaAnulado}
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

      <BarraNotificar 
        unnotifiedCount={unnotifiedCount}
        notificacionPendienteEmail={notificacionPendienteEmail}
        onNotificar={() => actions.notificar(resumenAcciones)}
        onReintentar={() => actions.reintentarCorreo()}
        isLoading={false}
        isVendedor={false}
        resumenAcciones={resumenAcciones}
      />
    </div>
  );
};

