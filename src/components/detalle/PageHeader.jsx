import React from 'react';
import { ArrowLeft } from 'lucide-react';

/** Cabecera operativa: retorno, título, referencia, metadatos y slot de acciones. */
export const PageHeader = ({ onBack, title, reference, metadata = [], actions, backLabel = 'Volver' }) => (
  <header className="detalle-header">
    <div className="detalle-header__identity">
      {onBack && <button type="button" onClick={onBack} aria-label={backLabel} className="detalle-header__back"><ArrowLeft size={17} /></button>}
      <div className="min-w-0">
        <h1 className="detalle-header__title">{title}</h1>
        {(reference || metadata.length > 0) && <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {reference && <span className="detalle-header__reference">REF {reference}</span>}
          {metadata.length > 0 && <div className="detalle-header__meta">{metadata.map((item, index) => <React.Fragment key={`${item}-${index}`}>{index > 0 && <span aria-hidden="true">·</span>}<span>{item}</span></React.Fragment>)}</div>}
        </div>}
      </div>
    </div>
    {actions && <div className="detalle-header__actions">{actions}</div>}
  </header>
);
