import React, { useEffect, useRef, useState } from 'react';
import { ShoppingCart, TrendingDown } from 'lucide-react';
import { StickyActionBar } from '../../../components/mobile';

export const DetalleRFQAcciones = ({
  enviandoPedido,
  mensajePedido,
  debeMostrarBotonVentaPerdida,
  handleAbrirVentaPerdida,
  handleCrearPedido,
  totalItemsSeleccionados,
  totalVentasPerdidasPendientes,
  puedeConfirmarOEnviar,
  pedidoYaCreado,
  totalItemsSeleccionables,
  totalPedidoActual
}) => {
  const accionesPrincipalesRef = useRef(null);
  const [accionesPrincipalesVisibles, setAccionesPrincipalesVisibles] = useState(false);

  useEffect(() => {
    const element = accionesPrincipalesRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setAccionesPrincipalesVisibles(entry.isIntersecting && entry.intersectionRatio > 0.15);
      },
      { threshold: [0, 0.15, 0.5, 1], rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [debeMostrarBotonVentaPerdida, puedeConfirmarOEnviar, totalVentasPerdidasPendientes]);

  const mostrarStickyMovil = (puedeConfirmarOEnviar || debeMostrarBotonVentaPerdida)
    && !accionesPrincipalesVisibles;
  const hayPedidoYVentaPerdida = totalItemsSeleccionados > 0 && totalVentasPerdidasPendientes > 0;

  return (
    <>
      <div
        ref={accionesPrincipalesRef}
        className="mt-8 flex flex-col sm:flex-row items-stretch gap-3 w-full"
      >
        {debeMostrarBotonVentaPerdida && (
          <button
            type="button"
            onClick={() => handleAbrirVentaPerdida()}
            disabled={enviandoPedido}
            className="w-full sm:w-auto px-5 sm:px-6 py-4 rounded-2xl border-2 border-rose-300 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 min-h-[48px]"
          >
            <TrendingDown size={18} className="text-rose-600 shrink-0" />
            <span className="truncate">
              {totalItemsSeleccionados > 0
                ? `Venta Perdida (${totalItemsSeleccionados})`
                : 'Registrar Venta Perdida'}
            </span>
          </button>
        )}

        <button
          onClick={handleCrearPedido}
          disabled={enviandoPedido || !puedeConfirmarOEnviar}
          className={`w-full sm:flex-1 py-4 px-5 sm:px-6 rounded-2xl font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[48px] text-xs sm:text-sm ${
            totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes > 0
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/20'
          }`}
        >
          {totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes > 0 ? (
            <TrendingDown size={18} className="shrink-0" />
          ) : (
            <ShoppingCart size={18} className="shrink-0" />
          )}
          {puedeConfirmarOEnviar && !enviandoPedido && hayPedidoYVentaPerdida ? (
            <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 text-center leading-tight">
              <span className="shrink-0">CONFIRMAR</span>
              <span className="text-[10px] font-bold tracking-wide opacity-90">
                {totalItemsSeleccionados} {totalItemsSeleccionados === 1 ? 'pedido' : 'pedidos'} · {totalVentasPerdidasPendientes} {totalVentasPerdidasPendientes === 1 ? 'venta perdida' : 'ventas perdidas'}
              </span>
            </span>
          ) : (
            <span className="truncate">
              {puedeConfirmarOEnviar
                ? (enviandoPedido
                    ? (mensajePedido || 'PROCESANDO...')
                    : totalVentasPerdidasPendientes > 0
                      ? `ENVIAR VENTAS PERDIDAS (${totalVentasPerdidasPendientes})`
                      : 'CONFIRMAR Y ENVIAR PEDIDO'
                  )
                : (pedidoYaCreado ? 'PEDIDO YA GENERADO' : 'SOLO VISUALIZACION')}
            </span>
          )}
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
          mostrarStickyMovil
            ? 'max-h-40 opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 translate-y-6 pointer-events-none'
        }`}
        aria-hidden={!mostrarStickyMovil}
      >
        <StickyActionBar
          className={`overflow-hidden transition-all duration-300 ease-out ${
            mostrarStickyMovil
              ? 'max-h-40 opacity-100 translate-y-0'
              : 'max-h-0 opacity-0 translate-y-6 pointer-events-none p-0'
          }`}
          summary={(
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                {totalItemsSeleccionados > 0 && `${totalItemsSeleccionados} ped.`}
                {totalItemsSeleccionados > 0 && totalVentasPerdidasPendientes > 0 && ' · '}
                {totalVentasPerdidasPendientes > 0 && `${totalVentasPerdidasPendientes} vta. perd.`}
                {totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes === 0 && `${totalItemsSeleccionables} cotizados`}
              </div>
              <div className="text-base font-black text-slate-900">
                ${totalPedidoActual.toFixed(2)}
              </div>
            </div>
          )}
          primaryAction={(
            <div className="flex items-center gap-1.5 sm:gap-2">
              {debeMostrarBotonVentaPerdida && (
                <button
                  type="button"
                  onClick={handleAbrirVentaPerdida}
                  disabled={enviandoPedido}
                  className="border border-rose-300 bg-rose-50 active:bg-rose-100 text-rose-700 px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl flex items-center justify-center gap-1 active:scale-95 shadow-xs font-black text-xs whitespace-nowrap cursor-pointer disabled:opacity-50 shrink-0 min-h-[48px]"
                  title={totalItemsSeleccionados > 0 ? `Registrar Venta Perdida (${totalItemsSeleccionados} sel.)` : 'Registrar Venta Perdida'}
                >
                  <TrendingDown size={15} className="text-rose-600 shrink-0" />
                  <span className="hidden xs:inline">
                    {totalItemsSeleccionados > 0 ? `Vta. Perdida (${totalItemsSeleccionados})` : 'Vta. Perdida'}
                  </span>
                  <span className="xs:hidden">
                    {totalItemsSeleccionados > 0 ? `Perdida (${totalItemsSeleccionados})` : 'Perdida'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCrearPedido}
                disabled={enviandoPedido || !puedeConfirmarOEnviar}
                className={`active:scale-95 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 shadow-md disabled:opacity-50 whitespace-nowrap min-h-[48px] ${
                  totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes > 0
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                }`}
              >
                {totalItemsSeleccionados === 0 && totalVentasPerdidasPendientes > 0 ? <TrendingDown size={16} /> : <ShoppingCart size={16} />}
                <span>
                  {enviandoPedido
                    ? (mensajePedido || 'Procesando...')
                    : totalItemsSeleccionados > 0 && totalVentasPerdidasPendientes > 0
                      ? `Confirmar (${totalItemsSeleccionados} + ${totalVentasPerdidasPendientes} VP)`
                      : totalVentasPerdidasPendientes > 0
                        ? `Enviar VP (${totalVentasPerdidasPendientes})`
                        : 'Confirmar'}
                </span>
              </button>
            </div>
          )}
        />
      </div>
    </>
  );
};

export default DetalleRFQAcciones;
