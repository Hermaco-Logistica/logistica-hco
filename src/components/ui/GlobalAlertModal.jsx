import React, { useState, useEffect } from 'react';

export const GlobalAlertModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timeoutId;
    const originalAlert = window.alert;

    window.alert = (msg) => {
      setMessage(msg);
      setIsOpen(true);
      
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsOpen(false);
      }, 2000); // Se cierra a los 2 segundos
    };

    return () => {
      window.alert = originalAlert;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
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
          onClick={() => setIsOpen(false)}
          className="mt-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl uppercase tracking-wider text-xs transition-all shadow-md active:scale-95 cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
};
