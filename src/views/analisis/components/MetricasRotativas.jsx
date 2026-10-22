import React, { useEffect, useState } from 'react';
import { Gauge, Package, TrendingDown } from 'lucide-react';

const MetricValue = ({ icon, iconClass, label, value, unit, detail }) => (
  <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {React.createElement(icon, { size: 15, className: iconClass })}
    </div>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="font-mono text-xl font-black text-slate-900">{value}</span>
      {unit && <span className="text-[10px] font-semibold text-slate-500">{unit}</span>}
    </div>
    {detail && <p className="mt-1 truncate text-[10px] font-medium text-slate-400" title={detail}>{detail}</p>}
  </div>
);

const TiemposOperativosValue = ({ primero, segundo, vendedorFilter }) => (
  <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiempos operativos</span>
      <ClockIcon />
    </div>
    <div className="mt-2 space-y-2">
      {[primero, segundo].map((tiempo) => (
        <div key={tiempo.label} className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-1.5 last:border-0 last:pb-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${tiempo.color}`} />
            <span className="truncate text-[10px] font-semibold text-slate-600">{tiempo.label}</span>
          </div>
          <span className="shrink-0 font-mono text-xs font-black text-slate-900">
            {tiempo.info?.valor || '---'} {tiempo.info?.unidad || ''}
          </span>
        </div>
      ))}
    </div>
    <p className="mt-2 truncate text-[10px] font-medium text-slate-400">{vendedorFilter ? `Filtrado por ${vendedorFilter}` : 'Promedio del período'}</p>
  </div>
);

const ClockIcon = () => <span className="text-slate-500">◷</span>;

export const MetricasRotativas = ({ metricas, vendedorFilter = '', compact = false, formatearDinero = (valor) => `$${Number(valor || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` }) => {
  const [modo, setModo] = useState('normal');
  const [automatico, setAutomatico] = useState(true);

  useEffect(() => {
    if (!automatico) return undefined;
    const timer = window.setInterval(() => {
      setModo((actual) => actual === 'normal' ? 'ventasPerdidas' : 'normal');
    }, 30000);
    return () => window.clearInterval(timer);
  }, [automatico]);

  const cambiarModo = (nuevoModo) => {
    setAutomatico(false);
    setModo(nuevoModo);
  };

  const esVentasPerdidas = modo === 'ventasPerdidas';
  const titulo = esVentasPerdidas ? 'Métricas de ventas perdidas' : 'Métricas operativas';
  const subtitulo = esVentasPerdidas
    ? 'Seguimiento comercial de oportunidades no concretadas'
    : 'Resumen del flujo de solicitudes y pedidos';
  return (
    <section className={`overflow-hidden rounded-2xl border ${esVentasPerdidas ? 'border-orange-200/80' : 'border-slate-200/80'} bg-white shadow-xs`}>
      <div className={`flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${esVentasPerdidas ? 'border-orange-100 bg-orange-50/40' : 'border-slate-100 bg-slate-50/40'}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${esVentasPerdidas ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
            {esVentasPerdidas ? <TrendingDown size={15} /> : <Gauge size={15} />}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-slate-900">{titulo}</h2>
            <p className="truncate text-[10px] font-medium text-slate-400">{subtitulo}{vendedorFilter ? ` · ${vendedorFilter}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button type="button" onClick={() => cambiarModo('normal')} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${!esVentasPerdidas ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-white'}`}>
            Operativas
          </button>
          <button type="button" onClick={() => cambiarModo('ventasPerdidas')} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${esVentasPerdidas ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-white'}`}>
            Ventas perdidas
          </button>
          <button type="button" aria-pressed={automatico} onClick={() => setAutomatico((actual) => !actual)} className={`ml-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors ${automatico ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
            {automatico ? 'Auto 30 s' : 'Manual'}
          </button>
        </div>
      </div>

      <div key={modo} className={`grid grid-cols-2 gap-2.5 p-3.5 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-4'} animate-metricas-rotativas`}>
        {esVentasPerdidas ? (
          <>
            <MetricValue icon={Package} iconClass="text-orange-600" label="Ítems en venta perdida" value={metricas.ventasPerdidas} detail={`${metricas.ventasPerdidasSolicitudes} solicitudes involucradas`} />
            <MetricValue icon={TrendingDown} iconClass="text-rose-600" label="Incidencia comercial" value={metricas.tasaVentaPerdida} unit="%" detail={`${metricas.rechazos} rechazos · sobre solicitudes del período`} />
            <MetricValue icon={TrendingDown} iconClass="text-amber-600" label="Rechazos" value={metricas.rechazos} detail="Ítems rechazados o cancelados" />
            <TiemposOperativosValue
              vendedorFilter={vendedorFilter}
              primero={{ label: 'Resp. comprador', info: metricas.tiempoRespuestaInfo, color: 'bg-blue-500' }}
              segundo={{ label: 'Reporte VP', info: metricas.tiempoVentaPerdidaInfo, color: 'bg-orange-500' }}
            />
          </>
        ) : (
          <>
            <MetricValue icon={Package} iconClass="text-slate-500" label="Total solicitudes" value={metricas.total} detail={`${metricas.pendientes} pendientes`} />
            <MetricValue icon={Gauge} iconClass="text-emerald-600" label="Conversión a pedido" value={metricas.tasaConversion} unit="%" detail={`${metricas.pedidos} pedidos ganados`} />
            <MetricValue icon={Package} iconClass="text-slate-500" label="Volumen cotizado" value={formatearDinero(metricas.montoCotizadoTotal)} detail={`${formatearDinero(metricas.montoPedidoTotal)} en pedidos`} />
            <TiemposOperativosValue
              vendedorFilter={vendedorFilter}
              primero={{ label: 'Cierre vendedor', info: metricas.tiempoCierreInfo, color: 'bg-emerald-500' }}
              segundo={{ label: 'Resp. comprador', info: metricas.tiempoRespuestaInfo, color: 'bg-blue-500' }}
            />
          </>
        )}
      </div>
    </section>
  );
};
