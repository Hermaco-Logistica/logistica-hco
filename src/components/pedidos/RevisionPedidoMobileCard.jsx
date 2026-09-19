import React, { useEffect } from 'react';
import { Check, ArrowLeftRight, X, MessageSquare } from 'lucide-react';
import { auth } from '../../firebase';
import { HiloComentariosItem } from '../hilos/HiloComentariosItem';

export const RevisionPedidoMobileCard = ({
  p, idx, pedido, originalProductos,
  handleFieldChange, conteos, noLeidos,
  hiloAbierto, setHiloAbierto
}) => {
  // Ir al inicio al montar el primer ítem (cuando carga la vista)
  useEffect(() => {
    if (idx === 0) (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' });
  }, [idx]);

  const isProcesado = p.estadoItem !== 'Pendiente';
  const msgCount = conteos[idx] || 0;
  const unreadCount = noLeidos[idx] || 0;
  
  let cardBg = '';
  if (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') cardBg = 'bg-emerald-50';
  else if (p.estadoItem === 'Cotizado') cardBg = 'bg-amber-50';
  else if (p.estadoItem === 'Denegado') cardBg = 'bg-rose-50';

  return (
    <React.Fragment>
      <div className={`p-4 space-y-3 ${cardBg}`}>
        {/* Encabezado ítem */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-800 uppercase text-sm leading-tight">{p.descripcion}</p>
            <p className="text-[11px] text-blue-600 font-bold uppercase mt-0.5">{p.marca}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${
              (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') ? 'bg-emerald-100 text-emerald-700' : 
              p.estadoItem === 'Cotizado' ? 'bg-amber-100 text-amber-700' : 
              p.estadoItem === 'Denegado' ? 'bg-rose-100 text-rose-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              {(p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado') ? 'Aprobado' : p.estadoItem === 'Cotizado' ? 'Devuelto' : p.estadoItem === 'Denegado' ? 'Denegado' : p.estadoItem}
            </span>
            {!(originalProductos && (originalProductos[idx]?.estadoItem === 'Pedido' || originalProductos[idx]?.estadoItem === 'Comprado' || originalProductos[idx]?.estadoItem === 'Denegado')) && (
              <button onClick={() => handleFieldChange(idx, 'estadoItem', 'Pendiente')} className="text-[10px] text-slate-400 hover:text-slate-600 underline font-bold mt-1">Deshacer</button>
            )}
          </div>
        </div>

        {/* Campos editables */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Precio (OC)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                value={p.fob || ''}
                onChange={(e) => handleFieldChange(idx, 'fob', e.target.value)}
                className="w-full pl-6 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700 text-sm"
                disabled={isProcesado}
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cant.</label>
            <div className="w-full py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg font-black text-slate-700 text-sm">{p.cant}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">T. Entrega</label>
            <input
              type="text"
              value={p.fechaCompromiso || ''}
              onChange={(e) => handleFieldChange(idx, 'fechaCompromiso', e.target.value)}
              placeholder="Ej: 5 días"
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700 text-sm"
              disabled={isProcesado}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Modalidad</label>
            {isProcesado ? (
              <span className="inline-block text-xs font-black text-slate-600 bg-slate-100 px-2 py-1.5 rounded-lg">{p.modalidad || 'Aéreo'}</span>
            ) : (
              <select
                value={p.modalidad || 'Aéreo'}
                onChange={(e) => handleFieldChange(idx, 'modalidad', e.target.value)}
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700 text-sm cursor-pointer"
              >
                <option value="Aéreo">Aéreo</option>
                <option value="Marítimo">Marítimo</option>
              </select>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100/80">
          <div className="flex items-center justify-between">
            {!isProcesado ? (
              <div className="flex items-center gap-2 w-full justify-between sm:justify-start">
                <button onClick={() => handleFieldChange(idx, 'estadoItem', 'Pedido')} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-black text-[10px] uppercase transition-colors hover:bg-emerald-200">
                  <Check size={14} /> <span className="hidden xs:inline">Aprobar</span>
                </button>
                <button onClick={() => handleFieldChange(idx, 'estadoItem', 'Cotizado')} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2 py-2 bg-amber-100 text-amber-700 rounded-lg font-black text-[10px] uppercase transition-colors hover:bg-amber-200">
                  <ArrowLeftRight size={14} /> <span className="hidden xs:inline">Devolver</span>
                </button>
                <button onClick={() => handleFieldChange(idx, 'estadoItem', 'Denegado')} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2 py-2 bg-rose-100 text-rose-700 rounded-lg font-black text-[10px] uppercase transition-colors hover:bg-rose-200">
                  <X size={14} /> <span className="hidden xs:inline">Denegar</span>
                </button>
              </div>
            ) : (
              <div className="flex w-full justify-end">
                {!(originalProductos && (originalProductos[idx]?.estadoItem === 'Pedido' || originalProductos[idx]?.estadoItem === 'Denegado')) && (
                  <button onClick={() => handleFieldChange(idx, 'estadoItem', 'Pendiente')} className="text-[10px] text-slate-400 hover:text-slate-700 underline font-bold px-2 py-1">
                    Deshacer cambios
                  </button>
                )}
              </div>
            )}
          </div>

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
      </div>
      {hiloAbierto === idx && (
        <HiloComentariosItem
          solicitudId={pedido.id}
          itemId={idx}
          productoActual={p}
          currentUser={{ ...auth.currentUser, rol: 'comprador' }}
          todosLosProductos={pedido.productos}
          onClose={() => setHiloAbierto(null)}
          onPrecioAceptado={(nuevoFob) => handleFieldChange(idx, 'fob', nuevoFob)}
        />
      )}
    </React.Fragment>
  );
};
