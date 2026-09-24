import React from 'react';

export const EstadoItemChip = ({ estado, pendingRole }) => {
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = estado;
  
  if (estado === 'Pedido' || estado === 'Comprado') {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (estado === 'Cotizado') {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (estado === 'Pendiente') {
    badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (estado === 'Denegado' || estado === 'Cancelado' || estado === 'Rechazado') {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  const isPending = !!pendingRole;

  return (
    <div className="flex flex-col sm:flex-row gap-1.5 items-end sm:items-center">
      <span className={`px-2.5 py-1 rounded-lg border font-black uppercase text-[10px] tracking-wider whitespace-nowrap ${badgeColor}`}>
        {label}
      </span>
      {isPending && (
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
          Turno {pendingRole === 'compras' ? 'Compras' : 'Vendedor'}
        </span>
      )}
    </div>
  );
};
