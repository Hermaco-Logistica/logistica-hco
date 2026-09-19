import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, ShoppingCart, ArrowRight } from 'lucide-react';

export const NuevaSolicitudGateway = () => {
  const navigate = useNavigate();

  useEffect(() => {
    (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in zoom-in duration-300">
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-4xl font-black text-slate-800 uppercase italic tracking-tight mb-3">
          Nueva Solicitud
        </h1>
        <p className="text-slate-500 font-medium text-sm sm:text-base max-w-xl mx-auto">
          ¿Qué tipo de solicitud deseas crear? Selecciona el flujo correspondiente para continuar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Opción RFQ */}
        <button
          onClick={() => navigate('/vendedor/nueva-rfq')}
          className="group relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-left hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
            <ArrowRight className="text-violet-500" size={24} />
          </div>
          
          <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <FilePlus className="text-violet-600" size={28} />
          </div>
          
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-violet-700 transition-colors">
            Solicitud de Compra (RFQ)
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">
            Crea una nueva solicitud de repuestos para que el departamento de compras gestione su cotización con los proveedores.
          </p>
        </button>

        {/* Opción Pedido Manual */}
        <button
          onClick={() => navigate('/vendedor/nuevo-pedido')}
          className="group relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-left hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
            <ArrowRight className="text-emerald-500" size={24} />
          </div>

          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <ShoppingCart className="text-emerald-600" size={28} />
          </div>
          
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-emerald-700 transition-colors">
            Pedido Manual
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">
            Registra un pedido que ya cuenta con un precio acordado para que compras proceda directamente con la validación y compra.
          </p>
        </button>
      </div>
    </div>
  );
};
