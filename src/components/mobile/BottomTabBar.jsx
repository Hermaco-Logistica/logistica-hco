import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
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

export const BAR_HEIGHT = 62;
export const CIRCLE_SIZE = 52;
export const NOTCH_WIDTH = 72;
export const NOTCH_DEPTH = 27;
export const BAR_RADIUS = 20;

const PAGE_BG = '#f8fafc';

const ROLE_THEMES = {
  comprador: {
    activeText: 'text-blue-600',
    activeBg: 'bg-blue-50',
    indicator: 'bg-blue-600',
    glowColor: 'rgba(37, 99, 235, 0.18)',
    ringColor: PAGE_BG,
  },
  vendedor: {
    activeText: 'text-violet-600',
    activeBg: 'bg-violet-50',
    indicator: 'bg-violet-600',
    glowColor: 'rgba(124, 58, 237, 0.18)',
    ringColor: PAGE_BG,
  },
  gerente: {
    activeText: 'text-emerald-600',
    activeBg: 'bg-emerald-50',
    indicator: 'bg-emerald-600',
    glowColor: 'rgba(5, 150, 105, 0.18)',
    ringColor: PAGE_BG,
  },
  administrador: {
    activeText: 'text-rose-600',
    activeBg: 'bg-rose-50',
    indicator: 'bg-rose-600',
    glowColor: 'rgba(225, 29, 72, 0.18)',
    ringColor: PAGE_BG,
  },
};

export const generateBarPath = (W, H, R, cx, nw, nd) => {
  const halfNw = nw / 2;
  const leftNotch = cx - halfNw;
  const rightNotch = cx + halfNw;

  return [
    `M ${R},0`,
    `L ${leftNotch},0`,
    `C ${cx - nw * 0.28},0 ${cx - nw * 0.22},${nd} ${cx},${nd}`,
    `C ${cx + nw * 0.22},${nd} ${cx + nw * 0.28},0 ${rightNotch},0`,
    `L ${W - R},0`,
    `A ${R},${R} 0 0 1 ${W},${R}`,
    `L ${W},${H - R}`,
    `A ${R},${R} 0 0 1 ${W - R},${H}`,
    `L ${R},${H}`,
    `A ${R},${R} 0 0 1 0,${H - R}`,
    `L 0,${R}`,
    `A ${R},${R} 0 0 1 ${R},0`,
    `Z`
  ].join(' ');
};

