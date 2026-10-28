import React from 'react';
import { Eye } from 'lucide-react';

/** Línea contextual y discreta para solo lectura o propiedad de otra persona. */
export const ContextBar = ({ children, readOnly = false, ownerName, onOwnerClick }) => (
  <div className="detalle-context" role="note">
    {readOnly && <><Eye size={15} aria-hidden="true" /><span>Solo lectura · Auditando</span></>}
    {children}
    {ownerName && <span>Pertenece a {onOwnerClick
      ? <button type="button" className="detalle-context__link" onClick={onOwnerClick}>{ownerName}</button>
      : <strong>{ownerName}</strong>}</span>}
  </div>
);
