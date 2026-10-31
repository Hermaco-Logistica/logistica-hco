/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Package,
  Plane,
  RefreshCw,
  ShieldCheck,
  Ship,
  Anchor,
  FileText,
  Truck,
} from 'lucide-react';
import {
  DHL_STATUS_LABELS,
  DSV_STATUS_LABELS,
  DSV_COMPLETED_CODES,
  DSV_TRANSIT_CODES,
  DSV_CUSTOMS_CODES,
  DSV_PICKUP_CODES,
  DSV_DELIVERY_CODES,
} from './trackingMappings';

const normalizeCode = (code) => String(code || '').toLowerCase();

export const getStatusLabel = (code, provider, group) => {
  if (!code) return 'Actualizacion';
  const providerUpper = String(provider || '').toUpperCase();
  if (providerUpper === 'DSV') {
    const lookup = String(code || '').toUpperCase();
    const direct = DSV_STATUS_LABELS[lookup];
    if (direct) return direct;
    if (group) return String(group);
  }
  const direct = DHL_STATUS_LABELS[code] || DHL_STATUS_LABELS[normalizeCode(code)];
  if (direct) return direct;

  const normalized = normalizeCode(code);
  if (normalized === 'delivered') return 'Entregado';
  return 'Actualizacion';
};

export const getDescripcionUi = (descripcion, code, provider) => {
  if (!descripcion) return 'Sin detalle';
  const normalized = normalizeCode(code);
  if (normalized === 'delivered' && descripcion.toLowerCase() === 'delivered') {
    return 'Entregado';
  }
  if (String(provider || '').toUpperCase() === 'DSV') {
    return descripcion.replace(/^actual\s+/i, '').trim() || descripcion;
  }
  return descripcion;
};

export const formatFechaDsv = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  const dateText = new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'America/El_Salvador'
  }).format(date);

  if (!hasTime) return dateText;

  const timeText = new Intl.DateTimeFormat('es-SV', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/El_Salvador'
  }).format(date);

  return `${dateText}, ${timeText}`;
};

export const getDsvEventLabel = (event) => {
  const code = String(event?.eventCode || '').toUpperCase();
  return DSV_STATUS_LABELS[code] || event?.eventDescription || 'Actualizacion';
};

export const getDsvIcon = (event) => {
  const group = String(event?.eventGroup || '').toLowerCase();
  const code = String(event?.eventCode || '').toUpperCase();

  if (group.includes('booking')) return <FileText size={14} className="text-slate-500" />;
  if (group.includes('pickup') || group.includes('received')) return <Package size={14} className="text-slate-500" />;
  if (group.includes('customs') || ['ECC', 'ECL', 'ECD', 'ICC', 'ICL', 'ICD'].includes(code)) {
    return <ShieldCheck size={14} className="text-amber-500" />;
  }
  if (group.includes('handover') || code === 'Z70') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (code === 'ARV' || code === 'ETA') return <Anchor size={14} className="text-blue-500" />;
  if (code === 'DEP' || code === 'ETD') return <Ship size={14} className="text-blue-500" />;
  return <RefreshCw size={14} className="text-slate-400" />;
};

