import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Users, 
  Truck, 
  Calendar,
  Filter,
  ArrowUpRight,
  ChevronRight,
  Layers,
  Search,
  Zap,
  AlertCircle
} from 'lucide-react';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme, formatearTiempoRespuesta } from './theme';
import {
  getHoyElSalvador,
  getAnioActualElSalvador,
  parseInicioDiaElSalvador,
  parseFinDiaElSalvador,
  validarRangoFechas,
  cargarFiltroPeriodoStorage,
  guardarFiltroPeriodoStorage
} from '../../utils/dateValidation';

import { useSessionState } from '../../hooks/usePersistedState';

export const AnalisisEstadisticas = ({ role, solicitudes = [], ordenesCompra = [] }) => {
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);

  // Cargar última selección guardada en sessionStorage (o default 30d)
  const [filtroPeriodoInicial] = useState(() => cargarFiltroPeriodoStorage());
  const [periodo, setPeriodo] = useState(filtroPeriodoInicial.periodo);
  const [fechaInicio, setFechaInicio] = useState(filtroPeriodoInicial.fechaInicio);
  const [fechaFin, setFechaFin] = useState(filtroPeriodoInicial.fechaFin);
  const [anioHistorico, setAnioHistorico] = useState(() => filtroPeriodoInicial.anioHistorico || getAnioActualElSalvador());
  const [vendedorFilter, setVendedorFilter] = useSessionState('analisis_vendedor_filter', '');
  const [clienteSearch, setClienteSearch] = useSessionState('analisis_cliente_search', '');
  const [ordenarProductosPor, setOrdenarProductosPor] = useSessionState('analisis_top_prod_orden', 'veces'); // 'veces' (default) | 'unidades'
  const [pageVendedores, setPageVendedores] = useState(1);
  const itemsPerPageVendedores = 5;

  // Persistir última selección de período/rango en sessionStorage
  useEffect(() => {
    guardarFiltroPeriodoStorage({ periodo, fechaInicio, fechaFin, anioHistorico });
  }, [periodo, fechaInicio, fechaFin, anioHistorico]);

  const hoyElSalvador = useMemo(() => getHoyElSalvador(), []);
  const anioActualSV = useMemo(() => getAnioActualElSalvador(), []);

  // Validación en frontend de fechas (imposibles, futuras, incoherencias)
  const validacionRango = useMemo(() => {
    if (periodo !== 'custom') {
      return { esValido: true, errorInicio: null, errorFin: null, errorGeneral: null };
    }
    return validarRangoFechas(fechaInicio, fechaFin);
  }, [periodo, fechaInicio, fechaFin]);

  const puedeVerLogistica = role === 'comprador' || role === 'administrador';

  // Scroll horizontal y vertical por arrastre para la card de Rendimiento por Vendedor
  const scrollVendedoresRef = useRef(null);
  const isDraggingVendedoresRef = useRef(false);
  const dragStartXVendRef = useRef(0);
  const dragStartScrollLeftVendRef = useRef(0);

  const handleDragStartVend = useCallback((e) => {
    const el = scrollVendedoresRef.current;
    if (!el) return;
    isDraggingVendedoresRef.current = true;
    dragStartXVendRef.current = e.pageX - el.offsetLeft;
    dragStartScrollLeftVendRef.current = el.scrollLeft;
  }, []);

  const handleDragEndVend = useCallback(() => {
    isDraggingVendedoresRef.current = false;
  }, []);

  const handleDragMoveVend = useCallback((e) => {
    const el = scrollVendedoresRef.current;
    if (!isDraggingVendedoresRef.current || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragStartXVendRef.current;
    el.scrollLeft = dragStartScrollLeftVendRef.current - walk;
  }, []);




  const parseDate = (val) => {
    if (!val) return null;
    if (typeof val === 'object') {
      if (typeof val.toDate === 'function') {
        try { return val.toDate(); } catch { return null; }
      }
      if (typeof val.seconds === 'number') {
        return new Date(val.seconds * 1000);
      }
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  // Lista de vendedores únicos para el selector
  const vendedoresDisponibles = useMemo(() => {
    return Array.from(new Set(solicitudes.map(s => s.vendedorNombre).filter(Boolean))).sort();
  }, [solicitudes]);

  // Años disponibles en los datos (para el selector de "Histórico por año")
  const aniosDisponibles = useMemo(() => {
    const years = new Set();
    solicitudes.forEach(s => {
      const fecha = parseDate(s.fechaS || s.fechaCreacion);
      if (fecha) years.add(fecha.getFullYear());
    });
    return [...years].sort((a, b) => b - a); // descendente: año más reciente primero
  }, [solicitudes]);

  // Filtrado de solicitudes según período, vendedor y cliente
  const solicitudesFiltradas = useMemo(() => {
    const ahora = new Date();

    return solicitudes.filter((s) => {
      // Filtro por fecha de solicitud (fechaS o fechaCreacion)
      const fecha = parseDate(s.fechaS || s.fechaCreacion);
      if (fecha) {
        if (periodo === 'custom') {
          // Si hay incoherencia entre fechas (Desde > Hasta), no aplicar filtro hasta corregirlo
          if (!validacionRango.esValido && validacionRango.errorGeneral && fechaInicio && fechaFin && fechaInicio > fechaFin) {
            return true;
          }
          if (fechaInicio && !validacionRango.errorInicio) {
            const dInicio = parseInicioDiaElSalvador(fechaInicio);
            if (dInicio && fecha < dInicio) return false;
          }
          if (fechaFin && !validacionRango.errorFin) {
            const dFin = parseFinDiaElSalvador(fechaFin);
            if (dFin && fecha > dFin) return false;
          }
        } else if (periodo === 'historico') {
          // Histórico por año: si hay un año específico seleccionado, filtrar por él
          if (anioHistorico !== 'todos') {
            if (fecha.getFullYear() !== anioHistorico) return false;
          }
          // Si anioHistorico === 'todos', no aplicar filtro de fecha (todo el historial)
        } else if (periodo !== 'all') {
          // Períodos relativos (7d, 30d, 90d, this_year)
          const diffDias = (ahora.getTime() - fecha.getTime()) / (1000 * 3600 * 24);
          if (periodo === '7d' && diffDias > 7) return false;
          if (periodo === '30d' && diffDias > 30) return false;
          if (periodo === '90d' && diffDias > 90) return false;
          if (periodo === 'this_year' && fecha.getFullYear() !== anioActualSV) return false;
        }
      }

      // Filtro por vendedor
      if (vendedorFilter && s.vendedorNombre !== vendedorFilter) return false;

      // Filtro por búsqueda de cliente
      if (clienteSearch) {
        const term = normalizarBusqueda(clienteSearch);
        if (!normalizarBusqueda(s.cliente || '').includes(term)) return false;
      }

      return true;
    });
  }, [solicitudes, periodo, fechaInicio, fechaFin, anioHistorico, vendedorFilter, clienteSearch, validacionRango, anioActualSV]);

  // Cálculos y métricas principales
  const metricas = useMemo(() => {
    const total = solicitudesFiltradas.length;
    let pendientes = 0;
    let cotizadas = 0;
    let cotizadasParcial = 0;
    let pedidos = 0;
    let pedidosParcial = 0;
    let montoCotizadoTotal = 0;
    let montoPedidoTotal = 0;
    let totalDiasCotizacion = 0;
    let cotizacionesConTiempo = 0;

    solicitudesFiltradas.forEach((s) => {
      const estado = s.estado || 'Pendiente';
      if (estado === 'Pendiente') pendientes++;
      else if (estado === 'Cotizado') cotizadas++;
      else if (estado === 'Cotizado Parcial') cotizadasParcial++;
      else if (estado === 'Pedido') pedidos++;
      else if (estado === 'Pedido Parcial') pedidosParcial++;

      // Cálculo de montos en base a productos
      if (Array.isArray(s.productos)) {
        s.productos.forEach((p) => {
          const cant = Number(p.cant || 1);
          const fob = Number(p.fob || 0);
          const fobReal = Number(p.fobReal || fob);
          const unitario = Number(p.precioUnitario || fob);

          if (fob > 0 || unitario > 0) {
            montoCotizadoTotal += (unitario > 0 ? unitario : fob) * cant;
          }

          if (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || estado === 'Pedido') {
            montoPedidoTotal += (fobReal > 0 ? fobReal : (unitario > 0 ? unitario : fob)) * cant;
          }
        });
      }

      // Tiempo de respuesta entre creación y cotización
      const fInicio = parseDate(s.fechaS || s.fechaCreacion);
      const fCot = parseDate(s.fechaCotizacion);
      if (fInicio && fCot && fCot >= fInicio) {
        const dias = (fCot.getTime() - fInicio.getTime()) / (1000 * 3600 * 24);
        totalDiasCotizacion += dias;
        cotizacionesConTiempo++;
      }
    });

    const totalCotizadasDirectas = cotizadas + cotizadasParcial + pedidos + pedidosParcial;
    const tasaConversion = totalCotizadasDirectas > 0 
      ? ((pedidos / totalCotizadasDirectas) * 100).toFixed(1)
      : 0;

    const tiempoPromedioDiasRaw = cotizacionesConTiempo > 0 
      ? (totalDiasCotizacion / cotizacionesConTiempo)
      : null;
    const tiempoRespuestaInfo = formatearTiempoRespuesta(tiempoPromedioDiasRaw);

    return {
      total,
      pendientes,
      cotizadas: cotizadas + cotizadasParcial,
      cotizadasCompletas: cotizadas,
      cotizadasParciales: cotizadasParcial,
      pedidos, // Solo pedidos ganados completos al 100%
      pedidosCompletos: pedidos,
      pedidosParciales: pedidosParcial,
      tasaConversion,
      montoCotizadoTotal,
      montoPedidoTotal,
      tiempoPromedioDias: tiempoRespuestaInfo.valor,
      tiempoRespuestaInfo
    };
  }, [solicitudesFiltradas]);

  // Top productos más cotizados y ganados
  const topProductos = useMemo(() => {
    const map = {};
    solicitudesFiltradas.forEach((s) => {
      if (!Array.isArray(s.productos)) return;
      s.productos.forEach((p) => {
        const desc = (p.desc || p.descripcion || 'Sin descripción').trim().toUpperCase();
        const key = normalizarBusqueda(desc);
        if (!key) return;

        const cant = Number(p.cant || 1);
        const marca = p.marca?.trim() || '';
        const esGanado = p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || s.estado === 'Pedido' || s.estado === 'Comprado';

        if (!map[key]) {
          map[key] = {
            desc,
            marca,
            veces: 0,
            unidades: 0,
            ganadas: 0,
            unidadesGanadas: 0
          };
        }
        map[key].veces++;
        map[key].unidades += cant;
        if (esGanado) {
          map[key].ganadas++;
          map[key].unidadesGanadas += cant;
        }
        if (!map[key].marca && marca) map[key].marca = marca;
      });
    });

    return Object.values(map)
      .sort((a, b) => {
        if (ordenarProductosPor === 'unidades') {
          return b.unidades - a.unidades || b.veces - a.veces;
        }
        if (ordenarProductosPor === 'ganadas') {
          return b.ganadas - a.ganadas || b.veces - a.veces;
        }
        return b.veces - a.veces || b.unidades - a.unidades;
      })
      .slice(0, 5);
  }, [solicitudesFiltradas, ordenarProductosPor]);

  // Desempeño por vendedor
  const statsVendedores = useMemo(() => {
    const map = {};
    solicitudesFiltradas.forEach((s) => {
      const vend = s.vendedorNombre || 'Sin asignar';
      if (!map[vend]) {
        map[vend] = { nombre: vend, total: 0, cotizadas: 0, pedidos: 0 };
      }
      map[vend].total++;
      if (['Cotizado', 'Cotizado Parcial', 'Pedido', 'Pedido Parcial'].includes(s.estado)) {
        map[vend].cotizadas++;
      }
      if (s.estado === 'Pedido' || s.estado === 'Comprado') {
        map[vend].pedidos++;
      } else if (s.estado === 'Pedido Parcial') {
        map[vend].pedidosParciales = (map[vend].pedidosParciales || 0) + 1;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [solicitudesFiltradas]);

  const totalPagesVendedores = Math.max(1, Math.ceil(statsVendedores.length / itemsPerPageVendedores));
  const safePageVendedores = Math.min(pageVendedores, totalPagesVendedores);
  const paginatedVendedores = statsVendedores.slice((safePageVendedores - 1) * itemsPerPageVendedores, safePageVendedores * itemsPerPageVendedores);

  // Top clientes
  const topClientes = useMemo(() => {
    const map = {};
    solicitudesFiltradas.forEach((s) => {
      const cli = s.cliente?.trim() || 'Desconocido';
      if (!map[cli]) {
        map[cli] = { cliente: cli, total: 0, pedidos: 0, pedidosParciales: 0 };
      }
      map[cli].total++;
      if (s.estado === 'Pedido' || s.estado === 'Comprado') {
        map[cli].pedidos++;
      } else if (s.estado === 'Pedido Parcial') {
        map[cli].pedidosParciales = (map[cli].pedidosParciales || 0) + 1;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [solicitudesFiltradas]);

  // Resumen de órdenes de compra
  const statsLogistica = useMemo(() => {
    const ahora = new Date();

    const ordenesFiltradas = ordenesCompra.filter((oc) => {
      const fecha = parseDate(oc.fechaCreacion);
      if (!fecha) return true; // Si no tiene fecha, mantener visible

      if (periodo === 'custom') {
        if (!validacionRango.esValido && validacionRango.errorGeneral && fechaInicio && fechaFin && fechaInicio > fechaFin) {
          return true;
        }
        if (fechaInicio && !validacionRango.errorInicio) {
          const dInicio = parseInicioDiaElSalvador(fechaInicio);
          if (dInicio && fecha < dInicio) return false;
        }
        if (fechaFin && !validacionRango.errorFin) {
          const dFin = parseFinDiaElSalvador(fechaFin);
          if (dFin && fecha > dFin) return false;
        }
        return true;
      }

      if (periodo === 'historico') {
        if (anioHistorico !== 'todos') {
          if (fecha.getFullYear() !== anioHistorico) return false;
        }
        return true;
      }

      if (periodo !== 'all') {
        const diffDias = (ahora.getTime() - fecha.getTime()) / (1000 * 3600 * 24);
        if (periodo === '7d' && diffDias > 7) return false;
        if (periodo === '30d' && diffDias > 30) return false;
        if (periodo === '90d' && diffDias > 90) return false;
        if (periodo === 'this_year' && fecha.getFullYear() !== anioActualSV) return false;
      }

      return true;
    });

    const total = ordenesFiltradas.length;
    let enTransito = 0;
    let enAduana = 0;
    let entregadas = 0;
    let pendientes = 0;

    ordenesFiltradas.forEach((oc) => {
      const est = (oc.estado || '').toLowerCase();
      if (est.includes('transito') || est.includes('tránsito') || est.includes('en camino') || est.includes('shipped')) {
        enTransito++;
      } else if (est.includes('aduana') || est.includes('customs') || est.includes('despacho')) {
        enAduana++;
      } else if (est.includes('entregad') || est.includes('delivered') || est.includes('recibido') || est.includes('completo')) {
        entregadas++;
      } else {
        pendientes++;
      }
    });

    return { total, enTransito, enAduana, entregadas, pendientes };
  }, [ordenesCompra, periodo, fechaInicio, fechaFin, anioHistorico, validacionRango, anioActualSV]);

  const formatearDinero = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Bloqueo estricto para rol vendedor
  if (role === 'vendedor') {
    return <Navigate to="/vendedor" replace />;
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6 pb-12">
      {/* CABECERA MINIMALISTA & ROL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Análisis & Estadísticas
            </h1>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${theme.bgBadge}`}>
              {theme.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Métricas operativas consolidadas, trazabilidad de solicitudes y rendimiento comercial
          </p>
        </div>

        {/* SELECTOR DE PERÍODO SEGMENTADO */}
        <div className="inline-flex flex-wrap items-center bg-white p-1 rounded-2xl border border-slate-200/90 shadow-xs self-start sm:self-auto">
          {[
            { id: '7d', label: '7D' },
            { id: '30d', label: '30D' },
            { id: '90d', label: '90D' },
            { id: 'this_year', label: 'Este Año' },
            { id: 'custom', label: 'Rango' },
            { id: 'historico', label: 'Histórico' }
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPeriodo(p.id); setPageVendedores(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodo === p.id 
                  ? theme.activePeriod
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* BARRA DE FILTROS MINIMALISTA */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold shrink-0">
          <Filter size={14} className="text-slate-400" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Filtros:</span>
        </div>

        {periodo === 'custom' && (
          <div className="flex flex-col gap-1.5 w-full sm:w-auto animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 px-2.5 rounded-xl border border-slate-200/80 shrink-0">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desde</span>
                <input
                  type="date"
                  value={fechaInicio}
                  max={fechaFin && fechaFin <= hoyElSalvador ? fechaFin : hoyElSalvador}
                  onChange={(e) => { setFechaInicio(e.target.value); setPageVendedores(1); }}
                  className={`border rounded-lg px-2 py-0.5 text-xs outline-none font-mono transition-colors ${
                    validacionRango.errorInicio 
                      ? 'border-rose-400 text-rose-800 bg-rose-50/50 focus:border-rose-500' 
                      : 'border-slate-200/80 bg-white text-slate-700 focus:border-slate-400'
                  }`}
                  title={validacionRango.errorInicio || 'Fecha inicial (00:00:00 El Salvador)'}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasta</span>
                <input
                  type="date"
                  value={fechaFin}
                  min={fechaInicio || undefined}
                  max={hoyElSalvador}
                  onChange={(e) => { setFechaFin(e.target.value); setPageVendedores(1); }}
                  className={`border rounded-lg px-2 py-0.5 text-xs outline-none font-mono transition-colors ${
                    validacionRango.errorFin 
                      ? 'border-rose-400 text-rose-800 bg-rose-50/50 focus:border-rose-500' 
                      : 'border-slate-200/80 bg-white text-slate-700 focus:border-slate-400'
                  }`}
                  title={validacionRango.errorFin || 'Fecha final (23:59:59 El Salvador)'}
                />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 hidden xl:inline-block pl-1.5 border-l border-slate-200 whitespace-nowrap">
                UTC-6 (El Salvador)
              </span>
            </div>

            {/* Alerta de validación en frontend */}
            {!validacionRango.esValido && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-600 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-lg font-medium animate-in fade-in">
                <AlertCircle size={13} className="shrink-0 text-rose-500" />
                <span>{validacionRango.errorGeneral}</span>
              </div>
            )}
          </div>
        )}

        {periodo === 'historico' && (
          <div className="flex flex-col gap-1.5 w-full sm:w-auto animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 px-2.5 rounded-xl border border-slate-200/80 shrink-0">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Año</span>
              <select
                value={anioHistorico}
                onChange={(e) => { 
                  const val = e.target.value;
                  setAnioHistorico(val === 'todos' ? 'todos' : parseInt(val, 10)); 
                  setPageVendedores(1); 
                }}
                className="border border-slate-200/80 bg-white text-slate-700 rounded-lg px-2 py-1 text-xs outline-none font-mono focus:border-slate-400 cursor-pointer"
              >
                {aniosDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value="todos">Todo el historial</option>
              </select>
              {anioHistorico !== 'todos' && (
                <span className="text-[10px] font-semibold text-slate-500 pl-1.5 border-l border-slate-200">
                  Mostrando datos de {anioHistorico}
                </span>
              )}
            </div>
            {anioHistorico === 'todos' && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg font-medium animate-in fade-in">
                <AlertCircle size={13} className="shrink-0 text-amber-500" />
                <span>Puede ser lento con muchos años de datos</span>
              </div>
            )}
          </div>
        )}

        {role !== 'vendedor' && (
          <div className="w-full sm:w-60">
            <select
              value={vendedorFilter}
              onChange={(e) => { setVendedorFilter(e.target.value); setPageVendedores(1); }}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="">Todos los vendedores ({vendedoresDisponibles.length})</option>
              {vendedoresDisponibles.map((vend) => (
                <option key={vend} value={vend}>{vend}</option>
              ))}
            </select>
          </div>
        )}

        <div className="w-full sm:flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por cliente..."
            value={clienteSearch}
            onChange={(e) => setClienteSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:border-slate-400"
          />
        </div>

        {(vendedorFilter || clienteSearch || (periodo === 'custom' && (fechaInicio || fechaFin))) && (
          <button
            type="button"
            onClick={() => { 
              setVendedorFilter(''); 
              setClienteSearch(''); 
              setFechaInicio(''); 
              setFechaFin(''); 
              guardarFiltroPeriodoStorage({ periodo, fechaInicio: '', fechaFin: '' });
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 cursor-pointer whitespace-nowrap"
          >
            Limpiar filtros
          </button>
        )}

        <div className="text-xs text-slate-400 font-medium ml-auto hidden md:block">
          <strong className="text-slate-700 font-semibold">{solicitudesFiltradas.length}</strong> solicitudes
        </div>
      </div>

      {/* TARJETAS KPI MINIMALISTAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Solicitudes */}
        <div 
          onClick={() => navigate('/analisis/solicitudes/todas')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Solicitudes</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {metricas.total}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1 flex items-center justify-between">
              <span><strong className={`${theme.flujoEstados?.pendiente?.textColor || 'text-rose-600'} font-bold`}>{metricas.pendientes}</strong> pendientes</span>
              <span className="text-[11px] text-slate-600 font-bold group-hover:text-slate-900 group-hover:underline">Ver detalle →</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Tasa de Conversión */}
        <div 
          onClick={() => navigate('/analisis/solicitudes/pedidos')}
          className={`bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:${theme.flujoEstados?.pedidos?.border || 'border-emerald-300'} transition-all cursor-pointer group`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversión a Pedido</span>
            <div className={`w-8 h-8 rounded-xl ${theme.flujoEstados?.pedidos?.badge || 'bg-emerald-50 text-emerald-600'} flex items-center justify-center group-hover:scale-105 transition-transform`}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
              {metricas.tasaConversion}
              <span className={`text-sm font-bold ${theme.flujoEstados?.pedidos?.textColor || 'text-emerald-600'}`}>%</span>
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1 flex items-center justify-between">
              <span>{metricas.pedidos} ganadas {metricas.pedidosParciales > 0 && <span className="text-slate-400 font-normal">(+{metricas.pedidosParciales} parc.)</span>}</span>
              <span className="text-[11px] text-slate-600 font-bold group-hover:text-slate-900 group-hover:underline">Ver pedidos →</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Monto Cotizado */}
        <div 
          onClick={() => navigate('/analisis/productos')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Volumen Cotizado</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight truncate font-mono" title={formatearDinero(metricas.montoCotizadoTotal)}>
              {formatearDinero(metricas.montoCotizadoTotal)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1 truncate flex items-center justify-between">
              <span>{formatearDinero(metricas.montoPedidoTotal)} en pedidos</span>
              <span className="text-[11px] text-slate-600 font-bold group-hover:text-slate-900 group-hover:underline">Ver catálogo →</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Tiempo Promedio de Respuesta */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiempo de Respuesta</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              metricas.tiempoRespuestaInfo?.esRapido 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'bg-slate-100/80 text-slate-600'
            }`}>
              {metricas.tiempoRespuestaInfo?.esRapido ? <Zap size={16} /> : <Clock size={16} />}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5 font-mono">
              <span>{metricas.tiempoRespuestaInfo?.valor || '---'}</span>
              {metricas.tiempoRespuestaInfo?.unidad && (
                <span className="text-sm font-bold text-slate-500 font-sans">
                  {metricas.tiempoRespuestaInfo.unidad}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {metricas.tiempoRespuestaInfo?.etiqueta && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${metricas.tiempoRespuestaInfo.badgeClase}`}>
                  {metricas.tiempoRespuestaInfo.esRapido && <Zap size={10} className="shrink-0" />}
                  <span>{metricas.tiempoRespuestaInfo.etiqueta}</span>
                </span>
              )}
              <span className="text-xs font-medium text-slate-500">
                {metricas.tiempoRespuestaInfo?.subtexto || 'Promedio creación → cotización'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: FLUJO DE ESTADOS Y TOP CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Embudo de Estados (2 columnas) con enlaces directos */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Flujo de Estado de Solicitudes
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Ciclo de vida de RFQs (clic en cualquier barra para ver el detalle)
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/analisis/solicitudes/todas')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver todas ({metricas.total}) <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="space-y-3.5">
            {[
              { 
                tipo: 'pendiente',
                label: 'Pendiente de Cotizar', 
                count: metricas.pendientes, 
                color: theme.flujoEstados?.pendiente?.color || 'bg-rose-500', 
                barBg: theme.flujoEstados?.pendiente?.barBg || 'bg-rose-100/60',
                textColor: theme.flujoEstados?.pendiente?.textColor || 'text-rose-600',
                desc: 'Solicitudes en espera de cotización por compras'
              },
              { 
                tipo: 'cotizadas',
                label: 'Cotizadas / Parciales', 
                count: metricas.cotizadas, 
                color: theme.flujoEstados?.cotizadas?.color || 'bg-sky-600', 
                barBg: theme.flujoEstados?.cotizadas?.barBg || 'bg-sky-100/60',
                textColor: theme.flujoEstados?.cotizadas?.textColor || 'text-sky-700',
                desc: 'Precios enviados al vendedor o cliente',
                subdetail: `${metricas.cotizadasCompletas} completas · ${metricas.cotizadasParciales} parciales`
              },
              { 
                tipo: 'pedidos',
                label: 'Pedidos Confirmados / Parciales', 
                count: metricas.pedidos, 
                color: theme.flujoEstados?.pedidos?.color || 'bg-emerald-600', 
                barBg: theme.flujoEstados?.pedidos?.barBg || 'bg-emerald-100/60',
                textColor: theme.flujoEstados?.pedidos?.textColor || 'text-emerald-700',
                desc: 'Aprobadas para adquisición y entrega logística',
                subdetail: `${metricas.pedidosCompletos} confirmados · ${metricas.pedidosParciales} parciales`
              }
            ].map((item) => {
              const porcentaje = metricas.total > 0 
                ? ((item.count / metricas.total) * 100).toFixed(1)
                : 0;
              return (
                <div 
                  key={item.tipo}
                  onClick={() => navigate(`/analisis/solicitudes/${item.tipo}`)}
                  className="p-3.5 bg-slate-50/60 hover:bg-slate-100/70 rounded-xl border border-slate-100 hover:border-slate-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                          {item.label}
                        </span>
                        <ChevronRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {item.desc}
                      </p>
                    </div>
                    <div className="text-right">
                      <div>
                        <span className={`text-base font-black ${item.textColor} font-mono`}>
                          {item.count}
                        </span>
                        <span className="text-xs font-bold text-slate-400 ml-1.5">
                          ({porcentaje}%)
                        </span>
                      </div>
                      {item.subdetail && (
                        <span className="text-[10px] font-medium text-slate-400 block -mt-0.5">
                          {item.subdetail}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`w-full h-2 rounded-full ${item.barBg} overflow-hidden`}>
                    <div 
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Clientes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Top Clientes
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  Mayor volumen de solicitudes
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
                <Users size={15} />
              </div>
            </div>

            {topClientes.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-medium">
                No hay registros en el período
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {topClientes.map((c, idx) => {
                  const maxTotal = topClientes[0]?.total || 1;
                  const pct = Math.round((c.total / maxTotal) * 100);
                  return (
                    <div 
                      key={idx} 
                      className="space-y-1.5 cursor-pointer group"
                      onClick={() => navigate(`/analisis/cliente/${encodeURIComponent(c.cliente)}`)}
                      title={`Ver historial de ${c.cliente}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[180px] group-hover:text-slate-900 transition-colors" title={c.cliente}>
                          <span className="text-slate-400 font-mono text-[11px] mr-1.5">#{idx + 1}</span>
                          {c.cliente}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          <strong className="text-slate-800 font-semibold">{c.total}</strong> RFQ
                          {c.pedidos > 0 && (
                            <span className={`${theme.flujoEstados?.pedidos?.textColor || 'text-emerald-600'} font-semibold ml-1.5`}>
                              ({c.pedidos} ped)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-800 rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/analisis/clientes')}
            className={`mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold ${theme.linkClass} cursor-pointer group transition-colors`}
          >
            <span>Ver todos los clientes</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* SECCIÓN NUEVA: TOP PRODUCTOS MÁS COTIZADOS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
              <Layers size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Top Productos Más Cotizados
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Artículos con mayor demanda y recurrencia
              </p>
            </div>
          </div>

          {/* TOGGLE DE ORDENAMIENTO */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
              <button
                type="button"
                onClick={() => setOrdenarProductosPor('veces')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  ordenarProductosPor === 'veces'
                    ? 'bg-white text-slate-800 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Más cotizados
              </button>
              <button
                type="button"
                onClick={() => setOrdenarProductosPor('ganadas')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  ordenarProductosPor === 'ganadas'
                    ? 'bg-white text-slate-800 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Más ganados
              </button>
              <button
                type="button"
                onClick={() => setOrdenarProductosPor('unidades')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  ordenarProductosPor === 'unidades'
                    ? 'bg-white text-slate-800 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Por unidades
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/analisis/productos')}
              className={`text-xs font-semibold ${theme.linkClass} flex items-center gap-1 cursor-pointer whitespace-nowrap ml-1 transition-colors`}
            >
              <span>Ver todos</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {topProductos.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-medium">
            No se encontraron productos registrados en el período.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {topProductos.map((p, idx) => (
              <div 
                key={idx}
                onClick={() => navigate(`/analisis/producto/${encodeURIComponent(p.desc)}`)}
                className="p-3.5 bg-slate-50/70 hover:bg-slate-100/70 rounded-xl border border-slate-200/60 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </span>
                      {p.ganadas > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 size={10} className="shrink-0 text-emerald-600" />
                          Ganado
                        </span>
                      )}
                    </div>
                    {p.marca && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 truncate max-w-[90px]" title={p.marca}>
                        {p.marca}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug mb-3 group-hover:text-slate-900 transition-colors uppercase" title={p.desc}>
                    {p.desc}
                  </h3>
                </div>
                <div className="pt-2.5 border-t border-slate-200/60 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Cotizado</span>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200/60">
                      {p.veces} {p.veces === 1 ? 'vez' : 'veces'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Cotizaciones Ganadas</span>
                    {p.ganadas > 0 ? (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 text-[11px]">
                        <CheckCircle2 size={10} className="shrink-0 text-emerald-600" />
                        <span>{p.ganadas}</span>
                        {p.veces > 0 && (
                          <span className="text-[9px] font-medium text-emerald-600 font-sans">
                            ({Math.round((p.ganadas / p.veces) * 100)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="font-mono text-slate-400 text-[11px] px-2 py-0.5 bg-slate-100/60 rounded-md border border-slate-200/50">
                        0 (0%)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Unidades</span>
                    <span className="font-mono font-semibold text-slate-700 text-xs">
                      {p.unidades.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN INFERIOR: RENDIMIENTO POR VENDEDOR Y MONITOREO LOGÍSTICO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rendimiento por Vendedor */}
        <div className={`${puedeVerLogistica ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Rendimiento por Vendedor
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  Actividad y tasa de conversión comercial
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/analisis/vendedores')}
                className={`text-xs font-semibold ${theme.linkClass} flex items-center gap-1 cursor-pointer transition-colors`}
              >
                <span>Ver detalle</span>
                <ArrowUpRight size={13} />
              </button>
            </div>

            {statsVendedores.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-medium">
                No hay datos para mostrar
              </div>
            ) : (
              <div
                ref={scrollVendedoresRef}
                onMouseDown={handleDragStartVend}
                onMouseMove={handleDragMoveVend}
                onMouseUp={handleDragEndVend}
                onMouseLeave={handleDragEndVend}
                className="overflow-x-auto overflow-y-auto overscroll-contain cursor-grab active:cursor-grabbing select-none rounded-xl border border-slate-200/70 h-[280px] sm:h-[300px] max-h-[350px]"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <table className="min-w-full w-max text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200/80 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 whitespace-nowrap">Vendedor</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">Total RFQs</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">Cotizadas</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">Pedidos</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Efectividad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedVendedores.map((v, i) => {
                      const efectividad = v.cotizadas > 0 
                        ? Math.round((v.pedidos / v.cotizadas) * 100) 
                        : 0;
                      return (
                        <tr 
                          key={i} 
                          onClick={() => navigate(`/analisis/vendedor/${encodeURIComponent(v.nombre)}`)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          title={`Ver historial de ${v.nombre}`}
                        >
                          <td className="py-2.5 px-3 text-slate-800 font-semibold flex items-center gap-2 whitespace-nowrap">
                            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {v.nombre[0] || 'V'}
                            </div>
                            <span className="truncate max-w-[180px]">{v.nombre}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 whitespace-nowrap">{v.total}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 whitespace-nowrap">{v.cotizadas}</td>
                          <td className={`py-2.5 px-3 text-center font-mono font-bold ${theme.flujoEstados?.pedidos?.textColor || 'text-emerald-700'} whitespace-nowrap`}>{v.pedidos}</td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold ${theme.flujoEstados?.pedidos?.badge || 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'} whitespace-nowrap`}>
                              {efectividad}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PAGINACIÓN DE VENDEDORES */}
          {totalPagesVendedores > 1 && (
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <button 
                type="button"
                onClick={() => setPageVendedores(prev => Math.max(prev - 1, 1))}
                disabled={safePageVendedores === 1}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-medium text-xs rounded-lg transition-all cursor-pointer"
              >
                Anterior
              </button>
              <span className="text-[11px] font-medium text-slate-400">
                Página {safePageVendedores} de {totalPagesVendedores} ({statsVendedores.length} vendedores)
              </span>
              <button 
                type="button"
                onClick={() => setPageVendedores(prev => Math.min(prev + 1, totalPagesVendedores))}
                disabled={safePageVendedores === totalPagesVendedores}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-medium text-xs rounded-lg transition-all cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>

        {/* Resumen Logístico de Órdenes de Compra (Solo Comprador y Administrador) */}
        {puedeVerLogistica && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Estado Logístico
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Órdenes de Compra (OCs)
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
                  <Truck size={15} />
                </div>
              </div>

              <div className="space-y-2 mt-3">
                <div 
                  onClick={() => navigate('/analisis/logistica')}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/60 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-medium text-slate-700">Total OCs registradas</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{statsLogistica.total}</span>
                </div>

                <div 
                  onClick={() => navigate('/analisis/logistica/transito')}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 hover:bg-amber-100/50 border border-amber-200/60 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-medium text-amber-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    En Tránsito / Despachadas
                  </span>
                  <span className="text-sm font-bold font-mono text-amber-800">{statsLogistica.enTransito}</span>
                </div>

                <div 
                  onClick={() => navigate('/analisis/logistica/aduana')}
                  className="flex items-center justify-between p-3 rounded-xl bg-sky-50/50 hover:bg-sky-100/50 border border-sky-200/60 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-medium text-sky-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    En Aduana / Revisión
                  </span>
                  <span className="text-sm font-bold font-mono text-sky-800">{statsLogistica.enAduana}</span>
                </div>

                <div 
                  onClick={() => navigate('/analisis/logistica/entregadas')}
                  className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/50 border border-emerald-200/60 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-medium text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Entregadas / Finalizadas
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-800">{statsLogistica.entregadas}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/analisis/logistica')}
              className={`mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold ${theme.linkClass} cursor-pointer group transition-colors`}
            >
              <span>Ver todas las órdenes de compra</span>
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
