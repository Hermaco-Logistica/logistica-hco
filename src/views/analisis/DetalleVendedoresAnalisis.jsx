import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Search, Zap } from 'lucide-react';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme, formatearTiempoRespuesta } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';

export const DetalleVendedoresAnalisis = ({ role, solicitudes = [] }) => {
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);
  const [searchTerm, setSearchTerm] = useSessionState('analisis_vend_dir_search', '');
  const [criterioOrden, setCriterioOrden] = useSessionState('analisis_vend_dir_orden', 'total'); // 'total' | 'pedidos' | 'efectividad' | 'monto'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Scroll horizontal por arrastre (drag) para la tabla, además del swipe nativo táctil
  const scrollContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  const handleDragStart = useCallback((e) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.pageX - el.offsetLeft;
    dragStartScrollLeftRef.current = el.scrollLeft;
  }, []);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleDragMove = useCallback((e) => {
    const el = scrollContainerRef.current;
    if (!isDraggingRef.current || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragStartXRef.current;
    el.scrollLeft = dragStartScrollLeftRef.current - walk;
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

  const formatearDinero = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Agrupar por vendedor
  const datosVendedores = useMemo(() => {
    const map = {};

    solicitudes.forEach((s) => {
      const nombre = (s.vendedorNombre || 'Sin asignar').trim();
      if (!map[nombre]) {
        map[nombre] = {
          vendedor: nombre,
          email: s.vendedorEmail || '',
          totalRFQs: 0,
          cotizadas: 0,
          pedidos: 0,
          pedidosParciales: 0,
          pendientes: 0,
          montoCotizado: 0,
          montoPedidos: 0,
          totalDiasRespuesta: 0,
          rfqConTiempo: 0
        };
      }

      const item = map[nombre];
      item.totalRFQs++;

      const est = s.estado || 'Pendiente';
      if (est === 'Pendiente') item.pendientes++;
      if (['Cotizado', 'Cotizado Parcial', 'Pedido', 'Pedido Parcial'].includes(est)) item.cotizadas++;
      if (est === 'Pedido' || est === 'Comprado') {
        item.pedidos++;
      } else if (est === 'Pedido Parcial') {
        item.pedidosParciales++;
      }

      // Montos
      if (Array.isArray(s.productos)) {
        s.productos.forEach((p) => {
          const cant = Number(p.cant || 1);
          const fob = Number(p.fob || 0);
          const unitario = Number(p.precioUnitario || fob);
          if (unitario > 0 || fob > 0) {
            item.montoCotizado += (unitario > 0 ? unitario : fob) * cant;
          }
          if (p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || est === 'Pedido') {
            item.montoPedidos += (unitario > 0 ? unitario : fob) * cant;
          }
        });
      }

      // Tiempo de respuesta
      const fInicio = parseDate(s.fechaS || s.fechaCreacion);
      const fCot = parseDate(s.fechaCotizacion);
      if (fInicio && fCot && fCot >= fInicio) {
        const dias = (fCot.getTime() - fInicio.getTime()) / (1000 * 3600 * 24);
        item.totalDiasRespuesta += dias;
        item.rfqConTiempo++;
      }
    });

    return Object.values(map);
  }, [solicitudes]);

  // Filtrado por búsqueda
  const vendedoresFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return datosVendedores;
    const term = normalizarBusqueda(searchTerm);
    return datosVendedores.filter(v => 
      normalizarBusqueda(v.vendedor).includes(term) || 
      normalizarBusqueda(v.email).includes(term)
    );
  }, [datosVendedores, searchTerm]);

  // Ordenamiento
  const vendedoresOrdenados = useMemo(() => {
    return [...vendedoresFiltrados].sort((a, b) => {
      if (criterioOrden === 'pedidos') return b.pedidos - a.pedidos;
      if (criterioOrden === 'efectividad') {
        const efA = a.cotizadas > 0 ? a.pedidos / a.cotizadas : 0;
        const efB = b.cotizadas > 0 ? b.pedidos / b.cotizadas : 0;
        return efB - efA;
      }
      if (criterioOrden === 'monto') return b.montoCotizado - a.montoCotizado;
      return b.totalRFQs - a.totalRFQs;
    });
  }, [vendedoresFiltrados, criterioOrden]);

  const totalPages = Math.max(1, Math.ceil(vendedoresOrdenados.length / itemsPerPage));
  const paginatedVendedores = vendedoresOrdenados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Bloqueo estricto para rol vendedor
  if (role === 'vendedor') {
    return <Navigate to="/vendedor" replace />;
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-7xl mx-auto space-y-5 pb-12">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/analisis')}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200/80 transition-colors shadow-xs cursor-pointer"
            title="Volver a Análisis"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold tracking-wider px-2.5 py-0.5 rounded-full ${theme.bgBadge}`}>
                Comercial
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Rendimiento por Vendedor
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Métricas de conversión y volumen comercial
            </p>
          </div>
        </div>

        {/* ORDENAMIENTO */}
        <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-medium text-slate-400 ml-2">Ordenar:</span>
          {[
            { id: 'total', label: 'Más RFQs' },
            { id: 'pedidos', label: 'Más Pedidos' },
            { id: 'efectividad', label: 'Efectividad' },
            { id: 'monto', label: 'Mayor Monto' }
          ].map((ord) => (
            <button
              key={ord.id}
              type="button"
              onClick={() => { setCriterioOrden(ord.id); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                criterioOrden === ord.id 
                  ? 'bg-slate-900 text-white shadow-xs font-semibold' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {ord.label}
            </button>
          ))}
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por vendedor o correo..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:border-slate-400 transition-colors"
          />
        </div>
        <div className="text-[11px] font-medium text-slate-400 font-mono">
          Mostrando <strong className="text-slate-700 font-semibold">{vendedoresFiltrados.length}</strong> vendedores
        </div>
      </div>

      {/* TABLA DE VENDEDORES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {paginatedVendedores.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-medium">
            No se encontraron vendedores con los filtros aplicados.
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            className="overflow-x-auto overflow-y-auto overscroll-contain cursor-grab active:cursor-grabbing select-none h-[52vh] min-h-[380px] max-h-[620px] sm:h-[56vh] lg:h-[60vh]"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table className="min-w-full w-max text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200/80 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 whitespace-nowrap">#</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Vendedor</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Total RFQs</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Cotizadas</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Ganadas (Pedidos)</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Efectividad</th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Monto Cotizado</th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Monto en Pedidos</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Resp. Promedio</th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedVendedores.map((v, idx) => {
                  const numGlobal = (currentPage - 1) * itemsPerPage + idx + 1;
                  const efPct = v.cotizadas > 0 
                    ? Math.round((v.pedidos / v.cotizadas) * 100) 
                    : 0;

                  const respInfo = formatearTiempoRespuesta(
                    v.rfqConTiempo > 0 ? (v.totalDiasRespuesta / v.rfqConTiempo) : null
                  );

                  return (
                    <tr key={v.vendedor} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {numGlobal}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/analisis/vendedor/${encodeURIComponent(v.vendedor)}`)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer transition-colors"
                            title={`Ver historial de ${v.vendedor}`}
                          >
                            {v.vendedor[0] || 'V'}
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => navigate(`/analisis/vendedor/${encodeURIComponent(v.vendedor)}`)}
                              className="font-semibold text-slate-800 hover:text-blue-600 text-xs block text-left transition-colors cursor-pointer"
                              title={`Ver historial de ${v.vendedor}`}
                            >
                              {v.vendedor}
                            </button>
                            {v.email && (
                              <span className="text-[10px] text-slate-400 font-medium block text-left">
                                {v.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-600 whitespace-nowrap">
                        {v.totalRFQs}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-600 whitespace-nowrap">
                        {v.cotizadas}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                        <span>{v.pedidos}</span>
                        {v.pedidosParciales > 0 && (
                          <span className="text-[10px] font-normal text-sky-600 block" title={`${v.pedidosParciales} pedidos parciales`}>
                            +{v.pedidosParciales} parc.
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                          efPct > 50 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            : efPct > 0 
                            ? 'bg-blue-50 text-blue-700 border-blue-200/60' 
                            : 'bg-slate-50 text-slate-400 border-slate-200/60'
                        }`}>
                          {efPct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {formatearDinero(v.montoCotizado)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {formatearDinero(v.montoPedidos)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        {respInfo.valor === '---' ? (
                          <span className="font-mono text-slate-400 text-xs">---</span>
                        ) : respInfo.esRapido ? (
                          <span 
                            className="inline-flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            title={`${respInfo.valor} ${respInfo.unidad} (${respInfo.subtexto})`}
                          >
                            <Zap size={11} className="shrink-0" />
                            {respInfo.textoCorto}
                          </span>
                        ) : (
                          <span 
                            className="font-mono text-slate-600 text-xs font-semibold"
                            title={`${respInfo.valor} ${respInfo.unidad}`}
                          >
                            {respInfo.textoCorto}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/analisis/vendedor/${encodeURIComponent(v.vendedor)}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Historial →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINACIÓN DE 10 EN 10 */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-medium text-xs rounded-lg transition-all cursor-pointer"
            >
              Anterior
            </button>
            <span className="text-[11px] font-medium text-slate-400">
              Página {currentPage} de {totalPages} ({vendedoresFiltrados.length} vendedores)
            </span>
            <button 
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-medium text-xs rounded-lg transition-all cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
