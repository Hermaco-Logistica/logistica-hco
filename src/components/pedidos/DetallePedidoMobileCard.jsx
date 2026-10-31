import React, { useEffect, useState } from 'react';
import { Check, X, MessageSquare, ArrowLeftRight, TrendingDown, MessageCircleQuestion, Undo2 } from 'lucide-react';
import { auth } from '../../firebase';
import { HiloComentariosItem } from '../hilos/HiloComentariosItem';
import { EstadoItemChip } from './negociacion/EstadoItemChip';
import { FormularioOferta } from './negociacion/FormularioOferta';
import { OfertaDiff } from './negociacion/OfertaDiff';
import { tieneMotivoConsultaItem } from '../../utils/ventasPerdidasHelpers';
import { esItemCerrado } from '../../utils/decisionItemHelpers';
import { SeguimientoItemCondicion } from '../seguimiento/SeguimientoItemCondicion';
import { Etiqueta } from '../../components/Etiqueta';

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
  puedeRegistrarVentaPerdida = false,
  esEstancado = false,
  estaSeleccionado = false,
  stagedVP = false,
  onToggleSeleccion,
  onVentaPerdida,
  onConsulta,
  onConsultaVentaPerdida,
  onDeshacerVentaPerdida,
  onRechazar,
  seguimiento = null
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
    <div className={`flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-xs ${esCerrado ? 'opacity-60 bg-slate-50/50' : estaAnulado ? 'opacity-60 grayscale-[0.5]' : ''}`}>
      <div className="order-1 mb-4 flex items-start justify-between gap-3">
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
              aria-label={estaSeleccionado ? "Deseleccionar ítem" : "Seleccionar ítem para seguimiento o venta perdida"}
              title={estaSeleccionado ? "Deseleccionar ítem" : "Seleccionar ítem para seguimiento o venta perdida"}
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
              <Etiqueta tono="peligro">
                <TrendingDown size={11} />
                <span>Por enviar</span>
              </Etiqueta>
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
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-rose-700"
                    aria-label="Deshacer venta perdida pendiente"
                    title="Deshacer venta perdida pendiente"
                  >
                    <Undo2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Ocultar indicador de turno si el ítem está anulado */}
              <EstadoItemChip estado={p.estadoItem} pendingRole={estaAnulado ? null : neg.turno} stacked />
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
          <button
            type="button"
            onClick={() => setHiloAbierto(hiloAbierto === idx ? null : idx)}
            className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${hiloAbierto === idx ? 'border-purple-300 bg-purple-100 text-purple-700' : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            aria-label={`Mensajes del ítem${msgCount > 0 ? ` (${msgCount})` : ''}`}
            title={`Mensajes${msgCount > 0 ? ` (${msgCount})` : ''}`}
          >
            <MessageSquare size={14} className={msgCount === 0 ? 'opacity-60' : ''} />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">{unreadCount}</span>}
          </button>
        </div>
      </div>

      <div className="order-3 mb-4 rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
        <h3 className="pedido-item-conditions__heading mb-2">Condiciones</h3>
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 text-sm font-medium text-slate-700">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cant</span>
            <span className="font-black text-slate-800">{p.cant}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Oferta vigente</span>
            <span className="font-bold text-slate-800">${Number(currentFob).toFixed(2)}</span>
            {Number(p.fob || 0) !== Number(currentFob) && (
              <span className="text-[9px] font-medium text-slate-500">Base OC: ${Number(p.fob || 0).toFixed(2)}</span>
            )}
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
        <div className={`order-4 mt-3 mb-5 ${estaAnulado ? 'opacity-50 pointer-events-none' : ''}`}>
          <OfertaDiff 
            actual={neg.ofertaVigente} 
            anterior={neg.ofertaAnterior} 
            label="Ajuste de Compras" 
          />
        </div>
      )}

      {showAdjustForm && isMyTurn ? (
        <div className="order-5 mb-4">
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
        <div className="order-5 pedido-mobile-actions-grid" aria-label="Acciones del ítem">
          {isMyTurn && puedeResponder && !esCerrado && !stagedVP && (
            <>
              <button type="button" onClick={() => actions.aceptar(idx, versionEsperada)} className="pedido-mobile-action pedido-mobile-action--accept" aria-label={`Aceptar oferta vigente de $${Number(currentFob).toFixed(2)}`}>
                <Check size={16} /><span>Aceptar</span>
              </button>
              <button type="button" onClick={() => setShowAdjustForm(true)} className="pedido-mobile-action pedido-mobile-action--counter" aria-label="Contraofertar">
                <ArrowLeftRight size={16} /><span>Contraofertar</span>
              </button>
              <button type="button" onClick={() => {
                if (onRechazar) onRechazar(idx, versionEsperada);
                else {
                  const motivo = window.prompt('Motivo del rechazo de la oferta de Compras (obligatorio):');
                  if (motivo === null) return;
                  if (!motivo.trim()) { alert('Debes ingresar un motivo para rechazar la oferta.'); return; }
                  actions.rechazar(idx, versionEsperada, motivo.trim());
                }
              }} className="pedido-mobile-action pedido-mobile-action--reject" aria-label="Rechazar oferta de Compras">
                <X size={16} /><span>Rechazar</span>
              </button>
            </>
          )}
          {!isMyTurn && neg.sinNotificar && neg.ultimoCambio?.rol === 'vendedor' && (
            <button type="button" onClick={() => actions.deshacer(idx, versionEsperada)} className="pedido-mobile-action pedido-mobile-action--neutral" aria-label="Deshacer cambios">
              <Undo2 size={16} /><span>Deshacer</span>
            </button>
          )}
          {puedeRegistrarVentaPerdida && !esCerrado && !stagedVP && (
            <button type="button" onClick={onVentaPerdida} className="pedido-mobile-action pedido-mobile-action--loss" aria-label="Registrar venta perdida" title={esEstancado ? 'Registrar Venta Perdida comercial (>5 días hábiles)' : 'Registrar Venta Perdida de este ítem'}>
              <TrendingDown size={16} /><span>Venta perdida</span>
            </button>
          )}
          {stagedVP && onDeshacerVentaPerdida && (
            <button type="button" onClick={onDeshacerVentaPerdida} className="pedido-mobile-action pedido-mobile-action--neutral" aria-label="Deshacer venta perdida pendiente">
              <Undo2 size={16} /><span>Deshacer VP</span>
            </button>
          )}
        </div>
      )}

      {hiloAbierto === idx && (
        <div className="order-6 mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
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