export const BottomTabBar = ({ role, onOpenDrawer, hidden = false }) => {
  const location = useLocation();
  const navRef = useRef(null);
  const [barWidth, setBarWidth] = useState(0);
  const [isFocusInside, setIsFocusInside] = useState(false);
  const theme = ROLE_THEMES[role] || ROLE_THEMES.comprador;

  useEffect(() => {
    const handleFocus = () => {
      const activeEl = document.activeElement;
      if (
        navRef.current &&
        activeEl &&
        navRef.current.contains(activeEl) &&
        activeEl.matches(':focus-visible')
      ) {
        setIsFocusInside(true);
      } else {
        setIsFocusInside(false);
      }
    };
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (navRef.current) {
      const mainEl = navRef.current.closest('.tf-app-shell')?.querySelector('main');
      if (mainEl) {
        mainEl.scrollTop = 0;
      }
    }
  }, [location.pathname]);

  // Medición síncrona pre-render con useLayoutEffect + ResizeObserver reactivo
  useLayoutEffect(() => {
    if (navRef.current) {
      const rect = navRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setBarWidth(rect.width);
      }
    }
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setBarWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(navRef.current);
    return () => observer.disconnect();
  }, []);

  // Configuración de pestañas por rol
  const tabs = useMemo(() => {
    switch (role) {
      case 'vendedor':
        return [
          { label: 'Mis RFQs', path: '/vendedor', icon: <ClipboardList size={20} />, exact: true },
          { label: 'Nueva', path: '/vendedor/nueva', icon: <FilePlus size={20} /> },
          { label: 'Pedidos', path: '/pedidos', icon: <PackageCheck size={20} /> },
          { label: 'Más', action: onOpenDrawer, icon: <Menu size={20} /> }
        ];

      case 'comprador':
        return [
          { label: 'Bandeja', path: '/compras', icon: <ClipboardList size={20} /> },
          { label: 'Pedidos', path: '/pedidos', icon: <PackageCheck size={20} /> },
          { label: 'Órdenes', path: '/gestion-oc', icon: <ShoppingBag size={20} /> },
          { label: 'Análisis', path: '/analisis', icon: <BarChart3 size={20} /> },
          { label: 'Más', action: onOpenDrawer, icon: <Menu size={20} /> }
        ];

      case 'gerente':
        return [
          { label: 'Globales', path: '/vendedor', icon: <LayoutDashboard size={20} /> },
          { label: 'Bandeja', path: '/compras', icon: <ClipboardList size={20} /> },
          { label: 'Pedidos', path: '/pedidos', icon: <PackageCheck size={20} /> },
          { label: 'Nueva', path: '/vendedor/nueva', icon: <FilePlus size={20} /> },
          { label: 'Más', action: onOpenDrawer, icon: <Menu size={20} /> }
        ];

      case 'administrador':
      default:
        return [
          { label: 'Globales', path: '/vendedor', icon: <LayoutDashboard size={20} /> },
          { label: 'Bandeja', path: '/compras', icon: <ClipboardList size={20} /> },
          { label: 'Pedidos', path: '/pedidos', icon: <PackageCheck size={20} /> },
          { label: 'Órdenes', path: '/gestion-oc', icon: <ShoppingBag size={20} /> },
          { label: 'Más', action: onOpenDrawer, icon: <Menu size={20} /> }
        ];
    }
  }, [role, onOpenDrawer]);

  // Lógica de coincidencia más específica por longitud de path
  const activeIndex = useMemo(() => {
    const p = location.pathname;
    const matches = [];

    tabs.forEach((tab, index) => {
      if (!tab.path) return;
      const isMatch = tab.exact 
        ? p === tab.path 
        : p === tab.path || p.startsWith(tab.path + '/');
      if (isMatch) {
        matches.push({ index, pathLength: tab.path.length });
      }
    });

    if (matches.length > 0) {
      matches.sort((a, b) => b.pathLength - a.pathLength);
      return matches[0].index;
    }

    // Si ninguna coincide, activar "Más" (último tab)
    return tabs.length - 1;
  }, [tabs, location.pathname]);

  // Cálculo de PAD y posición centro del activo (clamped)
  const { pad, targetCx } = useMemo(() => {
    const N = tabs.length;
    const minX = BAR_RADIUS + NOTCH_WIDTH / 2;
    let computedPad = 0;
    if (N > 1 && barWidth > 0) {
      computedPad = Math.max(0, (N * minX - barWidth / 2) / (N - 1));
    }
    const tabWidth = barWidth > 0 ? (barWidth - 2 * computedPad) / N : 0;
    const rawCx = computedPad + (activeIndex + 0.5) * tabWidth;
    const clampedCx = barWidth > 0 ? Math.min(Math.max(rawCx, minX), barWidth - minX) : 0;
    return { pad: computedPad, targetCx: clampedCx };
  }, [tabs.length, barWidth, activeIndex]);

  // Animación suave de animatedCx con requestAnimationFrame (~300ms, ease-out)
  const [animatedCx, setAnimatedCx] = useState(null);
  const animFrameRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (targetCx <= 0) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isFirstRenderRef.current || animatedCx === null || prefersReduced) {
      setAnimatedCx(targetCx);
      isFirstRenderRef.current = false;
      return;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const startX = animatedCx;
    const targetX = targetCx;
    const startTime = performance.now();
    const duration = 300;

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentX = startX + (targetX - startX) * easeOut;

      setAnimatedCx(currentX);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetCx]);

  const currentCx = animatedCx !== null ? animatedCx : targetCx;
  const pathD = barWidth > 0 && currentCx > 0
    ? generateBarPath(barWidth, BAR_HEIGHT, BAR_RADIUS, currentCx, NOTCH_WIDTH, NOTCH_DEPTH)
    : '';

  const activeTab = tabs[activeIndex];
  const isActuallyHidden = hidden && !isFocusInside;

  return (
    <nav
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))',
        transform: isActuallyHidden ? 'translateY(calc(100% + 40px))' : 'translateY(0)'
      }}
      {...(isActuallyHidden ? { inert: '' } : {})}
      className="fixed bottom-0 inset-x-3 sm:inset-x-6 z-40 md:hidden overflow-visible pointer-events-none select-none transition-transform duration-300 ease-out motion-reduce:transition-none"
      aria-label="Navegación principal"
    >
      <div 
        ref={navRef} 
        style={{ height: `${BAR_HEIGHT}px` }} 
        className="relative w-full overflow-visible pointer-events-auto"
      >
        {/* SVG de fondo con notch curvo y sombra con resplandor */}
        {barWidth > 0 && pathD && (
          <svg
            width={barWidth}
            height={BAR_HEIGHT}
            className="absolute inset-0 overflow-visible pointer-events-none"
            style={{
              filter: `drop-shadow(0 8px 24px ${theme.glowColor}) drop-shadow(0 4px 12px rgba(0,0,0,0.06))`
            }}
          >
            <path d={pathD} fill="#FFFFFF" />
          </svg>
        )}

        {/* Círculo Flotante del Ítem Activo (incluye área táctil extendida) */}
        {barWidth > 0 && currentCx > 0 && activeTab && (
          <div
            tabIndex={-1}
            aria-hidden="true"
            style={{
              transform: `translate3d(${currentCx - CIRCLE_SIZE / 2}px, -${CIRCLE_SIZE / 2 + 8}px, 0)`,
              width: `${CIRCLE_SIZE}px`,
              height: `${CIRCLE_SIZE}px`,
              boxShadow: `0 0 0 6px ${theme.ringColor}`
            }}
            className="absolute top-0 left-0 z-30 flex items-center justify-center rounded-full bg-white pointer-events-auto cursor-pointer"
          >
            {activeTab.action ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={activeTab.action}
                className="w-full h-full rounded-full flex items-center justify-center active:scale-95 transition-transform outline-none"
              >
                <div 
                  key={activeIndex}
                  className={`${theme.activeText} flex items-center justify-center animate-tabpop motion-reduce:animate-none`}
                >
                  {React.cloneElement(activeTab.icon, { size: 22, strokeWidth: 2.5 })}
                </div>
              </button>
            ) : (
              <Link
                to={activeTab.path}
                tabIndex={-1}
                aria-hidden="true"
                className="w-full h-full rounded-full flex items-center justify-center active:scale-95 transition-transform outline-none"
              >
                <div 
                  key={activeIndex}
                  className={`${theme.activeText} flex items-center justify-center animate-tabpop motion-reduce:animate-none`}
                >
                  {React.cloneElement(activeTab.icon, { size: 22, strokeWidth: 2.5 })}
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Columnas de Ítems */}
        <div
          style={{
            paddingLeft: `${pad}px`,
            paddingRight: `${pad}px`,
            height: `${BAR_HEIGHT}px`
          }}
          className="relative z-20 flex items-center justify-between w-full pb-2"
        >
          {tabs.map((tab, idx) => {
            const active = idx === activeIndex;
            const isPageLink = !!tab.path;

            if (tab.action) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={tab.action}
                  aria-current={active && isPageLink ? 'page' : undefined}
                  className="flex-1 min-w-[44px] min-h-[44px] flex flex-col items-center justify-end px-0.5 transition-all cursor-pointer outline-none"
                >
                  {!active && (
                    <div className="text-slate-500 hover:text-slate-700 mb-0.5">
                      {tab.icon}
                    </div>
                  )}
                  <span className={`text-[11px] tracking-tight leading-none truncate max-w-[64px] ${
                    active 
                      ? `${theme.activeText} font-semibold text-[12px]` 
                      : 'text-slate-500 font-normal'
                  }`}>
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={idx}
                to={tab.path}
                aria-current={active && isPageLink ? 'page' : undefined}
                className="flex-1 min-w-[44px] min-h-[44px] flex flex-col items-center justify-end px-0.5 transition-all outline-none"
              >
                {!active && (
                  <div className="text-slate-500 hover:text-slate-700 mb-0.5">
                    {tab.icon}
                  </div>
                )}
                <span className={`text-[11px] tracking-tight leading-none truncate max-w-[64px] ${
                  active 
                    ? `${theme.activeText} font-semibold text-[12px]` 
                    : 'text-slate-500 font-normal'
                }`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;
