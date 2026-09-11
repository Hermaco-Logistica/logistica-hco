import React, { useState } from 'react';
import {
  X, Copy, Check, Truck, ShieldCheck, CheckCircle2,
  MapPin, Clock, Package, AlertTriangle
} from 'lucide-react';
import { interpretarEstadoLogistico, ESTADOS_SISTEMA } from '../utils/interpretarEstadoLogistico';
import { getStatusLabel, getDsvEventLabel, getDescripcionUi } from '../utils/trackingUi';

const PASOS_LOGISTICOS = [
  { key: ESTADOS_SISTEMA.PEDIDO, label: 'Pedido', icon: Package },
  { key: ESTADOS_SISTEMA.TRANSITO, label: 'Tránsito', icon: Truck },
  { key: ESTADOS_SISTEMA.ADUANA, label: 'Aduana', icon: ShieldCheck },
  { key: ESTADOS_SISTEMA.RECIBIDO, label: 'Recibido', icon: CheckCircle2 },
];

const INDICE_ESTADO = {
  [ESTADOS_SISTEMA.PEDIDO]: 0,
  [ESTADOS_SISTEMA.TRANSITO]: 1,
  [ESTADOS_SISTEMA.ADUANA]: 2,
  [ESTADOS_SISTEMA.RECIBIDO]: 3,
};

const formatFecha = (iso) => {
  if (!iso) return '--';
  const rawDate = typeof iso?.toDate === 'function' ? iso.toDate() : iso;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/El_Salvador',
  }).format(d);
};

const formatearTextoEvento = (event, provider, estadoActual, esUltimo = false) => {
  if (!event) return 'Actualización registrada';
  const isDsv = String(provider).toUpperCase() === 'DSV';

  if (isDsv && esUltimo) {
    if (estadoActual === 'Aduana') return 'En proceso de aduana';
    if (estadoActual === 'Recibido') return 'Recibido';
  }

  if (isDsv) {
    const raw = event.raw || event;
    const label = getDsvEventLabel(raw);
    if (label && label !== 'Actualizacion') return label;
    return raw.eventDescription || raw.description || raw.eventType || 'Actualización registrada';
  }

  const code = event.status || event.statusCode || event.raw?.statusCode || event.raw?.status;
  const labelMapeado = getStatusLabel(code, 'DHL');
  if (labelMapeado && labelMapeado !== 'Actualizacion') {
    return labelMapeado;
  }

  return getDescripcionUi(event.description || event.status, code, 'DHL');
};

