import React, { useState, useMemo, useEffect } from 'react';
import { pluralizar } from '../../utils/pluralizar';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Search, Building, Download } from 'lucide-react';
import { exportarTodosLosMovimientosExcel } from '../../utils/exportarExcel';
import { normalizarBusqueda } from '../../utils/normalizers';
import { Etiqueta } from '../../components/Etiqueta';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { acumularFaseSeguimiento, describirFasesSeguimiento, obtenerFaseSolicitudCacheada } from '../../utils/faseSeguimiento';
import { getRoleTheme } from './theme';
import { contarDecisiones } from './utils/decisionMetrics';
import { DecisionSummaryMobile, DecisionSummaryColumns } from './components/DecisionSummary';
import { cumpleFiltroPeriodoAnalisis } from './utils/periodoAnalisis';
import { useSessionState } from '../../hooks/usePersistedState';
import {
  getHoyElSalvador,
  cargarFiltroPeriodoStorage
} from '../../utils/dateValidation';
import { TablePagination } from '../../components/ui/TablePagination';

export const DetalleClientesAnalisis = ({ role, solicitudes = [], ordenesCompra = [] }) => {
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);
  const [searchTerm, setSearchTerm] = useSessionState('analisis_clientes_dir_search', '');
  const [criterioOrden, setCriterioOrden] = useSessionState('analisis_clientes_dir_orden', 'total'); // 'total' | 'pedidos' | 'monto' | 'anulaciones'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtro de período sincronizado con el dashboard (guardado en sessionStorage)
  const filtroPeriodo = useMemo(() => cargarFiltroPeriodoStorage(), []);
  const rangoEsteMes = useMemo(() => {
    const hoy = getHoyElSalvador();
    const [yStr, mStr] = hoy.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const sigY = m === 12 ? y + 1 : y;
    const sigM = m === 12 ? 1 : m + 1;
    return {
      inicio: new Date(`${yStr}-${mStr}-01T00:00:00-06:00`),
      fin: new Date(`${sigY}-${String(sigM).padStart(2, '0')}-01T00:00:00-06:00`)
    };
  }, []);

  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const btn = document.getElementById(`ord-cli-${criterioOrden}`);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [criterioOrden]);

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

  // Agrupar solicitudes por cliente (sin duplicados por mayúsculas, tildes o espacios)
  const todosLosClientes = useMemo(() => {
    const map = {};
    const ahora = new Date();

    solicitudes.forEach((s) => {
      // Filtro por fecha (respeta el período seleccionado en el dashboard)
      const fechaSol = parseDate(s.fechaS || s.fechaCreacion);
      if (!cumpleFiltroPeriodoAnalisis({ fecha: fechaSol, filtroPeriodo, rangoEsteMes, ahora })) return;

      const nombre = (s.cliente || 'Consumidor Final').trim();
      const key = normalizarBusqueda(nombre) || 'consumidor final';
      if (!map[key]) {
        map[key] = {
          cliente: nombre,
          totalRFQs: 0,
          cotizadas: 0,
          pedidos: 0,
          pedidosParciales: 0,
          anulaciones: 0,
          ventasPerdidas: 0,
          rechazos: 0,
          pendientes: 0,
          montoTotal: 0,
          montoPedidos: 0,
          enSeguimiento: 0,
          fasesSeguimiento: {},
          solicitudesList: []
        };
      } else {
        // Mantener la versión con formato más completo/legible si difiere
        if (nombre && nombre.length > map[key].cliente.length) {
          map[key].cliente = nombre;
        }
      }

      const item = map[key];
      item.totalRFQs++;
      item.solicitudesList.push(s);
      acumularFaseSeguimiento(item, obtenerFaseSolicitudCacheada(s)?.fase);

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
        const decisiones = contarDecisiones(s);
        item.anulaciones += decisiones.anulaciones;
        item.ventasPerdidas += decisiones.ventasPerdidas;
        item.rechazos += decisiones.rechazos;
        s.productos.forEach((p) => {
          const cant = Number(p.cant || 1);
          const fob = Number(p.fob || 0);
          let unitario = Number(p.precioUnitario || p.precio || 0);
          if (!unitario && p.subtotal && cant > 0) {
            unitario = Number(p.subtotal) / cant;
          }
          if (!unitario && fob > 0) {
            unitario = fob;
          }

          if (unitario > 0) {
            item.montoTotal += unitario * cant;
          }

          const esItemPedido = p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || 
            (est === 'Pedido' && p.estadoItem !== 'Cotizado' && p.estadoItem !== 'Pendiente');

          if (esItemPedido) {
            item.montoPedidos += unitario * cant;
          }
        });
      }
    });

    return Object.values(map);
  }, [solicitudes, filtroPeriodo, rangoEsteMes]);

  // Filtrado por búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return todosLosClientes;
    const term = normalizarBusqueda(searchTerm);
    return todosLosClientes.filter(c => normalizarBusqueda(c.cliente).includes(term));
  }, [todosLosClientes, searchTerm]);

  // Ordenamiento
  const clientesOrdenados = useMemo(() => {
    return [...clientesFiltrados].sort((a, b) => {
      if (criterioOrden === 'pedidos') {
        return b.pedidos - a.pedidos || b.totalRFQs - a.totalRFQs;
      }
      if (criterioOrden === 'monto') {
        return b.montoTotal - a.montoTotal;
      }
      if (criterioOrden === 'anulaciones') {
        return b.anulaciones - a.anulaciones || b.totalRFQs - a.totalRFQs;
      }
      if (criterioOrden === 'decisiones') {
        return (b.ventasPerdidas + b.rechazos + b.anulaciones) - (a.ventasPerdidas + a.rechazos + a.anulaciones) || b.totalRFQs - a.totalRFQs;
      }
      return b.totalRFQs - a.totalRFQs;
    });
  }, [clientesFiltrados, criterioOrden]);

  const totalPages = Math.max(1, Math.ceil(clientesOrdenados.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedClientes = clientesOrdenados.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  const formatearDinero = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // Bloqueo estricto para rol vendedor
  if (role === 'vendedor') {
    return <Navigate to="/vendedor" replace />;
  }

  return (
    <PageContainer className="animate-in fade-in duration-300 space-y-5 pb-12">
      <PageHeader
        onBack={() => navigate('/analisis')}
        backLabel="Volver a Análisis"
        title="Directorio de Clientes"
        statusChip={
          <Etiqueta dominio="rol" valor={theme.key}>
            Directorio
          </Etiqueta>
        }
        subtitle={<>Análisis consolidado por cliente ({todosLosClientes.length} empresas registradas)</>}
        actions={
        <div className="surface flex overflow-x-auto whitespace-nowrap items-center gap-1.5 p-1 rounded-xl w-full sm:w-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[10px] font-medium text-slate-400 ml-2 shrink-0">Ordenar:</span>
          {[
            { id: 'total', label: 'Más RFQs' },
            { id: 'pedidos', label: 'Más Pedidos' },
            { id: 'monto', label: 'Mayor Monto' },
            { id: 'anulaciones', label: 'Más anulaciones' },
            { id: 'decisiones', label: 'Más ventas perdidas' }
          ].map((ord) => (
            <button
              key={ord.id}
              id={`ord-cli-${ord.id}`}
              type="button"
              onClick={() => { setCriterioOrden(ord.id); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                criterioOrden === ord.id 
                  ? 'bg-slate-900 text-white shadow-xs font-semibold' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {ord.label}
            </button>
          ))}
        </div>
        }
      />


      {/* BUSCADOR */}
      <div className="surface p-3 rounded-2xl flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre de cliente..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:border-slate-400 transition-colors"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              const solsAExportar = searchTerm.trim()
                ? clientesFiltrados.flatMap(c => c.solicitudesList || [])
                : solicitudes;
              const periodoLabel = searchTerm.trim()
                ? `Todos los registros | Búsqueda cliente: "${searchTerm.trim()}"`
                : 'Todos los registros de clientes';
              exportarTodosLosMovimientosExcel(solsAExportar, ordenesCompra, 'movimientos_clientes', {
                titulo: 'CONTROL DE LOGÍSTICA - MOVIMIENTOS POR CLIENTES',
                periodoLabel
              });
            }}
            className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
            title="Exportar todos los movimientos de clientes a Excel"
          >
            <Download size={13} />
            <span>Exportar Movimientos</span>
          </button>
          <div className="text-[11px] font-medium text-slate-400 font-mono self-end sm:self-auto">
            Mostrando <strong className="text-slate-700 font-semibold">{clientesFiltrados.length}</strong> {pluralizar(clientesFiltrados.length, 'cliente', 'clientes')}
          </div>
        </div>
      </div>

      {paginatedClientes.length === 0 ? (
        <div className="surface text-center py-16 text-slate-400 text-xs font-medium rounded-2xl">
          No se encontraron clientes con el filtro aplicado.
        </div>
      ) : (
        <>
          {/* VISTA MÓVIL (Tarjetas) */}
          <div className="md:hidden space-y-3">
            {paginatedClientes.map((c, idx) => {
              const numGlobal = (currentPage - 1) * itemsPerPage + idx + 1;
              const convPct = c.cotizadas > 0 
                ? Math.round((c.pedidos / c.cotizadas) * 100) 
                : 0;
              return (
                <div key={c.cliente} className="surface p-4 rounded-2xl space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(`/analisis/cliente/${encodeURIComponent(c.cliente)}`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 border border-slate-200/60 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                        <Building size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-primary-strong transition-colors">{c.cliente}</h3>
                      </div>
                    </div>
                    <Etiqueta tono="neutral" mono className="shrink-0">#{numGlobal}</Etiqueta>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-400 font-medium">RFQs</span>
                      <span className="font-bold font-mono text-slate-700">{c.totalRFQs}</span>
                    </div>
                    <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100/50 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-blue-600/70 font-medium">Cotizadas</span>
                      <span className="font-bold font-mono text-blue-700">{c.cotizadas}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-emerald-600/70 font-medium">Pedidos</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold font-mono text-emerald-700">{c.pedidos}</span>
                        {c.pedidosParciales > 0 && (
                          <span className="text-[9px] font-normal text-sky-600 font-mono" title={`${c.pedidosParciales} ${pluralizar(c.pedidosParciales, 'pedido parcial', 'pedidos parciales')}`}>
                            +{c.pedidosParciales}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DecisionSummaryMobile
                    counts={c}
                    basePath={`/analisis/cliente/${encodeURIComponent(c.cliente)}`}
                    navigate={navigate}
                  />
                  <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
                    {c.enSeguimiento > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">En seguimiento de cliente</span>
                        <button
                          type="button"
                          onClick={() => navigate(`/analisis/cliente/${encodeURIComponent(c.cliente)}?seguimiento=1`)}
                          aria-label={`Ver ${c.enSeguimiento} ${pluralizar(c.enSeguimiento, 'solicitud', 'solicitudes')} en seguimiento de ${c.cliente}`}
                          className="inline-flex rounded-lg cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <Etiqueta tono="seguimiento" titulo={describirFasesSeguimiento(c.fasesSeguimiento)}>{c.enSeguimiento > 0 ? `${c.enSeguimiento} ${pluralizar(c.enSeguimiento, 'solicitud', 'solicitudes')}` : null}</Etiqueta>
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Volumen Estimado</span>
                      <span className="font-mono font-bold text-slate-800">{formatearDinero(c.montoTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Conversión</span>
                      <span className="font-mono font-bold text-slate-800">{convPct}%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => navigate(`/analisis/cliente/${encodeURIComponent(c.cliente)}`)} 
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      Ver Historial
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISTA DESKTOP (Tabla original) */}
          <div className="surface hidden md:flex rounded-2xl overflow-hidden flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="tf-tabla-head">
                    <th className="py-2.5 px-3.5 whitespace-normal">#</th>
                    <th className="py-2.5 px-3.5 whitespace-normal">Cliente</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Total RFQs</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Cotizadas</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-nowrap" title="Solicitudes cotizadas en revisión, prórroga o vencidas">En seguimiento</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Anulaciones</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Ventas perdidas</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Rechazos</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Ganadas (Pedidos)</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Conversión</th>
                    <th className="py-2.5 px-3.5 text-right whitespace-normal">Volumen Estimado</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedClientes.map((c, idx) => {
                    const numGlobal = (currentPage - 1) * itemsPerPage + idx + 1;
                    const convPct = c.cotizadas > 0 
                      ? Math.round((c.pedidos / c.cotizadas) * 100) 
                      : 0;

                    return (
                      <tr key={c.cliente} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                          {numGlobal}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => navigate(`/analisis/cliente/${encodeURIComponent(c.cliente)}`)}
                            title={`Ver historial de ${c.cliente}`}
                          >
                            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                              <Building size={12} />
                            </div>
                            <span className="font-semibold text-slate-800 text-xs truncate max-w-[240px] group-hover:text-slate-900 transition-colors">
                              {c.cliente}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-600">
                          {c.totalRFQs}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-600">
                          {c.cotizadas}
                        </td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          {c.enSeguimiento > 0
                            ? <button
                                type="button"
                                onClick={() => navigate(`/analisis/cliente/${encodeURIComponent(c.cliente)}?seguimiento=1`)}
                                aria-label={`Ver ${c.enSeguimiento} ${pluralizar(c.enSeguimiento, 'solicitud', 'solicitudes')} en seguimiento de ${c.cliente}`}
                                className="inline-flex rounded-lg cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                <Etiqueta tono="seguimiento" titulo={describirFasesSeguimiento(c.fasesSeguimiento)}>{c.enSeguimiento > 0 ? `${c.enSeguimiento}` : null}</Etiqueta>
                              </button>
                            : <span className="font-mono text-slate-300 text-xs">---</span>}
                        </td>
                        <DecisionSummaryColumns counts={c} basePath={`/analisis/cliente/${encodeURIComponent(c.cliente)}`} navigate={navigate} />
                        <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                          <span>{c.pedidos}</span>
                          {c.pedidosParciales > 0 && (
                            <span className="text-[10px] font-normal text-sky-600 block" title={`${c.pedidosParciales} ${pluralizar(c.pedidosParciales, 'pedido parcial', 'pedidos parciales')}`}>
                              +{c.pedidosParciales} parc.
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <Etiqueta dominio="rendimiento" valor={convPct} mono />
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900">
                          {formatearDinero(c.montoTotal)}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => navigate(`/analisis/cliente/${encodeURIComponent(c.cliente)}`)}
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
          </div>
        </>
      )}

      <TablePagination
        page={safeCurrentPage}
        totalPages={totalPages}
        totalItems={clientesFiltrados.length}
        noun="clientes"
        onPageChange={setCurrentPage}
      />
    </PageContainer>
  );
};
