import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Truck, Globe, ChevronRight, ArrowLeft, Calendar, Hash,
  AlertTriangle, RefreshCw, Loader2, Calendar as CalendarIcon, Trash2,
  Filter, SlidersHorizontal, Clock, Package
} from 'lucide-react';
import { consultarTrackingStatus, trackingStatusEnabled } from '../../services/trackingStatusService';
import { ShipmentTracker } from '../../components/ShipmentTracker';
import { usePersistedState } from '../../hooks/usePersistedState';
import { normalizarBusqueda } from '../../utils/normalizers';
import { interpretarEstadoLogistico } from '../../utils/interpretarEstadoLogistico';

export const GestionOC = ({ readOnly = false }) => {
  const [ordenes, setOrdenes] = useState([]);
  const [ocSeleccionada, setOcSeleccionada] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Estados de filtros para Gestión de OC (persistidos en localStorage)
  const [searchOCNum, setSearchOCNum] = usePersistedState('goc_searchOCNum', '');
  const [filterProveedor, setFilterProveedor] = usePersistedState('goc_filterProveedor', '');
  const [filterEstadoLogistica, setFilterEstadoLogistica] = usePersistedState('goc_filterEstadoLogistica', '');
  
  // Rango de Fecha Creación (Calendario Popover)
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesActual, setMesActual] = useState(new Date());
  const refCalendario = useRef(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFiltersCount = [
    Boolean(filterProveedor),
    Boolean(filterEstadoLogistica),
    Boolean(fechaInicio || fechaFin)
  ].filter(Boolean).length;

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    const clickFuera = (e) => {
      if (refCalendario.current && !refCalendario.current.contains(e.target)) {
        setMostrarCalendario(false);
      }
    };
    document.addEventListener('mousedown', clickFuera);
    return () => document.removeEventListener('mousedown', clickFuera);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "ordenesCompra"), orderBy("fechaCreacion", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrdenes(data);
      setOcSeleccionada(prev => {
        if (!prev) return null;
        const actualizada = data.find(o => o.id === prev.id);
        if (!actualizada) return prev;
        if (
          actualizada.estado === prev.estado &&
          actualizada.tracking === prev.tracking &&
          actualizada.ultimaActualizacion?.seconds === prev.ultimaActualizacion?.seconds &&
          actualizada.fechaUltimoEstado?.seconds === prev.fechaUltimoEstado?.seconds
        ) {
          return prev;
        }
        return { ...prev, ...actualizada };
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTrackingInput(ocSeleccionada?.tracking || '');
      setTrackingData(null);
      setTrackingError('');
    }, 0);
    return () => clearTimeout(timer);
  }, [ocSeleccionada?.id, ocSeleccionada?.tracking]);

  const cambiarEstado = async (e, id, nuevoEstado) => {
    if (readOnly) return;
    e.stopPropagation();
    const ahora = new Date();
    // 1. Actualización optimista inmediata (0ms)
    setOcSeleccionada(prev => (prev ? { ...prev, estado: nuevoEstado, fechaUltimoEstado: ahora } : prev));
    try {
      const ocRef = doc(db, "ordenesCompra", id);
      await updateDoc(ocRef, {
        estado: nuevoEstado,
        fechaUltimoEstado: serverTimestamp(),
      });
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
      const result = await consultarTrackingStatus(trackingInput.trim());
      setTrackingData(result);

      if (ocSeleccionada?.id && result) {
        const estadoNuevo = interpretarEstadoLogistico(result, ocSeleccionada.estado);
        if (estadoNuevo !== ocSeleccionada.estado) {
          const ocRef = doc(db, 'ordenesCompra', ocSeleccionada.id);
          await updateDoc(ocRef, {
            estado: estadoNuevo,
            ultimaActualizacion: serverTimestamp(),
          });
          setOcSeleccionada(prev => ({ ...prev, estado: estadoNuevo }));
        }
      }
    } catch {
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

  // Dinámicos únicos para filtros
  const proveedoresDisponibles = Array.from(new Set(ordenes.map(o => o.proveedor).filter(Boolean)));
  const estadosLogisticaDisponibles = ['Pedido', 'Tránsito', 'Aduana', 'Recibido'];

  // Calendario popover helpers
  const handleSelectDia = (diaDate) => {
    if (!fechaInicio || (fechaInicio && fechaFin)) {
      setFechaInicio(diaDate);
      setFechaFin(null);
    } else if (fechaInicio && !fechaFin) {
      if (diaDate < fechaInicio) {
        setFechaInicio(diaDate);
      } else {
        setFechaFin(diaDate);
        setMostrarCalendario(false);
      }
    }
  };

  const getDiasDelMes = () => {
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    const primerDiaSemana = new Date(año, mes, 1).getDay();
    const totalDias = new Date(año, mes + 1, 0).getDate();
    const dias = [];
    for (let i = 0; i < primerDiaSemana; i++) dias.push(null);
    for (let i = 1; i <= totalDias; i++) dias.push(new Date(año, mes, i));
    return dias;
  };

  const cambiarMes = (offset) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + offset, 1));
  };

  const formattedRangoText = () => {
    if (!fechaInicio) return 'Elegir Rango / Día';
    const opt = { day: '2-digit', month: 'short' };
    const iniStr = fechaInicio.toLocaleDateString('es-ES', opt);
    if (!fechaFin) return iniStr;
    return `${iniStr} - ${fechaFin.toLocaleDateString('es-ES', opt)}`;
  };

  // Aplicar filtros a las órdenes
  const filteredOrdenes = ordenes.filter(oc => {
    // Buscar por Orden, Ítems o Tracking
    if (searchOCNum) {
      const termNormalized = normalizarBusqueda(searchOCNum);
      if (termNormalized) {
        const matchOC = normalizarBusqueda(oc.numeroOC).includes(termNormalized);
        const matchTracking = normalizarBusqueda(oc.tracking).includes(termNormalized);
        const matchItems = oc.items?.some(item => 
          normalizarBusqueda(item.descripcion || item.desc).includes(termNormalized) ||
          normalizarBusqueda(item.marca).includes(termNormalized)
        );
        if (!matchOC && !matchTracking && !matchItems) return false;
      }
    }

    // Filtrar por proveedor
    if (filterProveedor && oc.proveedor !== filterProveedor) return false;

    // Filtrar por estado logístico
    if (filterEstadoLogistica && oc.estado !== filterEstadoLogistica) return false;

    // Filtrar por Rango de fecha de creación
    if (fechaInicio || fechaFin) {
      if (!oc.fechaCreacion) return false;
      const dateCreacion = oc.fechaCreacion.toDate ? oc.fechaCreacion.toDate() : new Date(oc.fechaCreacion);
      const dComp = new Date(dateCreacion.getFullYear(), dateCreacion.getMonth(), dateCreacion.getDate());

      if (fechaInicio) {
        const dIni = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
        if (dComp < dIni) return false;
      }
      if (fechaFin) {
        const dFin = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
        if (dComp > dFin) return false;
      }
    }

    return true;
  });

  // ─── VISTA DE DETALLE ────────────────────────────────────────────────────────
  if (ocSeleccionada) {
    const totalOrden = calcularTotalOC(ocSeleccionada.items);
    const totalPiezas = ocSeleccionada.items?.reduce((acc, it) => acc + Number(it.cantidad || 0), 0) || 0;

    return (
      <div className="max-w-7xl mx-auto pb-32 md:pb-20 animate-in slide-in-from-right duration-300">
        {/* Barra superior de regreso */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <button
            onClick={() => setOcSeleccionada(null)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-black text-xs uppercase tracking-wide border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft size={14} /> <span>Volver al listado</span>
          </button>
          <div className="md:hidden flex items-center gap-1 text-[11px] font-mono font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            <Hash size={12} className="text-slate-400" />
            <span>{ocSeleccionada.numeroOC}</span>
          </div>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-xl md:shadow-2xl border border-slate-100 overflow-hidden">
          
          {/* HEADER ESCRITORIO (>= md) */}
          <div className="hidden md:flex bg-slate-900 p-8 lg:p-10 flex-col md:flex-row justify-between md:items-end gap-6">
            <div>
              <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-2">Detalle de Orden de Compra</p>
              <h2 className="text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter">{ocSeleccionada.numeroOC}</h2>
              <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-wider">{ocSeleccionada.proveedor}</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-500 font-black text-[9.5px] uppercase tracking-wider">Estado Logístico</span>
                {ocSeleccionada.fechaUltimoEstado && (
                  <>
                    <span className="text-slate-700 font-black text-[9px]">•</span>
                    <span className="text-slate-400 font-bold text-[9px] tracking-tight">
                      Actualizado {formatFechaHora(ocSeleccionada.fechaUltimoEstado)}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {['Pedido', 'Tránsito', 'Aduana', 'Recibido'].map(est => (
                  <button
                    key={est}
                    onClick={(e) => cambiarEstado(e, ocSeleccionada.id, est)}
                    disabled={readOnly}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all duration-200 text-center ${
                      ocSeleccionada.estado === est
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 -translate-y-0.5'
                        : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {est}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* HEADER MÓVIL (< md): Minimalista, compacto y estilizado */}
          <div className="md:hidden bg-slate-900 p-4 text-white space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="inline-block text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded-md uppercase mb-1 truncate max-w-[200px]">
                  {ocSeleccionada.proveedor}
                </span>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight truncate">
                  {ocSeleccionada.numeroOC}
                </h2>
              </div>
              {ocSeleccionada.fechaUltimoEstado && (
                <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium shrink-0 mt-1">
                  <Clock size={11} className="text-emerald-400 shrink-0" />
                  <span>{formatFechaHora(ocSeleccionada.fechaUltimoEstado)}</span>
                </div>
              )}
            </div>

            {/* Segmented Control para Estado Logístico en Mobile */}
            <div className="pt-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                Estado Logístico
              </span>
              <div className="grid grid-cols-4 gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
                {['Pedido', 'Tránsito', 'Aduana', 'Recibido'].map(est => {
                  const isCurrent = ocSeleccionada.estado === est;
                  return (
                    <button
                      key={est}
                      type="button"
                      onClick={(e) => cambiarEstado(e, ocSeleccionada.id, est)}
                      disabled={readOnly}
                      className={`py-2 px-1 rounded-lg font-black text-[10px] uppercase transition-all text-center truncate ${
                        isCurrent
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {est}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-6 md:p-10">
            {/* Resumen Móvil (< md): Tarjetas de Total y Partidas */}
            <div className="md:hidden grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total de la Orden</span>
                <span className="text-base font-black text-slate-900 font-mono block truncate">
                  ${totalOrden.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Partidas</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-black text-slate-900 font-mono">
                    {ocSeleccionada.items?.length || 0}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    ({totalPiezas} {totalPiezas === 1 ? 'ud' : 'uds'})
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN TRACKING */}
            <div className="mb-6 md:mb-10 bg-slate-50 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-inner">
              <div className="flex flex-col md:flex-row md:items-start gap-4 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Globe size={13} className="text-emerald-500" /> Número de Seguimiento (Tracking)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                      onBlur={(e) => guardarTracking(ocSeleccionada.id, e.target.value)}
                      disabled={readOnly}
                      placeholder="Ingresa tracking (ej. 1234567890)..."
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-xs font-black outline-none transition-all uppercase shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={consultarTracking}
                      disabled={trackingLoading}
                      className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wide hover:bg-emerald-600 transition-all whitespace-nowrap disabled:opacity-60 cursor-pointer shrink-0"
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

                {/* Total en Desktop (>= md) */}
                <div className="hidden md:block text-right shrink-0 md:pl-6 md:border-l border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de la Orden</p>
                  <p className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter font-mono">
                    ${totalOrden.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <ShipmentTracker shipmentData={trackingData} estadoManual={ocSeleccionada?.estado} />

            {/* TABLA / TARJETAS DE ÍTEMS */}
            <div className="mt-6 md:mt-8">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Ítems de la Orden</h3>
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full md:hidden">
                  {ocSeleccionada.items?.length || 0} {ocSeleccionada.items?.length === 1 ? 'partida' : 'partidas'}
                </span>
              </div>
              
              {/* Tarjetas Espaciosas en Mobile (< md) */}
              <div className="md:hidden space-y-3">
                {ocSeleccionada.items?.map((item, idx) => {
                  const fob = Number(item.fobConfirmado || 0);
                  const cant = Number(item.cantidad || 0);
                  const total = fob * cant;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 transition-all"
                    >
                      {/* Fila 1: Cantidad + Marca + Total de línea */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="text-[11px] font-black text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg shrink-0">
                            {cant} {cant === 1 ? 'unidad' : 'unidades'}
                          </span>
                          {item.marca && (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg uppercase truncate max-w-[150px]">
                              {item.marca}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Línea</span>
                          <span className="text-base font-black text-slate-900 font-mono">
                            ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Fila 2: Descripción en caja independiente */}
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Descripción</span>
                        <p className="text-xs sm:text-sm font-black text-slate-800 uppercase leading-snug break-words">
                          {item.descripcion || item.desc || 'Sin descripción'}
                        </p>
                      </div>

                      {/* Fila 3: FOB Unitario y Cotización */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                          <span className="text-[10px] text-slate-400 uppercase font-black">FOB Unitario:</span>
                          <span className="font-mono font-black text-slate-800">${fob.toFixed(2)}</span>
                        </div>
                        {item.numCotizacion && (
                          <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                            Cot #{item.numCotizacion}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tabla en Desktop (>= md) */}
              <div className="hidden md:block overflow-x-auto">
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
        </div>
      </div>
    );
  }

  // ─── VISTA DE TABLA PRINCIPAL ────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6 md:mb-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 italic uppercase tracking-tighter">Gestión de Órdenes</h1>
        <p className="text-slate-400 font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.3em]">Bandeja Logística de Compras</p>
      </div>

      {/* Controles de Filtros Mobile (< md) */}
      <div className="md:hidden space-y-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Buscar OC, ítem, tracking..." 
              value={searchOCNum}
              onChange={(e) => setSearchOCNum(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-slate-400 transition-all text-slate-700 shadow-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-black transition-all ${
              activeFiltersCount > 0 || showMobileFilters
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {showMobileFilters && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Proveedor</label>
              <select 
                value={filterProveedor} 
                onChange={(e) => setFilterProveedor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none text-slate-700"
              >
                <option value="">TODOS LOS PROVEEDORES</option>
                {proveedoresDisponibles.map(prov => (
                  <option key={prov} value={prov}>{prov.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado Logístico</label>
              <select 
                value={filterEstadoLogistica} 
                onChange={(e) => setFilterEstadoLogistica(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none text-slate-700"
              >
                <option value="">TODOS LOS ESTADOS</option>
                {estadosLogisticaDisponibles.map(est => (
                  <option key={est} value={est}>{est.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha Creación</label>
              <div className="flex items-center gap-2">
                <div 
                  onClick={() => setMostrarCalendario(!mostrarCalendario)}
                  className="flex-1 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold cursor-pointer text-slate-700"
                >
                  <CalendarIcon size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{formattedRangoText()}</span>
                </div>
                {(fechaInicio || fechaFin) && (
                  <button 
                    onClick={() => { setFechaInicio(null); setFechaFin(null); }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-200 text-xs font-black"
                  >
                    Borrar
                  </button>
                )}
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearchOCNum('');
                  setFilterProveedor('');
                  setFilterEstadoLogistica('');
                  setFechaInicio(null);
                  setFechaFin(null);
                }}
                className="text-xs font-black text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1"
              >
                <Trash2 size={13} /> Limpiar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controles de Filtros Desktop (>= md) */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Buscar (OC / Item / Tracking)</label>
          <input 
            type="text" 
            placeholder="N° OC, ítem, tracking..." 
            value={searchOCNum}
            onChange={(e) => setSearchOCNum(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700"
          />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Proveedor</label>
          <select 
            value={filterProveedor} 
            onChange={(e) => setFilterProveedor(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700 cursor-pointer"
          >
            <option value="">TODOS LOS PROVEEDORES</option>
            {proveedoresDisponibles.map(prov => (
              <option key={prov} value={prov}>{prov.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado Logístico</label>
          <select 
            value={filterEstadoLogistica} 
            onChange={(e) => setFilterEstadoLogistica(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700 cursor-pointer"
          >
            <option value="">TODOS LOS ESTADOS</option>
            {estadosLogisticaDisponibles.map(est => (
              <option key={est} value={est}>{est.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Popover Rango de Fecha Creación */}
        <div className="relative" ref={refCalendario}>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha Creación</label>
          <div className="flex items-center gap-1 bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold cursor-pointer text-slate-700" onClick={() => setMostrarCalendario(!mostrarCalendario)}>
            <CalendarIcon size={14} className="text-slate-400 shrink-0" />
            <span className="truncate flex-1 select-none">{formattedRangoText()}</span>
            {(fechaInicio || fechaFin) && (
              <button onClick={(e) => { e.stopPropagation(); setFechaInicio(null); setFechaFin(null); }} className="hover:text-red-500 font-bold p-0.5">&times;</button>
            )}
          </div>

          {mostrarCalendario && (
            <div className="absolute right-0 mt-2 z-30 bg-white border border-slate-200 shadow-2xl rounded-3xl p-5 w-72 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={() => cambiarMes(-1)} className="hover:bg-slate-100 p-1.5 rounded-lg font-black text-slate-600">&lt;</button>
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  {mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" onClick={() => cambiarMes(1)} className="hover:bg-slate-100 p-1.5 rounded-lg font-black text-slate-600">&gt;</button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 mb-2">
                <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDiasDelMes().map((dia, idx) => {
                  if (!dia) return <div key={`empty-${idx}`} />;
                  const timestampDia = dia.getTime();
                  const isInicio = fechaInicio && timestampDia === fechaInicio.getTime();
                  const isFin = fechaFin && timestampDia === fechaFin.getTime();
                  const isRango = fechaInicio && fechaFin && timestampDia > fechaInicio.getTime() && timestampDia < fechaFin.getTime();

                  let bgClass = 'hover:bg-slate-100 text-slate-700';
                  if (isInicio || isFin) bgClass = 'bg-slate-900 text-white rounded-full font-black';
                  if (isRango) bgClass = 'bg-slate-100 text-slate-900 rounded-none';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDia(dia)}
                      className={`text-center py-1 text-[11px] font-bold rounded-full transition-all ${bgClass}`}
                    >
                      {dia.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-end w-fit pb-1">
          <button
            onClick={() => {
              setSearchOCNum('');
              setFilterProveedor('');
              setFilterEstadoLogistica('');
              setFechaInicio(null);
              setFechaFin(null);
            }}
            title="Limpiar filtros"
            className="flex items-center justify-center bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl w-10 h-10 border border-slate-100 transition-all cursor-pointer shadow-sm"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Vista Móvil (< md): Tarjetas Detalladas y Espaciosas con toda la información de escritorio */}
      <div className="md:hidden space-y-3.5">
        {filteredOrdenes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200 font-bold text-xs">
            No se encontraron órdenes con los filtros aplicados.
          </div>
        ) : (
          filteredOrdenes.map(oc => {
            const total = calcularTotalOC(oc.items);
            const totalItems = oc.items?.length || 0;
            const totalUds = oc.items?.reduce((acc, it) => acc + Number(it.cantidad || 0), 0) || 0;

            return (
              <div
                key={oc.id}
                onClick={() => setOcSeleccionada(oc)}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all cursor-pointer space-y-3 active:scale-[0.99] touch-manipulation"
              >
                {/* Bloque 1: N° OC + Estado Logístico + Proveedor */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-base text-slate-900 tracking-tight">
                        {oc.numeroOC}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wide shrink-0 ${
                        oc.estado === 'Recibido' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        oc.estado === 'Aduana'   ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        oc.estado === 'Tránsito' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {oc.estado}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600 uppercase mt-1 tracking-wide">
                      {oc.proveedor}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 shrink-0 mt-1" />
                </div>

                {/* Bloque 2: Monto Total y Partidas/Piezas */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                      Monto Total
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono tracking-tight block">
                      ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                      Partidas / Piezas
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      <strong className="text-slate-900 font-black">{totalItems}</strong> {totalItems === 1 ? 'ítem' : 'ítems'}
                      <span className="text-slate-400 mx-1">·</span>
                      <strong className="text-slate-900 font-black">{totalUds}</strong> uds
                    </span>
                  </div>
                </div>

                {/* Bloque 3: Guía / BL / Tracking */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide shrink-0">
                    Guía / BL:
                  </span>
                  {oc.tracking ? (
                    <span className="inline-flex items-center gap-1.5 font-mono font-black text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg break-all text-right">
                      <Globe size={13} className="text-blue-500 shrink-0" />
                      <span>{oc.tracking}</span>
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 italic">
                      Sin guía asignada
                    </span>
                  )}
                </div>

                {/* Bloque 4: Fechas estructuradas en líneas independientes */}
                <div className="pt-2.5 border-t border-slate-100 space-y-2 text-[10px]">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5 text-slate-400 font-bold uppercase">
                      <Calendar size={12} className="text-slate-400 shrink-0" />
                      <span>Fecha Creación:</span>
                    </span>
                    <span className="font-bold text-slate-700">
                      {formatFechaHora(oc.fechaCreacion)}
                    </span>
                  </div>

                  {oc.fechaUltimoEstado ? (
                    <div className="flex items-center justify-between text-emerald-800 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100">
                      <span className="flex items-center gap-1.5 font-bold uppercase text-[9px] text-emerald-700">
                        <Clock size={12} className="text-emerald-600 shrink-0" />
                        <span>Último Cambio:</span>
                      </span>
                      <span className="font-black text-[10px] text-emerald-900">
                        {formatFechaHora(oc.fechaUltimoEstado)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Vista Escritorio (>= md): Tabla tradicional */}
      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest">Orden No.</th>
                <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest">Proveedor</th>
                <th className="text-center px-8 py-6 text-[10px] font-black uppercase tracking-widest">Fecha</th>
                <th className="text-center px-8 py-6 text-[10px] font-black uppercase tracking-widest">Últ. Cambio</th>
                <th className="text-center px-8 py-6 text-[10px] font-black uppercase tracking-widest">Guía/BL</th>
                <th className="text-center px-8 py-6 text-[10px] font-black uppercase tracking-widest">Logística</th>
                <th className="text-right px-8 py-6 text-[10px] font-black uppercase tracking-widest">Monto</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrdenes.map(oc => (
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
                    {oc.tracking ? (
                      <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full uppercase border border-slate-200">
                        {oc.tracking}
                      </span>
                    ) : <span className="text-slate-300 italic text-[9px]">-</span>}
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
    </div>
  );
};