export const getStatusConfig = (code, provider) => {
  const providerUpper = String(provider || '').toUpperCase();
  if (providerUpper === 'DSV') {
    const raw = String(code || '').toUpperCase();
    if (DSV_COMPLETED_CODES.has(raw)) {
      return {
        tono: 'exito',
        card: 'bg-emerald-50 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Completado',
      };
    }
    if (DSV_CUSTOMS_CODES.has(raw)) {
      return {
        tono: 'aviso',
        card: 'bg-amber-50 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Aduana',
      };
    }
    if (DSV_TRANSIT_CODES.has(raw)) {
      return {
        tono: 'azul',
        card: 'bg-blue-50 border-blue-200',
        dot: 'bg-blue-500',
        label: 'En transito',
      };
    }
    if (DSV_PICKUP_CODES.has(raw)) {
      return {
        tono: 'neutral',
        card: 'bg-slate-50 border-slate-200',
        dot: 'bg-slate-500',
        label: 'Recoleccion',
      };
    }
    if (DSV_DELIVERY_CODES.has(raw)) {
      return {
        tono: 'exito',
        card: 'bg-emerald-50 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Entrega',
      };
    }
  }
  const normalized = normalizeCode(code);

  if (normalized === 'delivered' || normalized === 'ok') {
    return {
      tono: 'exito',
      card: 'bg-emerald-50 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Entregado',
    };
  }

  if (normalized === 'failure') {
    return {
      tono: 'peligro',
      card: 'bg-rose-50 border-rose-200',
      dot: 'bg-rose-500',
      label: 'Problema',
    };
  }

  if (['rr', 'ic', 'ud', 'cr'].includes(normalized)) {
    return {
      tono: 'aviso',
      card: 'bg-amber-50 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Aduana',
    };
  }

  if (['tr', 'wc', 'df', 'af', 'pl'].includes(normalized)) {
    return {
      tono: 'azul',
      card: 'bg-blue-50 border-blue-200',
      dot: 'bg-blue-500',
      label: 'En transito',
    };
  }

  if (normalized === 'pu') {
    return {
      tono: 'neutral',
      card: 'bg-slate-50 border-slate-200',
      dot: 'bg-slate-500',
      label: 'Recogido',
    };
  }

  return {
    tono: 'neutral',
    card: 'bg-slate-50 border-slate-200',
    dot: 'bg-slate-500',
    label: 'Actualizacion',
  };
};

/** Tono (utils/etiquetas.js) del chip de un evento de tracking. */
export const getEventoTono = (code, provider) => {
  const providerUpper = String(provider || '').toUpperCase();
  if (providerUpper === 'DSV') {
    const raw = String(code || '').toUpperCase();
    if (DSV_COMPLETED_CODES.has(raw)) return 'exito';
    if (DSV_CUSTOMS_CODES.has(raw)) return 'aviso';
    if (DSV_TRANSIT_CODES.has(raw)) return 'azul';
    if (DSV_PICKUP_CODES.has(raw)) return 'neutral';
    return 'apagado';
  }
  const normalized = normalizeCode(code);
  if (normalized === 'delivered') return 'exito';
  if (normalized === 'failure') return 'peligro';
  if (['ic', 'rr', 'ud', 'cr'].includes(normalized)) return 'aviso';
  if (normalized === 'wc') return 'azul';
  return 'apagado';
};

export const EventIcon = ({ code, provider, size = 14 }) => {
  const providerUpper = String(provider || '').toUpperCase();
  if (providerUpper === 'DSV') {
    const raw = String(code || '').toUpperCase();
    if (DSV_COMPLETED_CODES.has(raw)) return <CheckCircle size={size} className="text-emerald-500" />;
    if (DSV_CUSTOMS_CODES.has(raw)) return <ShieldCheck size={size} className="text-amber-500" />;
    if (DSV_TRANSIT_CODES.has(raw)) return <Truck size={size} className="text-blue-500" />;
    if (DSV_PICKUP_CODES.has(raw)) return <Package size={size} className="text-slate-500" />;
    return <RefreshCw size={size} className="text-slate-400" />;
  }
  const normalized = normalizeCode(code);
  if (normalized === 'delivered' || normalized === 'ok') return <CheckCircle size={size} className="text-emerald-500" />;
  if (normalized === 'failure') return <AlertTriangle size={size} className="text-rose-500" />;
  if (['ic', 'rr', 'ud', 'cr'].includes(normalized)) return <ShieldCheck size={size} className="text-amber-500" />;
  if (normalized === 'wc') return <Truck size={size} className="text-blue-500" />;
  if (normalized === 'pu') return <Package size={size} className="text-slate-500" />;
  if (['df', 'af', 'pl', 'tr'].includes(normalized)) return <Plane size={size} className="text-slate-400" />;
  return <RefreshCw size={size} className="text-slate-400" />;
};
