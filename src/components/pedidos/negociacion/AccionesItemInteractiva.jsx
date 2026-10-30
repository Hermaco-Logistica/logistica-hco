import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const AccionesContext = createContext(null);

/** Agrupa acciones de un ítem: primer toque enfoca; el segundo ejecuta. */
export const AccionesItemInteractiva = ({ children, className = '' }) => {
  const [activa, setActiva] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!activa) return undefined;
    const resetFuera = (event) => {
      if (!rootRef.current?.contains(event.target)) setActiva(null);
    };
    const resetEscape = (event) => {
      if (event.key === 'Escape') setActiva(null);
    };
    document.addEventListener('pointerdown', resetFuera, true);
    document.addEventListener('keydown', resetEscape);
    return () => {
      document.removeEventListener('pointerdown', resetFuera, true);
      document.removeEventListener('keydown', resetEscape);
    };
  }, [activa]);

  const contextValue = {
    activa,
    seleccionar(id, onConfirm, event) {
      event.preventDefault();
      event.stopPropagation();
      if (activa !== id) {
        setActiva(id);
        return;
      }
      setActiva(null);
      onConfirm?.();
    }
  };

  return (
    <AccionesContext.Provider value={contextValue}>
      <div ref={rootRef} className={`pedido-item-actions ${className}`}>
        {children}
      </div>
    </AccionesContext.Provider>
  );
};

/** Botón compacto con estado de preselección y confirmación al segundo toque. */
export const AccionItemButton = ({ id, label, text, icon, onConfirm, className = '', disabled = false }) => {
  const context = useContext(AccionesContext);
  if (!context) throw new Error('AccionItemButton debe usarse dentro de AccionesItemInteractiva');

  const estaActiva = context.activa === id;
  const hayOtraActiva = Boolean(context.activa) && !estaActiva;
  const textoVisible = text || label;
  const anchoExpandido = `${Math.min(176, Math.max(88, textoVisible.length * 5.6 + 40))}px`;

  return (
    <button
      type="button"
      onClick={(event) => context.seleccionar(id, onConfirm, event)}
      disabled={disabled}
      aria-label={estaActiva ? `${label}. Vuelve a tocar para confirmar.` : label}
      aria-pressed={estaActiva}
      title={estaActiva ? `Vuelve a tocar para ${label.toLowerCase()}` : label}
      style={estaActiva ? { width: anchoExpandido } : hayOtraActiva ? { width: '26px' } : undefined}
      className={`pedido-item-action-button inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-md border transition-[width,opacity,background-color,color,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${estaActiva ? 'pedido-item-action-button--active px-2' : hayOtraActiva ? 'opacity-50' : ''} ${disabled ? 'cursor-not-allowed opacity-40' : ''} ${className}`}
    >
      {icon}
      <span className={`pedido-item-action-label whitespace-nowrap text-[10px] font-bold transition-[opacity,transform] duration-200 ${estaActiva ? 'translate-x-0 opacity-100' : 'pointer-events-none w-0 -translate-x-1 overflow-hidden opacity-0'}`} aria-hidden="true">
        {textoVisible}
      </span>
    </button>
  );
};
