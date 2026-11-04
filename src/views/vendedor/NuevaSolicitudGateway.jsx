import React, { useEffect } from 'react';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { useNavigate } from 'react-router-dom';
import { FilePlus, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCotizacionesEstancadas } from '../../hooks/useCotizacionesEstancadas';
import { ModalBloqueoCotizaciones } from '../../components/vendedor/ModalBloqueoCotizaciones';

export const NuevaSolicitudGateway = ({ role }) => {
  const navigate = useNavigate();
  const { cotizacionesEstancadas, tieneBloqueo, loading } = useCotizacionesEstancadas({ role });

  useEffect(() => {
    (document.querySelector('main') || window).scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  if (!loading && tieneBloqueo) {
    return <ModalBloqueoCotizaciones cotizaciones={cotizacionesEstancadas} onVolver={() => navigate('/vendedor')} />;
  }

  return (
    <PageContainer size="form" className="animate-in fade-in zoom-in duration-300">
      <PageHeader title="Nueva Solicitud" />
      <div className="text-center mb-10">
        <p className="text-slate-500 font-medium text-sm sm:text-base max-w-xl mx-auto">
          ¿Qué tipo de solicitud deseas crear? Selecciona el flujo correspondiente para continuar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Opción RFQ */}
        <button
          onClick={() => navigate('/vendedor/nueva-rfq')}
          className="group relative bg-white border border-transparent rounded-3xl p-6 sm:p-8 text-left hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden shadow-[var(--tf-shadow-card)]"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
            <ArrowRight className="text-primary" size={24} />
          </div>
          
          <div className="w-14 h-14 bg-primary-soft rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <FilePlus className="text-primary-strong" size={28} />
          </div>
          
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-primary-strong transition-colors">
            Solicitud de Compra (RFQ)
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">
            Crea una nueva solicitud de repuestos para que el departamento de compras gestione su cotización con los proveedores.
          </p>
        </button>

        {/* Opción Pedido Manual */}
        <button
          onClick={() => navigate('/vendedor/nuevo-pedido')}
          className="group relative bg-primary-soft border border-primary/30 rounded-3xl p-6 sm:p-8 text-left hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden shadow-[var(--tf-shadow-card)]"
        >
          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
            <ArrowRight className="text-primary-strong" size={24} />
          </div>

          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <ShoppingCart className="text-primary-strong" size={28} />
          </div>
          
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-primary-strong transition-colors">
            Pedido Manual
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">
            Registra un pedido que ya cuenta con un precio acordado para que compras proceda directamente con la validación y compra.
          </p>
        </button>
      </div>
    </PageContainer>
  );
};
