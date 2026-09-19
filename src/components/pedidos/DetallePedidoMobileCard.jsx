import React, { useEffect } from 'react';
import { CheckCircle2, X, Clock, CheckSquare, Square, MessageSquare } from 'lucide-react';
import { HiloComentariosItem } from '../hilos/HiloComentariosItem';

export const DetallePedidoMobileCard = ({
  p, idx, pedido,
  esItemYaPedido, esItemDenegado, seleccionados, setSeleccionados,
  modalidades, setModalidades, conteos, noLeidos,
  puedeConfirmarPedido, hiloAbierto, setHiloAbierto, currentUser, esPropietario
}) => {
  // Ir al inicio al montar el primer ítem (cuando carga la vista)
  useEffect(() => {
    if (idx === 0) (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' });
  }, [idx]);

  const yaFuePedido = esItemYaPedido(p);
  const fueDenegado = esItemDenegado(p);
  const fueDevuelto = p.estadoItem === 'Cotizado';
  const fob = Number(p.fob || 0);
  const msgCount = conteos[idx] || 0;
  const unreadCount = noLeidos[idx] || 0;

  let cardBg = 'bg-white';
  if (seleccionados[idx]) cardBg = 'bg-slate-50';
  else if (yaFuePedido) cardBg = 'bg-emerald-50/30';
  else if (fueDenegado) cardBg = 'bg-rose-50/30';

  return (
    <React.Fragment>
      <div className={`p-4 space-y-3 ${cardBg}`}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="pt-0.5 shrink-0">
            {yaFuePedido ? (
              <CheckCircle2 size={18} className="text-emerald-500" />
            ) : fueDenegado ? (
              <X size={18} className="text-rose-500" />
            ) : fueDevuelto ? (
              <button
                onClick={() => setSeleccionados(prev => ({ ...prev, [idx]: !prev[idx] }))}
                disabled={!puedeConfirmarPedido}
                className={seleccionados[idx] ? 'text-emerald-500' : 'text-slate-300'}
              >
                {seleccionados[idx] ? <CheckSquare size={20} /> : <Square size={20} />}
              </button>
            ) : (
              <Clock size={16} className="text-slate-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-black text-slate-800 uppercase text-sm leading-tight">{p.descripcion || p.desc}</p>
                <p className="text-[11px] text-blue-600 font-bold uppercase mt-0.5">{p.marca}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {yaFuePedido ? (
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-black uppercase">Aprobado</span>
                ) : fueDenegado ? (
                  <span className="text-[9px] bg-rose-100 text-rose-700 px-2 py-1 rounded font-black uppercase">Denegado</span>
                ) : fueDevuelto ? (
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-black uppercase">Ajuste de Compras</span>
                ) : (
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-black uppercase">En Revisión</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detalles */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Cantidad</p>
            <p className="font-black text-slate-700 text-lg">{p.cant}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">T. Entrega</p>
            <p className="font-bold text-slate-600">{p.fechaCompromiso || p.tiempoEntrega || '---'}</p>
          </div>
        </div>

        {/* Precios y Modalidad */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">FOB Ud.</p>
              <div className="flex items-center gap-1.5">
                <p className={`font-black ${fueDevuelto ? 'text-amber-600' : 'text-emerald-700'}`}>${fob.toFixed(2)}</p>
                {fueDevuelto && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Subtotal</p>
              <p className="font-black text-slate-700">${(fob * p.cant).toFixed(2)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Modalidad</p>
            {yaFuePedido ? (
              <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded">{p.modalidad || 'Aéreo'}</span>
            ) : fueDevuelto && seleccionados[idx] ? (
              <select
                value={modalidades[idx] || p.modalidad || 'Aéreo'}
                onChange={(e) => setModalidades(prev => ({ ...prev, [idx]: e.target.value }))}
                className="bg-slate-100 border-none rounded-lg p-1.5 font-black text-[10px] uppercase text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Aéreo">Aéreo</option>
                <option value="Marítimo">Marítimo</option>
              </select>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 italic">{p.modalidad || 'Aéreo'}</span>
            )}
          </div>
        </div>

        {/* Acciones */}
        {esPropietario && (
          <div className="flex items-center justify-center pt-2 border-t border-slate-100">
            <button
              onClick={() => setHiloAbierto(hiloAbierto === idx ? null : idx)}
              className={`relative inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase transition-colors ${
                hiloAbierto === idx ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <MessageSquare size={16} className={msgCount === 0 ? 'opacity-50' : ''} />
              <span className={msgCount === 0 ? 'opacity-50' : ''}>Mensajes</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full shadow-sm">{unreadCount}</span>
              )}
            </button>
          </div>
        )}
      </div>
      {hiloAbierto === idx && (
        <HiloComentariosItem
          solicitudId={pedido.id}
          itemId={idx}
          currentUser={currentUser}
          productoActual={p}
          todosLosProductos={pedido.productos}
          onClose={() => setHiloAbierto(null)}
        />
      )}
    </React.Fragment>
  );
};
