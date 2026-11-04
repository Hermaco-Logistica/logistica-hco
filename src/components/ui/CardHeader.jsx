import React from 'react';

// Título de tarjeta con subtítulo opcional y un control a la derecha (selector, enlace, botón).
export const CardHeader = ({ title, subtitle, action, className = '' }) => (
  <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h2 className="truncate text-[15px] font-semibold leading-tight text-slate-800">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[12.5px] leading-tight text-slate-500">{subtitle}</p>}
    </div>
    {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
  </div>
);
