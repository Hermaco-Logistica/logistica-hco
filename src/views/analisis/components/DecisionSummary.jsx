import React from 'react';

const DECISIONES = [
  { key: 'anulaciones', label: 'Anulaciones', query: 'anulados', color: 'text-rose-700' },
  { key: 'ventasPerdidas', label: 'Ventas perdidas', query: 'ventas-perdidas', color: 'text-orange-700' },
  { key: 'rechazos', label: 'Rechazos', query: 'rechazos', color: 'text-amber-700' }
];

const getHref = (basePath, query) => `${basePath}/anulados?decision=${query}`;

export const DecisionSummaryMobile = ({ counts, basePath, navigate }) => (
  <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
    {DECISIONES.map(({ key, label, query, color }) => {
      const value = counts[key] || 0;
      return (
        <button
          key={key}
          type="button"
          onClick={() => value > 0 && navigate(getHref(basePath, query))}
          className="w-full flex items-center justify-between text-left hover:bg-slate-50 rounded px-1 -mx-1 cursor-pointer"
        >
          <span className="text-slate-500">{label}</span>
          <span className={`font-mono font-bold ${value > 0 ? color : 'text-slate-400'}`}>{value}</span>
        </button>
      );
    })}
  </div>
);

export const DecisionSummaryColumns = ({ counts, basePath, navigate }) => (
  <>
    {DECISIONES.map(({ key, query, color }) => {
      const value = counts[key] || 0;
      return (
        <td key={key} className="py-2.5 px-3.5 text-center whitespace-nowrap">
          <button
            type="button"
            disabled={value === 0}
            onClick={() => navigate(getHref(basePath, query))}
            className={`font-mono font-semibold ${value > 0 ? `${color} hover:opacity-80 cursor-pointer` : 'text-slate-400'}`}
          >
            {value}
          </button>
        </td>
      );
    })}
  </>
);
