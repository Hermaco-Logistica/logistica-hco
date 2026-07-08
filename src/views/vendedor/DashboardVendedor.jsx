import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge';

export const DashboardVendedor = ({ solicitudes, canCreate = true, title = 'Mis Solicitudes' }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const formatFechaHora = (timestamp) => {
    if (!timestamp?.toDate) return '---';
    const dateValue = timestamp.toDate();
    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
      timeZone: 'America/El_Salvador'
    }).format(dateValue);
  };

  // Ordenar de más reciente a más antigua
  const sortedSolicitudes = [...solicitudes].sort((a, b) => {
    const getMs = (val) => {
      if (!val) return 0;
      if (typeof val === 'object') {
        if (typeof val.toDate === 'function') {
          try { return val.toDate().getTime(); } catch(e) {}
        }
        if (typeof val.seconds === 'number') {
          return val.seconds * 1000;
        }
      }
      const ms = Date.parse(val);
      return isNaN(ms) ? 0 : ms;
    };
    return getMs(b.fechaS) - getMs(a.fechaS);
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedSolicitudes.length / itemsPerPage);
  const paginatedSolicitudes = sortedSolicitudes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">{title}</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Estado de RFQs enviadas</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => navigate('/vendedor/nueva')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
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
            {paginatedSolicitudes.map((s) => {
              const itemsConPrecio = s.productos?.filter(p => Number(p.fob) > 0) || [];
              
              const totalA = itemsConPrecio.reduce((acc, p) => 
                acc + (p.fob * (s.factorA || 1) * (p.fva || 1.3) * p.cant), 0);
              
              const totalM = itemsConPrecio.reduce((acc, p) => 
                acc + (p.fob * (s.factorM || 1.08) * (p.fvm || 1.25) * p.cant), 0);

              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="block font-black text-slate-800 text-lg leading-none">{s.correlativo}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase italic">EXT: {s.cliente}</span>
                  </td>
                  <td className="p-4 text-[11px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-bold uppercase text-[9px]">📥 Solicitud: <b className="text-slate-700 font-black">{formatFechaHora(s.fechaS)}</b></span>
                      <span className="text-emerald-600 font-black italic text-[9px] uppercase">
                        📤 {s.estado.includes('Parcial') ? 'Avance Recibido: ' : 'Respondida: '}
                        {s.fechaCotizacion?.toDate ? formatFechaHora(s.fechaCotizacion) : 'En proceso'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      {totalA > 0 ? (
                        <>
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">A: ${totalA.toFixed(2)}</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">M: ${totalM.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">En costeo...</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Badge estado={s.estado} />
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => navigate(`/vendedor/detalle/${s.id}`)}
                      className="bg-white border-2 border-slate-100 hover:border-slate-900 text-slate-900 px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm"
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

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 px-6 py-4 bg-slate-900 rounded-[1.5rem] text-white">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            Anterior
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Página {currentPage} de {totalPages} ({solicitudes.length} solicitudes)
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};