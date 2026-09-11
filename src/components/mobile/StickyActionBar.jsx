import React from 'react';

/**
 * StickyActionBar
 * Barra de acción inferior fija en móvil (< md), adaptada a safe areas,
 * que se vuelve estática y transparente en pantallas desktop (>= md).
 */
export const StickyActionBar = ({
  children,
  summary,
  primaryAction,
  secondaryAction,
  className = ''
}) => {
  return (
    <div
      className={`fixed bottom-[calc(3.75rem+max(0.5rem,env(safe-area-inset-bottom,0.5rem)))] md:bottom-auto inset-x-0 md:inset-auto z-30 bg-white/95 backdrop-blur-md p-3 sm:p-4 border-t border-slate-200 shadow-lg md:static md:p-0 md:bg-transparent md:backdrop-blur-none md:border-0 md:shadow-none transition-all ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Slot Resumen / Totales (opcional) */}
        {summary && (
          <div className="min-w-0 flex-1">
            {summary}
          </div>
        )}

        {/* Acciones principales o children directo */}
        {children ? (
          <div className={`flex items-center gap-2 ${summary ? 'shrink-0' : 'w-full justify-end'}`}>
            {children}
          </div>
        ) : (
          <div className={`flex items-center gap-2 ${summary ? 'shrink-0' : 'w-full justify-end'}`}>
            {secondaryAction && (
              <div className="shrink-0">
                {secondaryAction}
              </div>
            )}
            {primaryAction && (
              <div className="shrink-0 flex-1 sm:flex-none">
                {primaryAction}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StickyActionBar;
