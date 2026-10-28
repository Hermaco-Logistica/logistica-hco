import React from 'react';

/** Resumen lateral sticky; en modo móvil fijo respeta el dock y el área segura. */
export const SummaryPanel = ({ title = 'Resumen', children, mobileFixed = false, className = '' }) => (
  <aside className={`detalle-summary ${mobileFixed ? 'detalle-summary--mobile-fixed' : ''} ${className}`}>
    <div className="detalle-summary__inner">{title && <h2 className="m-0 text-base font-semibold">{title}</h2>}{children}</div>
  </aside>
);
