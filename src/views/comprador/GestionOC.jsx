import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Truck, Globe, ChevronRight, ArrowLeft, Calendar, Hash } from 'lucide-react';
import { consultarTrackingStatus, trackingStatusEnabled } from '../../services/trackingStatusService';

export const GestionOC = ({ readOnly = false }) => {
  const [ordenes, setOrdenes] = useState([]);
  const [ocSeleccionada, setOcSeleccionada] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    const q = query(collection(db, "ordenesCompra"), orderBy("fechaCreacion", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrdenes(data);
      
      // Esto mantiene el detalle actualizado si hay cambios en tiempo real
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
    e.stopPropagation(); // Evita conflictos de clics
    try {
      const ocRef = doc(db, "ordenesCompra", id);
      await updateDoc(ocRef, { 
        estado: nuevoEstado,
        fechaUltimoEstado: new Date() 
      });
      // Actualizamos el estado local inmediatamente para respuesta visual
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
      setTrackingError('Ingresa un tracking valido (min 6 caracteres)');
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

  const calcularTotalOC = (items) => {
    return items?.reduce((acc, item) => acc + (Number(item.fobConfirmado || 0) * Number(item.cantidad || 0)), 0) || 0;
  };

  // VISTA DE DETALLE
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
            <div className="mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-8 shadow-inner">
               <div className="flex-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Globe size={14} className="text-emerald-500" /> Número de Seguimiento (Tracking)
                  </label>
                  <div className="flex gap-3 items-start">
                    <input 
                      type="text"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                      onBlur={(e) => guardarTracking(ocSeleccionada.id, e.target.value)}
                      disabled={readOnly}
                      placeholder="DIGITE EL TRACKING Y PRESIONE FUERA PARA GUARDAR..."
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-xs font-black outline-none focus:border-emerald-500 transition-all uppercase shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={consultarTracking}
                      disabled={trackingLoading}
                      className="px-5 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wide hover:bg-emerald-600 transition-all"
                    >
                      {trackingLoading ? 'Consultando...' : 'Consultar DHL'}
                    </button>
                  </div>

                  {trackingError && (
                    <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-rose-600">{trackingError}</p>
                  )}

                  {trackingData && (
                    <div className="mt-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50">
                      <p className="text-[10px] font-black uppercase text-emerald-700">
                        Estado: {trackingData.status || 'Sin estado'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-600 mt-1">
                        {trackingData.description || 'Sin detalle'}
                      </p>
                    </div>
                  )}
               </div>
               <div className="text-right px-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Total de la Orden</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">${calcularTotalOC(ocSeleccionada.items).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
               </div>
            </div>

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

  // VISTA DE TABLA PRINCIPAL
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
                    <Calendar size={12} /> {oc.fechaCreacion?.toDate().toLocaleDateString() || '--'}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className="text-[10px] font-black text-emerald-600 uppercase italic">
                    {oc.fechaUltimoEstado?.toDate().toLocaleDateString() || '--'}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className={`px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-tighter ${
                    oc.estado === 'Recibido' ? 'bg-emerald-100 text-emerald-600' :
                    oc.estado === 'Aduana' ? 'bg-amber-100 text-amber-600' :
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