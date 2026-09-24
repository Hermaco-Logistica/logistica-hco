import React, { useState } from 'react';
import { EstadoItemChip } from '../components/pedidos/negociacion/EstadoItemChip';
import { OfertaDiff } from '../components/pedidos/negociacion/OfertaDiff';
import { FormularioOferta } from '../components/pedidos/negociacion/FormularioOferta';
import { ResumenTurnos } from '../components/pedidos/negociacion/ResumenTurnos';
import { BarraNotificar } from '../components/pedidos/negociacion/BarraNotificar';
import { useToast } from '../components/ui/Toast';

export const NegociacionPreview = () => {
  const { addToast } = useToast();
  
  const [unnotifiedCount, setUnnotifiedCount] = useState(0);
  const [notificacionPendiente, setNotificacionPendiente] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ofertaDraft, setOfertaDraft] = useState({ precio: 0, tiempoEntrega: '', modalidad: 'Aéreo' });

  const showToast = (type) => {
    if (type === 'success') {
      addToast({ type: 'success', title: 'Éxito', message: 'La operación se realizó correctamente.' });
    } else if (type === 'error') {
      addToast({ type: 'error', title: 'Error', message: 'Hubo un problema con la operación.' });
    } else if (type === 'undo') {
      addToast({
        type: 'info',
        message: 'Cambio guardado temporalmente.',
        action: { label: 'Deshacer', onClick: () => alert('Deshacer clickeado!') }
      });
    }
  };

  return (
    <div className="p-8 pb-32 max-w-4xl mx-auto space-y-12">
      <h1 className="text-2xl font-black mb-8">Dev Preview: Negociación UI</h1>

      <section>
        <h2 className="text-lg font-bold mb-4 border-b pb-2">1. EstadoItemChip</h2>
        <div className="flex flex-wrap gap-6 items-end">
          <EstadoItemChip estado="Pendiente" pendingRole="compras" />
          <EstadoItemChip estado="Cotizado" pendingRole="vendedor" />
          <EstadoItemChip estado="Pedido" />
          <EstadoItemChip estado="Denegado" />
          <EstadoItemChip estado="Cancelado" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4 border-b pb-2">2. OfertaDiff</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OfertaDiff 
            actual={{ precio: 100, tiempoEntrega: 5, modalidad: 'Aéreo' }} 
            label="Sin anterior"
          />
          <OfertaDiff 
            actual={{ precio: 100, tiempoEntrega: 5, modalidad: 'Marítimo' }} 
            anterior={{ precio: 120, tiempoEntrega: 5, modalidad: 'Aéreo' }}
            label="Con cambios (precio, modalidad)"
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4 border-b pb-2">3. FormularioOferta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormularioOferta 
            ofertaDraft={ofertaDraft}
            originalOferta={{ precio: 100, tiempoEntrega: '5', modalidad: 'Aéreo' }}
            onChange={setOfertaDraft}
            onCancel={() => {}}
            onSubmit={() => alert('Submit!')}
            title="Ajustar"
          />
          <FormularioOferta 
            ofertaDraft={{ precio: 50, tiempoEntrega: 2, modalidad: 'Aéreo' }}
            onChange={() => {}}
            onCancel={() => {}}
            onSubmit={() => {}}
            title="Disabled"
            disabled={true}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4 border-b pb-2">4. ResumenTurnos</h2>
        <ResumenTurnos 
          resumen={{ turnoCompras: 2, turnoVendedor: 1, acordados: 5, denegados: 1 }}
          isVendedor={true}
        />
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4 border-b pb-2">5. Toasts</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm" onClick={() => showToast('success')}>Éxito</button>
          <button className="px-4 py-2 bg-rose-500 text-white rounded-lg font-bold text-sm" onClick={() => showToast('error')}>Error</button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm" onClick={() => showToast('undo')}>Con Deshacer</button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4 border-b pb-2">6. BarraNotificar Controls</h2>
        <div className="flex gap-4 items-center mb-4">
          <button className="px-3 py-1 border rounded" onClick={() => setUnnotifiedCount(c => c + 1)}>+1 Unnotified</button>
          <button className="px-3 py-1 border rounded" onClick={() => setUnnotifiedCount(0)}>Reset Unnotified</button>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={notificacionPendiente} onChange={e => setNotificacionPendiente(e.target.checked)} />
            Correo Fallido
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isProcessing} onChange={e => setIsProcessing(e.target.checked)} />
            Cargando
          </label>
        </div>
      </section>

      <BarraNotificar 
        unnotifiedCount={unnotifiedCount}
        notificacionPendienteEmail={notificacionPendiente}
        onNotificar={() => alert('Notificar!')}
        onReintentar={() => alert('Reintentar!')}
        isLoading={isProcessing}
        isVendedor={true}
      />
    </div>
  );
};
