import React from 'react';

/**
 * Chip de estado discreto: punto de color + texto, sin borde, fondo tenue.
 * API: status (string), label (string override), className (string).
 * Nunca comunica estado solo por color: punto + texto siempre presentes.
 */
const ESTADOS = {
  // Prórrogas
  pendiente:    { label: 'Pendiente' },
  vencida:      { label: 'Vencida' },
  aprobada:     { label: 'Aprobada' },
  rechazada:    { label: 'Rechazada' },
  en_revision:  { label: 'En revisión' },
  resuelta:     { label: 'Resuelta' },
  solo_lectura: { label: 'Auditando' },

  // Seguimiento de ítems
  parcial:                { label: 'Parcial' },
  completa:               { label: 'Completa' },
  reprogramada:           { label: 'Reprogramada' },
  plazo_vencido:          { label: 'Plazo vencido' },
  cierre_requerido:       { label: 'Cierre requerido' },
  seguimiento_requerido:  { label: 'Seg. requerido' },
  prorroga_disponible:    { label: 'Prórroga disponible' },

  // Genéricos
  success: { label: 'Correcto' },
  error:   { label: 'Error' },
  info:    { label: 'Información' },
  neutral: { label: 'Neutral' },
};

export const StatusChip = ({ status = 'info', label, className = '' }) => {
  const config = ESTADOS[status] || ESTADOS.info;
  return (
    <span className={`detalle-status ${className}`} data-status={status}>
      <span className="detalle-status__dot" aria-hidden="true" />
      {label || config.label}
    </span>
  );
};
