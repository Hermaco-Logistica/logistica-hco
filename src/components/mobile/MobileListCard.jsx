import React from 'react';

/**
 * MobileListCard
 * Tarjeta base estandarizada con 3 slots fijos (leading, content, trailing) + footer opcional.
 * Diseñada para unificar listados en pantallas táctiles (< md) sin duplicar markup.
 */
export const MobileListCard = ({
  leading,
  title,
  subtitle,
  metadata,
  content,
  trailing,
  badge,
  action,
  footer,
  onClick,
  selected = false,
  className = ''
}) => {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={`bg-white rounded-2xl p-4 border transition-all select-none ${
        selected
          ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-md'
          : 'border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm'
      } ${
        isClickable ? 'cursor-pointer active:scale-[0.99] active:bg-slate-50/80' : ''
      } ${className}`}
    >
      {/* Fila principal con los 3 slots fijos */}
      <div className="flex items-start gap-3">
        {/* Slot 1: Leading (Ícono / Avatar / Código visual) */}
        {leading && (
          <div className="shrink-0 flex items-center justify-center">
            {leading}
          </div>
        )}

        {/* Slot 2: Content (Título + Subtítulo + Metadata) */}
        <div className="flex-1 min-w-0">
          {content ? (
            content
          ) : (
            <div className="space-y-0.5">
              {title && (
                <div className="font-black text-slate-800 text-sm sm:text-base leading-tight truncate">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-xs font-bold text-slate-500 truncate">
                  {subtitle}
                </div>
              )}
              {metadata && (
                <div className="text-[11px] font-medium text-slate-400 line-clamp-2 mt-1">
                  {metadata}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slot 3: Trailing (Badge de estado + Acción rápida opcional) */}
        {(trailing || badge || action) && (
          <div className="shrink-0 flex flex-col items-end justify-between gap-1.5 min-h-[40px]">
            {badge && <div className="shrink-0">{badge}</div>}
            {trailing && <div className="shrink-0">{trailing}</div>}
            {action && (
              <div
                className="shrink-0"
                onClick={(e) => {
                  // Evitar propagar click al card si el botón de acción es presionado
                  e.stopPropagation();
                }}
              >
                {action}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slot inferior opcional: Footer */}
      {footer && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {footer}
        </div>
      )}
    </div>
  );
};

export default MobileListCard;
