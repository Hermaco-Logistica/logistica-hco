import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FilePlus, 
  ClipboardList, 
  ShoppingBag, 
  LogOut,
  PackageCheck,
  Settings,
  Lightbulb,
  PanelLeftClose,
  BarChart3,
  X,
  Truck,
  Bell
} from 'lucide-react';
import { FindexSettingsModal } from './FindexSettingsModal';
import { usePersistedState } from '../hooks/usePersistedState';
import { ENABLE_RETACEOS } from '../config/featureFlags';

export const Sidebar = ({ 
  role, 
  userEmail, 
  onLogout, 
  isFindexSettingsOpen, 
  setIsFindexSettingsOpen, 
  isFindexActive,
  prorrogasPendientes = 0,
  mobileOpen = false,
  onCloseMobile = () => {}
}) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = usePersistedState('sidebar_collapsed', () => {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth;
    return w >= 1024 && w < 1280;
  });

  // El color de cada rol sale de los tokens nav-* (styles/tokens.css), que .role-* y body[data-role] sobrescriben.
  const currentTheme = {
    accentText: 'text-nav-accent-text',
    active: 'bg-nav-accent text-white',
    activeCollapsed: 'bg-nav-accent text-white',
    iconHover: 'group-hover:text-white',
    roleText: 'text-nav-accent-text',
  };

  const menuItems = [
    {
      label: 'Mis Solicitudes',
      icon: <LayoutDashboard size={18} />,
      path: '/vendedor',
      show: role === 'vendedor'
    },
    {
      label: 'Solicitudes Globales',
      icon: <LayoutDashboard size={18} />,
      path: '/vendedor',
      show: role === 'gerente' || role === 'administrador'
    },
    {
      label: 'Nueva Solicitud',
      icon: <FilePlus size={18} />,
      path: '/vendedor/nueva',
      alias: ['/vendedor/nueva-rfq', '/vendedor/nuevo-pedido'],
      show: role === 'vendedor' || role === 'gerente'
    },
    {
      label: 'Prórrogas',
      icon: <Bell size={18} />,
      path: '/prorrogas',
      show: true,
      badge: prorrogasPendientes
    },
    {
      label: 'Bandeja RFQ',
      icon: <ClipboardList size={18} />,
      path: '/compras',
      alias: ['/calculadora'],
      show: role === 'comprador' || role === 'gerente' || role === 'administrador'
    },
    {
      label: 'Dashboard de Pedidos',
      icon: <PackageCheck size={18} />,
      path: '/pedidos',
      show: true 
    },
    {
      label: 'Retaceos',
      icon: <Truck size={18} />,
      path: '/compras/retaceos',
      show: ENABLE_RETACEOS && (role === 'comprador' || role === 'administrador')
    },
    {
      label: 'Gestión de OC',
      icon: <ShoppingBag size={18} />,
      path: '/gestion-oc',
      show: role === 'comprador' || role === 'administrador'
    },
    {
      label: 'Análisis y estadísticas',
      icon: <BarChart3 size={18} />,
      path: '/analisis',
      show: role !== 'vendedor'
    }
  ];

  // El ítem activo es el de la ruta más específica que coincide por prefijo (o por alias), así el padre queda
  // activo en las subvistas: /vendedor/detalle/:id enciende "Solicitudes", /compras/retaceos enciende "Retaceos"
  // y no "Bandeja RFQ".
  const indiceActivo = (() => {
    let mejor = -1;
    let largo = -1;
    menuItems.forEach((item, i) => {
      if (!item.show) return;
      [item.path, ...(item.alias || [])].forEach((ruta) => {
        const coincide = location.pathname === ruta || location.pathname.startsWith(`${ruta}/`);
        if (coincide && ruta.length > largo) {
          mejor = i;
          largo = ruta.length;
        }
      });
    });
    return mejor;
  })();

  return (
    <>
      <FindexSettingsModal isOpen={isFindexSettingsOpen} onClose={() => setIsFindexSettingsOpen(false)} />
      {/* SIDEBAR DESKTOP (solo visible en pantallas medianas y grandes >= md) */}
      <aside
        className={`tf-sidebar-shell h-full hidden md:flex flex-col p-3 transition-[width] duration-300 ease-in-out relative z-10 shrink-0 select-none overflow-x-hidden ${
          collapsed ? 'w-20' : 'w-60'
        }`}
      >
        {/* HEADER */}
        {collapsed ? (
          <div className="mb-6 mt-1 flex flex-col items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title="Clic para expandir barra lateral (HCO)"
              className="w-12 h-11 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
            >
              <span className={`${currentTheme.accentText} font-black text-xl italic tracking-tighter underline decoration-2 underline-offset-4 group-hover:scale-110 transition-transform`}>
                HCO
              </span>
            </button>
          </div>
        ) : (
          <div className="mb-6 px-1 mt-1 shrink-0">
            <div className="flex items-center justify-between gap-2 h-11">
              <Link 
                to="/" 
                className="shrink-0 text-white font-black text-[19px] italic tracking-tighter uppercase leading-none whitespace-nowrap select-none hover:opacity-85 active:scale-95 transition-all cursor-pointer"
                title="Ir al inicio"
              >
                Logistica<span className={`${currentTheme.accentText} underline decoration-2 underline-offset-4`}>HCO</span>
              </Link>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                title="Plegar barra lateral"
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>
            <p className="text-white/50 font-medium text-[12px] mt-1.5 whitespace-nowrap overflow-hidden">
              Gestor de cotizaciones
            </p>
          </div>
        )}

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-1 w-full">
          {menuItems.map((item, idx) => (
            item.show && (
              <Link
                key={idx}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center h-11 rounded-xl text-[13.5px] transition-[background-color,color,scale] duration-150 active:scale-[0.96] group px-3 ${
                  idx === indiceActivo
                    ? `${currentTheme.activeCollapsed} font-semibold`
                    : 'text-white/70 font-medium hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`relative shrink-0 w-8 flex items-center justify-center transition-colors ${
                  idx === indiceActivo ? 'text-white' : 'text-white/60 group-hover:text-white'
                }`}>
                  {item.icon}
                  {item.badge > 0 && collapsed && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-slate-900 bg-rose-600 px-1 text-[8px] font-black text-white">{item.badge > 99 ? '99+' : item.badge}</span>}
                </span>
                <span
                  className={`whitespace-nowrap overflow-hidden transition-[max-width,margin,opacity,translate] duration-300 ease-in-out ${
                    collapsed
                      ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                      : 'max-w-[200px] opacity-100 translate-x-0 ml-3'
                  }`}
                >
                  {item.label}
                </span>
                {item.badge > 0 && !collapsed && (
                  <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold leading-none text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            )
          ))}
        </nav>

        {/* FOOTER */}
        <div className="mt-auto border-t border-white/10 pt-4 w-full shrink-0">
          <div
            title={`${userEmail} (${role})`}
            className="flex items-center h-11 px-3 mb-2 w-full select-none"
          >
            <div className="shrink-0 w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white font-black text-xs uppercase">
              {userEmail?.[0] || 'U'}
            </div>
            <div
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out min-w-0 ${
                collapsed
                  ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                  : 'max-w-[200px] opacity-100 translate-x-0 ml-3'
              }`}
            >
              <p className="text-white font-black text-[10px] truncate leading-tight">{userEmail}</p>
              <p className={`${currentTheme.roleText} font-black text-[9px] uppercase italic tracking-widest leading-tight`}>{role}</p>
            </div>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setIsFindexSettingsOpen(true)}
              title={isFindexActive ? "Findex Auth: inventario activo" : "Findex Auth: inventario inactivo, clic para re-autenticar"}
              className="w-full flex items-center h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 font-medium text-[13.5px] transition-[background-color,color,scale] duration-150 active:scale-[0.96] cursor-pointer px-3"
            >
              <span className="shrink-0 w-8 flex items-center justify-center">
                <Lightbulb
                  size={18}
                  className={isFindexActive ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : ''}
                />
              </span>
              <span
                className={`whitespace-nowrap overflow-hidden transition-[max-width,margin,opacity,translate] duration-300 ease-in-out ${
                  collapsed
                    ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                    : 'max-w-[200px] opacity-100 translate-x-0 ml-3'
                }`}
              >
                Findex Auth
              </span>
            </button>

            <button 
              type="button"
              onClick={onLogout}
              title={collapsed ? "Cerrar sesión" : undefined}
              className="w-full flex items-center h-11 rounded-xl text-white/70 hover:text-rose-300 hover:bg-white/10 font-medium text-[13.5px] transition-[background-color,color,scale] duration-150 active:scale-[0.96] cursor-pointer px-3"
            >
              <span className="shrink-0 w-8 flex items-center justify-center">
                <LogOut size={18} />
              </span>
              <span
                className={`whitespace-nowrap overflow-hidden transition-[max-width,margin,opacity,translate] duration-300 ease-in-out ${
                  collapsed
                    ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                    : 'max-w-[200px] opacity-100 translate-x-0 ml-3'
                }`}
              >
                Cerrar sesión
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* DRAWER MÓVIL OFF-CANVAS (solo visible en pantallas pequeñas < md) */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop oscuro con blur */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-xs" 
          onClick={onCloseMobile}
          aria-hidden="true"
        />

        {/* Panel deslizante lateral */}
        <aside
          className={`tf-sidebar-shell relative w-72 max-w-[85vw] h-full flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-out select-none ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header del drawer con botón de cierre */}
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Link 
                to="/" 
                onClick={onCloseMobile}
                className="text-white font-black text-xl italic tracking-tighter uppercase leading-none truncate select-none hover:opacity-85 active:scale-95 transition-all cursor-pointer"
                title="Ir al inicio"
              >
                Logistica<span className={`${currentTheme.accentText} underline decoration-2 underline-offset-4`}>HCO</span>
              </Link>
              <button
                type="button"
                onClick={() => { if (!isFindexActive) { setIsFindexSettingsOpen(true); onCloseMobile(); } }}
                title={isFindexActive ? "Inventario Activo" : "Inventario Inactivo - Click para re-autenticar"}
                className={`p-1.5 rounded-lg ${isFindexActive ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] cursor-default' : 'text-white/40 hover:text-white cursor-pointer'}`}
              >
                <Lightbulb size={17} className={isFindexActive ? "fill-yellow-400" : ""} />
              </button>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              aria-label="Cerrar menú lateral"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navegación dentro del drawer */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto">
            {menuItems.map((item, idx) => (
              item.show && (
                <Link
                  key={idx}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={`w-full flex items-center h-12 rounded-xl text-sm transition-[background-color,color,scale] duration-150 active:scale-[0.96] px-3.5 ${
                    idx === indiceActivo
                      ? `${currentTheme.active} font-semibold`
                      : 'text-white/70 font-medium hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="shrink-0 w-8 flex items-center justify-center">
                    {item.icon}
                  </span>
                  <span className="ml-3 flex flex-1 items-center">
                    {item.label}
                  </span>
                  {item.badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold leading-none text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              )
            ))}
          </nav>

          {/* Footer del drawer con perfil y acciones */}
          <div className="mt-auto border-t border-white/10 pt-4 space-y-2">
            <div className="flex items-center px-2 py-1 mb-1">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white font-black text-xs uppercase">
                {userEmail?.[0] || 'U'}
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-white font-black text-xs truncate leading-tight">{userEmail}</p>
                <p className={`${currentTheme.roleText} font-black text-[10px] uppercase italic tracking-widest mt-0.5`}>{role}</p>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => { setIsFindexSettingsOpen(true); onCloseMobile(); }}
              className="w-full flex items-center h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 font-medium text-[13.5px] transition-[background-color,color,scale] duration-150 active:scale-[0.96] px-3 cursor-pointer"
            >
              <span className="shrink-0 w-8 flex items-center justify-center">
                <Settings size={18} />
              </span>
              <span className="ml-3">Findex Auth</span>
            </button>

            <button 
              type="button"
              onClick={() => { onCloseMobile(); onLogout(); }}
              className="w-full flex items-center h-11 rounded-xl text-white/70 hover:text-rose-300 hover:bg-white/10 font-medium text-[13.5px] transition-[background-color,color,scale] duration-150 active:scale-[0.96] px-3 cursor-pointer"
            >
              <span className="shrink-0 w-8 flex items-center justify-center">
                <LogOut size={18} />
              </span>
              <span className="ml-3">Cerrar sesión</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};
