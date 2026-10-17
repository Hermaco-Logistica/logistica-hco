import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBottomDock } from '../../context/BottomDockContext';

/**
 * BottomActionBar
 * Registra un componente en el slot superior del BottomDock para móvil (< md) mediante Portal.
 * - Cero bucles de re-renderizado: utiliza createPortal directamente hacia el slot DOM del dock.
 * - Si hideNav es true (por defecto), oculta la nav flotante en móvil mientras esté activo.
 */
export const BottomActionBar = ({ children, hideNav = true, className = '' }) => {
  const { actionSlotEl, setActionBar, setHideNav } = useBottomDock();

  useEffect(() => {
    if (hideNav) {
      setHideNav(true);
      return () => {
        setHideNav(false);
      };
    }
  }, [hideNav, setHideNav]);

  // Fallback para entornos donde no exista el slot DOM directo (ej. tests unitarios)
  useEffect(() => {
    if (!actionSlotEl && setActionBar) {
      if (children) {
        setActionBar(
          <div className={className}>
            {children}
          </div>
        );
      } else {
        setActionBar(null);
      }
      return () => {
        setActionBar(null);
      };
    }
  }, [actionSlotEl, children, className, setActionBar]);

  if (!actionSlotEl || !children) {
    return null;
  }

  return createPortal(
    <div className={className}>
      {children}
    </div>,
    actionSlotEl
  );
};

export default BottomActionBar;
