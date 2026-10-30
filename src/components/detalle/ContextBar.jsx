import React from 'react';
import { Eye } from 'lucide-react';
import { StatusChip } from './StatusChip';
import './detalle.css';

/**
 * Franja de solo lectura / auditoría.
 * Alto ~40px, una sola línea: ícono + texto + nombre del propietario (enlace) | chip "Auditando".
 * Sin barra lateral, sin sombra.
 */
export const ContextBar = ({ children, readOnly = false, ownerName, onOwnerClick }) => (
  <div className="detalle-context" role="note">
    <span className="detalle-context__left">
      {readOnly && <Eye size={14} aria-hidden="true" />}
      <span>
        Solo lectura
        {ownerName && (
          <> · Pertenece a {onOwnerClick
            ? <button type="button" className="detalle-context__link" onClick={onOwnerClick}>{ownerName}</button>
            : <strong>{ownerName}</strong>}
          </>
        )}
      </span>
      {children}
    </span>
    {readOnly && <StatusChip status="solo_lectura" label="Auditando" />}
  </div>
);
