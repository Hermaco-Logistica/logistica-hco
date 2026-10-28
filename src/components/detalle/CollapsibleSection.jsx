import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Acordeón compacto para documentación, notas o contenido auxiliar. */
export const CollapsibleSection = ({ title, icon, count, children, defaultOpen = false, open: controlledOpen, onToggle, className = '' }) => {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? localOpen;
  const toggle = () => { if (controlledOpen === undefined) setLocalOpen((value) => !value); onToggle?.(!open); };
  return <section className={`detalle-collapsible ${className}`}><button type="button" className="detalle-collapsible__trigger" aria-expanded={open} onClick={toggle}><span className="flex min-w-0 items-center gap-2">{icon}<strong className="truncate text-sm font-semibold">{title}</strong>{count != null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{count}</span>}</span><ChevronDown size={17} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="detalle-collapsible__content">{children}</div>}</section>;
};
