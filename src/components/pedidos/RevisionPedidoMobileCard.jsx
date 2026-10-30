import React, { useEffect, useState } from 'react';
import { Check, X, MessageSquare, ArrowLeftRight, Ban, MessageCircleQuestion } from 'lucide-react';
import { auth } from '../../firebase';
import { HiloComentariosItem } from '../hilos/HiloComentariosItem';
import { EstadoItemChip } from './negociacion/EstadoItemChip';
import { FormularioOferta } from './negociacion/FormularioOferta';
import { OfertaDiff } from './negociacion/OfertaDiff';
import { tieneMotivoConsultaItem } from '../../utils/ventasPerdidasHelpers';
import { esItemCerrado } from '../../utils/decisionItemHelpers';
import { SeguimientoItemCondicion } from '../seguimiento/SeguimientoItemCondicion';

export const RevisionPedidoMobileCard = ({
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
  onAnular,
  onDenegar,
  onConsulta,
  onConsultaVentaPerdida,
  estaAnulado,
  role,
  seguimiento = null
}) => {
  const [showAdjustForm, setShowAdjustForm] = useState(false);

  useEffect(() => {
    if (idx === 0) (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' });
  }, [idx]);

  const p = itemServer;
  const esCerrado = esItemCerrado(p);
  const neg = p.negociacion || {};
  const tiempoEntrega = neg.ofertaVigente?.tiempoEntrega || p.tiempoEntrega || p.diasPrometidos || '';
  const versionEsperada = neg.version || 0;
  
  const msgCount = conteos[idx] || 0;
  const unreadCount = noLeidos[idx] || 0;

  const isPending = neg.turno === 'compras' && !esCerrado;
  
  let currentBorrador = borrador || {
    precio: p.fob || 0,
    tiempoEntrega,
    modalidad: p.modalidad || 'Aéreo'
  };

  return (
    <div className={`bg-white p-4 ${esCerrado ? 'opacity-60 bg-slate-50/50' : estaAnulado ? 'opacity-60 grayscale-[0.5]' : ''}`}>
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-slate-800 uppercase line-clamp-2 wrap-break-word leading-snug">{p.descripcion}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Marca: {p.marca}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <EstadoItemChip estado={p.estadoItem} pendingRole={estaAnulado ? null : neg.turno} />
            {role === 'comprador' && ['Cotizado', 'Pedido'].includes(p.estadoItem) && !p.numOC && !esCerrado && (
              <button
                type="button"
                title="Anular"
                onClick={onAnular}
                className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-full transition-all"
              >
                <Ban size={16} />
              </button>
            )}
          </div>
          {estaAnulado && p.motivoAnulacion && (
            <span className="text-[9px] text-slate-400 italic text-right max-w-30 leading-tight" title={p.motivoAnulacion}>
              {p.motivoAnulacion.length > 30 ? p.motivoAnulacion.slice(0, 30) + '…' : p.motivoAnulacion}
            </span>
          )}
          {tieneMotivoConsultaItem(p) && (onConsulta || onConsultaVentaPerdida) && (
            <button
              type="button"
              onClick={onConsulta || onConsultaVentaPerdida}
              className="inline-flex min-h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[9px] cursor-pointer"
              title="Consultar motivo de la decisión"
            >
              <MessageCircleQuestion size={11} /> Consulta
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 sm:p-3 mb-4">
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 text-sm font-medium text-slate-700">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cant</span>
            <span className="font-black text-slate-800">{p.cant}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Precio</span>
            <span className="font-bold text-slate-800">${Number(p.fob || 0).toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Días entrega</span>
            <span className="font-bold text-slate-800 truncate">{tiempoEntrega || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vía</span>
            <span className="font-bold text-slate-800 truncate">{p.modalidad || 'N/A'}</span>
          </div>
        </div>
        {seguimiento && <SeguimientoItemCondicion {...seguimiento} className="mt-2.5" />}
      </div>

      {/* Historial de ajuste — visible aunque esté anulado, pero atenuado */}
      {(neg.ofertaVigente && neg.ofertaAnterior) && (
        <div className={`mt-3 mb-5 ${estaAnulado ? 'opacity-50 pointer-events-none' : ''}`}>
          <OfertaDiff 
            actual={neg.ofertaVigente} 
            anterior={neg.ofertaAnterior} 
            label="Contraoferta del Vendedor" 
          />
        </div>
      )}

      {showAdjustForm && isPending ? (
        <div className="mb-4">
          <FormularioOferta 
            ofertaDraft={currentBorrador}
            originalOferta={{ precio: p.fob, tiempoEntrega, modalidad: p.modalidad || 'Aéreo' }}
            onChange={(draft) => updateBorrador(idx, draft)}
            onCancel={() => { clearBorrador(idx); setShowAdjustForm(false); }}
            onSubmit={() => { actions.ajustar(idx, versionEsperada, currentBorrador); setShowAdjustForm(false); }}
            title="Ajustar Ítem"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {isPending && !esCerrado && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => actions.aprobar(idx, versionEsperada)} 
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 rounded-xl font-black text-[10px] uppercase transition-colors shadow-sm min-h-[38px] cursor-pointer"
              >
                <Check size={14} /> Aprobar
              </button>
              <button 
                onClick={() => setShowAdjustForm(true)} 
                className="flex-[0.8] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95 rounded-xl font-black text-[10px] uppercase transition-colors min-h-[38px] cursor-pointer"
              >
                <ArrowLeftRight size={14} /> Ajustar
              </button>
              <button 
                onClick={() => onDenegar ? onDenegar(idx, versionEsperada) : null} 
                className="w-10 flex items-center justify-center px-0 py-2.5 bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-700 active:scale-95 rounded-xl transition-colors min-h-[38px] cursor-pointer"
                title="Denegar"
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
            
            {!isPending && neg.sinNotificar && neg.ultimoCambio?.rol === 'comprador' && (
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
            currentUser={{ ...auth.currentUser, rol: 'comprador' }}
            todosLosProductos={[]}
            onClose={() => setHiloAbierto(null)}
            accionesHabilitadas={false}
            soloLectura={estaAnulado || esCerrado}
          />
        </div>
      )}
    </div>
  );
};
