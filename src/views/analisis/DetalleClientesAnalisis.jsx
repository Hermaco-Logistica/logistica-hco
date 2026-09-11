import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Search, Building, Download } from 'lucide-react';
import { exportarTodosLosMovimientosExcel } from '../../utils/exportarExcel';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';

export const DetalleClientesAnalisis = ({ role, solicitudes = [], ordenesCompra = [] }) => {
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);
  const [searchTerm, setSearchTerm] = useSessionState('analisis_clientes_dir_search', '');
  const [criterioOrden, setCriterioOrden] = useSessionState('analisis_clientes_dir_orden', 'total'); // 'total' | 'pedidos' | 'monto'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const btn = document.getElementById(`ord-cli-${criterioOrden}`);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [criterioOrden]);

  // Agrupar solicitudes por cliente (sin duplicados por mayúsculas, tildes o espacios)
  const todosLosClientes = useMemo(() => {
    const map = {};

    solicitudes.forEach((s) => {
      const nombre = (s.cliente || 'Consumidor Final').trim();
      const key = normalizarBusqueda(nombre) || 'consumidor final';
      if (!map[key]) {
        map[key] = {
          cliente: nombre,
          totalRFQs: 0,
          cotizadas: 0,
          pedidos: 0,
          pedidosParciales: 0,
          pendientes: 0,
          montoTotal: 0,
          montoPedidos: 0,
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
  }, [solicitudes]);

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
                Directorio
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Directorio de Clientes
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Análisis consolidado por cliente ({todosLosClientes.length} empresas registradas)
            </p>
          </div>
        </div>

        {/* ORDENAMIENTO */}
        <div className="flex overflow-x-auto whitespace-nowrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs w-full sm:w-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[10px] font-medium text-slate-400 ml-2 shrink-0">Ordenar:</span>
          {[
            { id: 'total', label: 'Más RFQs' },
            { id: 'pedidos', label: 'Más Pedidos' },
            { id: 'monto', label: 'Mayor Monto' }
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
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
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
            className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
            title="Exportar todos los movimientos de clientes a Excel"
          >
            <Download size={13} />
            <span>Exportar Movimientos</span>
          </button>
          <div className="text-[11px] font-medium text-slate-400 font-mono self-end sm:self-auto">
            Mostrando <strong className="text-slate-700 font-semibold">{clientesFiltrados.length}</strong> clientes
          </div>
        </div>
      </div>

      {paginatedClientes.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200/80 shadow-xs">
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
                <div key={c.cliente} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(`/analisis/cliente/${encodeURIComponent(c.cliente)}`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 border border-slate-200/60 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                        <Building size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">{c.cliente}</h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200/60 rounded-lg shrink-0">#{numGlobal}</span>
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
                          <span className="text-[9px] font-normal text-sky-600 font-mono" title={`${c.pedidosParciales} pedidos parciales`}>
                            +{c.pedidosParciales}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Volumen Estimado</span>
                      <span className="font-mono font-bold text-slate-800">{formatearDinero(c.montoTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Conversión</span>
                      <span className="font-mono font-bold text-blue-600">{convPct}%</span>
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
          <div className="hidden md:flex bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3.5">#</th>
                    <th className="py-2.5 px-3.5">Cliente</th>
                    <th className="py-2.5 px-3.5 text-center">Total RFQs</th>
                    <th className="py-2.5 px-3.5 text-center">Cotizadas</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Ganadas (Pedidos)</th>
                    <th className="py-2.5 px-3.5 text-center">Conversión</th>
                    <th className="py-2.5 px-3.5 text-right">Volumen Estimado</th>
                    <th className="py-2.5 px-3.5 text-right">Detalle</th>
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
                        <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                          <span>{c.pedidos}</span>
                          {c.pedidosParciales > 0 && (
                            <span className="text-[10px] font-normal text-sky-600 block" title={`${c.pedidosParciales} pedidos parciales`}>
                              +{c.pedidosParciales} parc.
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                            convPct > 50 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                              : convPct > 0 
                              ? 'bg-blue-50 text-blue-700 border-blue-200/60' 
                              : 'bg-slate-50 text-slate-400 border-slate-200/60'
                          }`}>
                            {convPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900">
                          {formatearDinero(c.montoTotal)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
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

      {/* PAGINACIÓN DE 10 EN 10 */}
      {totalPages > 1 && (
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <button 
            type="button"
            onClick={() => setCurrentPage(Math.max(safeCurrentPage - 1, 1))}
            disabled={safeCurrentPage === 1}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-medium text-xs rounded-lg transition-all cursor-pointer"
          >
            Anterior
          </button>
          <span className="text-[11px] font-medium text-slate-400 text-center px-2">
            Página <span className="font-bold text-slate-600">{safeCurrentPage}</span> de {totalPages} <br className="sm:hidden" />
            <span className="hidden sm:inline">({clientesFiltrados.length} clientes)</span>
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
  );
};
