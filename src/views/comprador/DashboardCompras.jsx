import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge';

export const DashboardCompras = ({ solicitudes }) => {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">Panel de Compras</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gestión de cotizaciones y logística</p>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
              <th className="p-4">Referencia / Cliente</th>
              <th className="p-4">Vendedor</th>
              <th className="p-4">Fecha Solicitud</th>
              <th className="p-4 text-center">Total Cotizado (A / M)</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {solicitudes.map((s) => {
              // Calculamos totales basados en ítems que YA tienen precio (fob > 0)
              const itemsConPrecio = s.productos?.filter(p => Number(p.fob) > 0) || [];
              
              const totalA = itemsConPrecio.reduce((acc, p) => 
                acc + (p.fob * (s.factorA || 1) * (p.fva || 1.3) * p.cant), 0);
              
              const totalM = itemsConPrecio.reduce((acc, p) => 
                acc + (p.fob * (s.factorM || 1.08) * (p.fvm || 1.25) * p.cant), 0);

              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="block font-black text-slate-800 text-lg leading-none">{s.correlativo}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase italic">{s.cliente}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700 uppercase">{s.vendedorNombre}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{s.vendedorEmail}</span>
                    </div>
                  </td>
                  <td className="p-4 text-[11px]">
                    <span className="text-slate-500 font-bold">
                      {s.fechaS?.toDate ? s.fechaS.toDate().toLocaleDateString() : '---'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      {totalA > 0 ? (
                        <>
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">A: ${totalA.toFixed(2)}</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">M: ${totalM.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Sin cotizar</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Badge estado={s.estado} />
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => navigate(`/calculadora/${s.id}`)}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border uppercase ${
                        s.estado === 'Cotizado' 
                        ? 'bg-slate-100 text-slate-400 border-slate-200' 
                        : 'bg-white border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      {s.estado === 'Cotizado' ? 'Revisar' : s.estado === 'Cotizado Parcial' ? 'Continuar' : 'Cotizar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};