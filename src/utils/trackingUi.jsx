import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Package,
  Plane,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';

const DHL_STATUS_LABELS = {
  PU: 'Recogido por DHL',
  PL: 'Procesado en instalacion',
  AF: 'Llego a instalacion',
  DF: 'Salio de instalacion',
  TR: 'En transito',
  WC: 'En camino al destinatario',
  OH: 'Envio retenido',
  RR: 'Aduana iniciada',
  IC: 'En proceso de aduana',
  UD: 'Evento de aduana',
  CR: 'Aduana liberada',
  OK: 'Entregado',
  delivered: 'Entregado',
  failure: 'Fallo en entrega',
};

const normalizeCode = (code) => String(code || '').toLowerCase();

export const getStatusLabel = (code) => {
  if (!code) return 'Actualizacion';
  const direct = DHL_STATUS_LABELS[code] || DHL_STATUS_LABELS[normalizeCode(code)];
  if (direct) return direct;

  const normalized = normalizeCode(code);
  if (normalized === 'delivered') return 'Entregado';
  return 'Actualizacion';
};

export const getDescripcionUi = (descripcion, code) => {
  if (!descripcion) return 'Sin detalle';
  const normalized = normalizeCode(code);
  if (normalized === 'delivered' && descripcion.toLowerCase() === 'delivered') {
    return 'Entregado';
  }
  return descripcion;
};

export const getStatusConfig = (code) => {
  const normalized = normalizeCode(code);

  if (normalized === 'delivered' || normalized === 'ok') {
    return {
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      card: 'bg-emerald-50 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Entregado',
    };
  }

  if (normalized === 'failure') {
    return {
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
      card: 'bg-rose-50 border-rose-200',
      dot: 'bg-rose-500',
      label: 'Problema',
    };
  }

  if (['rr', 'ic', 'ud', 'cr'].includes(normalized)) {
    return {
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      card: 'bg-amber-50 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Aduana',
    };
  }

  if (['tr', 'wc', 'df', 'af', 'pl'].includes(normalized)) {
    return {
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      card: 'bg-blue-50 border-blue-200',
      dot: 'bg-blue-500',
      label: 'En transito',
    };
  }

  if (normalized === 'pu') {
    return {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      card: 'bg-slate-50 border-slate-200',
      dot: 'bg-slate-500',
      label: 'Recogido',
    };
  }

  return {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    card: 'bg-slate-50 border-slate-200',
    dot: 'bg-slate-500',
    label: 'Actualizacion',
  };
};

export const getEventoBadgeClass = (code) => {
  const normalized = normalizeCode(code);
  if (normalized === 'delivered') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'failure') return 'bg-rose-100 text-rose-700';
  if (['ic', 'rr', 'ud', 'cr'].includes(normalized)) return 'bg-amber-100 text-amber-700';
  if (normalized === 'wc') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-500';
};

export const EventIcon = ({ code, size = 14 }) => {
  const normalized = normalizeCode(code);
  if (normalized === 'delivered' || normalized === 'ok') return <CheckCircle size={size} className="text-emerald-500" />;
  if (normalized === 'failure') return <AlertTriangle size={size} className="text-rose-500" />;
  if (['ic', 'rr', 'ud', 'cr'].includes(normalized)) return <ShieldCheck size={size} className="text-amber-500" />;
  if (normalized === 'wc') return <Truck size={size} className="text-blue-500" />;
  if (normalized === 'pu') return <Package size={size} className="text-slate-500" />;
  if (['df', 'af', 'pl', 'tr'].includes(normalized)) return <Plane size={size} className="text-slate-400" />;
  return <RefreshCw size={size} className="text-slate-400" />;
};
