import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Search, Package, ChevronRight, Download, X, User, Building } from 'lucide-react';
import { extraerTodosLosMovimientos, exportarMovimientosExcel } from '../../utils/exportarExcel';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';

export const DetalleProductosAnalisis = ({ role, solicitudes = [], ordenesCompra = [] }) => {
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);
  const [searchTerm, setSearchTerm] = useSessionState('analisis_prod_dir_search', '');
  const [vendedorFilter, setVendedorFilter] = useSessionState('analisis_vendedor_filter', '');
  const [clienteFilter, setClienteFilter] = useSessionState('analisis_cliente_search', '');
  const [ordenarPor, setOrdenarPor] = useSessionState('analisis_prod_dir_orden', 'veces'); // 'veces' (default) | 'unidades' | 'pedidos'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const btn = document.getElementById(`ord-prod-${ordenarPor}`);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [ordenarPor]);

  // Agrupar productos de todas las solicitudes (filtradas por vendedor / cliente si están activos)
  const todosLosProductos = useMemo(() => {
    const map = {};

    solicitudes.forEach((s) => {
      if (vendedorFilter && s.vendedorNombre !== vendedorFilter) return;
      if (clienteFilter) {
        const term = normalizarBusqueda(clienteFilter);
        if (!normalizarBusqueda(s.cliente || '').includes(term)) return;
      }
      if (!Array.isArray(s.productos)) return;

      s.productos.forEach((p) => {
        const desc = (p.desc || p.descripcion || '').trim().toUpperCase();
        if (!desc) return;
        const key = desc;

        const cant = Number(p.cant || 1);
        const marca = p.marca?.trim() || '';
        const esPedido = p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' || 
          (s.estado === 'Pedido' && p.estadoItem !== 'Cotizado' && p.estadoItem !== 'Pendiente');

        if (!map[key]) {
          map[key] = {
            id: key,
            desc: desc,
            marcas: new Set(),
            vecesCotizado: 0,
            unidadesCotizadas: 0,
            vecesPedido: 0,
            unidadesPedidas: 0,
            clientes: new Set(),
            rfqIds: new Set()
          };
        }

        const item = map[key];
        item.vecesCotizado++;
        item.unidadesCotizadas += cant;
        if (marca) item.marcas.add(marca);
        if (s.cliente) item.clientes.add(s.cliente.trim());
        if (s.id) item.rfqIds.add(s.id);

        if (esPedido) {
          item.vecesPedido++;
          item.unidadesPedidas += cant;
        }
      });
    });

    return Object.values(map).map(p => ({
      ...p,
      marcaPrincipal: Array.from(p.marcas).join(', ') || 'Sin marca',
      totalClientes: p.clientes.size
    }));
  }, [solicitudes, vendedorFilter, clienteFilter]);

  // Filtrar por término de búsqueda
  const productosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return todosLosProductos;
    const term = searchTerm.trim().toUpperCase();
    const termNorm = normalizarBusqueda(searchTerm);

    return todosLosProductos.filter(p => 
      p.desc.includes(term) ||
      (termNorm && normalizarBusqueda(p.desc).includes(termNorm)) ||
      (p.marcaPrincipal && p.marcaPrincipal.toUpperCase().includes(term))
    );
  }, [todosLosProductos, searchTerm]);

  // Ordenar productos
  const productosOrdenados = useMemo(() => {
    return [...productosFiltrados].sort((a, b) => {
      if (ordenarPor === 'unidades') {
        return b.unidadesCotizadas - a.unidadesCotizadas || b.vecesCotizado - a.vecesCotizado;
      }
      if (ordenarPor === 'pedidos') {
        return b.vecesPedido - a.vecesPedido || b.unidadesPedidas - a.unidadesPedidas;
      }
      // 'veces' por defecto (más veces cotizado)
      return b.vecesCotizado - a.vecesCotizado || b.unidadesCotizadas - a.unidadesCotizadas;
    });
  }, [productosFiltrados, ordenarPor]);

  const totalPages = Math.max(1, Math.ceil(productosOrdenados.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProductos = productosOrdenados.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

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
                Catálogo
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Top Productos Más Cotizados
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Demanda de productos y unidades solicitadas ({todosLosProductos.length} productos analizados)
            </p>
          </div>
        </div>

        {/* SELECTOR DE ORDENAMIENTO */}
        <div className="flex overflow-x-auto whitespace-nowrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs w-full sm:w-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[10px] font-medium text-slate-400 ml-2 shrink-0">Ordenar:</span>
          {[
            { id: 'veces', label: 'Más cotizados' },
            { id: 'unidades', label: 'Mayor volumen' },
            { id: 'pedidos', label: 'Más ganados' }
          ].map((btn) => (
            <button
              key={btn.id}
              id={`ord-prod-${btn.id}`}
              type="button"
              onClick={() => { setOrdenarPor(btn.id); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                ordenarPor === btn.id 
                  ? 'bg-slate-900 text-white shadow-xs font-semibold' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* BUSCADOR Y FILTROS CONTEXTUALES */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto o marca..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:border-slate-400 transition-colors"
            />
          </div>
          {vendedorFilter && (
            <div className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-white border border-slate-200/90 rounded-full text-xs shadow-2xs transition-all hover:border-slate-300">
              <User size={11} className="text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vendedor:</span>
              <span className="font-semibold text-slate-800">{vendedorFilter}</span>
              <button 
                type="button" 
                onClick={() => { setVendedorFilter(''); setCurrentPage(1); }}
                className="w-4 h-4 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Quitar filtro de vendedor"
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </div>
          )}
          {clienteFilter && (
            <div className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-white border border-slate-200/90 rounded-full text-xs shadow-2xs transition-all hover:border-slate-300">
              <Building size={11} className="text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cliente:</span>
              <span className="font-semibold text-slate-800">{clienteFilter}</span>
              <button 
                type="button" 
                onClick={() => { setClienteFilter(''); setCurrentPage(1); }}
                className="w-4 h-4 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Quitar filtro de cliente"
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              let movs = extraerTodosLosMovimientos(solicitudes, ordenesCompra);
              if (vendedorFilter) {
                movs = movs.filter(m => m.vendedor === vendedorFilter);
              }
              if (clienteFilter) {
                const termCli = normalizarBusqueda(clienteFilter);
                movs = movs.filter(m => normalizarBusqueda(m.cliente || '').includes(termCli));
              }
              if (searchTerm.trim()) {
                const term = normalizarBusqueda(searchTerm);
                movs = movs.filter(m =>
                  normalizarBusqueda(m.producto || '').includes(term) ||
                  normalizarBusqueda(m.marca || '').includes(term)
                );
              }
              const filtrosActivos = ['Catálogo de productos'];
              if (vendedorFilter) filtrosActivos.push(`Vendedor: ${vendedorFilter}`);
              if (clienteFilter && clienteFilter.trim()) filtrosActivos.push(`Cliente: "${clienteFilter.trim()}"`);
              if (searchTerm.trim()) filtrosActivos.push(`Búsqueda: "${searchTerm.trim()}"`);

              exportarMovimientosExcel(movs, 'movimientos_productos', {
                titulo: 'CONTROL DE LOGÍSTICA - MOVIMIENTOS POR PRODUCTOS',
                periodoLabel: filtrosActivos.join(' | ')
              });
            }}
            className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
            title="Exportar todos los movimientos de productos a Excel"
          >
            <Download size={13} />
            <span>Exportar Movimientos</span>
          </button>
          <div className="text-[11px] font-medium text-slate-400 font-mono self-end sm:self-auto">
            Mostrando <strong className="text-slate-700 font-semibold">{productosFiltrados.length}</strong> productos
          </div>
        </div>
      </div>

      {paginatedProductos.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          No se encontraron productos con los criterios seleccionados.
        </div>
      ) : (
        <>
          {/* VISTA MÓVIL (Tarjetas) */}
          <div className="md:hidden space-y-3">
            {paginatedProductos.map((p, idx) => {
              const numGlobal = (currentPage - 1) * itemsPerPage + idx + 1;
              return (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(`/analisis/producto/${encodeURIComponent(p.desc)}`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 border border-slate-200/60 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                        <Package size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors uppercase">{p.desc}</h3>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{p.marcaPrincipal}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200/60 rounded-lg shrink-0">#{numGlobal}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-400 font-medium">Cotizados</span>
                      <span className="font-bold font-mono text-slate-700">{p.vecesCotizado} <span className="text-[9px] font-normal">veces</span></span>
                    </div>
                    <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-emerald-600/70 font-medium">Ganados</span>
                      <span className="font-bold font-mono text-emerald-700">{p.vecesPedido} <span className="text-[9px] font-normal">veces</span></span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-400 font-medium">Und. Cotizadas</span>
                      <span className="font-bold font-mono text-slate-700">{p.unidadesCotizadas.toLocaleString()}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-emerald-600/70 font-medium">Und. Pedidas</span>
                      <span className="font-bold font-mono text-emerald-700">{p.unidadesPedidas.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Clientes</span>
                      <span className="font-mono font-bold text-slate-800">{p.totalClientes}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => navigate(`/analisis/producto/${encodeURIComponent(p.desc)}`)} 
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
                    <th className="py-2.5 px-3.5">Descripción del Producto</th>
                    <th className="py-2.5 px-3.5">Marca</th>
                    <th className="py-2.5 px-3.5 text-center">Veces Cotizado</th>
                    <th className="py-2.5 px-3.5 text-center">Unidades Cotizadas</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Cotizaciones Ganadas</th>
                    <th className="py-2.5 px-3.5 text-center">Unidades Pedidas</th>
                    <th className="py-2.5 px-3.5 text-center">Clientes</th>
                    <th className="py-2.5 px-3.5 text-right">Historial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedProductos.map((p, idx) => {
                    const numGlobal = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                          {numGlobal}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div 
                            onClick={() => navigate(`/analisis/producto/${encodeURIComponent(p.desc)}`)}
                            className="flex items-center gap-2 cursor-pointer group/item"
                          >
                            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0 group-hover/item:bg-slate-800 group-hover/item:text-white transition-colors">
                              <Package size={12} />
                            </div>
                            <span className="font-semibold text-slate-800 text-xs max-w-sm truncate group-hover/item:text-blue-600 transition-colors uppercase" title={p.desc}>
                              {p.desc}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          <span className="truncate max-w-[150px] inline-block text-[11px]" title={p.marcaPrincipal}>
                            {p.marcaPrincipal}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
                            {p.vecesCotizado} RFQ{p.vecesCotizado > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className="inline-block font-mono text-slate-800 font-semibold text-xs">
                            {p.unidadesCotizadas.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-xs">
                            {p.vecesPedido}
                            {p.vecesCotizado > 0 && (
                              <span className="text-[10px] font-medium text-emerald-600">
                                ({Math.round((p.vecesPedido / p.vecesCotizado) * 100)}%)
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-700">
                          {p.unidadesPedidas.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">
                          {p.totalClientes}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/analisis/producto/${encodeURIComponent(p.desc)}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Historial <ChevronRight size={11} />
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
            <span className="hidden sm:inline">({productosFiltrados.length} productos)</span>
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
