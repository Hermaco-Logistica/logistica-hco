import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FilePlus, 
  ClipboardList, 
  ShoppingBag, 
  LogOut,
  PackageCheck
} from 'lucide-react';

export const Sidebar = ({ role, userEmail, onLogout }) => {
  const location = useLocation();

  // Definición de ítems con la etiqueta exacta que solicitaste
  const menuItems = [
    {
      label: 'Mis Solicitudes',
      icon: <LayoutDashboard size={18} />,
      path: '/vendedor',
      show: role === 'vendedor'
    },
    {
      label: 'Nueva Solicitud',
      icon: <FilePlus size={18} />,
      path: '/vendedor/nueva',
      show: role === 'vendedor'
    },
    {
      label: 'Bandeja RFQ',
      icon: <ClipboardList size={18} />,
      path: '/compras',
      show: role === 'comprador'
    },
    {
      label: 'Dashboard de Pedidos', // <--- Nombre actualizado
      icon: <PackageCheck size={18} />,
      path: '/pedidos',
      show: true 
    },
    {
      label: 'Gestión de OC',
      icon: <ShoppingBag size={18} />,
      path: '/gestion-oc',
      show: role === 'comprador'
    }
  ];

  return (
    <div className="w-72 bg-slate-900 h-full flex flex-col p-6 shadow-2xl relative z-10">
      <div className="mb-12 px-4 mt-4">
        <h1 className="text-white font-black text-2xl italic tracking-tighter uppercase leading-none">
          Trade<span className="text-emerald-500 underline decoration-2 underline-offset-4">Flow</span>
        </h1>
        <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.4em] mt-2">Supply Chain Manager</p>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item, idx) => (
          item.show && (
            <Link
              key={idx}
              to={item.path}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                location.pathname === item.path 
                ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 translate-x-2' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
              }`}
            >
              <span className={`${location.pathname === item.path ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`}>
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
          <p className="text-emerald-500 font-black text-[9px] uppercase italic text-right tracking-widest">{role}</p>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 text-slate-500 hover:text-red-400 font-black text-[10px] uppercase tracking-widest transition-all group"
        >
          <LogOut size={16} /> 
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};