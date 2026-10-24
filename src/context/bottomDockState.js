import { createContext, useContext } from 'react';

export const BottomDockContext = createContext({
  actionSlotEl: null,
  setActionSlotEl: () => {},
  actionBar: null,
  setActionBar: () => {},
  hideNav: false,
  setHideNav: () => {},
  dockHeight: 0,
  setDockHeight: () => {}
});

export const FOCUS_ROUTE_PATTERNS = [
  '/compras/revision-pedido/',
  '/vendedor/pedido-manual/',
  '/vendedor/detalle/',
  '/vendedor/nueva-rfq',
  '/vendedor/nuevo-pedido',
  '/calculadora/'
];

export const useBottomDock = () => useContext(BottomDockContext);
