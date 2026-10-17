import React, { useState } from 'react';
import { Send, AlertCircle, RefreshCw, X } from 'lucide-react';
import { BottomActionBar } from '../../mobile/BottomActionBar';

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

  const barContent = (
    <div className={`p-3 sm:p-4 transition-all ${
      notificacionPendienteEmail ? 'bg-amber-50' : 'bg-white'
    }`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {notificacionPendienteEmail ? (
          <>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-bold text-amber-800 flex items-center gap-1.5 sm:gap-2 truncate">
                <AlertCircle size={15} className="shrink-0" /> Correo pendiente
              </span>
              <span className="text-[11px] sm:text-xs text-amber-700 truncate">Hubo un problema al enviar la última notificación.</span>
            </div>
            <button
              onClick={onReintentar}
              disabled={isLoading}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black uppercase tracking-wider text-xs bg-amber-500 text-white hover:bg-amber-600 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 min-h-[48px] cursor-pointer shadow-sm"
            >
              <span>Reintentar</span>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                Tienes {unnotifiedCount} cambio{unnotifiedCount !== 1 ? 's' : ''} sin enviar
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 hidden xs:block truncate">
                {isVendedor ? 'Compras' : 'El vendedor'} no verá los cambios hasta que los notifiques.
              </span>
            </div>
            <button
              onClick={() => setShowSheet(true)}
              disabled={isLoading}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 min-h-[48px] cursor-pointer"
            >
              <span className="hidden sm:inline">
                {isVendedor ? 'Confirmar y notificar a Compras' : 'Notificar al vendedor'}
              </span>
              <span className="sm:hidden">
                Notificar ({unnotifiedCount})
              </span>
              <Send size={15} className={isLoading ? 'animate-pulse' : ''} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {showSheet && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[70] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">Confirmar Notificación</h3>
                <button onClick={() => setShowSheet(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 mb-5 sm:mb-6">
                <p className="text-xs sm:text-sm font-bold text-slate-700 text-center flex flex-wrap justify-center gap-1.5 sm:gap-2">
                  <span className="text-emerald-600">{resumenAcciones?.aprobados || 0} aprobados</span> &bull; 
                  <span className="text-amber-600">{resumenAcciones?.ajustes || 0} {isVendedor ? 'contraofertas' : 'ajustes'}</span> &bull; 
                  <span className="text-rose-600">{resumenAcciones?.denegados || 0} {isVendedor ? 'rechazados' : 'denegados'}</span>
                  {resumenAcciones?.ventasPerdidas > 0 && (
                    <> &bull; <span className="text-rose-700 font-black">{resumenAcciones.ventasPerdidas} vta. perdida</span></>
                  )}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 text-center mt-2.5 font-medium">
                  Los ítems que sigan en tu turno se mantendrán pendientes de tu acción.
                </p>
              </div>

              <div className="flex gap-2.5 sm:gap-3">
                <button 
                  onClick={() => setShowSheet(false)}
                  className="flex-1 py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer min-h-[48px]"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 px-3 sm:px-4 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shadow-md cursor-pointer active:scale-95 min-h-[48px]"
                >
                  <span>Enviar</span>
                  <Send size={15} className={isLoading ? 'animate-pulse' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Móvil (< md): Registrado en el dock inferior único con hideNav */}
      <div className="md:hidden">
        <BottomActionBar hideNav={true}>
          {barContent}
        </BottomActionBar>
      </div>

      {/* Escritorio (>= md): Pegado al fondo de <main> como sticky sin márgenes hardcodeados */}
      <div className={`hidden md:block sticky bottom-0 z-30 border-t shadow-lg ${
        notificacionPendienteEmail ? 'bg-amber-50 border-amber-200' : 'bg-white/95 backdrop-blur-md border-slate-200'
      }`}>
        {barContent}
      </div>
    </>
  );
};

export default BarraNotificar;
