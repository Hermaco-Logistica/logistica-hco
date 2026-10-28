import React from 'react';
import { AlertCircle, CheckCircle2, Clock3, Eye, Info, XCircle } from 'lucide-react';

const ESTADOS = {
  pendiente: { label: 'Pendiente', icon: Clock3 },
  vencida: { label: 'Vencida', icon: AlertCircle },
  aprobada: { label: 'Aprobada', icon: CheckCircle2 },
  rechazada: { label: 'Rechazada', icon: XCircle },
  en_revision: { label: 'En revisión', icon: Clock3 },
  solo_lectura: { label: 'Solo lectura', icon: Eye },
  info: { label: 'Información', icon: Info },
  resuelta: { label: 'Resuelta', icon: CheckCircle2 },
  success: { label: 'Correcto', icon: CheckCircle2 },
  error: { label: 'Error', icon: AlertCircle }
};

/** Etiqueta de estado semántica con texto e icono, no dependiente solo del color. */
export const StatusChip = ({ status = 'info', label, className = '' }) => {
  const config = ESTADOS[status] || ESTADOS.info;
  const Icon = config.icon;
  return <span className={`detalle-status ${className}`} data-status={status}><Icon size={13} aria-hidden="true" />{label || config.label}</span>;
};
