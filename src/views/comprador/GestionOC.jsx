import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Truck, Globe, ChevronRight, ArrowLeft, Calendar, Hash,
  AlertTriangle, RefreshCw, Loader2, Calendar as CalendarIcon
} from 'lucide-react';
import { consultarTrackingStatus, trackingStatusEnabled } from '../../services/trackingStatusService';
import { ShipmentTracker } from '../../components/ShipmentTracker';
import { usePersistedState } from '../../hooks/usePersistedState';

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
    // Buscar por Orden NO
    if (searchOCNum) {
      const term = searchOCNum.toLowerCase();
      if (!(oc.numeroOC || '').toLowerCase().includes(term)) return false;
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

                <div className="text-right shrink-0 pl-4 border-l border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de la Orden</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">
                    ${calcularTotalOC(ocSeleccionada.items).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <ShipmentTracker shipmentData={trackingData} />

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

      {/* Controles de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Buscar N° Orden</label>
          <input 
            type="text" 
            placeholder="N° de OC..." 
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