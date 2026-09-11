import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ClipboardList, 
  FilePlus, 
  PackageCheck, 
  ShoppingBag, 
  BarChart3, 
  LayoutDashboard, 
  Menu 
} from 'lucide-react';

const ROLE_THEMES = {
  comprador: {
    activeText: 'text-blue-600',
    activeBg: 'bg-blue-50',
    indicator: 'bg-blue-600',
  },
  vendedor: {
    activeText: 'text-violet-600',
    activeBg: 'bg-violet-50',
    indicator: 'bg-violet-600',
  },
  gerente: {
    activeText: 'text-emerald-600',
    activeBg: 'bg-emerald-50',
    indicator: 'bg-emerald-600',
  },
  administrador: {
    activeText: 'text-rose-600',
    activeBg: 'bg-rose-50',
    indicator: 'bg-rose-600',
  },
};

export const BottomTabBar = ({ role, onOpenDrawer }) => {
  const location = useLocation();
  const theme = ROLE_THEMES[role] || ROLE_THEMES.comprador;

  // Configuración de tabs por rol
  const getTabsForRole = () => {
    switch (role) {
      case 'vendedor':
        return [
          {
            label: 'Mis RFQs',
            path: '/vendedor',
            icon: <ClipboardList size={20} />,
            exact: true
          },
          {
            label: 'Nueva',
            path: '/vendedor/nueva',
            icon: <FilePlus size={20} />
          },
          {
            label: 'Pedidos',
            path: '/pedidos',
            icon: <PackageCheck size={20} />
          },
          {
            label: 'Más',
            action: onOpenDrawer,
            icon: <Menu size={20} />
          }
        ];

      case 'comprador':
        return [
          {
            label: 'Bandeja',
            path: '/compras',
            icon: <ClipboardList size={20} />
          },
          {
            label: 'Pedidos',
            path: '/pedidos',
            icon: <PackageCheck size={20} />
          },
          {
            label: 'Gestión OC',
            path: '/gestion-oc',
            icon: <ShoppingBag size={20} />
          },
          {
            label: 'Análisis',
            path: '/analisis',
            icon: <BarChart3 size={20} />
          },
          {
            label: 'Más',
            action: onOpenDrawer,
            icon: <Menu size={20} />
          }
        ];

      case 'gerente':
        return [
          {
            label: 'Globales',
            path: '/vendedor',
            icon: <LayoutDashboard size={20} />
          },
          {
            label: 'Bandeja',
            path: '/compras',
            icon: <ClipboardList size={20} />
          },
          {
            label: 'Pedidos',
            path: '/pedidos',
            icon: <PackageCheck size={20} />
          },
          {
            label: 'Análisis',
            path: '/analisis',
            icon: <BarChart3 size={20} />
          },
          {
            label: 'Más',
            action: onOpenDrawer,
            icon: <Menu size={20} />
          }
        ];

      case 'administrador':
      default:
        return [
          {
            label: 'Globales',
            path: '/vendedor',
            icon: <LayoutDashboard size={20} />
          },
          {
            label: 'Bandeja',
            path: '/compras',
            icon: <ClipboardList size={20} />
          },
          {
            label: 'Pedidos',
            path: '/pedidos',
            icon: <PackageCheck size={20} />
          },
          {
            label: 'Gestión OC',
            path: '/gestion-oc',
            icon: <ShoppingBag size={20} />
          },
          {
            label: 'Más',
            action: onOpenDrawer,
            icon: <Menu size={20} />
          }
        ];
    }
  };

  const tabs = getTabsForRole();

  const isTabActive = (tab) => {
    if (!tab.path) return false;
    if (tab.exact) return location.pathname === tab.path;
    return location.pathname.startsWith(tab.path);
  };

  return (
    <nav
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))'
      }}
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      aria-label="Navegación móvil inferior"
    >
      <div className="flex items-center justify-around h-15 px-2">
        {tabs.map((tab, idx) => {
          const active = isTabActive(tab);

          if (tab.action) {
            return (
              <button
                key={idx}
                type="button"
                onClick={tab.action}
                className="flex-1 flex flex-col items-center justify-center py-1 px-1 text-slate-500 hover:text-slate-900 active:scale-95 transition-all cursor-pointer select-none"
              >
                <div className="p-1 rounded-xl transition-colors">
                  {tab.icon}
                </div>
                <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={idx}
              to={tab.path}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 relative transition-all select-none ${
                active 
                  ? `${theme.activeText} font-black` 
                  : 'text-slate-400 hover:text-slate-700 font-bold'
              }`}
            >
              {active && (
                <span 
                  className={`absolute top-0 w-8 h-0.5 rounded-full ${theme.indicator}`} 
                />
              )}
              <div className={`p-1 rounded-xl transition-transform ${active ? 'scale-110' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none truncate max-w-[64px]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