export const TrackingModal = ({
  open,
  onClose,
  data,
  loading,
  error,
  notice,
  trackingNumber,
  rfqLabel,
  estadoActual = 'Pedido',
  fechaUltimoEstado = null,
  role = 'vendedor',
}) => {
  const [copiado, setCopiado] = useState(false);

  if (!open) return null;

  const esAdminOComprador = role === 'comprador' || role === 'administrador';
  const provider = String(data?.provider || data?.source || (trackingNumber?.includes('ANR') ? 'DSV' : 'DHL')).toUpperCase();
  const estadoInterpretado = data ? interpretarEstadoLogistico(data, estadoActual) : estadoActual;
  const pasoActivo = INDICE_ESTADO[estadoInterpretado] ?? 0;

  const events = Array.isArray(data?.events) ? data.events : [];
  const latestEvent = events[0] || null;
  const previousEvents = events.slice(1, 3); // Máximo 2 eventos anteriores

  const copiarGuia = () => {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-[2rem] bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh]">
        {/* Mobile drag handle */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* HEADER */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-14 bg-white border border-slate-200/80 rounded-lg overflow-hidden shrink-0">
                {provider === 'DSV' ? (
                  <img src="/dsv_logo.jpg" alt="DSV" className="w-full h-full object-cover" />
                ) : (
                  <img src="/dhl.svg" alt="DHL" className="w-full h-full object-cover" />
                )}
              </div>
              {rfqLabel && (
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate">
                  {rfqLabel}
                </span>
              )}
            </div>

            {esAdminOComprador ? (
              <div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-base font-black text-slate-800 tracking-tight font-mono">
                    {trackingNumber || '--'}
                  </p>
                  {trackingNumber && (
                    <button
                      type="button"
                      onClick={copiarGuia}
                      title="Copiar guía"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
                <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5 tracking-tight">
                  {provider === 'DSV' ? 'Seguimiento de Embarque' : 'Seguimiento Aéreo'}
                </p>
              </div>
            ) : (
              <p className="text-xs font-black uppercase text-slate-700 mt-1">
                {provider === 'DSV' ? 'Seguimiento de Embarque' : 'Seguimiento Aéreo'}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {notice && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-[10px] font-bold text-amber-800 flex items-center gap-2">
              <Clock size={13} className="shrink-0 text-amber-600" />
              <span>{notice}</span>
            </div>
          )}

          {loading && (
            <div className="py-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultando tracking...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 flex items-center gap-3">
              <AlertTriangle size={18} className="shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* STEPPER LOGISTICO */}
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4">
                <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-3">Progreso del Envío</p>
                <div className="grid grid-cols-4 gap-1 relative">
                  {PASOS_LOGISTICOS.map((paso, idx) => {
                    const PasoIcon = paso.icon;
                    const esPasado = idx < pasoActivo;
                    const esActual = idx === pasoActivo;

                    let colorCircle = 'bg-white border-slate-200 text-slate-300';
                    let colorText = 'text-slate-400 font-bold';

                    if (esPasado) {
                      colorCircle = 'bg-emerald-500 border-emerald-500 text-white shadow-xs shadow-emerald-500/30';
                      colorText = 'text-emerald-700 font-black';
                    } else if (esActual) {
                      colorCircle = 'bg-slate-900 border-slate-900 text-white shadow-sm';
                      colorText = 'text-slate-900 font-black';
                    }

                    return (
                      <div key={paso.key} className="flex flex-col items-center text-center">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${colorCircle}`}>
                          <PasoIcon size={14} />
                        </div>
                        <span className={`text-[9px] uppercase mt-2 tracking-tight ${colorText}`}>
                          {paso.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EVENTO ACTUAL */}
              {latestEvent && (
                <div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Estado Actual
                    </span>
                    {(provider === 'DSV' && (estadoActual === 'Aduana' || estadoActual === 'Recibido')
                      ? (fechaUltimoEstado || latestEvent.timestamp)
                      : latestEvent.timestamp) && (
                      <span className="text-[9px] font-bold text-slate-400">
                        {formatFecha(
                          provider === 'DSV' && (estadoActual === 'Aduana' || estadoActual === 'Recibido')
                            ? (fechaUltimoEstado || latestEvent.timestamp)
                            : latestEvent.timestamp
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-black text-slate-800 uppercase leading-snug">
                    {formatearTextoEvento(latestEvent, provider, estadoActual, true)}
                  </p>
                  {!(provider === 'DSV' && (estadoActual === 'Aduana' || estadoActual === 'Recibido')) &&
                    latestEvent.description &&
                    latestEvent.description.trim().toLowerCase() !== formatearTextoEvento(latestEvent, provider, estadoActual, true).trim().toLowerCase() && (
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-snug">
                      {latestEvent.description}
                    </p>
                  )}
                  {latestEvent.location?.address?.addressLocality && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-slate-500">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span>
                        {[
                          latestEvent.location.address.addressLocality,
                          latestEvent.location.address.countryCode
                        ].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ANTERIORES (MÁXIMO 2) */}
              {previousEvents.length > 0 && (
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">
                    Movimientos Anteriores
                  </p>
                  <div className="divide-y divide-slate-100">
                    {previousEvents.map((ev, i) => (
                      <div key={i} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-left">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-600 uppercase leading-tight">
                            {formatearTextoEvento(ev, provider, estadoActual, false)}
                          </p>
                          {ev.description && ev.description.trim().toLowerCase() !== formatearTextoEvento(ev, provider, estadoActual, false).trim().toLowerCase() && (
                            <p className="text-[8.5px] font-medium text-slate-400 mt-0.5 leading-tight">
                              {ev.description}
                            </p>
                          )}
                          {ev.location?.address?.addressLocality && (
                            <p className="text-[8.5px] font-medium text-slate-400 mt-0.5">
                              {ev.location.address.addressLocality}
                            </p>
                          )}
                        </div>
                        <span className="text-[8.5px] font-bold text-slate-400 shrink-0 whitespace-nowrap">
                          {formatFecha(ev.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs sm:text-[10px] font-black uppercase hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center touch-manipulation"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
