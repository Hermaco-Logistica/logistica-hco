import React, { useState } from 'react';
import { Send, AlertCircle, RefreshCw } from 'lucide-react';
import { BottomActionBar } from '../../mobile/BottomActionBar';
import { Modal, ModalBoton, ModalCuerpo, ModalEncabezado, ModalPie } from '../../Modal';

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
        <Modal etiqueta="Confirmar notificación" ancho="sm" onCerrar={() => setShowSheet(false)}>
          <ModalEncabezado titulo="Confirmar notificación" subtitulo="Revisa el resumen antes de enviar." icono={Send} tono="exito" onCerrar={() => setShowSheet(false)} />
          <ModalCuerpo>
            <p className="flex flex-wrap justify-center gap-x-2 text-[14.5px] font-semibold">
              <span className="text-emerald-700">{resumenAcciones?.aprobados || 0} aprobados</span> &bull;
              <span className="text-amber-700">{resumenAcciones?.ajustes || 0} {isVendedor ? 'contraofertas' : 'ajustes'}</span> &bull;
              <span className="text-rose-700">{resumenAcciones?.denegados || 0} {isVendedor ? 'rechazados' : 'denegados'}</span>
              {resumenAcciones?.ventasPerdidas > 0 && (
                <> &bull; <span className="text-rose-700">{resumenAcciones.ventasPerdidas} vta. perdida</span></>
              )}
            </p>
            <p className="text-center text-[13.5px] text-neutral-500">Los ítems que sigan en tu turno se mantendrán pendientes de tu acción.</p>
          </ModalCuerpo>
          <ModalPie>
            <ModalBoton onClick={() => setShowSheet(false)}>Cancelar</ModalBoton>
            <ModalBoton variante="primario" tono="exito" icono={Send} onClick={handleConfirm} disabled={isLoading}>Enviar</ModalBoton>
          </ModalPie>
        </Modal>
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
