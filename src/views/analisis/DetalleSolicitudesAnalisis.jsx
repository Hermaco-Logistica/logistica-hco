import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Search, Package, ExternalLink, Calendar, User, Building, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme, evaluarEstadoGanada } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';

export const DetalleSolicitudesAnalisis = ({ role, solicitudes = [] }) => {
  const { tipoEstado } = useParams();
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);

  // 'pendiente' | 'cotizadas' | 'pedidos' | 'parciales' | 'todas'
  const [tabActual, setTabActual] = useSessionState('analisis_solicitudes_tab', tipoEstado || 'todas');

  useEffect(() => {
    if (tipoEstado) {
      setTabActual(tipoEstado);
    }
  }, [tipoEstado, setTabActual]);

  const [searchTerm, setSearchTerm] = useSessionState('analisis_solicitudes_search', '');
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

  const formatFecha = (val) => {
    const d = parseDate(val);
    if (!d) return '---';
    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'short',
      timeZone: 'America/El_Salvador'
    }).format(d);
  };

  const obtenerOCs = (s) => {
    const ocs = new Set();
    if (s.numeroOC) ocs.add(s.numeroOC.toString().trim());
    if (s.linkOC && !s.linkOC.startsWith('http')) ocs.add(s.linkOC.trim());
    if (Array.isArray(s.productos)) {
      s.productos.forEach((p) => {
        const num = p.numOC || p.ocRef || p.numeroOC;
        if (num) ocs.add(num.toString().trim());
      });
    }
    return Array.from(ocs);
  };

  // Filtrar según el tab activo
  const solicitudesPorEstado = useMemo(() => {
    return solicitudes.filter((s) => {
      const est = s.estado || 'Pendiente';
      if (tabActual === 'pendiente') {
        return est === 'Pendiente';
      }
      if (tabActual === 'cotizadas') {
        return est === 'Cotizado' || est === 'Cotizado Parcial';
      }
      if (tabActual === 'pedidos') {
        return est === 'Pedido' || est === 'Comprado';
      }
      if (tabActual === 'parciales') {
        return est === 'Pedido Parcial';
      }
      return true;
    });
  }, [solicitudes, tabActual]);

  // Filtrar por término de búsqueda
  const solicitudesFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return solicitudesPorEstado;
    const term = normalizarBusqueda(searchTerm);

    return solicitudesPorEstado.filter((s) => {
      const matchCorrelativo = normalizarBusqueda(s.correlativo || '').includes(term);
      const matchCliente = normalizarBusqueda(s.cliente || '').includes(term);
      const matchVendedor = normalizarBusqueda(s.vendedorNombre || '').includes(term);
      const matchProd = s.productos?.some(p => normalizarBusqueda(p.desc || '').includes(term));
      const matchOC = obtenerOCs(s).some(oc => normalizarBusqueda(oc).includes(term)) || 
                      (s.linkOC && normalizarBusqueda(s.linkOC).includes(term));
      return matchCorrelativo || matchCliente || matchVendedor || matchProd || matchOC;
    });
  }, [solicitudesPorEstado, searchTerm]);

  // Ordenar de más reciente a más antigua
  const solicitudesOrdenadas = useMemo(() => {
    return [...solicitudesFiltradas].sort((a, b) => {
      const dateA = parseDate(a.fechaS || a.fechaCreacion)?.getTime() || 0;
      const dateB = parseDate(b.fechaS || b.fechaCreacion)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [solicitudesFiltradas]);

  const totalPages = Math.max(1, Math.ceil(solicitudesOrdenadas.length / itemsPerPage));
  const paginatedSolicitudes = solicitudesOrdenadas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const irADetalle = (s) => {
    if (role === 'comprador' && s.estado === 'Pendiente') {
      navigate(`/calculadora/${s.id}`);
    } else {
      navigate(`/vendedor/detalle/${s.id}`);
    }
  };

  const tabs = [
    { id: 'todas', label: 'Todas' },
    { id: 'pendiente', label: 'Pendientes de Cotizar', dot: theme.flujoEstados?.pendiente?.dot },
    { id: 'cotizadas', label: 'Cotizadas', dot: theme.flujoEstados?.cotizadas?.dot },
    { id: 'pedidos', label: 'Pedidos Ganados', dot: theme.flujoEstados?.pedidos?.dot },
    { id: 'parciales', label: 'Pedidos Parciales', dot: 'bg-sky-500' }
  ];

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
                Solicitudes
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Detalle de Solicitudes (RFQs)
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Explorador del flujo de estados y seguimiento comercial
            </p>
          </div>
        </div>

        {/* TABS DE ESTADO */}
        <div className="inline-flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTabActual(t.id); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                tabActual === t.id 
                  ? 'bg-slate-900 text-white shadow-xs font-semibold' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {t.dot && (
                <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
              )}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por correlativo, cliente, vendedor, producto u OC..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:border-slate-400 transition-colors"
          />
        </div>
        <div className="text-[11px] font-medium text-slate-400 font-mono">
          Mostrando <strong className="text-slate-700 font-semibold">{solicitudesFiltradas.length}</strong> solicitudes
        </div>
      </div>

      {/* TABLA DE SOLICITUDES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {paginatedSolicitudes.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-medium">
            No se encontraron solicitudes con los criterios seleccionados.
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
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Correlativo</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Cliente</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Vendedor</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Fecha</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Ítems</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">OC Ref</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Estado</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Resultado</th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedSolicitudes.map((s) => {
                  const cantItems = s.productos?.length || 0;
                  const primerProd = s.productos?.[0]?.desc || '';
                  const ocs = obtenerOCs(s);
                  const tieneLink = s.linkOC && s.linkOC.startsWith('http');

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200/80 inline-block whitespace-nowrap">
                          {s.correlativo || 'S/N'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Building size={12} className="text-slate-400 shrink-0" />
                          <button
                            type="button"
                            onClick={() => s.cliente && navigate(`/analisis/cliente/${encodeURIComponent(s.cliente)}`)}
                            className="font-medium text-slate-800 hover:text-blue-600 transition-colors text-left truncate max-w-[200px] cursor-pointer"
                            title={`Ver historial de ${s.cliente || 'Consumidor Final'}`}
                          >
                            {s.cliente || 'Consumidor Final'}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <User size={12} className="text-slate-400 shrink-0" />
                          <button
                            type="button"
                            onClick={() => s.vendedorNombre && navigate(`/analisis/vendedor/${encodeURIComponent(s.vendedorNombre)}`)}
                            className="font-medium text-slate-700 hover:text-blue-600 transition-colors text-left truncate max-w-[150px] cursor-pointer"
                            title={`Ver historial de ${s.vendedorNombre || 'Sin asignar'}`}
                          >
                            {s.vendedorNombre || 'Sin asignar'}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{formatFecha(s.fechaS || s.fechaCreacion)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-medium" title={primerProd ? primerProd.toUpperCase() : ''}>
                          <Package size={11} className="text-slate-400" />
                          {cantItems}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {ocs.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            {ocs.map((oc, i) => (
                              <span 
                                key={i} 
                                className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                              >
                                {oc}
                              </span>
                            ))}
                            {tieneLink && (
                              <a
                                href={s.linkOC}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded-md"
                                title="Ver archivo de OC"
                              >
                                <LinkIcon size={11} />
                              </a>
                            )}
                          </div>
                        ) : tieneLink ? (
                          <a
                            href={s.linkOC}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded-md"
                          >
                            <LinkIcon size={11} /> Ver OC
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">---</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <Badge estado={s.estado || 'Pendiente'} roleTheme={theme} />
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        {(() => {
                          const res = evaluarEstadoGanada(s);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${res.badgeClase}`}>
                              {res.esGanada && <CheckCircle2 size={11} className="shrink-0" />}
                              <span>{res.label}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => irADetalle(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Ver <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINACIÓN (10 en 10) */}
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
              Página {currentPage} de {totalPages} ({solicitudesFiltradas.length} solicitudes)
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
