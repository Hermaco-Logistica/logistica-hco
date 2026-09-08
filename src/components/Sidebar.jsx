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
  BarChart3
} from 'lucide-react';
import { FindexSettingsModal } from './FindexSettingsModal';
import { usePersistedState } from '../hooks/usePersistedState';

export const Sidebar = ({ role, userEmail, onLogout, isFindexSettingsOpen, setIsFindexSettingsOpen, isFindexActive }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = usePersistedState('sidebar_collapsed', false);

  const roleTheme = {
    comprador: {
      accentText: 'text-blue-300',
      active: 'bg-blue-500 text-white shadow-xl shadow-black/25',
      activeCollapsed: 'bg-blue-500 text-white shadow-xl shadow-black/25',
      iconHover: 'group-hover:text-white',
      roleText: 'text-blue-300',
    },
    vendedor: {
      accentText: 'text-violet-300',
      active: 'bg-violet-500 text-white shadow-xl shadow-black/25',
      activeCollapsed: 'bg-violet-500 text-white shadow-xl shadow-black/25',
      iconHover: 'group-hover:text-white',
      roleText: 'text-violet-300',
    },
    gerente: {
      accentText: 'text-emerald-300',
      active: 'bg-emerald-500 text-white shadow-xl shadow-black/25',
      activeCollapsed: 'bg-emerald-500 text-white shadow-xl shadow-black/25',
      iconHover: 'group-hover:text-white',
      roleText: 'text-emerald-300',
    },
    administrador: {
      accentText: 'text-rose-300',
      active: 'bg-rose-500 text-white shadow-xl shadow-black/25',
      activeCollapsed: 'bg-rose-500 text-white shadow-xl shadow-black/25',
      iconHover: 'group-hover:text-white',
      roleText: 'text-rose-300',
    },
  };

  const currentTheme = roleTheme[role] || roleTheme.comprador;

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
      show: role === 'vendedor' || role === 'gerente'
    },
    {
      label: 'Bandeja RFQ',
      icon: <ClipboardList size={18} />,
      path: '/compras',
      show: role === 'comprador' || role === 'gerente' || role === 'administrador'
    },
    {
      label: 'Dashboard de Pedidos',
      icon: <PackageCheck size={18} />,
      path: '/pedidos',
      show: true 
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

  return (
    <>
      <FindexSettingsModal isOpen={isFindexSettingsOpen} onClose={() => setIsFindexSettingsOpen(false)} />
      <aside
        className={`tf-sidebar-shell h-full flex flex-col p-3 transition-[width] duration-300 ease-in-out shadow-2xl relative z-10 shrink-0 select-none overflow-x-hidden ${
          collapsed ? 'w-20' : 'w-72'
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
            <button
              type="button"
              onClick={() => { if (!isFindexActive) setIsFindexSettingsOpen(true); }}
              title={isFindexActive ? "Inventario Activo" : "Inventario Inactivo - Click para re-autenticar"}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-200 ${
                isFindexActive 
                  ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] cursor-default' 
                  : 'text-white/40 hover:text-white hover:bg-white/10 cursor-pointer'
              }`}
            >
              <Lightbulb size={17} className={isFindexActive ? "fill-yellow-400" : ""} />
            </button>
          </div>
        ) : (
          <div className="mb-6 px-1 mt-1 shrink-0">
            <div className="flex items-center justify-between gap-2 h-11">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-white font-black text-2xl italic tracking-tighter uppercase leading-none truncate select-none">
                  Logistica<span className={`${currentTheme.accentText} underline decoration-2 underline-offset-4`}>HCO</span>
                </h1>
                <button
                  type="button"
                  onClick={() => { if (!isFindexActive) setIsFindexSettingsOpen(true); }}
                  title={isFindexActive ? "Inventario Activo" : "Inventario Inactivo - Click para re-autenticar"}
                  className={`transition-colors duration-300 shrink-0 p-1.5 rounded-lg hover:bg-white/10 ${
                    isFindexActive ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] cursor-default' : 'text-white/40 hover:text-white cursor-pointer'
                  }`}
                >
                  <Lightbulb size={18} className={isFindexActive ? "fill-yellow-400" : ""} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                title="Plegar barra lateral"
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>
            <p className="text-white/40 font-bold text-[9px] uppercase tracking-[0.4em] mt-1.5 whitespace-nowrap overflow-hidden">
              Gestor de cotizaciones
            </p>
          </div>
        )}

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-1.5 w-full">
          {menuItems.map((item, idx) => (
            item.show && (
              <Link
                key={idx}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center h-11 rounded-xl transition-all duration-200 group px-3 ${
                  location.pathname === item.path
                    ? `${currentTheme.activeCollapsed} ${collapsed ? '' : 'translate-x-1'}`
                    : `text-white/70 hover:bg-white/10 hover:text-white ${collapsed ? '' : 'hover:translate-x-1'}`
                }`}
              >
                <span className={`shrink-0 w-8 flex items-center justify-center transition-colors ${
                  location.pathname === item.path ? 'text-white' : 'text-white/60 group-hover:text-white'
                }`}>
                  {item.icon}
                </span>
                <span
                  className={`whitespace-nowrap overflow-hidden font-black text-[10px] uppercase tracking-[0.15em] transition-all duration-300 ease-in-out ${
                    collapsed
                      ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                      : 'max-w-[200px] opacity-100 translate-x-0 ml-3'
                  }`}
                >
                  {item.label}
                </span>
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
              title={collapsed ? "Findex Auth" : undefined}
              className="w-full flex items-center h-10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-widest transition-colors duration-200 cursor-pointer px-3"
            >
              <span className="shrink-0 w-8 flex items-center justify-center">
                <Settings size={16} />
              </span>
              <span
                className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
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
              title={collapsed ? "Cerrar Sesión" : undefined}
              className="w-full flex items-center h-10 rounded-xl text-white/60 hover:text-rose-300 hover:bg-white/10 font-black text-[10px] uppercase tracking-widest transition-colors duration-200 cursor-pointer px-3"
            >
              <span className="shrink-0 w-8 flex items-center justify-center">
                <LogOut size={16} />
              </span>
              <span
                className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                  collapsed
                    ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                    : 'max-w-[200px] opacity-100 translate-x-0 ml-3'
                }`}
              >
                Cerrar Sesión
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
