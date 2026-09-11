import React, { useEffect } from 'react';
import { useInView, useCountUp } from '../../hooks/useInView';
import {
  Package,
  TrendingUp,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  Truck,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';

/* ============================================================================
   PRIMITIVOS MÓVILES
   Todos reutilizan tu paleta (slate-900 / bordes slate-200/80 / shadow-xs /
   rounded-2xl / mono para números) — solo cambia la COMPOSICIÓN para mobile.
   ========================================================================== */

/** Chip de estadística — icono en círculo de color + valor + etiqueta (como Walk step / Sleep en image2) */
// eslint-disable-next-line no-unused-vars
function StatChip({ icon: Icon, iconBg, iconColor, value, unit, label }) {
  return (
    <div className="flex-1 min-w-0 bg-slate-50/70 border border-slate-200/60 rounded-2xl p-3 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={15} className={iconColor} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1 truncate">
          <span className="text-sm font-black text-slate-900 font-mono truncate">{value}</span>
          {unit && <span className="text-[10px] font-semibold text-slate-400">{unit}</span>}
        </div>
        <p className="text-[10px] font-medium text-slate-400 truncate">{label}</p>
      </div>
    </div>
  );
}

/** Fila de lista tipo "Recently uploaded" — avatar iniciales + nombre + badge derecha, con soporte para barra de progreso */
function ListRow({ initials, title, subtitle, badgeValue, badgeColorClass, onClick, index, total, pedidos, maxTotal, theme }) {
  if (total !== undefined && maxTotal !== undefined) {
    const pct = Math.max(5, Math.round((total / maxTotal) * 100));
    const pedidosRatio = total > 0 ? (pedidos / total) : 0;
    const pedidosPct = Math.round(pedidosRatio * 100);

    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 py-2.5 px-1 active:bg-slate-50 rounded-xl transition-colors cursor-pointer"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 border shadow-xs ${theme?.flujoEstados?.cotizadas?.iconBg || 'bg-slate-100 text-slate-600 border-slate-200/70'}`}>
          {initials}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {index !== undefined && <span className="text-[10px] text-slate-400 font-mono font-normal mr-1">#{index + 1}</span>}
              {title}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-slate-900 font-mono">{total}</span>
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded font-mono ${theme?.flujoEstados?.pedidos?.badge || 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'}`}>
                {pedidosPct}%
              </span>
            </div>
          </div>
          
          {/* Barra minimalista pero conservando el "encaje" corporativo */}
          <div className="relative w-full h-2 bg-slate-100/90 rounded-full p-[1.5px] border border-slate-200/60 shadow-inner flex items-center">
            <div 
              className="h-full rounded-full flex overflow-hidden shadow-2xs transition-all duration-700"
              style={{ width: `${pct}%` }}
            >
              {pedidos > 0 && (
                <div 
                  className={`h-full bg-gradient-to-r ${theme?.flujoEstados?.pedidos?.barGradient || 'from-emerald-500 to-teal-500'} transition-all duration-500`}
                  style={{ width: `${pedidosPct}%` }}
                />
              )}
              <div 
                className={`h-full bg-gradient-to-r ${theme?.flujoEstados?.cotizadas?.barGradient || 'from-slate-500 to-slate-600'} transition-all duration-500`}
                style={{ width: pedidos > 0 ? `${100 - pedidosPct}%` : '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 py-2.5 px-1 active:bg-slate-50 rounded-xl transition-colors cursor-pointer"
    >
      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-bold shrink-0 border border-slate-200/70">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800 truncate">{title}</p>
        <p className="text-[10px] text-slate-400 font-medium truncate">{subtitle}</p>
      </div>
      <span className={`shrink-0 text-[11px] font-mono font-bold px-2 py-1 rounded-lg border ${badgeColorClass}`}>
        {badgeValue}
      </span>
      <ChevronRight size={14} className="text-slate-300 shrink-0" />
    </div>
  );
}

/* ============================================================================
   SECCIONES
   ========================================================================== */

/** 1. Selector de período — tira de píldoras horizontal (reemplaza el segmented control de escritorio) */
function MobilePeriodStrip({ periodo, setPeriodo, onChange }) {
  const opciones = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: 'this_month', label: 'Mes' },
    { id: '90d', label: '90D' },
    { id: 'this_year', label: 'Año' },
    { id: 'custom', label: 'Rango' },
    { id: 'historico', label: 'Histórico' }
  ];
  useEffect(() => {
    const btn = document.getElementById(`periodo-btn-${periodo}`);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [periodo]);

  return (
    <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden -mx-4 px-4 pb-1">
      {opciones.map((p) => (
        <button
          key={p.id}
          id={`periodo-btn-${p.id}`}
          type="button"
          onClick={() => { setPeriodo(p.id); onChange?.(); }}
          className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
            periodo === p.id
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-500 border border-slate-200/80'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** Anillo de progreso circular con estilo corporativo (gradiente, grosor fino, y "encaje") */
function RingStat({ pct = 0, size = 148, casingStroke = 14, innerStroke = 8, gradientId = 'ringGrad', children, isVisible = false }) {
  // Radio ajustado para evitar que los bordes del encaje se corten en el SVG
  const r = (size - casingStroke - 2) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = isVisible ? c * (1 - clamped / 100) : c;
  
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          {/* Filtro para la sombra interior del "encaje" (simula shadow-inner) */}
          <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feOffset dx="0" dy="1"/>
            <feGaussianBlur stdDeviation="2" result="offset-blur"/>
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
            <feFlood floodColor="black" floodOpacity="0.1" result="color"/>
            <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
            <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
          </filter>
          {/* Sombra suave para la línea de progreso (simula shadow-xs) */}
          <filter id="ringShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2" />
          </filter>
        </defs>
        
        {/* Fondo del encaje (simula bg-slate-200/60) */}
        <circle 
          cx={size / 2} cy={size / 2} r={r} 
          stroke="#f1f5f9" 
          strokeWidth={casingStroke} 
          fill="none" 
          filter="url(#innerShadow)"
        />
        
        {/* Bordes del encaje (simula border-slate-200/80) */}
        <circle cx={size / 2} cy={size / 2} r={r + casingStroke/2} stroke="#e2e8f0" strokeWidth="1" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r - casingStroke/2} stroke="#e2e8f0" strokeWidth="1" fill="none" />

        {/* Ticks simulados (25%, 50%, 75%) opcionales para mayor fidelidad */}
        <circle 
          cx={size / 2} cy={size / 2} r={r} 
          stroke="#cbd5e1" strokeWidth={innerStroke} fill="none" 
          strokeDasharray={`1 ${c/4 - 1}`}
          opacity="0.6"
        />

        {/* Línea principal rellena (más delgada que el encaje para dejar "padding") */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={innerStroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          filter="url(#ringShadow)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** 2. Hero — anillo de Tasa de Conversión + 3 celdas de apoyo (Total / Pendientes / Monto) */
function MobileHeroCard({ metricas, formatearDinero, onVerPedidos }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const pct = Number(metricas.tasaConversion) || 0;

  const animatedTasa = useCountUp(pct, 1200, isInView);
  const animatedTotal = useCountUp(metricas.total, 1200, isInView);
  const animatedPendientes = useCountUp(metricas.pendientes, 1200, isInView);
  const animatedMontoCotizado = useCountUp(metricas.montoCotizadoTotal, 1200, isInView);

  return (
    <div ref={ref}>
      <div className={`bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-700 ease-out transform ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversión a Pedido</p>
            <p className="text-[11px] text-slate-400 font-medium">Cotizadas → Ganadas</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-2 mt-1">
          <RingStat pct={pct} isVisible={isInView}>
            <span className="text-3xl font-black text-slate-900 tracking-tight">{animatedTasa.toFixed(1)}%</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
              {metricas.pedidos} ganadas{metricas.pedidosParciales > 0 ? ` (+${metricas.pedidosParciales} parc)` : ''}
            </span>
          </RingStat>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total RFQs</p>
            <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{Math.round(animatedTotal)}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              <span className="text-rose-600 font-bold">{Math.round(animatedPendientes)}</span> pendientes
            </p>
          </div>
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Volumen Cotiz.</p>
            <p className="text-lg font-black text-slate-900 font-mono mt-0.5 truncate" title={formatearDinero(metricas.montoCotizadoTotal)}>
              {formatearDinero(animatedMontoCotizado)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
              {formatearDinero(metricas.montoPedidoTotal)} en pedidos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onVerPedidos}
          className="mt-3 w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
        >
          Ver pedidos ganados <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );
}

/** 3. Flujo de estados — diseño idéntico a desktop */
function MobileFlujoCard({ theme, metricas, onVerTodas, onVerEstado }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  
  const items = [
    { 
      tipo: 'pendiente',
      label: 'Pendiente de Cotizar', 
      count: metricas.pendientes, 
      icon: Clock,
      iconBg: theme.flujoEstados?.pendiente?.iconBg || 'bg-amber-50 text-amber-600 border-amber-200/80',
      barGradient: theme.flujoEstados?.pendiente?.barGradient || 'from-amber-500 to-amber-600',
      subGradient: theme.flujoEstados?.pendiente?.subGradient || 'from-amber-400 to-amber-500',
      textColor: theme.flujoEstados?.pendiente?.textColor || 'text-amber-700',
      desc: 'Solicitudes en espera de cotización por compras',
      completas: metricas.pendientes,
      parciales: 0
    },
    { 
      tipo: 'cotizadas',
      label: 'Cotizadas / Parciales', 
      count: metricas.cotizadas, 
      icon: DollarSign,
      iconBg: theme.flujoEstados?.cotizadas?.iconBg || 'bg-sky-50 text-sky-600 border-sky-200/80',
      barGradient: theme.flujoEstados?.cotizadas?.barGradient || 'from-sky-500 to-blue-600',
      subGradient: theme.flujoEstados?.cotizadas?.subGradient || 'from-sky-400 to-blue-400',
      textColor: theme.flujoEstados?.cotizadas?.textColor || 'text-sky-700',
      desc: 'Precios enviados al vendedor o cliente',
      completas: metricas.cotizadasCompletas,
      parciales: metricas.cotizadasParciales,
      subdetail: `${metricas.cotizadasCompletas} completas · ${metricas.cotizadasParciales} parciales`
    },
    { 
      tipo: 'pedidos',
      label: 'Pedidos Confirmados / Parciales', 
      count: metricas.pedidos, 
      icon: CheckCircle2,
      iconBg: theme.flujoEstados?.pedidos?.iconBg || 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
      barGradient: theme.flujoEstados?.pedidos?.barGradient || 'from-emerald-500 to-teal-600',
      subGradient: theme.flujoEstados?.pedidos?.subGradient || 'from-emerald-400 to-teal-400',
      textColor: theme.flujoEstados?.pedidos?.textColor || 'text-emerald-700',
      desc: 'Aprobadas para adquisición y entrega logística',
      completas: metricas.pedidosCompletos,
      parciales: metricas.pedidosParciales,
      subdetail: `${metricas.pedidosCompletos} confirmados · ${metricas.pedidosParciales} parciales`
    }
  ];

  return (
    <div ref={ref}>
      <div className={`bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-700 ease-out transform ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Flujo de Solicitudes</h2>
            <p className="text-[11px] text-slate-400 font-medium">Ciclo de vida de RFQs</p>
          </div>
          <button type="button" onClick={onVerTodas} className="text-[11px] font-bold text-slate-500 flex items-center gap-0.5 shrink-0">
            Todas ({metricas.total}) <ArrowUpRight size={12} />
          </button>
        </div>

        <div className="space-y-2.5">
          {items.map((item) => {
            const porcentaje = metricas.total > 0 
              ? Number(((item.count / metricas.total) * 100).toFixed(1))
              : 0;
            const IconComponent = item.icon;
            const totalSegmentos = (item.completas || 0) + (item.parciales || 0);
            const pctCompletas = totalSegmentos > 0 
              ? ((item.completas || 0) / totalSegmentos) * 100 
              : 100;
            const pctParciales = totalSegmentos > 0 
              ? ((item.parciales || 0) / totalSegmentos) * 100 
              : 0;

            return (
              <div 
                key={item.tipo}
                onClick={() => onVerEstado && onVerEstado(item.tipo)}
                className="p-3 bg-slate-50/70 active:bg-slate-100 rounded-2xl border border-slate-200/60 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 border border-black/5`}>
                      <IconComponent size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {item.label}
                        </span>
                        <ChevronRight size={12} className="text-slate-400 shrink-0" />
                      </div>
                      {item.subdetail && (
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {item.subdetail}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-baseline justify-end gap-1.5 shrink-0 pl-2">
                    <span className={`text-sm font-black ${item.textColor} font-mono`}>
                      {item.count}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shadow-2xs">
                      {porcentaje}%
                    </span>
                  </div>
                </div>

                {/* Barra corporativa con micro-regla y segmentación */}
                <div className="relative w-full h-2 bg-slate-200/60 rounded-md p-0.5 border border-slate-200/80 shadow-inner overflow-hidden flex items-center">
                  {/* Ticks guía de escala 25%, 50%, 75% */}
                  <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none opacity-25 z-0">
                    <div className="w-px h-full bg-slate-400" />
                    <div className="w-px h-full bg-slate-400" />
                  </div>

                  {/* Barra rellena proporcional */}
                  {porcentaje > 0 && (
                    <div 
                      className="h-full rounded-xs flex overflow-hidden shadow-xs transition-all duration-700 relative z-10"
                      style={{ width: `${porcentaje}%` }}
                    >
                      {/* Segmento principal (Completas) */}
                      <div 
                        className={`h-full bg-gradient-to-r ${item.barGradient} transition-all duration-500`}
                        style={{ width: pctParciales > 0 ? `${pctCompletas}%` : '100%' }}
                      />
                      {/* Segmento secundario (Parciales si existen) */}
                      {pctParciales > 0 && (
                        <div 
                          className={`h-full bg-gradient-to-r ${item.subGradient || item.barGradient} border-l border-white/40 transition-all duration-500`}
                          style={{ width: `${pctParciales}%` }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 4. Tiempos operativos — 2 chips de color, como Walk step / Sleep de la referencia */
function MobileTiemposRow({ metricas }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref}>
      <div className={`flex gap-2.5 transition-all duration-700 ease-out transform ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <StatChip
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          value={metricas.tiempoCierreInfo?.valor !== '---' ? metricas.tiempoCierreInfo.valor : '???'}
          unit={metricas.tiempoCierreInfo?.valor !== '---' ? metricas.tiempoCierreInfo.unidad : ''}
          label="Cierre Vendedor"
        />
        <StatChip
          icon={Clock}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          value={metricas.tiempoRespuestaInfo?.valor !== '---' ? metricas.tiempoRespuestaInfo.valor : '???'}
          unit={metricas.tiempoRespuestaInfo?.valor !== '---' ? metricas.tiempoRespuestaInfo.unidad : ''}
          label="Resp. Comprador"
        />
      </div>
    </div>
  );
}

/** 5. Top Clientes / Vendedores — lista de filas, con tabs internas si se combinan */
// eslint-disable-next-line no-unused-vars
function MobileTopListCard({ theme, title, subtitle, icon: Icon, items, onVerTodos, emptyText }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref}>
      <div className={`bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-700 ease-out transform ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
            <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
            <Icon size={15} />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-medium">{emptyText}</div>
        ) : (
          <div className="divide-y divide-slate-100 mt-1">
            {items.map((it, i) => (
              <ListRow key={i} theme={theme} {...it} />
            ))}
          </div>
        )}

        {onVerTodos && (
          <button
            type="button"
            onClick={onVerTodos}
            className="mt-3 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-xs font-semibold text-slate-600"
          >
            <span>Ver todos</span>
            <ArrowUpRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/** 6. Top Productos — scroll horizontal de cards compactas (snap) */
function MobileProductosScroll({ productos, onSelect, onVerTodos }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref}>
      <div className={`bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-700 ease-out transform ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Top Productos</h2>
            <p className="text-[11px] text-slate-400 font-medium">Más cotizados en el período</p>
          </div>
          <button type="button" onClick={onVerTodos} className="text-[11px] font-bold text-slate-500 flex items-center gap-0.5 shrink-0">
            Todos <ArrowUpRight size={12} />
          </button>
        </div>

        {productos.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-medium">Sin productos en el período.</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden -mx-5 px-5">
            {productos.map((p, idx) => (
              <div
                key={idx}
                onClick={() => onSelect(p)}
                className="snap-start shrink-0 w-[168px] p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60 active:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                  {p.ganadas > 0 && p.ganadas === p.veces && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <CheckCircle2 size={9} /> Ganado
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug mb-3 uppercase min-h-[32px]">
                  {p.desc}
                </h3>
                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Cotizado</span>
                    <span className="font-mono font-semibold text-slate-700">{p.veces}x</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Ganado</span>
                    {p.ganadas > 0 ? (
                      <span className="inline-flex items-center gap-0.5 font-mono font-bold text-emerald-700 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-200/60 text-[10px]">
                        {p.ganadas}x
                        <span className="text-[9px] text-emerald-600 font-sans ml-0.5">
                          ({Math.round((p.ganadas / p.veces) * 100)}%)
                        </span>
                      </span>
                    ) : (
                      <span className="font-mono font-medium text-slate-400 text-[10px]">0</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Unidades</span>
                    <span className="font-mono font-semibold text-slate-700">{p.unidades.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 7. Estado logístico — grid 2x2 de chips de color (solo comprador/admin) */
function MobileLogisticaCard({ statsLogistica, onVerLogistica }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  
  const animatedTotal = useCountUp(statsLogistica.total, 1200, isInView);
  const animatedTransito = useCountUp(statsLogistica.enTransito, 1200, isInView);
  const animatedAduana = useCountUp(statsLogistica.enAduana, 1200, isInView);
  const animatedEntregadas = useCountUp(statsLogistica.entregadas, 1200, isInView);

  return (
    <div ref={ref}>
      <div className={`bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-700 ease-out transform ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Estado Logístico</h2>
            <p className="text-[11px] text-slate-400 font-medium">Órdenes de Compra (OCs)</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
            <Truck size={15} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <StatChip icon={Package} iconBg="bg-slate-100" iconColor="text-slate-600" value={Math.round(animatedTotal)} label="Total OCs" />
          <StatChip icon={Truck} iconBg="bg-amber-50" iconColor="text-amber-600" value={Math.round(animatedTransito)} label="En tránsito" />
          <StatChip icon={Clock} iconBg="bg-sky-50" iconColor="text-sky-600" value={Math.round(animatedAduana)} label="En aduana" />
          <StatChip icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" value={Math.round(animatedEntregadas)} label="Entregadas" />
        </div>

        <button
          type="button"
          onClick={onVerLogistica}
          className="mt-3 w-full py-2.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
        >
          Ir a panel logístico <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   COMPONENTE PRINCIPAL MOBILE
   Recibe los datos YA CALCULADOS por tu componente de escritorio
   (metricas, statsVendedores, topClientes, topProductos, statsLogistica, theme)
   para no duplicar toda la lógica de useMemo/filtrado.
   ========================================================================== */

export const AnalisisEstadisticasMobile = ({
  theme,
  // eslint-disable-next-line no-unused-vars
  role,
  periodo,
  setPeriodo,
  metricas,
  statsVendedores = [],
  topClientes = [],
  topProductos = [],
  statsLogistica,
  puedeVerLogistica,
  formatearDinero,
  navigate,
  resetPage,
  FiltrosComponent
}) => {
  const maxVendedoresTotal = statsVendedores[0]?.total || 1;
  const vendedoresRows = statsVendedores.slice(0, 5).map((v, idx) => {
    const efectividad = v.cotizadas > 0 ? Math.round((v.pedidos / v.cotizadas) * 100) : 0;
    return {
      initials: v.nombre[0] || 'V',
      title: v.nombre,
      subtitle: `${v.total} RFQs · ${v.cotizadas} cotizadas`,
      badgeValue: `${efectividad}% conv`,
      badgeColorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      index: idx,
      total: v.total,
      pedidos: v.pedidos,
      maxTotal: maxVendedoresTotal,
      onClick: () => navigate(`/analisis/vendedor/${encodeURIComponent(v.nombre)}`)
    };
  });

  const maxClientesTotal = topClientes[0]?.total || 1;
  const clientesRows = topClientes.slice(0, 5).map((c, idx) => {
    const efectividad = c.cotizadas > 0 ? Math.round((c.pedidos / c.cotizadas) * 100) : 0;
    return {
      initials: c.cliente[0] || 'C',
      title: c.cliente,
      subtitle: `${c.total} RFQs`,
      badgeValue: `${efectividad}% conv`,
      badgeColorClass: 'bg-slate-100 text-slate-700 border-slate-200/60',
      index: idx,
      total: c.total,
      pedidos: c.pedidos,
      maxTotal: maxClientesTotal,
      onClick: () => navigate(`/analisis/cliente/${encodeURIComponent(c.cliente)}`)
    };
  });

  return (
    <div className="animate-in fade-in duration-500 pb-12 space-y-4">
      {/* CABECERA (Solo saludo y rol) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Analítica</h1>
          <p className="text-[11px] text-slate-500 font-medium">Resumen de operaciones</p>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${theme.bgBadge}`}>{theme.label}</span>
      </div>

      {/* SELECTOR DE PERÍODO */}
      <MobilePeriodStrip periodo={periodo} setPeriodo={setPeriodo} onChange={resetPage} />

      {/* BARRA DE FILTROS (INYECTADA DESDE DESKTOP) */}
      {FiltrosComponent && FiltrosComponent}

      {/* HERO: CONVERSIÓN */}
      <MobileHeroCard
        theme={theme}
        metricas={metricas}
        formatearDinero={formatearDinero}
        onVerPedidos={() => navigate('/analisis/solicitudes/pedidos')}
      />

      {/* TIEMPOS OPERATIVOS */}
      <MobileTiemposRow metricas={metricas} />

      {/* FLUJO DE ESTADOS */}
      <MobileFlujoCard theme={theme} metricas={metricas} onVerTodas={() => navigate('/analisis/solicitudes/todas')} onVerEstado={(tipo) => navigate(`/analisis/solicitudes/${tipo}`)} />

      {/* TOP VENDEDORES */}
      <MobileTopListCard
        title="Rendimiento por Vendedor"
        subtitle="Actividad y conversión"
        icon={Users}
        items={vendedoresRows}
        emptyText="No hay datos para mostrar"
        onVerTodos={() => navigate('/analisis/vendedores')}
      />

      {/* TOP CLIENTES */}
      <MobileTopListCard
        title="Top Clientes"
        subtitle="Mayor volumen de solicitudes"
        icon={Users}
        items={clientesRows}
        emptyText="No hay clientes en el período"
        onVerTodos={() => navigate('/analisis/clientes')}
      />

      {/* TOP PRODUCTOS */}
      <MobileProductosScroll
        productos={topProductos}
        onSelect={(p) => navigate(`/analisis/producto/${encodeURIComponent(p.desc)}`)}
        onVerTodos={() => navigate('/analisis/productos')}
      />

      {/* LOGÍSTICA */}
      {puedeVerLogistica && (
        <MobileLogisticaCard statsLogistica={statsLogistica} onVerLogistica={() => navigate('/analisis/logistica')} />
      )}
    </div>
  );
};

export default AnalisisEstadisticasMobile;
