import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, Globe } from 'lucide-react';
import { exportarLogisticaExcel } from '../../utils/exportarExcel';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';
import { Etiqueta } from '../../components/Etiqueta';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { BarraFiltros, BotonExportar, BotonLimpiar, ContadorResultados, FiltroBusqueda, FiltroPestanas } from '../../components/filtros';
import { TablePagination } from '../../components/ui/TablePagination';

export const DetalleLogisticaAnalisis = ({ role, ordenesCompra = [] }) => {
  const { filtro } = useParams();
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);

  const [tabActual, setTabActual] = useSessionState('analisis_logistica_tab', filtro || 'todas');

  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const btn = document.getElementById(`tab-log-${tabActual}`);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [tabActual]);

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

  /** Exportar: cuerpo idéntico al anterior (solo movido de lugar). */
  const exportarOrdenes = () => {
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
  };

  const tabs = [
    { id: 'todas', label: 'Todas las OCs' },
    { id: 'transito', label: 'En Tránsito' },
    { id: 'aduana', label: 'En Aduana' },
    { id: 'entregadas', label: 'Entregadas' },
    { id: 'pendientes', label: 'Pendientes' }
  ];

  return (
    <PageContainer className="animate-in fade-in duration-300 space-y-5 pb-12">
      <PageHeader
        onBack={() => navigate('/analisis')}
        backLabel="Volver a Análisis"
        title="Monitoreo Logístico de OCs"
        statusChip={
          <Etiqueta dominio="rol" valor={theme.key}>
            Logística
          </Etiqueta>
        }
        subtitle={<>Estado de órdenes de compra y embarques ({ordenes.length} registradas)</>}
      />

      {/* PESTAÑAS DE ESTADO LOGÍSTICO: fuera de la hoja de filtros; no cuentan como filtro activo */}
      <FiltroPestanas
        sticky
        ariaLabel="Estado logístico"
        prefijoId="tab-log-"
        opciones={tabs}
        value={tabActual}
        onChange={(id) => { setTabActual(id); setCurrentPage(1); }}
      />

      {/* BARRA DE FILTROS: búsqueda, exportar y contador (refleja la pestaña activa) */}
      <BarraFiltros
        busquedaEnBarraMovil
        resultados={ordenesFiltradas.length}
        busqueda={(
          <FiltroBusqueda
            value={searchTerm}
            onChange={(texto) => { setSearchTerm(texto); setCurrentPage(1); }}
            placeholder="Buscar por # OC, proveedor, tracking o ítem..."
            ariaLabel="Buscar por número de OC, proveedor, tracking o ítem"
          />
        )}
        limpiar={<BotonLimpiar activos={searchTerm.trim() ? 1 : 0} onClick={() => { setSearchTerm(''); setCurrentPage(1); }} />}
        acciones={(
          <BotonExportar
            etiqueta="Exportar Excel"
            titulo="Exportar órdenes de compra e ítems a Excel"
            onClick={exportarOrdenes}
          />
        )}
        extremo={<ContadorResultados prefijo="Mostrando" total={ordenesFiltradas.length} singular="orden" plural="órdenes" />}
      />

      {/* TABLA DE ÓRDENES */}
      <div className="flex flex-col gap-3">
        {paginatedOrdenes.length === 0 ? (
          <div className="surface text-center py-16 text-slate-400 text-xs font-medium rounded-2xl">
            No se encontraron órdenes con los filtros seleccionados.
          </div>
        ) : (
          <>
            {/* VISTA MÓVIL (Tarjetas) */}
            <div className="md:hidden space-y-3">
              {paginatedOrdenes.map((oc) => {
                const est = (oc.estado || 'Pendiente');
                const cantItems = oc.items?.length || 0;
                const numOC = oc.numeroOC || oc.numero || oc.ocRef || 'S/N';
                
                return (
                  <div key={oc.id} className="surface p-4 rounded-2xl space-y-3 relative">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-bold text-slate-800">{numOC}</span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                          <Calendar size={10} />
                          <span>{formatFecha(oc.fechaCreacion)}</span>
                        </div>
                      </div>
                      <Etiqueta dominio="estadoOC" valor={est} />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="text-slate-700 font-medium text-xs truncate" title={oc.proveedor}>
                        {oc.proveedor || 'Sin proveedor'}
                      </div>
                      
                      {oc.tracking ? (
                        <Etiqueta tono="neutral" tamano="normal" mono className="w-max">
                          <Globe size={11} className="text-slate-400" /> {oc.tracking}
                        </Etiqueta>
                      ) : (
                        <span className="text-slate-400 text-[11px] block">Sin tracking</span>
                      )}
                    </div>
                    
                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Ítems:</span>
                      <span className="font-bold font-mono text-slate-700">{cantItems}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 mt-2">
                      <button 
                        onClick={() => navigate('/gestion-oc')} 
                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold transition-colors shadow-xs inline-flex justify-center items-center gap-1.5"
                      >
                        Gestionar <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA DESKTOP (Tabla original) */}
            <div className="surface hidden md:flex rounded-2xl overflow-hidden flex-col">
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
                    <tr className="tf-tabla-head">
                      <th className="py-2.5 px-3.5 whitespace-nowrap"># OC</th>
                      <th className="py-2.5 px-3.5 whitespace-nowrap">Proveedor</th>
                      <th className="py-2.5 px-3.5 whitespace-nowrap">Tracking</th>
                      <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Estado Logístico</th>
                      <th className="py-2.5 px-3.5 whitespace-nowrap">Fecha Creación</th>
                      <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Ítems</th>
                      <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedOrdenes.map((oc) => {
                      const est = (oc.estado || 'Pendiente');
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
                              <Etiqueta tono="neutral" tamano="normal" mono>
                                <Globe size={11} className="text-slate-400" /> {oc.tracking}
                              </Etiqueta>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Sin tracking</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <Etiqueta dominio="estadoOC" valor={est} />
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
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
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
            </div>
          </>
        )}
      </div>

      <TablePagination
        page={safeCurrentPage}
        totalPages={totalPages}
        totalItems={ordenesFiltradas.length}
        noun="órdenes"
        onPageChange={setCurrentPage}
      />
    </PageContainer>
  );
};

export default DetalleLogisticaAnalisis;
