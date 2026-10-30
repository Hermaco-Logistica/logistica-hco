import React from 'react';

export const EstadoItemChip = ({ estado, pendingRole, stacked = false }) => {
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = estado;
  
  if (estado === 'Pedido' || estado === 'Comprado') {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (estado === 'Cotizado') {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (estado === 'Pendiente') {
    badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (estado === 'Denegado' || estado === 'Cancelado' || estado === 'Rechazado' || estado === 'Venta Perdida') {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (estado === 'Anulado') {
    badgeColor = 'bg-slate-100 text-slate-500 border-slate-300';
  }

  const isPending = !!pendingRole;

  return (
    <div className={`flex gap-1.5 ${stacked ? 'flex-col items-center' : 'flex-col items-end sm:flex-row sm:items-center'}`}>
      <span className={`${stacked ? 'px-2 py-0.5 rounded-md text-[9px]' : 'px-2.5 py-1 rounded-lg text-[10px]'} border font-black uppercase tracking-wider whitespace-nowrap ${badgeColor}`}>
        {label}
      </span>
      {isPending && (
        <span className={`${stacked ? 'text-[8px] px-1.5 py-0.5 rounded-md' : 'text-[10px] px-2 py-1 rounded-lg'} font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50 border border-slate-100`}>
          Turno {pendingRole === 'compras' ? 'Compras' : 'Vendedor'}
        </span>
      )}
    </div>
  );
};
