import React, { useState } from 'react';
import {
  Copy, Check, Truck, ShieldCheck, CheckCircle2,
  MapPin, Clock, Package, AlertTriangle
} from 'lucide-react';
import { interpretarEstadoLogistico, ESTADOS_SISTEMA } from '../utils/interpretarEstadoLogistico';
import { getStatusLabel, getDsvEventLabel, getDescripcionUi } from '../utils/trackingUi';
import { Etiqueta } from './Etiqueta';
import { Modal, ModalBoton, ModalCallout, ModalCuerpo, ModalEncabezado, ModalPie } from './Modal';

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

  const tituloSeguimiento = trackingNumber?.toUpperCase().startsWith('1Z') ? 'Seguimiento UPS' : provider === 'DSV' ? 'Seguimiento de embarque' : 'Seguimiento aéreo';

  return (
    <Modal etiqueta={tituloSeguimiento} variante="hoja" ancho="lg" onCerrar={onClose}>
      <ModalEncabezado
        titulo={esAdminOComprador ? (trackingNumber || '--') : tituloSeguimiento}
        subtitulo={esAdminOComprador ? tituloSeguimiento : undefined}
        referencia={rfqLabel}
        icono={Truck}
        tono="azul"
        onCerrar={onClose}
      >
        <div className="mt-2 flex items-center gap-2">
          {trackingNumber?.toUpperCase().startsWith('1Z') ? (
            <img src="/ups_logo.png" alt="UPS" className="h-6 w-auto object-contain shrink-0" />
          ) : (
            <div className="h-6 w-14 bg-white rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
              {provider === 'DSV' ? (
                <img src="/dsv_logo.jpg" alt="DSV" className="w-full h-full object-cover" />
              ) : (
                <img src="/dhl.svg" alt="DHL" className="w-full h-full object-cover" />
              )}
            </div>
          )}
          {esAdminOComprador && trackingNumber && (
            <button
              type="button"
              onClick={copiarGuia}
              title="Copiar guía"
              className="flex size-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-200/70 hover:text-neutral-700"
            >
              {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </ModalEncabezado>

        {/* BODY */}
      <ModalCuerpo>
          {notice && (
            <ModalCallout tono="aviso" icono={Clock}>{notice}</ModalCallout>
          )}

          {loading && (
            <div className="py-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto" />
              <p className="text-[13.5px] text-neutral-500">Consultando tracking...</p>
            </div>
          )}

          {!loading && error && (
            <ModalCallout tono="peligro" icono={AlertTriangle}>{error}</ModalCallout>
          )}

          {!loading && !error && (
            <>
              {/* STEPPER LOGISTICO */}
              <div className="rounded-[14px] bg-neutral-100 p-3.5">
                <p className="mb-3 text-[13px] font-medium text-neutral-500">Progreso del envío</p>
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
                        <span className={`mt-2 text-xs ${colorText}`}>
                          {paso.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EVENTO ACTUAL */}
              {latestEvent && (
                <div className="rounded-[14px] bg-neutral-100 p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Etiqueta tono="exito">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Estado actual
                    </Etiqueta>
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
                  <p className="text-[14.5px] font-semibold leading-snug text-neutral-900">
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
                <div className="space-y-3 rounded-[14px] bg-neutral-100 p-3.5">
                  <p className="text-[13px] font-medium text-neutral-500">
                    Movimientos anteriores
                  </p>
                  <div className="divide-y divide-slate-100">
                    {previousEvents.map((ev, i) => (
                      <div key={i} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-left">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-medium leading-tight text-neutral-700">
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
      </ModalCuerpo>

      <ModalPie>
        <ModalBoton variante="primario" tono="neutral" onClick={onClose}>Cerrar</ModalBoton>
      </ModalPie>
    </Modal>
  );
};
