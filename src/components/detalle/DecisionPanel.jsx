import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { StatusChip } from './StatusChip';
import './detalle.css';

const ICONOS = { warning: TriangleAlert, danger: AlertCircle, success: CheckCircle2, info: Info };

/** Panel configurable para avisos de seguimiento y decisiones pendientes o resueltas. */
export const DecisionPanel = ({ tone = 'info', role, title, meta, description, facts = [], actions = [], actionContent, resolved = false, children, loading = false, error = '' }) => {
  const Icon = ICONOS[tone] || Info;
  const roleProps = role ? { 'data-role': String(role).toLowerCase() } : {};
  if (loading) return <section className="detalle-decision" data-tone={tone} {...roleProps} aria-busy="true"><div className="detalle-items__state">Cargando información…</div></section>;
  if (error) return <section className="detalle-decision" data-tone="danger" role="alert"><div className="detalle-decision__head"><AlertCircle size={17} /><h2 className="detalle-decision__title">No se pudo cargar la información</h2></div><p className="detalle-decision__description">{error}</p></section>;
  if (resolved) return <section className="detalle-decision" data-tone="success" {...roleProps}><div className="detalle-decision__resolved"><CheckCircle2 size={17} /><strong>{title}</strong>{meta && <span>{meta}</span>}{children}</div></section>;
  return (
    <section className="detalle-decision" data-tone={tone} {...roleProps}>
      <div className="detalle-decision__head"><Icon size={18} aria-hidden="true" /><h2 className="detalle-decision__title">{title}</h2>{meta && <StatusChip status={meta.status || tone} label={meta.label || meta} />}</div>
      <div className="detalle-decision__body">
        <div className="detalle-decision__description">{description}{children}</div>
        {facts.length > 0 && <dl className="detalle-decision__facts">{facts.map((fact, index) => <div className="detalle-decision__fact" key={`${fact.label}-${index}`}><dt>{fact.label}</dt><dd data-overdue={fact.overdue ? 'true' : undefined}>{fact.value}{fact.overdue && <StatusChip status="vencida" />}</dd></div>)}</dl>}
      </div>
      {(actions.length > 0 || actionContent) && <div className="detalle-decision__actions">{actions.map((action, index) => <button key={`${action.label}-${index}`} type="button" onClick={action.onClick} disabled={action.disabled || action.loading} className={action.className || `detalle-button ${action.variant === 'primary' ? 'detalle-button--primary' : action.variant === 'danger' ? 'detalle-button--danger' : ''}`}>{action.icon}{action.loading ? 'Procesando…' : action.label}</button>)}{actionContent}</div>}
    </section>
  );
};
