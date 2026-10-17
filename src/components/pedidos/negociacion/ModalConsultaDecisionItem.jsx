import React, { useEffect, useState } from 'react';
import { XCircle, ShieldAlert, Ban, X } from 'lucide-react';
import { 
  formatearFechaDecision, 
  esMotivoGenerico, 
  buscarMotivoDecisionMensajes 
} from '../../../utils/decisionItemHelpers';

/**
 * Modal exclusivo para consultar motivos de decisiones operativas en ítems:
 * - Oferta Rechazada por el Vendedor
 * - Ítem Denegado por Compras
 * - Ítem Anulado
 * 
 * Soporta ítem individual o lista de múltiples decisiones de una solicitud.
 * Si el motivo guardado en el ítem es genérico o vacío (común en órdenes previas),
 * consulta asíncronamente el mensaje de texto asociado al evento en Firestore.
 * Completamente separado del modal de Venta Perdida (control comercial).
 */
export const ModalConsultaDecisionItem = ({ isOpen = true, onClose, data }) => {
  const activo = Boolean(isOpen && data);
  const [itemsResueltos, setItemsResueltos] = useState([]);
  const [cargandoMotivos, setCargandoMotivos] = useState(false);

  useEffect(() => {
    if (!activo) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activo, onClose]);

  useEffect(() => {
    if (!activo || !data) {
      setItemsResueltos([]);
      return undefined;
    }

    const baseItems = Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : [data];

    setItemsResueltos(baseItems);

    const solicitudId = data.solicitudId || baseItems[0]?.solicitudId;
    const necesitanBusqueda = baseItems.some(it => esMotivoGenerico(it.motivo) && (it.solicitudId || solicitudId));

    if (!necesitanBusqueda) return undefined;

    let cancelado = false;
    setCargandoMotivos(true);

    Promise.all(
      baseItems.map(async (item) => {
        const solId = item.solicitudId || solicitudId;
        if (!esMotivoGenerico(item.motivo) || !solId) return item;

        try {
          const resultado = await buscarMotivoDecisionMensajes({
            solicitudId: solId,
            itemId: item.itemId,
            tipoDecision: item.tipoDecision,
            mensajeEventoId: item.mensajeEventoId,
            fechaEvento: item.fechaEvento || item.fecha
          });

          if (!resultado || !resultado.texto) return item;

          return {
            ...item,
            motivo: resultado.texto,
            registradoPor: resultado.autor
              ? `${resultado.autor} (${item.tipoDecision === 'denegacion' ? 'Compras' : 'Vendedor'})`
              : item.registradoPor,
            fecha: resultado.fecha || item.fecha
          };
        } catch {
          return item;
        }
      })
    ).then((actualizados) => {
      if (!cancelado) {
        setItemsResueltos(actualizados);
        setCargandoMotivos(false);
      }
    }).catch(() => {
      if (!cancelado) setCargandoMotivos(false);
    });

    return () => {
      cancelado = true;
    };
  }, [activo, data]);

  if (!activo) return null;

  const itemsList = itemsResueltos.length > 0
    ? itemsResueltos
    : (Array.isArray(data.items) && data.items.length > 0 ? data.items : [data]);

  const esMultiple = itemsList.length > 1;
  const primerItem = itemsList[0] || {};
  const correlativo = data.correlativo || primerItem.correlativo || 'S/N';
  const cliente = data.cliente || primerItem.cliente || '';

  const tipoPrincipal = primerItem.tipoDecision || 'rechazo';

  // Configuración visual de la cabecera según el tipo principal de decisión
  let headerIcon = <XCircle size={18} />;
  let iconBg = 'bg-rose-600 text-white';
  let headerTag = 'Negociación de Oferta';
  let headerTitle = esMultiple 
    ? `Decisiones de Ítems (${itemsList.length} ítems)` 
    : (primerItem.tituloModal || 'Motivo de la Decisión');

  if (tipoPrincipal === 'denegacion') {
    headerIcon = <ShieldAlert size={18} />;
    iconBg = 'bg-amber-600 text-white';
    headerTag = 'Revisión de Compras';
    if (esMultiple) headerTitle = `Ítems Denegados (${itemsList.length} ítems)`;
  } else if (tipoPrincipal === 'anulacion') {
    headerIcon = <Ban size={18} />;
    iconBg = 'bg-slate-700 text-white';
    headerTag = 'Anulación de Ítem';
    if (esMultiple) headerTitle = `Ítems Anulados (${itemsList.length} ítems)`;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-2 sm:p-4 md:p-6 backdrop-blur-[2px] animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="motivo-decision-item-titulo"
        className="flex max-h-[92vh] sm:max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 border-b border-slate-200 bg-slate-50 px-4 sm:px-5 py-3.5 sm:py-4">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <div className={`mt-0.5 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg shadow-xs ${iconBg}`}>
              {headerIcon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-0.5">
                {headerTag}
              </span>
              <h2 id="motivo-decision-item-titulo" className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
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

        {/* Contenido (con scroll si hay múltiples ítems) */}
        <div className="space-y-3.5 sm:space-y-4 px-4 sm:px-5 py-4 sm:py-5 bg-white overflow-y-auto max-h-[65vh]">
          {itemsList.map((item, idx) => {
            const itemTipo = item.tipoDecision || 'rechazo';
            let itemBadgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';
            let itemCardBorder = 'border-rose-500';

            if (itemTipo === 'denegacion') {
              itemBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';
              itemCardBorder = 'border-amber-500';
            } else if (itemTipo === 'anulacion') {
              itemBadgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
              itemCardBorder = 'border-slate-500';
            }

            const fechaTxt = formatearFechaDecision(item.fecha);

            return (
              <div key={idx} className={`border-l-3 ${itemCardBorder} bg-slate-50 p-3.5 sm:p-4 rounded-r-xl space-y-2.5 sm:space-y-3`}>
                {/* Producto y Badge */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      {esMultiple ? `Ítem ${idx + 1} · Producto` : 'Producto / Descripción'}
                    </span>
                    <p className="font-bold text-slate-800 text-xs sm:text-sm leading-snug uppercase break-words">
                      {item.producto}
                    </p>
                    {item.marca && item.marca !== 'N/A' && (
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                        Marca: {item.marca}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${itemBadgeStyle}`}>
                    {item.badgeLabel}
                  </span>
                </div>

                {/* Motivo Único Directo */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {item.labelMotivo || 'Motivo'}
                    </span>
                    {cargandoMotivos && esMotivoGenerico(item.motivo) && (
                      <span className="text-[9px] font-medium text-slate-400 animate-pulse">
                        Buscando motivo en historial...
                      </span>
                    )}
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                    {item.motivo}
                  </div>
                </div>

                {/* Metadatos: Autor y Fecha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/60 text-slate-500">
                  <div className="min-w-0">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Registrado por</span>
                    <span className="font-medium text-slate-700 truncate block">{item.registradoPor || 'Usuario'}</span>
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
