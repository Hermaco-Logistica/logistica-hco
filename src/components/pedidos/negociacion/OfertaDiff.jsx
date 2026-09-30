import React from 'react';
import { ArrowRight } from 'lucide-react';

const DiffValue = ({ curr, prev, prefix = '', suffix = '', hasAnterior }) => {
  const isDifferent = hasAnterior && curr !== prev;

  if (!isDifferent || prev === undefined || prev === null) {
    return (
      <span className="font-bold text-slate-800 font-mono text-xs">
        {prefix}{curr}{suffix}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="line-through text-slate-400 font-mono text-xs font-medium">
        {prefix}{prev}{suffix}
      </span>
      <ArrowRight size={11} className="text-slate-300 shrink-0" />
      <span className="text-amber-700 font-bold font-mono text-xs">
        {prefix}{curr}{suffix}
      </span>
    </span>
  );
};

export const OfertaDiff = ({ actual, anterior, label = 'Propuesta' }) => {
  if (!actual) return null;

  const hasAnterior = !!anterior;

  return (
    <div className="w-full my-3.5">
      {/* Encabezado — etiqueta sobria sin pastilla */}
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
        {label}
      </p>

      {/* Cuerpo — fila de datos separados por divisores verticales */}
      <div className="flex items-center divide-x divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/60">
        <div className="flex flex-col px-3 py-2 gap-0.5 flex-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Precio</span>
          <DiffValue
            curr={actual.precio}
            prev={anterior?.precio}
            prefix="$"
            hasAnterior={hasAnterior}
          />
        </div>
        <div className="flex flex-col px-3 py-2 gap-0.5 flex-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Entrega</span>
          <DiffValue
            curr={actual.tiempoEntrega}
            prev={anterior?.tiempoEntrega}
            suffix=" días"
            hasAnterior={hasAnterior}
          />
        </div>
        <div className="flex flex-col px-3 py-2 gap-0.5 flex-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vía</span>
          <DiffValue
            curr={actual.modalidad}
            prev={anterior?.modalidad}
            hasAnterior={hasAnterior}
          />
        </div>
      </div>
    </div>
  );
};
