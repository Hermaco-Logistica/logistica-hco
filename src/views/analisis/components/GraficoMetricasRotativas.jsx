import React from 'react';
import { useCountUp, useInView } from '../../../hooks/useInView';

function RingStat({ pct = 0, gradientId, gradientStart, gradientEnd, children, isVisible = false }) {
  const size = 148;
  const casingStroke = 14;
  const innerStroke = 8;
  const radius = (size - casingStroke - 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = isVisible ? circumference * (1 - clamped / 100) : circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
          <filter id={`${gradientId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2" />
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f1f5f9" strokeWidth={casingStroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius + casingStroke / 2} stroke="#e2e8f0" strokeWidth="1" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius - casingStroke / 2} stroke="#e2e8f0" strokeWidth="1" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#cbd5e1" strokeWidth={innerStroke} fill="none" strokeDasharray={`1 ${circumference / 4 - 1}`} opacity="0.6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={innerStroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#${gradientId}-shadow)`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function GraficoMetricasRotativas({ metricas, modo }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const esVentasPerdidas = modo === 'ventasPerdidas';
  const porcentaje = Number(esVentasPerdidas ? metricas.tasaVentaPerdida : metricas.tasaConversion) || 0;
  const porcentajeAnimado = useCountUp(porcentaje, 1200, isInView);
  const titulo = esVentasPerdidas ? 'Incidencia de ventas perdidas' : 'Conversión a pedido';
  const subtitulo = esVentasPerdidas ? 'Oportunidades no concretadas en el período' : 'Solicitudes cotizadas → pedidos ganados';

  return (
    <div
      ref={ref}
      className={`border-b p-4 transition-all duration-700 ${isInView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${esVentasPerdidas ? 'border-orange-100 bg-orange-50/20' : 'border-slate-100 bg-white'}`}
    >
      <div className="mb-1 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
        <p className="text-[11px] font-medium text-slate-400">{subtitulo}</p>
      </div>
      <div className="flex items-center justify-center py-2">
        <RingStat
          pct={porcentaje}
          gradientId={esVentasPerdidas ? 'metricas-ring-perdidas' : 'metricas-ring-normal'}
          gradientStart={esVentasPerdidas ? '#f97316' : '#10b981'}
          gradientEnd={esVentasPerdidas ? '#dc2626' : '#0d9488'}
          isVisible={isInView}
        >
          <span className="text-3xl font-black tracking-tight text-slate-900">{porcentajeAnimado.toFixed(1)}%</span>
          <span className="mt-0.5 text-[10px] font-semibold text-slate-400">
            {esVentasPerdidas ? `${metricas.ventasPerdidasSolicitudes} solicitudes` : `${metricas.pedidos} ganadas`}
          </span>
        </RingStat>
      </div>
    </div>
  );
}
