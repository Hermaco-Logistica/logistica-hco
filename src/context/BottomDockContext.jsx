import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomDockContext, FOCUS_ROUTE_PATTERNS } from './bottomDockState';

export const BottomDockProvider = ({ children }) => {
  const [actionSlotEl, setActionSlotElState] = useState(null);
  const [actionBar, setActionBarState] = useState(null);
  const [overrideHideNav, setOverrideHideNav] = useState(null);
  const [dockHeight, setDockHeight] = useState(0);
  const location = useLocation();

  // Detección automática de si la ruta actual es una vista de trabajo
  const isFocusRoute = useMemo(() => {
    const path = (location?.pathname || '').toLowerCase();
    return FOCUS_ROUTE_PATTERNS.some(pattern => path.includes(pattern));
  }, [location?.pathname]);

  // Si hay override explícito se respeta; de lo contrario se basa en la ruta
  const effectiveHideNav = overrideHideNav !== null ? overrideHideNav : isFocusRoute;

  const setActionSlotEl = useCallback((el) => {
    setActionSlotElState(el);
  }, []);

  const setActionBar = useCallback((node) => {
    setActionBarState(node);
  }, []);

  const setHideNav = useCallback((val) => {
    setOverrideHideNav(val === null ? null : Boolean(val));
  }, []);

  // Limpiar el action bar y el override únicamente al cambiar de ruta (no en mount inicial)
  const prevPathRef = useRef(location?.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location?.pathname) {
      prevPathRef.current = location?.pathname;
      setActionBarState(null);
      setOverrideHideNav(null);
    }
  }, [location?.pathname]);

  const value = useMemo(() => ({
    actionSlotEl,
    setActionSlotEl,
    actionBar,
    setActionBar,
    hideNav: effectiveHideNav,
    setHideNav,
    dockHeight,
    setDockHeight
  }), [actionSlotEl, actionBar, effectiveHideNav, dockHeight, setActionSlotEl, setActionBar, setHideNav]);

  return (
    <BottomDockContext.Provider value={value}>
      {children}
    </BottomDockContext.Provider>
  );
};

export default BottomDockProvider;
