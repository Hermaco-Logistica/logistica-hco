/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider');
  }
  return context;
};

let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, action, duration = 5000 }) => {
    const id = ++toastIdCounter;
    const newToast = { id, type, title, message, action, duration };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div 
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const { id, type, title, message, action, duration } = toast;
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    if (duration && duration > 0) {
      timerRef.current = setTimeout(() => {
        onRemove(id);
      }, duration);
    }
  }, [duration, id, onRemove]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  React.useEffect(() => {
    if (!isPaused) {
      startTimer();
    }
    return clearTimer;
  }, [isPaused, startTimer, clearTimer]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  const handleFocus = () => setIsPaused(true);
  const handleBlur = () => setIsPaused(false);

  const styleMap = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };
  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-rose-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all ${styleMap[type] || styleMap.info}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
      role="alert"
    >
      <div className="shrink-0 mt-0.5">{iconMap[type] || iconMap.info}</div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-bold text-sm mb-1">{title}</p>}
        <p className="text-sm opacity-90">{message}</p>
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onRemove(id);
            }}
            className="mt-2 text-sm font-bold uppercase tracking-wide hover:opacity-80 underline underline-offset-2"
          >
            {action.label}
          </button>
        )}
      </div>
      <button 
        onClick={() => onRemove(id)}
        className="shrink-0 p-1 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
