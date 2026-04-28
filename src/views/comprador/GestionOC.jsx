import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Truck, Globe, ChevronRight, ArrowLeft, Calendar, Hash,
  MapPin, Clock, ChevronDown, ChevronUp, AlertTriangle,
  RefreshCw, Loader2
} from 'lucide-react';
import { consultarTrackingStatus, trackingStatusEnabled } from '../../services/trackingStatusService';
import {
  EventIcon,
  getEventoBadgeClass,
  getStatusConfig,
  getStatusLabel,
} from '../../utils/trackingUi';

export const GestionOC = ({ readOnly = false }) => {
  const [ordenes, setOrdenes] = useState([]);
  const [ocSeleccionada, setOcSeleccionada] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [historialAbierto, setHistorialAbierto] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "ordenesCompra"), orderBy("fechaCreacion", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrdenes(data);
      if (ocSeleccionada) {
        const actualizada = data.find(o => o.id === ocSeleccionada.id);
        if (actualizada) setOcSeleccionada(actualizada);
      }
    });
    return () => unsubscribe();
  }, [ocSeleccionada?.id]);

  useEffect(() => {
    setTrackingInput(ocSeleccionada?.tracking || '');
    setTrackingData(null);
    setTrackingError('');
    setHistorialAbierto(false);
  }, [ocSeleccionada?.id, ocSeleccionada?.tracking]);

  const cambiarEstado = async (e, id, nuevoEstado) => {
    if (readOnly) return;
    e.stopPropagation();
    try {
      const ocRef = doc(db, "ordenesCompra", id);
      await updateDoc(ocRef, { estado: nuevoEstado, fechaUltimoEstado: new Date() });
      setOcSeleccionada(prev => ({ ...prev, estado: nuevoEstado }));
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  const guardarTracking = async (id, valor) => {
    if (readOnly) return;
    try {
      const ocRef = doc(db, "ordenesCompra", id);
      await updateDoc(ocRef, { tracking: valor });
    } catch (error) {
      console.error("Error al guardar tracking:", error);
    }
  };

  const consultarTracking = async () => {
    if (!trackingStatusEnabled) {
      setTrackingError('Tracking API no configurada');
      setTrackingData(null);
      return;
    }
    if (trackingInput.trim().length < 6) {
      setTrackingError('Ingresa un tracking válido (mín. 6 caracteres)');
      setTrackingData(null);
      return;
    }
    try {
      setTrackingLoading(true);
      setTrackingError('');
      setHistorialAbierto(false);
      const result = await consultarTrackingStatus(trackingInput.trim());
      setTrackingData(result);
    } catch (error) {
      setTrackingData(null);
      setTrackingError('No fue posible consultar el tracking en este momento');
    } finally {
      setTrackingLoading(false);
    }
  };

  const calcularTotalOC = (items) =>
    items?.reduce((acc, item) => acc + (Number(item.fobConfirmado || 0) * Number(item.cantidad || 0)), 0) || 0;

  const formatFechaHora = (value) => {
    if (!value) return '--';
    const dateValue = typeof value.toDate === 'function'
      ? value.toDate()
      : value instanceof Date ? value : null;
    if (!dateValue) return '--';
    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
      timeZone: 'America/El_Salvador'
    }).format(dateValue);
  };

  // ─── VISTA DE DETALLE ────────────────────────────────────────────────────────
  if (ocSeleccionada) {
    const mov = trackingData?.latestMovement;
    const eventos = trackingData?.events || [];
    const statusCfg = mov ? getStatusConfig(mov.codigo) : null;
    const statusLabel = mov?.estado || getStatusLabel(mov?.codigo) || statusCfg?.label;

    return (
      <div className="max-w-7xl mx-auto pb-20 animate-in slide-in-from-right duration-300">
        <button
          onClick={() => setOcSeleccionada(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-[0.2em] mb-6 transition-all"
        >
          <ArrowLeft size={14} /> Volver al listado
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">

          {/* HEADER */}
          <div className="bg-slate-900 p-10 flex justify-between items-end">
            <div>
              <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-2">Detalle de Orden de Compra</p>
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">{ocSeleccionada.numeroOC}</h2>
              <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-wider">{ocSeleccionada.proveedor}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-black text-[10px] uppercase mb-2 text-right">Estado Logístico</p>
              <div className="flex gap-2">
                {['Pedido', 'Tránsito', 'Aduana', 'Recibido'].map(est => (
                  <button
                    key={est}
                    onClick={(e) => cambiarEstado(e, ocSeleccionada.id, est)}
                    disabled={readOnly}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all duration-200 ${
                      ocSeleccionada.estado === est
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 translate-y-[-2px]'
                        : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {est}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-10">

            {/* ── SECCIÓN TRACKING ── */}
            <div className="mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">

              {/* Fila: input + total */}
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Globe size={14} className="text-emerald-500" /> Número de Seguimiento (Tracking)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                      onBlur={(e) => guardarTracking(ocSeleccionada.id, e.target.value)}
                      disabled={readOnly}
                      placeholder="INGRESA EL TRACKING Y PRESIONA FUERA PARA GUARDAR..."
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-xs font-black outline-none focus:border-emerald-500 transition-all uppercase shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={consultarTracking}
                      disabled={trackingLoading}
                      className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wide hover:bg-emerald-600 transition-all whitespace-nowrap disabled:opacity-60"
                    >
                      {trackingLoading
                        ? <><Loader2 size={13} className="animate-spin" /> Consultando...</>
                        : <><RefreshCw size={13} /> Consultar</>
                      }
                    </button>
                  </div>
                  {trackingError && (
                    <p className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-rose-600">
                      <AlertTriangle size={11} /> {trackingError}
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="text-right shrink-0 pl-4 border-l border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de la Orden</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">
                    ${calcularTotalOC(ocSeleccionada.items).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* ── ÚLTIMO MOVIMIENTO (siempre visible tras consultar) ── */}
              {mov && statusCfg && (
                <div className={`mt-5 rounded-2xl border ${statusCfg.card} overflow-hidden`}>

                  {/* Cabecera del movimiento */}
                  <div className="flex items-start gap-4 p-4">
                    <div className={`mt-0.5 p-2 rounded-xl bg-white shadow-sm border ${statusCfg.card}`}>
                      <EventIcon code={mov.codigo} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-xs font-black text-slate-800 uppercase leading-tight">
                          {mov.descripcion}
                        </p>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border ${statusCfg.badge}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <MapPin size={11} className="text-slate-400" />
                          {mov.locacion || '--'}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <Clock size={11} className="text-slate-400" />
                          {mov.fecha ? formatFechaHora(new Date(mov.fecha)) : '--'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botón de historial */}
                  {eventos.length > 0 && (
                    <button
                      onClick={() => setHistorialAbierto(h => !h)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-current border-opacity-10 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-all"
                    >
                      {historialAbierto
                        ? <><ChevronUp size={12} /> Ocultar historial</>
                        : <><ChevronDown size={12} /> Ver historial ({eventos.length} eventos)</>
                      }
                    </button>
                  )}
                </div>
              )}

              {/* ── HISTORIAL DESPLEGABLE ── */}
              {historialAbierto && eventos.length > 0 && (
                <div className="mt-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      {eventos.map((ev, idx) => {
                        const eventCode = ev.status || ev.statusCode;
                        const eventLabel = getStatusLabel(eventCode);

                        return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 px-4 py-3 ${idx !== eventos.length - 1 ? 'border-b border-slate-50' : ''}`}
                    >
                      {/* Línea de tiempo */}
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <EventIcon code={eventCode} size={13} />
                        {idx !== eventos.length - 1 && (
                          <div className="w-px flex-1 bg-slate-100 mt-1.5 min-h-[16px]" />
                        )}
                      </div>

                      {/* Contenido del evento */}
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-[10px] font-black text-slate-700 uppercase leading-tight">
                          {ev.description}
                        </p>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-0.5">
                          <MapPin size={10} />
                          {ev.location?.address?.addressLocality || '--'}
                        </span>
                      </div>

                      {/* Badge + fecha */}
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getEventoBadgeClass(eventCode)}`}>
                          {eventLabel}
                        </span>
                        <p className="flex items-center justify-end gap-1 text-[10px] font-bold text-slate-400 mt-1">
                          <Clock size={10} />
                          {ev.timestamp ? formatFechaHora(new Date(ev.timestamp)) : '--'}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          Codigo: {eventCode || '--'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
            {/* ── FIN SECCIÓN TRACKING ── */}

            {/* TABLA DE ÍTEMS */}
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="text-left px-6 py-4">Ítem / Descripción</th>
                  <th className="text-center px-6 py-4">Cant.</th>
                  <th className="text-right px-6 py-4">FOB Unit.</th>
                  <th className="text-right px-6 py-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {ocSeleccionada.items?.map((item, idx) => (
                  <tr key={idx} className="bg-white group shadow-sm">
                    <td className="px-6 py-5 text-xs font-black text-slate-700 uppercase rounded-l-2xl border-y border-l border-slate-100">{item.descripcion}</td>
                    <td className="px-6 py-5 text-center text-xs font-bold text-slate-500 border-y border-slate-100">{item.cantidad}</td>
                    <td className="px-6 py-5 text-right text-xs font-bold text-slate-500 border-y border-slate-100">${Number(item.fobConfirmado || 0).toFixed(2)}</td>
                    <td className="px-6 py-5 text-right text-xs font-black text-slate-900 rounded-r-2xl border-y border-r border-slate-100">
                      ${(Number(item.fobConfirmado || 0) * Number(item.cantidad || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── VISTA DE TABLA PRINCIPAL ────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-800 italic uppercase tracking-tighter">Gestión de Órdenes</h1>
        <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.3em]">Bandeja Logística de Compras</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest">Orden No.</th>
              <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest">Proveedor</th>
              <th className="text-center px-8 py-6 text-[10px] font-black uppercase tracking-widest">Fecha</th>
              <th className="text-center px-8 py-6 text-[10px] font-black uppercase tracking-widest">Últ. Cambio</th>
              <th className="text-center px-8 py-6 text-[10px] font-black uppercase tracking-widest">Logística</th>
              <th className="text-right px-8 py-6 text-[10px] font-black uppercase tracking-widest">Monto</th>
              <th className="px-8 py-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {ordenes.map(oc => (
              <tr
                key={oc.id}
                onClick={() => setOcSeleccionada(oc)}
                className="hover:bg-slate-50 transition-all cursor-pointer group"
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                      <Hash size={14} />
                    </div>
                    <span className="font-black text-xs uppercase text-slate-800">{oc.numeroOC}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-xs font-bold uppercase text-slate-600">{oc.proveedor}</td>
                <td className="px-8 py-6 text-center">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                    <Calendar size={12} /> {formatFechaHora(oc.fechaCreacion)}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className="text-[10px] font-black text-emerald-600 uppercase italic">
                    {formatFechaHora(oc.fechaUltimoEstado)}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className={`px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-tighter ${
                    oc.estado === 'Recibido' ? 'bg-emerald-100 text-emerald-600' :
                    oc.estado === 'Aduana'   ? 'bg-amber-100 text-amber-600' :
                    oc.estado === 'Tránsito' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {oc.estado}
                  </span>
                </td>
                <td className="px-8 py-6 text-right font-black text-xs text-slate-900">
                  ${calcularTotalOC(oc.items).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-8 py-6 text-right">
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-800 transition-all group-hover:translate-x-1" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};