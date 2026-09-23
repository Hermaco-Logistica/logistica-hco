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
  onPrecioAceptado,
  accionesHabilitadas = true
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
  }, [mensajes, currentUser?.uid, marcarMensajesComoLeidos]);

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
        nombre: currentUser.nombre || currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
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
        nombre: currentUser.nombre || currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
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
        nombre: currentUser.nombre || currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
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


  const handleAceptarPropuesta = async (propuestaId, precioPropuesto, tiempoEntrega, modalidad) => {
    setProcesando(true);
    try {
      const autor = {
        uid: currentUser.uid,
        nombre: currentUser.nombre || currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        rol: currentUser.rol || 'vendedor'
      };
      await aceptarPropuesta(propuestaId, precioPropuesto, todosLosProductos, autor, tiempoEntrega, modalidad);
      if (onPrecioAceptado) onPrecioAceptado(precioPropuesto, tiempoEntrega, modalidad);
    } catch (e) {
      console.error(e);
      alert('Error al aceptar propuesta');
    } finally {
      setProcesando(false);
    }
  };

  const descItem = productoActual?.descripcion 
    ? (productoActual.descripcion.length > 35 ? productoActual.descripcion.substring(0, 35) + '...' : productoActual.descripcion)
    : `Ítem #${itemId + 1}`;

  return (
    <>
      {/* Backdrop para escritorio */}
      <div 
        className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-xs animate-in fade-in hidden md:block" 
        onClick={onClose} 
      />
      
      <div 
        className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-4 md:zoom-in-95 fade-in duration-200 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[92%] md:max-w-xl md:h-[650px] md:max-h-[88vh] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200/80 overflow-hidden"
        style={offsetY > 0 || isDragging ? {
          transform: `translateY(${offsetY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        } : {}}
      >
        
        {/* Header tipo Messenger */}
        <div 
          className="flex flex-col border-b border-slate-200/80 bg-white select-none touch-none md:touch-auto shrink-0 shadow-xs z-10"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Indicador de arrastre para móviles */}
          <div className="w-full flex justify-center py-1.5 md:hidden">
            <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shadow-xs">
                  #{itemId + 1}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">
                  {descItem}
                </h3>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Negociación directa • Logística
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mensajes (Fondo estilo Messenger #f0f2f5) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4.5 bg-[#f0f2f5]">
          {loading && mensajes.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                <Send size={20} className="ml-0.5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aún no hay mensajes en este ítem</p>
              <p className="text-xs text-slate-400 mt-1">Escribe una nota o propuesta para iniciar la negociación.</p>
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
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                          esPropio 
                            ? 'bg-blue-600 text-white rounded-tr-xs' 
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                        }`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`text-[11px] font-bold ${esPropio ? 'text-blue-100' : 'text-slate-500'}`}>{m.autor?.nombre || 'Usuario'}</p>
                            {formatearHoraMensaje(m.createdAt) && (
                              <span className={`text-[9px] font-medium ${esPropio ? 'text-blue-200' : 'text-slate-400'}`}>
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
                        onAceptar={accionesHabilitadas ? handleAceptarPropuesta : null}
                        onContraofertar={accionesHabilitadas ? handleContraofertar : null}
                      />
                    </div>
                  </React.Fragment>
                );
              }

              if (m.tipo === 'aceptacion' || m.tipo === 'evento') {
                const actionText = m.tipo === 'aceptacion' ? m.texto : 
                  (m.accion === 'aprobar' || m.accion === 'aceptar' ? 'aceptó la oferta' : 
                   (m.accion === 'rechazar' || m.accion === 'denegar' ? 'rechazó la oferta' : m.accion));
                
                const isAccept = m.accion === 'aprobar' || m.accion === 'aceptar' || m.tipo === 'aceptacion';
                const isReject = m.accion === 'rechazar' || m.accion === 'denegar';

                let colorClass = 'bg-slate-50 text-slate-700 border-slate-200/60';
                let icon = '•';
                
                if (isAccept) {
                  colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
                  icon = '✓';
                } else if (isReject) {
                  colorClass = 'bg-rose-50 text-rose-700 border-rose-200/60';
                  icon = '✗';
                }

                return (
                  <div key={m.id || index} className="flex flex-col items-center my-4 gap-1">
                    <span className={`${colorClass} border text-[10px] font-bold uppercase px-4 py-1 rounded-full tracking-wider shadow-xs`}>
                      {icon} {m.autor?.nombre} {actionText}
                    </span>
                    {formatearHoraMensaje(m.createdAt) && (
                      <span className="text-[9px] text-slate-400 font-medium">
                        {formatearHoraMensaje(m.createdAt)}
                      </span>
                    )}
                  </div>
                );
              }

              // Texto normal estilo Messenger: propio en Azul, ajeno en Blanco
              return (
                <div key={m.id || index} className={`flex gap-2.5 max-w-[85%] ${esPropio ? 'ml-auto flex-row-reverse' : ''}`}>
                  {!esPropio && (
                    <div 
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs select-none mt-1 ${getRolColor(m.autor?.rol)}`}
                      title={m.autor?.rol}
                    >
                      {getIniciales(m.autor?.nombre)}
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${esPropio ? 'items-end' : 'items-start'}`}>
                    {!esPropio && (
                      <span className="text-[11px] font-semibold text-slate-500 mb-0.5 ml-1">
                        {m.autor?.nombre}
                      </span>
                    )}
                    
                    <div className={`px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                      esPropio 
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-xs' 
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-tl-xs'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.texto}</p>
                    </div>

                    {formatearHoraMensaje(m.createdAt) && (
                      <span className="text-[9px] text-slate-400 font-medium mt-1 px-1">
                        {formatearHoraMensaje(m.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Compositor de mensajes estilo Messenger */}
        {!isBloqueadoGlobal ? (
          <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
            <textarea
              ref={textareaRef}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                handleTextareaInput(e);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="w-full bg-[#f0f2f5] focus:bg-white border border-transparent focus:border-blue-500 rounded-2xl p-3 text-sm text-slate-800 outline-none resize-none max-h-[120px] transition-all min-h-[44px] mb-2 shadow-xs"
              rows={2}
            />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-1">
              <div>
                {accionesHabilitadas && isVendedor && isCotizado && (
                  <button
                    type="button"
                    onClick={handleReenviar}
                    disabled={procesando || !texto.trim()}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline disabled:opacity-40 disabled:no-underline transition-colors py-1 px-1 cursor-pointer"
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
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-sm disabled:opacity-40 disabled:bg-slate-300 transition-all font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  {procesando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Enviar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-100 border-t border-slate-200 text-center text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            El proceso de este ítem ha finalizado
          </div>
        )}

      </div>
    </>
  );
};
