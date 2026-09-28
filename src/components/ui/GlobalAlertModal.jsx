import React, { useState, useEffect, useCallback } from 'react';

// onClose callback: ejecutado únicamente cuando el usuario presiona OK.
// Esto permite que el código que llama a alert() encadene un navigate()
// que solo ocurre tras confirmación explícita, evitando doble-envío.
let _resolveAlert = null;

export const showAlert = (msg) =>
  new Promise((resolve) => {
    _resolveAlert = resolve;
    window.alert(msg);
  });

export const GlobalAlertModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [onClose, setOnClose] = useState(null);

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (msg, closeCb) => {
      setMessage(String(msg ?? ''));
      setOnClose(() => closeCb || null);
      setIsOpen(true);
      // Si hay un resolver pendiente de showAlert, no lo resolvemos aquí;
      // se resuelve al presionar OK.
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (_resolveAlert) {
      const cb = _resolveAlert;
      _resolveAlert = null;
      cb();
    }
    if (typeof onClose === 'function') {
      onClose();
      setOnClose(null);
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-200 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
          <span className="font-black text-xl italic">i</span>
        </div>

        <p className="text-slate-800 font-bold text-sm leading-snug break-words">
          {message}
        </p>

        <button
          onClick={handleClose}
          className="mt-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl uppercase tracking-wider text-xs transition-all shadow-md active:scale-95 cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
};
