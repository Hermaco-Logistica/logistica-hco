import React from 'react';
import { User, ShoppingBag, CheckCircle, XCircle } from 'lucide-react';

export const ResumenTurnos = ({ resumen, isVendedor }) => {
  if (!resumen) return null;

  return (
    <div className="bg-slate-50 border rounded-xl p-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 flex items-center justify-around gap-2 text-center divide-x">
        <div className="flex flex-col items-center px-3 w-1/4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <User size={12}/> Vendedor
          </span>
          <span className={`text-xl font-black ${isVendedor && resumen.turnoVendedor > 0 ? 'text-amber-500' : 'text-slate-700'}`}>
            {resumen.turnoVendedor || 0}
          </span>
        </div>
        <div className="flex flex-col items-center px-3 w-1/4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <ShoppingBag size={12}/> Compras
          </span>
          <span className={`text-xl font-black ${!isVendedor && resumen.turnoCompras > 0 ? 'text-amber-500' : 'text-slate-700'}`}>
            {resumen.turnoCompras || 0}
          </span>
        </div>
        <div className="flex flex-col items-center px-3 w-1/4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <CheckCircle size={12}/> Acordados
          </span>
          <span className="text-xl font-black text-emerald-600">
            {resumen.acordados || 0}
          </span>
        </div>
        <div className="flex flex-col items-center px-3 w-1/4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <XCircle size={12}/> Denegados
          </span>
          <span className="text-xl font-black text-rose-600">
            {resumen.denegados || 0}
          </span>
        </div>
      </div>
    </div>
  );
};
