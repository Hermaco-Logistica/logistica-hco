import React from 'react';
import { Ban } from 'lucide-react';
import { obtenerEtiquetaDecision } from '../utils/decisionFilter';

export const DecisionBadge = ({ decisionFilter, withIcon = false }) => (
  <span className={withIcon
    ? 'inline-flex items-center gap-1 text-[8px] font-semibold text-rose-500 bg-rose-50 px-1 py-0.5 rounded border border-rose-200'
    : 'text-[8px] font-semibold text-rose-600 uppercase tracking-wider'}
  >
    {withIcon && <Ban size={8} className="shrink-0" />}
    {obtenerEtiquetaDecision(decisionFilter)}
  </span>
);
