import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { StatusChip } from './StatusChip';
import './detalle.css';

const ICONOS = { warning: TriangleAlert, danger: AlertCircle, success: CheckCircle2, info: Info };

/**
 * Panel configurable para avisos de seguimiento y decisiones.
 * Anatomía (3 bandas separadas por líneas 1px):
 *  1. Cabecera: recuadro ícono 32px + título 15px/650 + StatusChip
 *  2. Cuerpo ≥1024px: 2 col (descripción+children | ficha de datos)
 *  3. Pie (solo si hay acciones): fondo muted, acciones a la derecha
 * Variante resolved: una línea. Estados loading/error con mismo contenedor.
 */
export const DecisionPanel = ({
  tone = 'info',
  role,
  title,
  meta,
  description,
  facts = [],
  actions = [],
  actionContent,
  resolved = false,
  children,
  loading = false,
  error = ''
}) => {
  const Icon = ICONOS[tone] || Info;
  const roleProps = role ? { 'data-role': String(role).toLowerCase() } : {};

  if (loading) return (
    <section className="detalle-decision" data-tone={tone} {...roleProps} aria-busy="true">
      <div className="detalle-items__state">Cargando información…</div>
    </section>
  );

  if (error) return (
    <section className="detalle-decision" data-tone="danger" role="alert">
      <div className="detalle-decision__head">
        <span className="detalle-decision__icon-box" data-tone="danger"><AlertCircle size={16} aria-hidden="true" /></span>
        <h2 className="detalle-decision__title">No se pudo cargar la información</h2>
      </div>
      <p className="detalle-decision__description">{error}</p>
    </section>
  );

  if (resolved) return (
    <section className="detalle-decision detalle-decision--resolved" data-tone="success" {...roleProps}>
      <div className="detalle-decision__resolved">
        <span className="detalle-decision__icon-box" data-tone="success"><CheckCircle2 size={16} aria-hidden="true" /></span>
        <strong>{title}</strong>
        {meta && <span>{meta}</span>}
        {children}
      </div>
    </section>
  );

  const hasActions = actions.length > 0 || actionContent;

  return (
    <section className="detalle-decision" data-tone={tone} {...roleProps}>
      {/* Banda 1: Cabecera */}
      <div className="detalle-decision__head">
        <span className="detalle-decision__icon-box" data-tone={tone}>
          <Icon size={16} aria-hidden="true" />
        </span>
        <h2 className="detalle-decision__title">{title}</h2>
        {meta && <StatusChip status={meta.status || tone} label={meta.label || meta} />}
      </div>

      {/* Banda 2: Cuerpo */}
      <div className="detalle-decision__body">
        <div className="detalle-decision__left">
          {description && <p className="detalle-decision__description">{description}</p>}
          {children && <div className="detalle-decision__children">{children}</div>}
        </div>
        {facts.length > 0 && (
          <dl className="detalle-decision__facts">
            {facts.map((fact, index) => (
              <div className="detalle-decision__fact" key={`${fact.label}-${index}`}>
                <dt>{fact.label}</dt>
                <dd data-overdue={fact.overdue ? 'true' : undefined}>
                  {fact.overdue
                    ? <><AlertCircle size={12} aria-hidden="true" />{fact.value}</>
                    : fact.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Banda 3: Pie de acciones */}
      {hasActions && (
        <div className="detalle-decision__actions">
          {actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={action.className || `detalle-button ${
                action.variant === 'primary' ? 'detalle-button--primary'
                : action.variant === 'danger' ? 'detalle-button--danger'
                : ''
              }`}
            >
              {action.icon}{action.loading ? 'Procesando…' : action.label}
            </button>
          ))}
          {actionContent}
        </div>
      )}
    </section>
  );
};
