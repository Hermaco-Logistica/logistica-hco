import React, { useEffect, useState } from 'react';
import { Check, X, MessageSquare, ArrowLeftRight, TrendingDown, MessageCircleQuestion } from 'lucide-react';
import { auth } from '../../firebase';
import { HiloComentariosItem } from '../hilos/HiloComentariosItem';
import { EstadoItemChip } from './negociacion/EstadoItemChip';
import { FormularioOferta } from './negociacion/FormularioOferta';
import { OfertaDiff } from './negociacion/OfertaDiff';
import { tieneMotivoConsultaItem } from '../../utils/ventasPerdidasHelpers';
import { esItemCerrado } from '../../utils/decisionItemHelpers';

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
  puedeResponder,
  esEstancado = false,
  estaSeleccionado = false,
  stagedVP = false,
  onToggleSeleccion,
  onVentaPerdida,
  onConsulta,
  onConsultaVentaPerdida,
  onDeshacerVentaPerdida,
  onRechazar
}) => {
  const [showAdjustForm, setShowAdjustForm] = useState(false);

  useEffect(() => {
    if (idx === 0) (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' });
  }, [idx]);

  const p = itemServer;
  const esCerrado = esItemCerrado(p);
  const estaAnulado = p.estadoItem === 'Anulado';
  const puedeSeleccionar = !esCerrado && puedeResponder && !stagedVP;
  const neg = p.negociacion || {};
  const tiempoEntrega = neg.ofertaVigente?.tiempoEntrega || p.tiempoEntrega || p.diasPrometidos || '';
  const versionEsperada = neg.version || 0;
  
  const msgCount = conteos[idx] || 0;
  const unreadCount = noLeidos[idx] || 0;

  const isMyTurn = neg.turno === 'vendedor' && !esCerrado && !stagedVP;
  const currentFob = neg.ofertaVigente?.precio || p.fob || 0;
  
  let currentBorrador = borrador || {
    precio: neg.ofertaVigente?.precio || p.fob || 0,
    tiempoEntrega,
    modalidad: neg.ofertaVigente?.modalidad || p.modalidad || 'Aéreo'
  };

  return (
    <div className={`bg-white p-4 ${esCerrado ? 'opacity-60 bg-slate-50/50' : estaAnulado ? 'opacity-60 grayscale-[0.5]' : ''}`}>
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {stagedVP ? (
            <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5" title="Venta Perdida por enviar">
              <TrendingDown size={12} />
            </div>
          ) : puedeSeleccionar ? (
            <button
              type="button"
              onClick={onToggleSeleccion}
              className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer mt-0.5 ${
                estaSeleccionado
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : 'border-slate-300 text-transparent hover:border-slate-400 bg-white'
              }`}
              title={estaSeleccionado ? "Deseleccionar ítem" : "Seleccionar ítem para venta perdida"}
            >
              <Check size={14} strokeWidth={3} />
            </button>
          ) : null}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-slate-800 uppercase line-clamp-2 wrap-break-word leading-snug">{p.descripcion}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Marca: {p.marca}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {stagedVP ? (
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-sm">
                <TrendingDown size={11} />
                <span>Por enviar</span>
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {onConsultaVentaPerdida && (
                  <button
                    type="button"
                    onClick={onConsultaVentaPerdida}
                    className="inline-flex min-h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[9px] cursor-pointer"
                    title="Consultar motivo de venta perdida"
                  >
                    <MessageCircleQuestion size={11} /> Consulta
                  </button>
                )}
                {onDeshacerVentaPerdida && (
                  <button
                    type="button"
                    onClick={onDeshacerVentaPerdida}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer"
                  >
                    Deshacer
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Ocultar indicador de turno si el ítem está anulado */}
              <EstadoItemChip estado={p.estadoItem} pendingRole={estaAnulado ? null : neg.turno} />
              {estaAnulado && p.motivoAnulacion && (
                <span className="text-[9px] text-slate-400 italic text-right max-w-30 leading-tight" title={p.motivoAnulacion}>
                  {p.motivoAnulacion.length > 30 ? p.motivoAnulacion.slice(0, 30) + '…' : p.motivoAnulacion}
                </span>
              )}
              {tieneMotivoConsultaItem(p) && (onConsulta || onConsultaVentaPerdida) && (
                <button
                  type="button"
                  onClick={onConsulta || onConsultaVentaPerdida}
                  className="inline-flex min-h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:translate-y-px text-[9px] cursor-pointer mt-0.5"
                  title="Consultar motivo de la decisión"
                >
                  <MessageCircleQuestion size={11} /> Consulta
                </button>
              )}
            </>
          )}
        </div>
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
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Días de entrega</span>
            <span className="font-bold">{tiempoEntrega || 'N/A'}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vía</span>
            <span className="font-bold">{p.modalidad || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Historial de ajuste — visible aunque esté anulado, pero atenuado */}
      {(neg.ofertaVigente && neg.ofertaAnterior) && (
        <div className={`mt-3 mb-5 ${estaAnulado ? 'opacity-50 pointer-events-none' : ''}`}>
          <OfertaDiff 
            actual={neg.ofertaVigente} 
            anterior={neg.ofertaAnterior} 
            label="Ajuste de Compras" 
          />
        </div>
      )}

      {showAdjustForm && isMyTurn ? (
        <div className="mb-4">
          <FormularioOferta 
            ofertaDraft={currentBorrador}
            originalOferta={{ 
              precio: neg.ofertaVigente?.precio || p.fob, 
              tiempoEntrega,
              modalidad: neg.ofertaVigente?.modalidad || p.modalidad || 'Aéreo' 
            }}
            onChange={(draft) => updateBorrador(idx, draft)}
            onCancel={() => { clearBorrador(idx); setShowAdjustForm(false); }}
            onSubmit={() => { actions.contraofertar(idx, versionEsperada, currentBorrador); setShowAdjustForm(false); }}
            title="Contraofertar Ítem"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
          {/* Bloque de Negociación Activa (cuando es turno del vendedor) */}
          {isMyTurn && puedeResponder && !esCerrado && !stagedVP && (
            <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg shadow-2xs">
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
                  onClick={() => setShowAdjustForm(true)} 
                  className="py-2.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-md font-bold text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeftRight size={14} /> Contraofertar
                </button>
              </div>

              <div className="flex justify-end pt-0.5">
                <button 
                  type="button"
                  onClick={() => { 
                    if (onRechazar) {
                      onRechazar(idx, versionEsperada);
                    } else {
                      const m = window.prompt("Motivo del rechazo de la oferta de Compras (obligatorio):"); 
                      if (m === null) return; 
                      if (!m.trim()) { alert("Debes ingresar un motivo para rechazar la oferta."); return; } 
                      actions.rechazar(idx, versionEsperada, m.trim()); 
                    }
                  }} 
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  <X size={13} className="text-slate-400" />
                  <span>Rechazar oferta de Compras</span>
                </button>
              </div>
            </div>
          )}

          {/* Barra de Herramientas: Mensajes, Deshacer y Venta Perdida */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setHiloAbierto(hiloAbierto === idx ? null : idx)} 
                className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-[10px] uppercase transition-colors cursor-pointer ${hiloAbierto === idx ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <MessageSquare size={13} className={msgCount === 0 ? 'opacity-50' : ''} />
                <span>Mensajes</span>
                {msgCount > 0 && <span className="ml-0.5 opacity-70">({msgCount})</span>}
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{unreadCount}</span>
                )}
              </button>

              {!isMyTurn && neg.sinNotificar && neg.ultimoCambio?.rol === 'vendedor' && (
                <button 
                  type="button"
                  onClick={() => actions.deshacer(idx, versionEsperada)} 
                  className="text-[10px] text-slate-400 hover:text-slate-700 underline font-bold px-1 py-1 cursor-pointer"
                >
                  Deshacer cambios
                </button>
              )}
            </div>

            {/* Acción Comercial de Cierre: Venta Perdida */}
            {puedeResponder && !esCerrado && !stagedVP && (
              <button
                type="button"
                onClick={onVentaPerdida}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wide transition-colors cursor-pointer shadow-xs ${
                  esEstancado
                    ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                }`}
                title={esEstancado ? "Registrar Venta Perdida comercial (>5 días hábiles)" : "Registrar Venta Perdida de este ítem"}
              >
                <TrendingDown size={13} />
                <span>Venta Perdida</span>
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
            soloLectura={!puedeResponder || esCerrado}
          />
        </div>
      )}
    </div>
  );
};
