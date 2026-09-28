import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Truck, Calendar, Hash, Save, Search, Filter } from 'lucide-react';

export const RetaceosView = ({ role }) => {
  const [retaceos, setRetaceos] = useState([]);
  const [ordenes, setOrdenes] = useState({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterMes, setFilterMes] = useState('');
  const [filterProv, setFilterProv] = useState('');

  // Edición Inline
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const unsubRetaceos = onSnapshot(collection(db, 'retaceos'), (snap) => {
      setRetaceos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => { console.warn("Falta regla en retaceos:", err); setRetaceos([]); });

    const unsubOrdenes = onSnapshot(collection(db, 'ordenesCompra'), (snap) => {
      const ocMap = {};
      snap.docs.forEach(d => {
        ocMap[d.id] = { id: d.id, ...d.data() };
      });
      setOrdenes(ocMap);
      setLoading(false);
    });

    return () => { unsubRetaceos(); unsubOrdenes(); };
  }, []);

  const mergedData = useMemo(() => {
    return retaceos.map(r => {
      const oc = ordenes[r.ocId] || {};
      let mesRecibido = '';
      if (r.fechaRecibido) {
        const date = r.fechaRecibido.toDate ? r.fechaRecibido.toDate() : new Date(r.fechaRecibido);
        mesRecibido = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      }
      return {
        ...r,
        numOC: oc.numeroOC || 'N/A',
        proveedor: oc.proveedor || 'N/A',
        mesRecibido,
        fechaObj: r.fechaRecibido?.toDate ? r.fechaRecibido.toDate() : new Date(r.fechaRecibido || Date.now())
      };
    }).sort((a, b) => b.fechaObj - a.fechaObj);
  }, [retaceos, ordenes]);

  const proveedoresDisponibles = useMemo(() => {
    return Array.from(new Set(mergedData.map(r => r.proveedor))).filter(p => p && p !== 'N/A').sort();
  }, [mergedData]);

  const mesesDisponibles = useMemo(() => {
    return Array.from(new Set(mergedData.map(r => r.mesRecibido))).filter(Boolean);
  }, [mergedData]);

  const filteredData = useMemo(() => {
    return mergedData.filter(r => {
      if (filterMes && r.mesRecibido !== filterMes) return false;
      if (filterProv && r.proveedor !== filterProv) return false;
      return true;
    });
  }, [mergedData, filterMes, filterProv]);

  const handleEditClick = (retaceo) => {
    setEditandoId(retaceo.id);
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const dateStr = new Date(retaceo.fechaObj - tzOffset).toISOString().slice(0, 10);
    
    setEditForm({
      correlativoRetaceo: retaceo.correlativoRetaceo || '',
      guia: retaceo.guia || '',
      fechaStr: dateStr
    });
  };

  const handleSave = async (id) => {
    try {
      const [y, m, d] = editForm.fechaStr.split('-');
      const fecha = new Date(y, m - 1, d);
      
      await updateDoc(doc(db, 'retaceos', id), {
        correlativoRetaceo: editForm.correlativoRetaceo,
        guia: editForm.guia,
        fechaRecibido: fecha
      });
      setEditandoId(null);
    } catch (error) {
      console.error(error);
      alert('Error guardando retaceo');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este registro de retaceo?')) {
      await deleteDoc(doc(db, 'retaceos', id));
    }
  };

  if (loading) return <div className="p-8 animate-pulse text-slate-400 font-bold uppercase tracking-widest text-sm">Cargando Retaceos...</div>;

  return (
    <div className="w-full animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 italic uppercase tracking-tighter">
            Retaceos <span className="text-blue-500">.</span>
          </h1>
          <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.3em]">
            Desglose de Aduana
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Mes</label>
          <select 
            value={filterMes}
            onChange={(e) => setFilterMes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="">TODOS LOS MESES</option>
            {mesesDisponibles.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Proveedor</label>
          <select 
            value={filterProv}
            onChange={(e) => setFilterProv(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="">TODOS LOS PROVEEDORES</option>
            {proveedoresDisponibles.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100 p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="p-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mes Recibido</th>
              <th className="p-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">N° OC</th>
              <th className="p-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Proveedor</th>
              <th className="p-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Retaceo (Aduana)</th>
              <th className="p-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Guía</th>
              <th className="p-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                  No hay retaceos registrados
                </td>
              </tr>
            ) : filteredData.map(r => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  {editandoId === r.id ? (
                    <input 
                      type="date" 
                      value={editForm.fechaStr}
                      onChange={e => setEditForm({...editForm, fechaStr: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-600 uppercase">
                      {r.fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-black text-slate-700 font-mono">
                    {r.numOC}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-xs font-black text-slate-700 uppercase">{r.proveedor}</span>
                </td>
                <td className="p-4">
                  {editandoId === r.id ? (
                    <input 
                      type="text" 
                      value={editForm.correlativoRetaceo}
                      onChange={e => setEditForm({...editForm, correlativoRetaceo: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold uppercase outline-none focus:border-blue-500"
                      placeholder="Ej: A-1234"
                    />
                  ) : (
                    <span className="text-xs font-black text-blue-700 uppercase">{r.correlativoRetaceo || '---'}</span>
                  )}
                </td>
                <td className="p-4">
                  {editandoId === r.id ? (
                    <input 
                      type="text" 
                      value={editForm.guia}
                      onChange={e => setEditForm({...editForm, guia: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold uppercase outline-none focus:border-blue-500"
                      placeholder="Guía..."
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-500 uppercase">{r.guia || '---'}</span>
                  )}
                </td>
                <td className="p-4 flex items-center justify-center gap-2">
                  {editandoId === r.id ? (
                    <button onClick={() => handleSave(r.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                      <Save size={16} />
                    </button>
                  ) : (
                    <button onClick={() => handleEditClick(r)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-xs">
                      Editar
                    </button>
                  )}
                  {editandoId === r.id ? (
                    <button onClick={() => setEditandoId(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-xs">
                      Cancelar
                    </button>
                  ) : (
                    <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
