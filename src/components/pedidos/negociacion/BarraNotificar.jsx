import React, { useState } from 'react';
import { Send, AlertCircle, RefreshCw, X } from 'lucide-react';

export const BarraNotificar = ({ 
  unnotifiedCount, 
  notificacionPendienteEmail, 
  onNotificar, 
  onReintentar, 
  isLoading, 
  isVendedor,
  resumenAcciones
}) => {
  const [showSheet, setShowSheet] = useState(false);

  if (unnotifiedCount === 0 && !notificacionPendienteEmail) return null;

  const handleConfirm = () => {
    setShowSheet(false);
    onNotificar();
  };

  return (
    <>
      {showSheet && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Confirmar Notificación</h3>
                <button onClick={() => setShowSheet(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                <p className="text-sm font-bold text-slate-700 text-center flex flex-wrap justify-center gap-2">
                  <span className="text-emerald-600">{resumenAcciones?.aprobados || 0} aprobados</span> &bull; 
                  <span className="text-amber-600">{resumenAcciones?.ajustes || 0} {isVendedor ? 'contraofertas' : 'ajustes'}</span> &bull; 
                  <span className="text-rose-600">{resumenAcciones?.denegados || 0} {isVendedor ? 'rechazados' : 'denegados'}</span>
                </p>
                <p className="text-xs text-slate-500 text-center mt-3 font-medium">
                  Los ítems que sigan en tu turno se mantendrán pendientes de tu acción.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSheet(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-wider text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  Enviar <Send size={16} className={isLoading ? 'animate-pulse' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 left-0 md:left-64 right-0 p-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 transition-all ${
        notificacionPendienteEmail ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {notificacionPendienteEmail ? (
            <>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <AlertCircle size={16} /> Correo pendiente
                </span>
                <span className="text-xs text-amber-700">Hubo un problema al enviar la última notificación.</span>
              </div>
              <button
                onClick={onReintentar}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                Reintentar <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">
                  Tienes {unnotifiedCount} cambio{unnotifiedCount !== 1 ? 's' : ''} sin enviar
                </span>
                <span className="text-xs text-slate-500">
                  {isVendedor ? 'Compras' : 'El vendedor'} no verá los cambios hasta que los notifiques.
                </span>
              </div>
              <button
                onClick={() => setShowSheet(true)}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                {isVendedor ? 'Confirmar y notificar a Compras' : 'Notificar al vendedor'} <Send size={16} className={isLoading ? 'animate-pulse' : ''} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};
