import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { 
  ChevronLeft, CheckCircle2, MessageSquare, ArrowLeftRight, Check, X,
  ChevronDown, Link as LinkIcon, Save
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

export const DetallePedidoManual = ({ role }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hiloAbierto, setHiloAbierto] = useState(null);
  const [filtroTurno, setFiltroTurno] = useState(null);
  const [linkOC, setLinkOC] = useState('');
  const [comentariosVendedor, setComentariosVendedor] = useState('');
  const [documentacionOpen, setDocumentacionOpen] = useState(false);
  const [editandoDocs, setEditandoDocs] = useState(false);
  const isFirstLoad = useRef(true);

  const currentUser = {
    uid: auth.currentUser?.uid,
    nombre: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Vendedor',
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

  const { conteos, noLeidos } = useMensajesResumen(id, itemsServer);

  const puedeResponder = Boolean(
    solicitudBase &&
    (role === 'administrador' || role === 'gerente' || solicitudBase.vendedorId === currentUser.uid || (!solicitudBase.vendedorId && currentUser.uid))
  );

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

  const allClosed = itemsServer.length > 0 && itemsServer.every(p => p.negociacion?.resultado != null && !p.negociacion?.sinNotificar);

  return (
    <div className="max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-36 fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="shrink-0 p-2 hover:bg-white rounded-full transition-colors shadow-sm bg-white">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-black text-slate-800 uppercase italic leading-none tracking-tight truncate">
            {solicitudBase.cliente}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-purple-600 font-bold text-[10px] sm:text-xs uppercase tracking-widest bg-purple-100 px-2.5 py-1 rounded-md">
              {solicitudBase.correlativo}
            </span>
          </div>
        </div>
        {allClosed && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full shadow-md whitespace-nowrap self-start md:self-auto">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Pedido Finalizado</span>
          </div>
        )}
      </div>

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
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-slate-700"
                    placeholder="https://..."
                    value={linkOC}
                    onChange={(e) => setLinkOC(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block italic">Notas para Compras</label>
                  </div>
                  <textarea
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-slate-700 min-h-20"
                    placeholder="Comentarios sobre el pedido..."
                    value={comentariosVendedor}
                    onChange={(e) => setComentariosVendedor(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button 
                  onClick={handleGuardarDocumentacion}
                  disabled={editandoDocs}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-[10px] uppercase transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save size={14} /> Guardar Documentación
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {turnoVendedor > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-black text-amber-800 uppercase tracking-tight">Atención requerida</span>
            <span className="text-xs font-medium text-amber-700">{turnoVendedor} ítem{turnoVendedor !== 1 ? 's' : ''} esperan tu respuesta</span>
          </div>
          {filtroTurno !== 'vendedor' && (
            <button 
              onClick={() => setFiltroTurno('vendedor')}
              className="px-4 py-2 bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
            >
              Ver
            </button>
          )}
        </div>
      )}

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
                const isMyTurn = neg.turno === 'vendedor';
                const hasCounterOffer = neg.ofertaVigente && neg.ofertaAnterior && isMyTurn;
                const currentFob = neg.ofertaVigente?.precio || p.fob || 0;
                
                const draft = borradores[idx];
                const msgCount = conteos[idx] || 0;
                const unreadCount = noLeidos[idx] || 0;

                const isUnchanged = draft && 
                  Number(draft.precio) === Number(neg.ofertaVigente?.precio || p.fob) &&
                  String(draft.tiempoEntrega) === String(neg.ofertaVigente?.tiempoEntrega || p.fechaCompromiso) &&
                  String(draft.modalidad) === String(neg.ofertaVigente?.modalidad || p.modalidad || 'Aéreo');

                return (
                  <React.Fragment key={idx}>
                    <tr className={`transition-colors ${isMyTurn ? 'bg-amber-50/20' : 'hover:bg-slate-50'}`}>
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
                            {draft ? (
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
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Entrega</span>
                            {draft ? (
                              <input 
                                type="text" 
                                value={draft.tiempoEntrega || ''} 
                                onChange={(e) => updateBorrador(idx, { ...draft, tiempoEntrega: e.target.value })} 
                                placeholder="Ej: 5 días" 
                                className="w-full max-w-[160px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold text-slate-700 text-sm" 
                              />
                            ) : (
                              <span className="font-bold text-slate-700 text-sm">{p.fechaCompromiso || 'No definido'}</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Modalidad</span>
                            {draft ? (
                              <select 
                                value={draft.modalidad || 'Aéreo'} 
                                onChange={(e) => updateBorrador(idx, { ...draft, modalidad: e.target.value })} 
                                className="w-full max-w-[160px] p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold text-slate-700 text-sm cursor-pointer"
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
                          
                          {isMyTurn && puedeResponder ? (
                            <div className="flex flex-wrap justify-end gap-1.5 w-full mt-2">
                              {!draft ? (
                                <>
                                  <button 
                                    onClick={() => actions.aceptar(idx, versionEsperada)} 
                                    className="px-3 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-black text-[10px] uppercase transition-colors flex items-center gap-1 shadow-sm"
                                  >
                                    <Check size={14} /> Aceptar ${Number(currentFob).toFixed(2)}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      updateBorrador(idx, {
                                        precio: currentFob,
                                        tiempoEntrega: neg.ofertaVigente?.tiempoEntrega || p.fechaCompromiso || '',
                                        modalidad: neg.ofertaVigente?.modalidad || p.modalidad || 'Aéreo'
                                      });
                                    }} 
                                    className="px-3 py-2.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg font-black text-[10px] uppercase transition-colors flex items-center gap-1"
                                  >
                                    <ArrowLeftRight size={14} /> Contraofertar
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const m = window.prompt("Motivo del rechazo:");
                                      if (m !== null) actions.rechazar(idx, versionEsperada, m);
                                    }} 
                                    className="px-2 py-2 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors"
                                    title="Rechazar Oferta"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => {
                                      actions.contraofertar(idx, versionEsperada, draft);
                                      clearBorrador(idx);
                                    }} 
                                    disabled={!draft.precio || isUnchanged}
                                    className="px-3 py-2.5 bg-amber-500 text-white hover:bg-amber-600 rounded-lg font-black text-[10px] uppercase transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Check size={14} /> Enviar Contraoferta
                                  </button>
                                  <button 
                                    onClick={() => clearBorrador(idx)} 
                                    className="px-3 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-black text-[10px] uppercase transition-colors flex items-center gap-1"
                                  >
                                    <X size={14} /> Cancelar
                                  </button>
                                </>
                              )}
                            </div>
                          ) : neg.sinNotificar && neg.ultimoCambio?.rol === currentUser.rol && !draft ? (
                            <div className="flex justify-end mt-2">
                              <button 
                                onClick={() => actions.deshacer(idx, versionEsperada)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg text-[10px] font-bold uppercase transition-colors"
                              >
                                Deshacer cambio
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>

                    {hasCounterOffer && (
                      <tr className="bg-amber-50/20">
                        <td colSpan={4} className="px-4 pb-4 border-l-4 border-amber-400">
                          <OfertaDiff actual={neg.ofertaVigente} anterior={neg.ofertaAnterior} label="Ajuste de Compras" />
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

      {puedeResponder && (
        <BarraNotificar 
          unnotifiedCount={unnotifiedCount}
          notificacionPendienteEmail={notificacionPendienteEmail}
          onNotificar={() => actions.notificar(resumenAcciones)}
          onReintentar={() => actions.reintentarCorreo()}
          isLoading={false}
          isVendedor={true}
          resumenAcciones={resumenAcciones}
        />
      )}
    </div>
  );
};
