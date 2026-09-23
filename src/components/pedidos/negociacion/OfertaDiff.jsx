import React from 'react';
import { ArrowRight } from 'lucide-react';

const DiffValue = ({ curr, prev, prefix = '', suffix = '', hasAnterior }) => {
  const isDifferent = hasAnterior && curr !== prev;
  
  if (!isDifferent || prev === undefined || prev === null) {
    return <span className="font-bold">{prefix}{curr}{suffix}</span>;
  }
  
  return (
    <span className="flex items-center gap-1.5 flex-wrap">
      <span className="line-through text-slate-400 font-medium">
        {prefix}{prev}{suffix}
      </span>
      <ArrowRight size={12} className="text-slate-400" />
      <span className="text-emerald-600 font-bold">
        {prefix}{curr}{suffix}
      </span>
    </span>
  );
};

export const OfertaDiff = ({ actual, anterior, label = 'Propuesta' }) => {
  if (!actual) return null;

  const hasAnterior = !!anterior;

  return (
    <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 sm:p-4 text-sm shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center w-full">
      <div className="text-[10px] font-black text-amber-800 uppercase tracking-widest whitespace-nowrap bg-amber-100/50 px-2.5 py-1 rounded-md self-start sm:self-auto border border-amber-200/50">
        {label}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 flex-1 text-slate-700 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Precio:</span>
          <DiffValue curr={actual.precio} prev={anterior?.precio} prefix="$" hasAnterior={hasAnterior} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Tiempo:</span>
          <DiffValue curr={actual.tiempoEntrega} prev={anterior?.tiempoEntrega} suffix=" días" hasAnterior={hasAnterior} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Modalidad:</span>
          <DiffValue curr={actual.modalidad} prev={anterior?.modalidad} hasAnterior={hasAnterior} />
        </div>
      </div>
    </div>
  );
};
