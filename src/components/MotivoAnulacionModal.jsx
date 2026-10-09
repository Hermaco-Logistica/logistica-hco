import React, { useEffect } from 'react';
import { Ban, X } from 'lucide-react';

export const MotivoAnulacionModal = ({ movimiento, movimientos = [], onClose }) => {
  useEffect(() => {
    if (!movimiento) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [movimiento, onClose]);

  const registros = movimientos.length > 0 ? movimientos : movimiento ? [movimiento] : [];
  if (registros.length === 0) return null;

  const principal = registros[0];
  const esDenegado = principal.estado === 'Denegado';
  const etiquetaMotivo = esDenegado ? 'Motivo de denegación' : 'Motivo de anulación';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="motivo-anulacion-titulo"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
              <Ban size={18} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Control de estados</p>
              <h2 id="motivo-anulacion-titulo" className="text-base font-bold tracking-tight text-slate-900">
                {etiquetaMotivo}
              </h2>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                {principal.correlativo} · {registros.length > 1 ? `${registros.length} ítems` : principal.producto}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar motivo de anulación"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-5 py-5">
          <div className="space-y-3 border-b border-slate-100 pb-4">
            {registros.map((registro, index) => {
              const motivo = registro.motivoAnulacion?.toString().trim() || 'No se registró un motivo.';
              return (
                <div key={`${registro.idMov || registro.producto}-${index}`} className="border-l-2 border-rose-500 bg-slate-50 px-4 py-3">
                  <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <span className="text-slate-400">Ítem / SKU</span>
                    <span className="truncate text-right font-semibold uppercase text-slate-800" title={registro.producto || 'N/D'}>{registro.producto || 'N/D'}</span>
                    <span className="text-slate-400">Marca</span>
                    <span className="truncate text-right font-medium text-slate-700">{registro.marca || 'N/D'}</span>
                  </div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{etiquetaMotivo}</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{motivo}</p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            <span className="text-slate-400">Cliente</span>
            <span className="truncate text-right font-medium text-slate-700">{principal.cliente || 'N/D'}</span>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-900"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
