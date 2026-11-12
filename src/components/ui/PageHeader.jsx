import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * Cabecera de página dentro del contenido: [←] título [chip]  ·····  [acciones]
 * `subtitle` y `statusChip` aceptan texto o nodos. `onBack` solo en detalles.
 * En móvil el título y las acciones se apilan.
 * (Sustituyó al antiguo components/detalle/PageHeader.jsx, ya eliminado.)
 */
export const PageHeader = ({ title, subtitle, onBack, backLabel = 'Volver', statusChip, actions, className = '' }) => (
  <header
    className={`mb-[var(--content-gap)] flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4 ${className}`}
  >
    <div className="flex min-w-0 items-start gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          title={backLabel}
          className="mt-0.5 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow-[var(--tf-shadow-card)] transition-[background-color,scale] duration-150 hover:bg-slate-50 active:scale-[0.96]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 break-words text-2xl font-black italic leading-tight tracking-tighter text-slate-800">{title}</h1>
          {statusChip}
        </div>
        {subtitle && <p className="mt-1 text-[12.5px] leading-tight text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 max-md:[&:not(:has(>:not(.hidden)))]:hidden md:justify-end">{actions}</div>}
  </header>
);
