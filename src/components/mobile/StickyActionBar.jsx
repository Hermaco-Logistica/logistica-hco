import React from 'react';
import { BottomActionBar } from './BottomActionBar';

/**
 * StickyActionBar
 * Barra de acción inferior.
 * - En móvil (< md): se registra en el BottomDock único vía BottomActionBar (con hideNav={true}).
 * - En escritorio (>= md): se renderiza en el flujo normal de la página.
 * Ninguno de los dos modos tiene posición fixed propia.
 */
export const StickyActionBar = ({
  children,
  summary,
  primaryAction,
  secondaryAction,
  className = '',
  hideNav = true
}) => {
  const barContent = (
    <div className={`w-full max-w-7xl mx-auto flex items-center justify-between gap-3 p-3 sm:p-4 ${className}`}>
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
  );

  return (
    <>
      {/* Móvil: Se registra en el dock inferior único */}
      <div className="md:hidden">
        <BottomActionBar hideNav={hideNav}>
          {barContent}
        </BottomActionBar>
      </div>

      {/* Escritorio: Renderizado estático en el flujo de la vista */}
      <div className={`hidden md:block w-full ${className}`}>
        {barContent}
      </div>
    </>
  );
};

export default StickyActionBar;
