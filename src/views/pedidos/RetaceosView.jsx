import React, { useState, useEffect, useMemo } from 'react';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Truck, Calendar, Hash, Save, Search, Filter } from 'lucide-react';
import { Etiqueta } from '../../components/Etiqueta';
import { BarraFiltros, BotonLimpiar, ContadorResultados, FiltroSelect } from '../../components/filtros';

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
    <PageContainer className="animate-in fade-in duration-500 pb-10">
      <PageHeader
        title={<>Retaceos <span className="text-primary">.</span></>}
        subtitle="Desglose de Aduana"
      />

      <BarraFiltros
        className="mb-6"
        filtrosActivos={(filterMes ? 1 : 0) + (filterProv ? 1 : 0)}
        resultados={filteredData.length}
        filtros={(
          <>
            <FiltroSelect
              value={filterMes}
              onChange={(valor) => setFilterMes(valor)}
              opciones={mesesDisponibles}
              prefijo="Mes:"
              ariaLabel="Filtrar por mes"
            />
            <FiltroSelect
              value={filterProv}
              onChange={(valor) => setFilterProv(valor)}
              opciones={proveedoresDisponibles}
              prefijo="Proveedor:"
              ariaLabel="Filtrar por proveedor"
            />
          </>
        )}
        limpiar={(
          <BotonLimpiar
            activos={(filterMes ? 1 : 0) + (filterProv ? 1 : 0)}
            onClick={() => { setFilterMes(''); setFilterProv(''); }}
          />
        )}
        extremo={<ContadorResultados total={filteredData.length} unidad="retaceos" />}
      />

      <div className="tf-tabla-card overflow-x-auto">
        <table className="tf-tabla text-left min-w-[800px]">
          <thead>
            <tr className="tf-tabla-head">
              <th className="p-4">Mes recibido</th>
              <th className="p-4">N° OC</th>
              <th className="p-4">Proveedor</th>
              <th className="p-4">Retaceo (aduana)</th>
              <th className="p-4">Guía</th>
              <th className="p-4 text-center">Acciones</th>
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
              <tr key={r.id}>
                <td className="p-4">
                  {editandoId === r.id ? (
                    <input 
                      type="date" 
                      value={editForm.fechaStr}
                      onChange={e => setEditForm({...editForm, fechaStr: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-primary"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-600 uppercase">
                      {r.fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <Etiqueta tono="neutral" tamano="normal" mono>
                    {r.numOC}
                  </Etiqueta>
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
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold uppercase outline-none focus:border-primary"
                      placeholder="Ej: A-1234"
                    />
                  ) : (
                    <span className="text-xs font-black text-primary-strong uppercase">{r.correlativoRetaceo || '---'}</span>
                  )}
                </td>
                <td className="p-4">
                  {editandoId === r.id ? (
                    <input 
                      type="text" 
                      value={editForm.guia}
                      onChange={e => setEditForm({...editForm, guia: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold uppercase outline-none focus:border-primary"
                      placeholder="Guía..."
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-500 uppercase">{r.guia || '---'}</span>
                  )}
                </td>
                <td className="p-4 flex items-center justify-center gap-2">
                  {editandoId === r.id ? (
                    <button onClick={() => handleSave(r.id)} className="p-2 bg-primary-soft text-primary-strong rounded-lg hover:bg-primary/15 transition-colors">
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
    </PageContainer>
  );
};
