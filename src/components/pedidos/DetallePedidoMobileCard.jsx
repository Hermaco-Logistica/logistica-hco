import React, { useEffect, useState } from 'react';
import { Check, X, MessageSquare, ArrowLeftRight } from 'lucide-react';
import { auth } from '../../firebase';
import { HiloComentariosItem } from '../hilos/HiloComentariosItem';
import { EstadoItemChip } from './negociacion/EstadoItemChip';
import { FormularioOferta } from './negociacion/FormularioOferta';
import { OfertaDiff } from './negociacion/OfertaDiff';

export const DetallePedidoMobileCard = ({
  idx,
  solicitudId,
  itemServer,
  borrador,
  updateBorrador,
  clearBorrador,
  actions,
  conteos,
  noLeidos,
  hiloAbierto,
  setHiloAbierto,
  puedeResponder
}) => {
  const [showAdjustForm, setShowAdjustForm] = useState(false);

  useEffect(() => {
    if (idx === 0) (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' });
  }, [idx]);

  const p = itemServer;
  const neg = p.negociacion || {};
  const versionEsperada = neg.version || 0;
  
  const msgCount = conteos[idx] || 0;
  const unreadCount = noLeidos[idx] || 0;

  const isMyTurn = neg.turno === 'vendedor';
  const hasCounterOffer = neg.ofertaVigente && neg.ofertaAnterior && isMyTurn;
  const currentFob = neg.ofertaVigente?.precio || p.fob || 0;
  
  let currentBorrador = borrador || {
    precio: neg.ofertaVigente?.precio || p.fob || 0,
    tiempoEntrega: neg.ofertaVigente?.tiempoEntrega || p.fechaCompromiso || '',
    modalidad: neg.ofertaVigente?.modalidad || p.modalidad || 'Aéreo'
  };

  return (
    <div className="bg-white p-4">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-slate-800 uppercase truncate">{p.descripcion}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Marca: {p.marca}</p>
        </div>
        <EstadoItemChip estado={p.estadoItem} pendingRole={neg.turno} />
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-700">
          <div className="flex-1 flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cant</span>
            <span className="font-black text-slate-800">{p.cant}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Precio</span>
            <span className="font-bold">${Number(p.fob || 0).toFixed(2)}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Entrega</span>
            <span className="font-bold">{p.fechaCompromiso || 'N/A'}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vía</span>
            <span className="font-bold">{p.modalidad || 'N/A'}</span>
          </div>
        </div>
      </div>

      {hasCounterOffer && (
        <div className="mb-4">
          <OfertaDiff 
            actual={neg.ofertaVigente} 
            anterior={neg.ofertaAnterior} 
            label="Ajuste de Compras" 
          />
        </div>
      )}

      {showAdjustForm ? (
        <div className="mb-4">
          <FormularioOferta 
            ofertaDraft={currentBorrador}
            originalOferta={{ 
              precio: neg.ofertaVigente?.precio || p.fob, 
              tiempoEntrega: neg.ofertaVigente?.tiempoEntrega || p.fechaCompromiso, 
              modalidad: neg.ofertaVigente?.modalidad || p.modalidad || 'Aéreo' 
            }}
            onChange={(draft) => updateBorrador(idx, draft)}
            onCancel={() => { clearBorrador(idx); setShowAdjustForm(false); }}
            onSubmit={() => { actions.contraofertar(idx, versionEsperada, currentBorrador); setShowAdjustForm(false); }}
            title="Contraofertar Ítem"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {isMyTurn && puedeResponder && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => actions.aceptar(idx, versionEsperada)} 
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-[10px] uppercase transition-colors shadow-sm"
              >
                <Check size={14} /> Aceptar ${Number(currentFob).toFixed(2)}
              </button>
              <button 
                onClick={() => setShowAdjustForm(true)} 
                className="flex-[0.8] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl font-black text-[10px] uppercase transition-colors"
              >
                <ArrowLeftRight size={14} /> Ajustar
              </button>
              <button 
                onClick={() => { const m = window.prompt("Motivo del rechazo:"); if (m !== null) actions.rechazar(idx, versionEsperada, m); }} 
                className="w-10 flex items-center justify-center px-0 py-2.5 bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex w-full justify-between items-center">
            <button 
              onClick={() => setHiloAbierto(hiloAbierto === idx ? null : idx)} 
              className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] uppercase transition-colors ${hiloAbierto === idx ? 'bg-purple-100 text-purple-700' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
            >
              <MessageSquare size={14} className={msgCount === 0 ? 'opacity-50' : ''} />
              <span>Mensajes</span>
              {msgCount > 0 && <span className="ml-1 opacity-70">({msgCount})</span>}
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{unreadCount}</span>
              )}
            </button>
            
            {!isMyTurn && neg.sinNotificar && neg.ultimoCambio?.rol === 'vendedor' && (
              <button 
                onClick={() => actions.deshacer(idx, versionEsperada)} 
                className="text-[10px] text-slate-400 hover:text-slate-700 underline font-bold px-3 py-2"
              >
                Deshacer cambios
              </button>
            )}
          </div>
        </div>
      )}

      {hiloAbierto === idx && (
        <div className="mt-3 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
          <HiloComentariosItem
            solicitudId={solicitudId}
            itemId={idx}
            productoActual={p}
            currentUser={{ ...auth.currentUser, rol: 'vendedor' }}
            todosLosProductos={[]}
            onClose={() => setHiloAbierto(null)}
            accionesHabilitadas={false}
          />
        </div>
      )}
    </div>
  );
};
