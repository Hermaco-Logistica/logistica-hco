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
  Lightbulb
} from 'lucide-react';
import { FindexSettingsModal } from './FindexSettingsModal';

export const Sidebar = ({ role, userEmail, onLogout, isFindexSettingsOpen, setIsFindexSettingsOpen, isFindexActive }) => {
  const location = useLocation();

  const roleTheme = {
    comprador: {
      accentText: 'text-blue-400',
      active: 'bg-blue-500 text-white shadow-xl shadow-blue-500/20 translate-x-2',
      iconHover: 'group-hover:text-blue-400',
      roleText: 'text-blue-400',
    },
    vendedor: {
      accentText: 'text-violet-400',
      active: 'bg-violet-500 text-white shadow-xl shadow-violet-500/20 translate-x-2',
      iconHover: 'group-hover:text-violet-400',
      roleText: 'text-violet-400',
    },
    gerente: {
      accentText: 'text-emerald-400',
      active: 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 translate-x-2',
      iconHover: 'group-hover:text-emerald-400',
      roleText: 'text-emerald-400',
    },
    administrador: {
      accentText: 'text-rose-400',
      active: 'bg-rose-600 text-white shadow-xl shadow-rose-600/20 translate-x-2',
      iconHover: 'group-hover:text-rose-400',
      roleText: 'text-rose-400',
    },
  };

  const currentTheme = roleTheme[role] || roleTheme.comprador;

  // Definición de ítems con la etiqueta exacta que solicitaste
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
    }
  ];

  return (
    <>
      <FindexSettingsModal isOpen={isFindexSettingsOpen} onClose={() => setIsFindexSettingsOpen(false)} />
      <div className="tf-sidebar-shell w-72 h-full flex flex-col p-6 shadow-2xl relative z-10">
        <div className="mb-12 px-4 mt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-white font-black text-2xl italic tracking-tighter uppercase leading-none">
              Logistica<span className={`${currentTheme.accentText} underline decoration-2 underline-offset-4`}>HCO</span>
            </h1>
            <button
              onClick={() => { if (!isFindexActive) setIsFindexSettingsOpen(true); }}
              title={isFindexActive ? "Inventario Activo" : "Inventario Inactivo - Click para re-autenticar"}
              className={`transition-colors duration-300 ${isFindexActive ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] cursor-default' : 'text-slate-600 hover:text-slate-400 cursor-pointer'}`}
            >
              <Lightbulb size={20} className={isFindexActive ? "fill-yellow-400" : ""} />
            </button>
          </div>
          <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.4em] mt-2">Gestor de cotizaciones</p>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item, idx) => (
            item.show && (
              <Link
                key={idx}
                to={item.path}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                  location.pathname === item.path 
                  ? currentTheme.active
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }`}
              >
                <span className={`${location.pathname === item.path ? 'text-white' : `text-slate-500 ${currentTheme.iconHover}`}`}>
                  {item.icon}
                </span>
                <span className="font-black text-[10px] uppercase tracking-[0.15em]">{item.label}</span>
              </Link>
            )
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-800/50 pt-8 px-4 pb-4">
          <div className="mb-8 text-white">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 text-right">Usuario Activo</p>
            <p className="text-white font-black text-[10px] truncate text-right">{userEmail}</p>
            <p className={`${currentTheme.roleText} font-black text-[9px] uppercase italic text-right tracking-widest`}>{role}</p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => setIsFindexSettingsOpen(true)}
              className="w-full flex items-center gap-3 text-slate-500 hover:text-emerald-400 font-black text-[10px] uppercase tracking-widest transition-all group"
            >
              <Settings size={16} /> 
              Findex Auth
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 text-slate-500 hover:text-red-400 font-black text-[10px] uppercase tracking-widest transition-all group"
            >
              <LogOut size={16} /> 
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
