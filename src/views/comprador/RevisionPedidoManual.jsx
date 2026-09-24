import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Loader2, ArrowLeft, Check, X, ArrowLeftRight, MessageSquare, Save } from 'lucide-react';
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full">
          <button 
            onClick={() => navigate('/compras')} 
            className="shrink-0 p-2 hover:bg-slate-100 rounded-full transition-colors bg-white shadow-sm"
          >
            <ArrowLeft size={22} className="text-slate-600" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl font-black text-slate-800 uppercase italic leading-none tracking-tight truncate">
              {solicitudBase.cliente}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`font-bold text-[10px] sm:text-xs uppercase tracking-widest px-2.5 py-1 rounded-md ${colors.text} ${colors.bg}`}>
                {solicitudBase.correlativo}
              </span>
            </div>
          </div>
        </div>
        
        {allClosed && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full shadow-md whitespace-nowrap self-start md:self-auto">
            <Check size={16} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Pedido Finalizado</span>
          </div>
        )}
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

                return (
                  <React.Fragment key={idx}>
                    <tr className={`transition-colors ${isPending ? 'bg-white' : 'hover:bg-slate-50'}`}>
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
                          <EstadoItemChip estado={p.estadoItem} pendingRole={neg.turno} />
                          
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

