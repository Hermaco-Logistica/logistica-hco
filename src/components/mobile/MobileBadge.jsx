import React from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PackageCheck, 
  Package, 
  Truck, 
  Building2, 
  FileCheck,
  MessageSquare,
  CheckCheck
} from 'lucide-react';

const ESTADOS_CONFIG = {
  // Estados de RFQ
  'Pendiente': {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    icon: Clock,
    label: 'Pendiente'
  },
  'Cotizado': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircle2,
    label: 'Cotizado'
  },
  'Cotizado Parcial': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: AlertCircle,
    label: 'Cotizado Parcial'
  },
  'Parcial': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: AlertCircle,
    label: 'Parcial'
  },
  'Pedido': {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: PackageCheck,
    label: 'Pedido'
  },
  'Pedido Parcial': {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    icon: Package,
    label: 'Pedido Parcial'
  },
  'Comprado': {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: CheckCheck,
    label: 'Comprado'
  },
  'En Consulta': {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: MessageSquare,
    label: 'En Consulta'
  },
  'En consulta': {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: MessageSquare,
    label: 'En Consulta'
  },

  // Estados Logísticos (DashboardPedidos, GestionOC)
  'Por Procesar': {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
    icon: Clock,
    label: 'Por Procesar'
  },
  'OC Generada': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: FileCheck,
    label: 'OC Generada'
  },
  'Tránsito': {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: Truck,
    label: 'En Tránsito'
  },
  'En Tránsito': {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: Truck,
    label: 'En Tránsito'
  },
  'Aduana': {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: Building2,
    label: 'En Aduana'
  },
  'En Aduana': {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: Building2,
    label: 'En Aduana'
  },
  'Recibido': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: PackageCheck,
    label: 'Recibido'
  },
  'Recibido (Almacén)': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: PackageCheck,
    label: 'Recibido'
  },
  'Entregado': {
    bg: 'bg-slate-900',
    border: 'border-slate-900',
    text: 'text-white',
    icon: CheckCircle2,
    label: 'Entregado'
  },
  'Entregado Cliente': {
    bg: 'bg-slate-900',
    border: 'border-slate-900',
    text: 'text-white',
    icon: CheckCircle2,
    label: 'Entregado'
  }
};

const DEFAULT_CONFIG = {
  bg: 'bg-slate-100',
  border: 'border-slate-200',
  text: 'text-slate-600',
  icon: Clock,
  label: ''
};

export const MobileBadge = ({ 
  estado, 
  label, 
  size = 'sm', 
  className = '', 
  showIcon = true,
  icon: CustomIcon
}) => {
  const config = ESTADOS_CONFIG[estado] || DEFAULT_CONFIG;
  const textoMostrado = label || config.label || estado || '-';
  const IconComponent = CustomIcon || config.icon;

  const sizeClasses = size === 'xs' 
    ? 'px-2 py-0.5 text-[9px] gap-1' 
    : size === 'lg'
    ? 'px-3.5 py-1.5 text-xs gap-1.5 font-black'
    : 'px-2.5 py-1 text-[10px] gap-1.5 font-bold';

  const iconSizes = size === 'xs' ? 10 : size === 'lg' ? 14 : 12;

  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase tracking-wide leading-none select-none shrink-0 ${config.bg} ${config.border} ${config.text} ${sizeClasses} ${className}`}
    >
      {showIcon && IconComponent && (
        <IconComponent size={iconSizes} className="shrink-0" />
      )}
      <span className="truncate">{textoMostrado}</span>
    </span>
  );
};

export default MobileBadge;
