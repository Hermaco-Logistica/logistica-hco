import React, { useRef, useEffect } from 'react';
import { useBottomDock } from '../../context/BottomDockContext';
import { BottomTabBar } from './BottomTabBar';

/**
 * BottomDock
 * El ÚNICO elemento position: fixed inferior en móvil (< md).
 * Apila en columna:
 * - Arriba: Barra de acción de la vista actual (Portal vía BottomActionBar o fallback actionBar).
 * - Abajo: Barra de navegación flotante (BottomTabBar, oculta en vistas de trabajo).
 * 
 * Mide su altura real y la publica como `--bottom-dock-h` en :root.
 */
export const BottomDock = ({ role, onOpenDrawer, hidden = false }) => {
  const { setActionSlotEl, actionBar, hideNav, setDockHeight } = useBottomDock();
  const dockRef = useRef(null);
  const slotRef = useRef(null);

  useEffect(() => {
    setActionSlotEl(slotRef.current);
    return () => setActionSlotEl(null);
  }, [setActionSlotEl]);

  useEffect(() => {
    const el = dockRef.current;
    if (!el) {
      document.documentElement.style.setProperty('--bottom-dock-h', '0px');
      setDockHeight(0);
      return;
    }

    const updateHeight = () => {
      // En pantallas desktop (>= 768px), el dock móvil no ocupa espacio inferior
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        document.documentElement.style.setProperty('--bottom-dock-h', '0px');
        setDockHeight(0);
        return;
      }
      const rect = el.getBoundingClientRect();
      const h = Math.round(rect.height) || 0;
      document.documentElement.style.setProperty('--bottom-dock-h', `${h}px`);
      setDockHeight(h);
    };

    updateHeight();

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateHeight();
      });
      observer.observe(el);
    }

    window.addEventListener('resize', updateHeight);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateHeight);
      document.documentElement.style.setProperty('--bottom-dock-h', '0px');
    };
  }, [setDockHeight, actionBar, hideNav]);

  return (
    <div
      ref={dockRef}
      className="fixed bottom-0 inset-x-0 z-40 md:hidden flex flex-col items-center justify-end pointer-events-none select-none transition-all duration-200"
    >
      {/* 1. Slot Superior: Barra de Acción de la Vista (Portal target + fallback de actionBar) */}
      <div
        ref={slotRef}
        id="bottom-dock-action-slot"
        className={`w-full pointer-events-auto bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg empty:hidden ${
          hideNav ? 'pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))]' : ''
        }`}
      >
        {actionBar}
      </div>

      {/* 2. Slot Inferior: Navegación Flotante (oculta en vistas de trabajo o si hideNav === true) */}
      {!hideNav && (
        <div className="w-full pointer-events-none pt-10 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] overflow-visible">
          <BottomTabBar
            role={role}
            onOpenDrawer={onOpenDrawer}
            hidden={hidden}
            isInsideDock={true}
          />
        </div>
      )}
    </div>
  );
};

export default BottomDock;
