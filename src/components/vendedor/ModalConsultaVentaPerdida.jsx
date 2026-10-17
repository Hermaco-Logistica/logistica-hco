import React, { useEffect } from 'react';
import { TrendingDown, X } from 'lucide-react';
import { normalizarItemVentaPerdida, formatearFechaVentaPerdida } from '../../utils/ventasPerdidasHelpers';

/**
 * Modal exclusivo para consultar motivos de Venta Perdida (control comercial y CRM).
 * Muestra el catálogo oficial, categorías y comentarios explicativos comerciales.
 */
export const ModalConsultaVentaPerdida = ({ isOpen = true, onClose, data }) => {
  const activo = Boolean(isOpen && data);
  useEffect(() => {
    if (!activo) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activo, onClose]);

  if (!activo) return null;

  const itemsList = Array.isArray(data.items) && data.items.length > 0
    ? data.items
    : [data];

  const esMultiple = itemsList.length > 1;
  const primerItem = itemsList[0] || {};
  const correlativo = data.correlativo || primerItem.correlativo || 'S/N';
  const cliente = data.cliente || primerItem.cliente || '';

  const headerTitle = esMultiple 
    ? `Motivos de Venta Perdida (${itemsList.length} ítems)` 
    : 'Motivo de Venta Perdida';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-2 sm:p-4 md:p-6 backdrop-blur-[2px] animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="motivo-venta-perdida-titulo"
        className="flex max-h-[92vh] sm:max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 border-b border-slate-200 bg-slate-50 px-4 sm:px-5 py-3.5 sm:py-4">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <div className="mt-0.5 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs">
              <TrendingDown size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Control Comercial
                </span>
                {data.esPendiente && (
                  <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                    Pendiente de Enviar
                  </span>
                )}
              </div>
              <h2 id="motivo-venta-perdida-titulo" className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                {headerTitle}
              </h2>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                Ref: <span className="font-mono font-bold text-slate-700">{correlativo}</span>
                {cliente ? ` · ${cliente}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 cursor-pointer min-w-[32px] min-h-[32px]"
            aria-label="Cerrar modal de motivo"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido con Scroll Vertical */}
        <div className="max-h-[65vh] space-y-3.5 sm:space-y-4 overflow-y-auto px-4 sm:px-5 py-4 sm:py-5 bg-white">
          {itemsList.map((rawItem, idx) => {
            const item = normalizarItemVentaPerdida({
              item: rawItem,
              solicitud: data,
              staged: rawItem.staged || (data.esPendiente ? data : null),
              fallbackIndex: idx
            });

            const prodNombre = item.producto;
            const prodMarca = item.marca;
            const catNombre = item.categoria;
            const motNombre = item.motivoNombre;
            const comTexto = item.comentario;
            const regPor = item.registradoPor;
            const fechaTxt = formatearFechaVentaPerdida(item.fecha);

            return (
              <div key={idx} className="border-l-3 border-rose-500 bg-slate-50 p-3.5 sm:p-4 rounded-r-xl space-y-2.5 sm:space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      {esMultiple ? `Ítem ${idx + 1} · Producto` : 'Producto / Descripción'}
                    </span>
                    <p className="font-bold text-slate-800 text-xs sm:text-sm leading-snug uppercase break-words">
                      {prodNombre}
                    </p>
                    {prodMarca && prodMarca !== 'N/A' && (
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                        Marca: {prodMarca}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                    Venta Perdida
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Motivo Registrado
                    </span>
                    {catNombre && catNombre !== 'General' && (
                      <span className="text-[10px] font-medium text-slate-400">
                        ({catNombre})
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                    {motNombre}
                  </p>
                </div>

                {comTexto && comTexto !== 'Sin comentario adicional registrado.' && (
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Comentario Explicativo
                    </span>
                    <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                      {comTexto}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/60 text-slate-500">
                  <div className="min-w-0">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Registrado por</span>
                    <span className="font-medium text-slate-700 truncate block">{regPor || 'Usuario'}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Fecha</span>
                    <span className="font-medium text-slate-700 block">{fechaTxt}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pie */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-4 sm:px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-900 cursor-pointer shadow-xs text-center"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
