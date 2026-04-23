import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const Calculadora = ({ onGuardar }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState([]);
  const [flete, setFlete] = useState(0);
  const [aduana, setAduana] = useState(0);
  const [factorA, setFactorA] = useState(1);
  const factorM_Standard = 1.08;

  useEffect(() => {
    const fetchRFQ = async () => {
      try {
        const docRef = doc(db, "solicitudes", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setRfq(data);
          
          setItems((data.productos || []).map(p => ({
            ...p,
            fob: p.fob || 0,
            fva: p.fva || 1.30,
            fvm: p.fvm || 1.25,
            entregaA: p.entregaA || '',
            entregaM: p.entregaM || '',
            notas: p.notas || '',
            marca: p.marca || '',
            selected: typeof p.selected === 'boolean' ? p.selected : true 
          })));

          setFlete(data.fleteAereo || 0);
          setAduana(data.aduanaAerea || 0);
        } else {
          navigate('/compras');
        }
      } catch (error) {
        console.error("Error cargando RFQ:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRFQ();
  }, [id, navigate]);

  const tienePendientes = items.filter(p => p.selected).some(p => Number(p.fob) <= 0);

  useEffect(() => {
    const seleccionados = items.filter(p => p.selected);
    const totalFobPartida = seleccionados.reduce((acc, p) => acc + (Number(p.fob) * p.cant), 0);
    
    if (totalFobPartida > 0) {
      const nuevoFactor = (totalFobPartida + Number(flete) + Number(aduana)) / totalFobPartida;
      setFactorA(nuevoFactor);
    } else {
      setFactorA(1);
    }
  }, [flete, aduana, items]);

  const updateItem = (idx, campo, valor) => {
    const nuevos = [...items];
    nuevos[idx][campo] = valor;
    setItems(nuevos);
  };

  const ejecutarGuardado = async () => {
    const exito = await onGuardar(items, factorA, factorM_Standard, flete, aduana);
    if (exito) {
      navigate('/compras');
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center font-black text-slate-400 animate-pulse uppercase tracking-widest">
      Cargando Calculadora de Márgenes...
    </div>
  );

  return (
    <div className="max-w-[99%] mx-auto animate-in fade-in duration-500 pb-28">
      {/* Panel de Control de Costos */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center gap-8">
        <div className="flex-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">Calculadora de Márgenes</h2>
          <p className="text-slate-500 text-xs uppercase font-bold">{rfq?.correlativo} — {rfq?.cliente}</p>
        </div>
        
        <div className="flex gap-4 bg-slate-900 p-4 rounded-xl shadow-lg shadow-slate-200">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase">Flete Aéreo ($)</label>
            <input 
              type="number" 
              className="bg-transparent font-bold text-white outline-none w-20 text-lg border-b border-slate-700 focus:border-emerald-500" 
              value={flete} 
              onChange={(e) => setFlete(e.target.value)} 
            />
          </div>
          <div className="flex flex-col border-l border-slate-700 pl-4">
            <label className="text-[9px] font-black text-slate-400 uppercase">Aduana Aéreo ($)</label>
            <input 
              type="number" 
              className="bg-transparent font-bold text-white outline-none w-20 text-lg border-b border-slate-700 focus:border-emerald-500" 
              value={aduana} 
              onChange={(e) => setAduana(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="text-right px-5 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-[9px] block text-emerald-600 font-black uppercase tracking-widest">Factor Aéreo</span>
            <span className="text-2xl font-black text-emerald-700">{factorA.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-slate-800 text-white text-[9px] uppercase font-bold">
            <tr>
              <th className="p-3 w-10 text-center">Sel</th>
              <th className="p-3 w-48">Producto / Marca</th>
              <th className="p-3 w-12 text-center">Cant</th>
              <th className="p-3 w-20 text-center">FOB Unit</th>
              <th className="p-3 w-24 text-center bg-emerald-900/40 font-black text-emerald-400">Venta (A)</th>
              <th className="p-3 w-16 text-center bg-emerald-900/60">% Renta</th>
              <th className="p-3 w-24 text-center bg-blue-900/40 font-black text-blue-400">Venta (M)</th>
              <th className="p-3 w-16 text-center bg-blue-900/60">% Renta</th>
              <th className="p-3 w-32">Entrega</th>
              <th className="p-3 w-32">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px]">
            {items.map((p, idx) => {
              const landedA = p.selected ? (Number(p.fob) * factorA) : (p.landedA || 0);
              const ventaA = landedA * Number(p.fva);
              const rentaA = ventaA > 0 ? ((ventaA - landedA) / ventaA) * 100 : 0;
              
              const landedM = Number(p.fob) * factorM_Standard;
              const ventaM = landedM * Number(p.fvm);
              const rentaM = ventaM > 0 ? ((ventaM - landedM) / ventaM) * 100 : 0;

              return (
                <tr key={idx} className={`${p.selected ? 'bg-white' : 'bg-slate-50 opacity-40'} hover:bg-slate-50/50 transition-all`}>
                  <td className="p-2 text-center">
                    <input type="checkbox" checked={p.selected} 
                           onChange={(e) => updateItem(idx, 'selected', e.target.checked)}
                           className="w-4 h-4 accent-emerald-500 cursor-pointer" />
                  </td>
                  <td className="p-2">
                    <input type="text" className="font-bold text-slate-800 w-full outline-none bg-transparent uppercase" 
                           value={p.desc || p.descripcion} onChange={(e) => updateItem(idx, 'desc', e.target.value)} />
                    <input type="text" className="text-[10px] text-blue-600 w-full outline-none bg-transparent italic font-bold" 
                           value={p.marca} onChange={(e) => updateItem(idx, 'marca', e.target.value)} placeholder="Indicar marca..." />
                  </td>
                  <td className="p-2 text-center font-bold">{p.cant}</td>
                  <td className="p-2">
                    <input type="number" className="w-full p-1 border rounded text-center font-bold text-emerald-600" 
                           value={p.fob} onChange={(e) => updateItem(idx, 'fob', e.target.value)} />
                  </td>

                  <td className="p-2 text-center bg-emerald-50/20">
                     <div className="font-black text-emerald-600 text-sm">${ventaA.toFixed(2)}</div>
                     <div className="flex items-center justify-center gap-1 text-[9px] mt-1">
                        <span className="text-slate-400 font-bold italic">FVA:</span>
                        <input type="number" step="0.01" className="w-8 border-b outline-none text-center bg-transparent font-bold" 
                               value={p.fva} onChange={(e) => updateItem(idx, 'fva', e.target.value)} />
                     </div>
                  </td>
                  <td className="p-2 text-center bg-emerald-100/30">
                    <span className={`font-bold px-2 py-1 rounded-md ${rentaA < 20 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        {rentaA.toFixed(0)}%
                    </span>
                  </td>

                  <td className="p-2 text-center bg-blue-50/20">
                     <div className="font-black text-blue-600 text-sm">${ventaM.toFixed(2)}</div>
                     <div className="flex items-center justify-center gap-1 text-[9px] mt-1">
                        <span className="text-slate-400 font-bold italic">FVM:</span>
                        <input type="number" step="0.01" className="w-8 border-b outline-none text-center bg-transparent font-bold" 
                               value={p.fvm} onChange={(e) => updateItem(idx, 'fvm', e.target.value)} />
                     </div>
                  </td>
                  <td className="p-2 text-center bg-blue-100/30">
                    <span className={`font-bold px-2 py-1 rounded-md ${rentaM < 15 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                        {rentaM.toFixed(0)}%
                    </span>
                  </td>

                  <td className="p-2">
                    <div className="flex flex-col gap-1">
                        <input type="text" className="text-[9px] border-b outline-none" placeholder="Aéreo: 10 días" 
                               value={p.entregaA} onChange={(e) => updateItem(idx, 'entregaA', e.target.value)} />
                        <input type="text" className="text-[9px] border-b outline-none" placeholder="Marít: 45 días" 
                               value={p.entregaM} onChange={(e) => updateItem(idx, 'entregaM', e.target.value)} />
                    </div>
                  </td>
                  <td className="p-2">
                    <textarea className="w-full text-[9px] border rounded p-1 h-10 outline-none" 
                              value={p.notas} onChange={(e) => updateItem(idx, 'notas', e.target.value)} placeholder="Notas..."></textarea>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ACCIONES INFERIORES */}
      <div className="fixed bottom-0 right-0 left-0 bg-white p-4 border-t border-slate-200 flex justify-end gap-6 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4 mr-auto pl-4">
          {tienePendientes && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 animate-pulse">
              <span className="text-lg">ℹ️</span>
              <span className="text-[10px] font-black uppercase tracking-tight">Detectados ítems sin precio. Se enviará como COTIZACIÓN PARCIAL.</span>
            </div>
          )}
        </div>

        <button onClick={() => navigate('/compras')} className="text-slate-400 hover:text-slate-600 font-bold transition-colors">Descartar</button>
        
        <button 
          onClick={ejecutarGuardado}
          className={`${
            tienePendientes ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-emerald-600'
          } text-white px-10 py-3 rounded-xl font-black transition-all flex flex-col items-center justify-center leading-none min-w-[240px] shadow-lg`}
        >
          <span className="text-sm">Finalizar y Enviar Cotización</span>
          {tienePendientes && <span className="text-[9px] opacity-80 mt-1 uppercase font-bold">(Como Parcial)</span>}
        </button>
      </div>
    </div>
  );
};