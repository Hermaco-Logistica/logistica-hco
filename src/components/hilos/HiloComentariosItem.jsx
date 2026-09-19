import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useHiloItem } from '../../hooks/useHiloItem';
import { PropuestaPrecioCard } from './PropuestaPrecioCard';

const getRolColor = (rol) => {
  switch (rol?.toLowerCase()) {
    case 'vendedor': return 'bg-blue-500 text-white';
    case 'comprador': return 'bg-purple-600 text-white';
    case 'gerente': return 'bg-amber-500 text-white';
    case 'administrador': return 'bg-rose-600 text-white';
    default: return 'bg-slate-500 text-white';
  }
};

const getIniciales = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nombre.substring(0, 2).toUpperCase();
};

const formatearHoraMensaje = (c) => {
  if (!c) return '';
  let d = null;
  if (typeof c.toDate === 'function') d = c.toDate();
  else if (c instanceof Date) d = c;
  else if (c.seconds) d = new Date(c.seconds * 1000);
  else if (typeof c === 'number') d = new Date(c);
  else if (typeof c === 'string') d = new Date(c);

  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const HiloComentariosItem = ({
  solicitudId,
  itemId,
  productoActual,
  currentUser,
  todosLosProductos,
  onClose,
  onPrecioAceptado
}) => {
  const { 
    mensajes, 
    loading, 
    enviarTexto, 
    enviarPropuesta, 
    aceptarPropuesta,
    reenviarACompras,
    marcarMensajesComoLeidos
  } = useHiloItem(solicitudId, itemId, productoActual);

  const [texto, setTexto] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);
  const startYRef = useRef(null);

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (startYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    if (diff > 0) {
      setOffsetY(diff);
      // Evitar scroll pull-to-refresh
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offsetY > 120) {
      onClose();
    } else {
      setOffsetY(0);
    }
    startYRef.current = null;
  };

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Manejo de teclado (Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Foco al abrir
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Scroll al fondo al llegar mensajes nuevos y marcar como leídos
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (currentUser?.uid) {
      marcarMensajesComoLeidos(currentUser.uid);
    }
  }, [mensajes, currentUser?.uid]);

  // Autoresize textarea
  const handleTextareaInput = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const currentPrecio = productoActual?.fob || 0;

  const isVendedor = currentUser?.rol === 'vendedor' || currentUser?.rol === 'gerente';
  const isCotizado = productoActual?.estadoItem === 'Cotizado';
  const isBloqueadoGlobal = productoActual?.estadoItem === 'Pedido' || productoActual?.estadoItem === 'Denegado';

  const handleReenviar = async () => {
    if (!texto.trim()) return;
    if (!window.confirm('¿Confirmas devolver este ítem a Compras para una nueva revisión? El ítem pasará a estado Pendiente.')) return;
    setProcesando(true);
    try {
      const autor = {
        uid: currentUser.uid,
        nombre: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        rol: currentUser.rol || 'vendedor'
      };
      await reenviarACompras(texto, currentPrecio, currentPrecio, autor, false, todosLosProductos);
      setTexto('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (e) {
      console.error(e);
      alert('Error al re-enviar');
    } finally {
      setProcesando(false);
    }
  };

  const handleEnviarTextoNormal = async () => {
    if (!texto.trim()) return;
    setProcesando(true);
    try {
      const autor = {
        uid: currentUser.uid,
        nombre: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        rol: currentUser.rol || 'vendedor'
      };
      await enviarTexto(texto, autor);
      setTexto('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (e) {
      console.error(e);
      alert('Error al enviar');
    } finally {
      setProcesando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviarTextoNormal();
    }
  };

  const handleContraofertar = async (nuevoFob, fobAnterior, nota, propuestaId, tiempoEntrega, modalidad, tiempoEntregaAnterior, modalidadAnterior) => {
    setProcesando(true);
    try {
      const autor = {
        uid: currentUser.uid,
        nombre: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        rol: currentUser.rol || 'vendedor'
      };
      await enviarPropuesta(nota, nuevoFob, fobAnterior, autor, propuestaId, tiempoEntrega, modalidad || null, tiempoEntregaAnterior, modalidadAnterior);
    } catch (e) {
      console.error(e);
      alert('Error al contraofertar');
    } finally {
      setProcesando(false);
    }
  };


  const handleAceptarPropuesta = async (propuestaId, precioPropuesto, tiempoEntrega) => {
    setProcesando(true);
    try {
      const autor = {
        uid: currentUser.uid,
        nombre: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        rol: currentUser.rol || 'vendedor'
      };
      await aceptarPropuesta(propuestaId, precioPropuesto, todosLosProductos, autor, tiempoEntrega);
      if (onPrecioAceptado) onPrecioAceptado(precioPropuesto);
    } catch (e) {
      console.error(e);
      alert('Error al aceptar propuesta');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={offsetY > 0 || isDragging ? {
        transform: `translateY(${offsetY}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      } : {}}
    >
        
        {/* Header - Zona de arrastre */}
        <div 
          className="flex flex-col border-b border-slate-100 bg-white select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full flex justify-center py-2">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between px-3 pb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
              Conversación del ítem <span className="text-slate-300 ml-1">#{itemId + 1}</span>
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                title="Cerrar (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && mensajes.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin text-slate-300" size={24} />
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex justify-center items-center h-full text-xs font-bold text-slate-400 uppercase tracking-widest text-center px-4">
              Aún no hay mensajes en este ítem
            </div>
          ) : (
            mensajes.map((m, index) => {
              const userSide = (currentUser?.rol === 'comprador' || currentUser?.rol === 'administrador') ? 'comprador' : 'vendedor';
              const autorSide = (m.autor?.rol === 'comprador' || m.autor?.rol === 'administrador') ? 'comprador' : 'vendedor';
              const esPropio = m.autor?.uid ? m.autor.uid === currentUser?.uid : userSide === autorSide;
              
              if (m.tipo === 'propuesta') {
                return (
                  <React.Fragment key={m.id || index}>
                    {m.texto && (
                      <div className={`flex ${esPropio ? 'justify-end' : 'justify-start'} mb-1`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          esPropio ? 'bg-emerald-100 text-emerald-900 rounded-tr-sm' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-bold opacity-70">{m.autor?.nombre || 'Usuario'}</p>
                            {formatearHoraMensaje(m.createdAt) && (
                              <span className="text-[9px] opacity-50 font-medium">
                                {formatearHoraMensaje(m.createdAt)}
                              </span>
                            )}
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{m.texto}</p>
                        </div>
                      </div>
                    )}
                    <div className={`flex ${esPropio ? 'justify-end' : 'justify-start'} mb-2`}>
                      <PropuestaPrecioCard 
                        mensaje={m}
                        currentUser={currentUser}
                        onAceptar={handleAceptarPropuesta}
                        onContraofertar={handleContraofertar}
                      />
                    </div>
                  </React.Fragment>
                );
              }

              if (m.tipo === 'aceptacion') {
                return (
                  <div key={m.id || index} className="flex flex-col items-center my-4 gap-1">
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest">
                      {m.autor?.nombre} {m.texto}
                    </span>
                    {formatearHoraMensaje(m.createdAt) && (
                      <span className="text-[9px] text-slate-400">
                        {formatearHoraMensaje(m.createdAt)}
                      </span>
                    )}
                  </div>
                );
              }

              // Texto normal
              return (
                <div key={m.id || index} className={`flex gap-3 max-w-[85%] ${esPropio ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div 
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm select-none ${getRolColor(m.autor?.rol)}`}
                    title={m.autor?.rol}
                  >
                    {getIniciales(m.autor?.nombre)}
                  </div>
                  
                  <div className={`flex flex-col ${esPropio ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-500">{m.autor?.nombre}</span>
                      {formatearHoraMensaje(m.createdAt) && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          {formatearHoraMensaje(m.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    <div className={`p-3 text-sm shadow-sm ${
                      esPropio 
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm'
                    }`}>
                      {m.texto}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Compositor */}
        {!isBloqueadoGlobal ? (
          <div className="p-3 bg-slate-50 border-t border-slate-200">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              handleTextareaInput(e);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje o comentario..."
            className="w-full bg-white border border-slate-300 rounded-2xl p-3 text-sm outline-none focus:border-blue-500 resize-none max-h-[120px] shadow-sm transition-all min-h-[44px] mb-2"
            rows={2}
          />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
            <div>
              {isVendedor && isCotizado && (
                <button
                  type="button"
                  onClick={handleReenviar}
                  disabled={procesando || !texto.trim()}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline disabled:opacity-40 disabled:no-underline transition-colors py-1 px-1"
                  title="Devuelve este ítem a Compras para que lo revisen de nuevo"
                >
                  Devolver ítem a Compras con esta nota
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEnviarTextoNormal}
                disabled={procesando || !texto.trim()}
                className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white shadow-sm disabled:opacity-50 disabled:bg-slate-300 transition-all font-black uppercase text-[10px] flex items-center justify-center gap-2"
              >
                {procesando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Añadir Nota
              </button>
            </div>
          </div>
        </div>
        ) : (
          <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            El proceso de este ítem ha finalizado
          </div>
        )}

      </div>
  );
};
