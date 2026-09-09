import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Search, ExternalLink, Calendar, Globe, Download } from 'lucide-react';
import { exportarLogisticaExcel } from '../../utils/exportarExcel';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';

export const DetalleLogisticaAnalisis = ({ role, ordenesCompra = [] }) => {
  const { filtro } = useParams();
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);

  const [tabActual, setTabActual] = useSessionState('analisis_logistica_tab', filtro || 'todas');

  // Sincronizar tab con la URL cuando cambia
  useEffect(() => {
    if (filtro) {
      setTabActual(filtro);
    }
  }, [filtro, setTabActual]);

  const [searchTerm, setSearchTerm] = useSessionState('analisis_logistica_search', '');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Scroll por arrastre (drag) horizontal y vertical
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

  // Ordenar las órdenes de compra por fechaCreacion descendente (antes lo hacía el listener)
  const ordenes = useMemo(() => {
    const docs = [...ordenesCompra];
    docs.sort((a, b) => {
      const dateA = parseDate(a.fechaCreacion)?.getTime() || 0;
      const dateB = parseDate(b.fechaCreacion)?.getTime() || 0;
      return dateB - dateA;
    });
    return docs;
  }, [ordenesCompra]);


  // Filtrar por tab
  const ordenesPorTab = useMemo(() => {
    return ordenes.filter((oc) => {
      const est = (oc.estado || '').toLowerCase();
      if (tabActual === 'transito') {
        return est.includes('transito') || est.includes('tránsito') || est.includes('en camino') || est.includes('shipped');
      }
      if (tabActual === 'aduana') {
        return est.includes('aduana') || est.includes('customs') || est.includes('despacho');
      }
      if (tabActual === 'entregadas') {
        return est.includes('entregad') || est.includes('delivered') || est.includes('recibido') || est.includes('completo');
      }
      if (tabActual === 'pendientes') {
        return !est.includes('transito') && !est.includes('tránsito') && !est.includes('aduana') && !est.includes('entregad') && !est.includes('delivered');
      }
      return true;
    });
  }, [ordenes, tabActual]);

  // Filtrar por búsqueda (# OC, proveedor, tracking, estado o ítems)
  const ordenesFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return ordenesPorTab;
    const term = normalizarBusqueda(searchTerm);

    return ordenesPorTab.filter((oc) => {
      const numOC = oc.numeroOC || oc.numero || oc.ocRef || '';
      const matchNum = normalizarBusqueda(numOC).includes(term);
      const matchProv = normalizarBusqueda(oc.proveedor || '').includes(term);
      const matchTrack = normalizarBusqueda(oc.tracking || '').includes(term);
      const matchEst = normalizarBusqueda(oc.estado || '').includes(term);
      const matchItems = oc.items?.some(item =>
        normalizarBusqueda(item.descripcion || item.desc || '').includes(term) ||
        normalizarBusqueda(item.marca || '').includes(term)
      );
      return matchNum || matchProv || matchTrack || matchEst || matchItems;
    });
  }, [ordenesPorTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(ordenesFiltradas.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrdenes = ordenesFiltradas.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  // Restricción de acceso: únicamente comprador y administrador
  if (role && role !== 'comprador' && role !== 'administrador') {
    return <Navigate to={role === 'vendedor' ? '/' : '/analisis'} replace />;
  }

  const tabs = [
    { id: 'todas', label: 'Todas las OCs' },
    { id: 'transito', label: 'En Tránsito' },
    { id: 'aduana', label: 'En Aduana' },
    { id: 'entregadas', label: 'Entregadas' },
    { id: 'pendientes', label: 'Pendientes' }
  ];

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
                Logística
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Monitoreo Logístico de OCs
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Estado de órdenes de compra y embarques ({ordenes.length} registradas)
            </p>
          </div>
        </div>

        {/* TABS DE ESTADO LOGÍSTICO */}
        <div className="inline-flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTabActual(t.id); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                tabActual === t.id 
                  ? 'bg-slate-900 text-white shadow-xs font-semibold' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {t.label}
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
            placeholder="Buscar por # OC, proveedor, tracking o ítem..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:border-slate-400 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const tabTitulos = {
                todas: 'TODAS LAS ÓRDENES DE COMPRA',
                pendientes: 'ÓRDENES PENDIENTES',
                transito: 'ÓRDENES EN TRÁNSITO',
                aduana: 'ÓRDENES EN ADUANA',
                entregadas: 'ÓRDENES ENTREGADAS'
              };
              const tituloTab = tabTitulos[tabActual] || 'ÓRDENES DE COMPRA Y TRACKING';
              const filtrosActivos = [`Pestaña: ${tituloTab}`];
              if (searchTerm.trim()) filtrosActivos.push(`Búsqueda: "${searchTerm.trim()}"`);

              exportarLogisticaExcel(
                ordenesFiltradas,
                `ordenes_logistica_${tabActual}`,
                {
                  titulo: `CONTROL DE LOGÍSTICA - ${tituloTab}`,
                  periodoLabel: filtrosActivos.join(' | ')
                }
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
            title="Exportar órdenes de compra e ítems a Excel"
          >
            <Download size={13} />
            <span>Exportar Excel</span>
          </button>
          <div className="text-[11px] font-medium text-slate-400 font-mono">
            Mostrando <strong className="text-slate-700 font-semibold">{ordenesFiltradas.length}</strong> órdenes
          </div>
        </div>
      </div>

      {/* TABLA DE ÓRDENES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {paginatedOrdenes.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-medium">
            No se encontraron órdenes con los filtros seleccionados.
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
                  <th className="py-2.5 px-3.5 whitespace-nowrap"># OC</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Proveedor</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Tracking</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Estado Logístico</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Fecha Creación</th>
                  <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Ítems</th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedOrdenes.map((oc) => {
                  const est = (oc.estado || 'Pendiente');
                  const estLower = est.toLowerCase();
                  const cantItems = oc.items?.length || 0;
                  const numOC = oc.numeroOC || oc.numero || oc.ocRef || 'S/N';

                  return (
                    <tr key={oc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {numOC}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-700 whitespace-nowrap font-medium">
                        <span className="truncate max-w-[220px] block" title={oc.proveedor}>
                          {oc.proveedor || 'Sin proveedor'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {oc.tracking ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                            <Globe size={11} className="text-slate-400" /> {oc.tracking}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sin tracking</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          estLower.includes('entregad') || estLower.includes('delivered')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            : estLower.includes('aduana')
                            ? 'bg-sky-50 text-sky-700 border-sky-200/60'
                            : estLower.includes('transito') || estLower.includes('tránsito')
                            ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                            : 'bg-slate-100 text-slate-600 border-slate-200/60'
                        }`}>
                          {est}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{formatFecha(oc.fechaCreacion)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-700 whitespace-nowrap">
                        {cantItems}
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate('/gestion-oc')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Gestionar <ExternalLink size={11} />
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
              onClick={() => setCurrentPage(Math.max(safeCurrentPage - 1, 1))}
              disabled={safeCurrentPage === 1}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-medium text-xs rounded-lg transition-all cursor-pointer"
            >
              Anterior
            </button>
            <span className="text-[11px] font-medium text-slate-400">
              Página {safeCurrentPage} de {totalPages} ({ordenesFiltradas.length} órdenes)
            </span>
            <button 
              type="button"
              onClick={() => setCurrentPage(Math.min(safeCurrentPage + 1, totalPages))}
              disabled={safeCurrentPage === totalPages}
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
