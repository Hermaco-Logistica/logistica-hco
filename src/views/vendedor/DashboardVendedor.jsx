import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge';

export const DashboardVendedor = ({ solicitudes, canCreate = true, title = 'Mis Solicitudes' }) => {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-slate-800">{title}</h1>
        {canCreate && (
          <button 
            onClick={() => navigate('/vendedor/nueva')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-100 flex items-center gap-2"
          >
            + Nueva RFQ
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
              <th className="p-4">Referencia / Cliente</th>
              <th className="p-4">Fechas (Solicitud / Respuesta)</th>
              <th className="p-4 text-center">Resumen Oferta (A / M)</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {solicitudes.map((s) => {
              // CORRECCIÓN: factorA y factorM se toman de 's' (la solicitud), no de 'p' (el producto)
              const totalA = s.productos?.reduce((acc, p) => 
                acc + (p.selected ? (p.fob * (s.factorA || 1) * (p.fva || 1.3) * p.cant) : 0), 0) || 0;
              
              const totalM = s.productos?.reduce((acc, p) => 
                acc + (p.selected ? (p.fob * (s.factorM || 1.08) * (p.fvm || 1.25) * p.cant) : 0), 0) || 0;

              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="block font-black text-slate-800 text-lg">{s.correlativo}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase italic">Ext: {s.cliente}</span>
                  </td>
                  <td className="p-4 text-[11px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500">📥 <b className="text-slate-700">Solicitud:</b> {s.fechaS?.toDate ? s.fechaS.toDate().toLocaleString() : '---'}</span>
                      <span className="text-emerald-600 font-bold italic text-[10px]">
                        📤 {s.estado === 'Parcial' ? 'Respuesta Parcial: ' : 'Respondida: '}
                        {s.fechaCotizacion?.toDate ? s.fechaCotizacion.toDate().toLocaleString() : 'En proceso'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-black w-24 text-center">A: ${totalA.toFixed(2)}</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[11px] font-black w-24 text-center">M: ${totalM.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Badge estado={s.estado} />
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => navigate(`/vendedor/detalle/${s.id}`)}
                      className="bg-white border border-slate-200 hover:border-slate-800 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Ver Detalle
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