import React, { useState, useMemo, useEffect } from 'react';
import { pluralizar } from '../../utils/pluralizar';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, ChevronRight } from 'lucide-react';
import { extraerTodosLosMovimientos, exportarMovimientosExcel } from '../../utils/exportarExcel';
import { normalizarBusqueda } from '../../utils/normalizers';
import { Etiqueta } from '../../components/Etiqueta';
import { PageContainer } from '../../components/ui/PageContainer';
import { PageHeader } from '../../components/ui/PageHeader';
import { BarraFiltros, BotonExportar, BotonLimpiar, ContadorResultados, FiltroBusqueda, FiltroSegmentado } from '../../components/filtros';
import { ChipsFiltroContexto } from './components/ChipsFiltroContexto';
import { getRoleTheme } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';
import { clasificarSolicitud } from '../../utils/clasificarSolicitud';
import { obtenerDecisionItem } from './utils/decisionMetrics';
import { DecisionSummaryMobile, DecisionSummaryColumns } from './components/DecisionSummary';
import { acumularFaseSeguimiento, describirFasesSeguimiento, obtenerFaseItemCacheada } from '../../utils/faseSeguimiento';
import { cumpleFiltroPeriodoAnalisis } from './utils/periodoAnalisis';
import {
  getHoyElSalvador,
  cargarFiltroPeriodoStorage
} from '../../utils/dateValidation';
import { TablePagination } from '../../components/ui/TablePagination';

/** Opciones de "Ordenar" (mismos valores, orden y rótulos que antes). El peso reserva el ancho de la fila de botones en la barra. */
const OPCIONES_ORDEN_PRODUCTOS = [
  { value: 'veces', label: 'Más cotizados' },
  { value: 'unidades', label: 'Mayor volumen' },
  { value: 'pedidos', label: 'Más ganados' },
  { value: 'anulaciones', label: 'Más anulaciones' },
  { value: 'decisiones', label: 'Más decisiones' },
  { value: 'ventasPerdidas', label: 'Más ventas perdidas' },
  { value: 'rechazos', label: 'Más rechazos' }
];
const ANCHO_ORDEN_PRODUCTOS = 7;

export const DetalleProductosAnalisis = ({ role, solicitudes = [], ordenesCompra = [] }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useMemo(() => getRoleTheme(role), [role]);
  const [searchTerm, setSearchTerm] = useSessionState('analisis_prod_dir_search', '');
  const [vendedorFilter, setVendedorFilter] = useSessionState('analisis_vendedor_filter', '');
  const [clienteFilter, setClienteFilter] = useSessionState('analisis_cliente_search', '');
  const [resultadoFilter] = useSessionState('analisis_resultado_filter', '');
  const ordenInicial = useMemo(() => {
    const orden = searchParams.get('orden');
    return orden === 'ganadas' ? 'pedidos' : ['veces', 'unidades', 'pedidos', 'anulaciones', 'decisiones', 'ventasPerdidas', 'rechazos'].includes(orden) ? orden : 'veces';
  }, [searchParams]);
  const [ordenarPor, setOrdenarPor] = useState(ordenInicial); // 'veces' | 'unidades' | 'pedidos' | 'anulaciones'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtro de período sincronizado con el dashboard (guardado en sessionStorage)
  const filtroPeriodo = useMemo(() => {
    const almacenado = cargarFiltroPeriodoStorage();
    const periodoRuta = searchParams.get('periodo');
    if (!periodoRuta) return almacenado;

    return {
      periodo: periodoRuta,
      fechaInicio: searchParams.get('fechaInicio') || '',
      fechaFin: searchParams.get('fechaFin') || '',
      anioHistorico: searchParams.get('anioHistorico') || 'todos'
    };
  }, [searchParams]);
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

  // Agrupar productos de todas las solicitudes (filtradas por vendedor / cliente si están activos)
  const todosLosProductos = useMemo(() => {
    const map = {};
    const ahora = new Date();

    solicitudes.forEach((s) => {
      // Filtro por fecha (respeta el período seleccionado en el dashboard)
      const fechaSol = parseDate(s.fechaS || s.fechaCreacion);
      if (!cumpleFiltroPeriodoAnalisis({ fecha: fechaSol, filtroPeriodo, rangoEsteMes, ahora })) return;

      if (vendedorFilter && s.vendedorNombre !== vendedorFilter) return;
      if (clienteFilter) {
        const term = normalizarBusqueda(clienteFilter);
        if (!normalizarBusqueda(s.cliente || '').includes(term)) return;
      }
      // Filtro por resultado (respeta el selector activo en el dashboard)
      if (resultadoFilter) {
        const resultado = s.resultado || clasificarSolicitud(s.productos, s.estado).resultado;
        if (resultado !== resultadoFilter) return;
      }
      if (!Array.isArray(s.productos)) return;

      s.productos.forEach((p, indiceProducto) => {
        const desc = (p.desc || p.descripcion || '').trim().toUpperCase();
        if (!desc) return;
        const key = desc;

        const cant = Number(p.cant || 1);
        const marca = p.marca?.trim() || '';

        if (!map[key]) {
          map[key] = {
            id: key,
            desc: desc,
            marcas: new Set(),
            vecesCotizado: 0,
            unidadesCotizadas: 0,
            vecesPedido: 0,
            unidadesPedidas: 0,
            anulaciones: 0,
            ventasPerdidas: 0,
            rechazos: 0,
            clientes: new Set(),
            rfqIds: new Set(),
            enSeguimiento: 0,
            fasesSeguimiento: {}
          };
        }

        const item = map[key];
        if (marca) item.marcas.add(marca);
        if (s.cliente) item.clientes.add(s.cliente.trim());
        if (s.id) item.rfqIds.add(s.id);
        acumularFaseSeguimiento(item, obtenerFaseItemCacheada(s, indiceProducto));

        const decision = obtenerDecisionItem(s, p);
        if (decision === 'Anulado' || decision === 'Venta Perdida' || decision === 'Rechazo') {
          if (decision === 'Anulado') item.anulaciones++;
          if (decision === 'Venta Perdida') item.ventasPerdidas++;
          if (decision === 'Rechazo') item.rechazos++;
          return;
        }

        const esPedido = p.estadoItem === 'Pedido' || p.estadoItem === 'Comprado' ||
          (s.estado === 'Pedido' && p.estadoItem !== 'Cotizado' && p.estadoItem !== 'Pendiente');

        item.vecesCotizado++;
        item.unidadesCotizadas += cant;

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
  }, [solicitudes, vendedorFilter, clienteFilter, resultadoFilter, filtroPeriodo, rangoEsteMes]);

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
        return b.vecesPedido - a.vecesPedido || b.unidadesPedidas - a.unidadesPedidas || b.vecesCotizado - a.vecesCotizado;
      }
      if (ordenarPor === 'anulaciones') {
        return b.anulaciones - a.anulaciones || b.vecesCotizado - a.vecesCotizado;
      }
      if (ordenarPor === 'ventasPerdidas') {
        return b.ventasPerdidas - a.ventasPerdidas || b.vecesCotizado - a.vecesCotizado;
      }
      if (ordenarPor === 'rechazos') {
        return b.rechazos - a.rechazos || b.vecesCotizado - a.vecesCotizado;
      }
      if (ordenarPor === 'decisiones') {
        return (b.ventasPerdidas + b.rechazos + b.anulaciones) - (a.ventasPerdidas + a.rechazos + a.anulaciones) || b.vecesCotizado - a.vecesCotizado;
      }
      // 'veces' por defecto (más veces cotizado)
      return b.vecesCotizado - a.vecesCotizado || b.unidadesCotizadas - a.unidadesCotizadas;
    });
  }, [productosFiltrados, ordenarPor]);

  const totalPages = Math.max(1, Math.ceil(productosOrdenados.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProductos = productosOrdenados.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  /** Exportar: cuerpo idéntico al anterior (solo movido de lugar). */
  const exportarMovimientosProductos = () => {
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
        title="Top Productos Más Cotizados"
        statusChip={
          <Etiqueta dominio="rol" valor={theme.key}>
            Catálogo
          </Etiqueta>
        }
        subtitle={<>Demanda de productos y unidades solicitadas ({todosLosProductos.length} {pluralizar(todosLosProductos.length, 'producto analizado', 'productos analizados')})</>}
      />

      {/* BARRA DE FILTROS: chips de contexto, búsqueda, orden, Limpiar, exportar y contador */}
      <BarraFiltros
        busquedaEnBarraMovil
        resultados={productosFiltrados.length}
        filtrosActivos={ordenarPor !== ordenInicial ? 1 : 0}
        encabezado={(vendedorFilter || clienteFilter) ? (
          <ChipsFiltroContexto
            plana
            vendedor={vendedorFilter}
            cliente={clienteFilter}
            onQuitarVendedor={() => { setVendedorFilter(''); setCurrentPage(1); }}
            onQuitarCliente={() => { setClienteFilter(''); setCurrentPage(1); }}
          />
        ) : null}
        busqueda={(
          <FiltroBusqueda
            value={searchTerm}
            onChange={(texto) => { setSearchTerm(texto); setCurrentPage(1); }}
            placeholder="Buscar producto o marca..."
            ariaLabel="Buscar producto o marca"
          />
        )}
        filtros={(
          <FiltroSegmentado
            colapsable
            peso={ANCHO_ORDEN_PRODUCTOS}
            prefijo="Ordenar:"
            etiqueta="Ordenar"
            ariaLabel="Ordenar productos"
            opciones={OPCIONES_ORDEN_PRODUCTOS}
            value={ordenarPor}
            onChange={(valor) => { setOrdenarPor(valor); setCurrentPage(1); }}
          />
        )}
        limpiar={(
          <BotonLimpiar
            activos={(searchTerm.trim() ? 1 : 0) + (ordenarPor !== ordenInicial ? 1 : 0)}
            onClick={() => { setSearchTerm(''); setOrdenarPor(ordenInicial); setCurrentPage(1); }}
          />
        )}
        acciones={(
          <BotonExportar
            etiqueta="Exportar movimientos"
            titulo="Exportar todos los movimientos de productos a Excel"
            onClick={exportarMovimientosProductos}
          />
        )}
        extremo={<ContadorResultados prefijo="Mostrando" total={productosFiltrados.length} singular="producto" plural="productos" />}
      />

      {paginatedProductos.length === 0 ? (
        <div className="surface text-center py-16 text-slate-400 text-xs font-medium rounded-2xl">
          No se encontraron productos con los criterios seleccionados.
        </div>
      ) : (
        <>
          {/* VISTA MÓVIL (Tarjetas) */}
          <div className="md:hidden space-y-3">
            {paginatedProductos.map((p, idx) => {
              const numGlobal = (currentPage - 1) * itemsPerPage + idx + 1;
              return (
                <div key={p.id} className="surface p-4 rounded-2xl space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(`/analisis/producto/${encodeURIComponent(p.desc)}`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 border border-slate-200/60 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                        <Package size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-primary-strong transition-colors uppercase">{p.desc}</h3>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{p.marcaPrincipal}</p>
                      </div>
                    </div>
                    <Etiqueta tono="neutral" mono className="shrink-0">#{numGlobal}</Etiqueta>
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
                      <span className="font-bold font-mono text-slate-800">{p.unidadesPedidas.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <DecisionSummaryMobile
                    counts={p}
                    basePath={`/analisis/producto/${encodeURIComponent(p.desc)}`}
                    navigate={navigate}
                  />
                  <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
                    {p.enSeguimiento > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">En seguimiento</span>
                        <button
                          type="button"
                          onClick={() => navigate(`/analisis/producto/${encodeURIComponent(p.desc)}?seguimiento=1`)}
                          aria-label={`Ver ${p.enSeguimiento} ítems en seguimiento de ${p.desc}`}
                          className="inline-flex rounded-lg cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <Etiqueta tono="seguimiento" titulo={describirFasesSeguimiento(p.fasesSeguimiento)}>{p.enSeguimiento > 0 ? `${p.enSeguimiento} ${pluralizar(p.enSeguimiento, 'ítem', 'ítems')}` : null}</Etiqueta>
                        </button>
                      </div>
                    )}
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
          <div className="surface hidden md:flex rounded-2xl overflow-hidden flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="tf-tabla-head">
                    <th className="py-2.5 px-3.5 whitespace-normal">#</th>
                    <th className="py-2.5 px-3.5 whitespace-normal">Descripción del Producto</th>
                    <th className="py-2.5 px-3.5 whitespace-normal">Marca</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-normal">Veces Cotizado</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-normal" title="Ítems en revisión, prórroga o vencidos">En seguimiento</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Anulaciones</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Ventas perdidas</th>
                    <th className="py-2.5 px-3.5 text-center whitespace-normal">Rechazos</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-normal">Unidades Cotizadas</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-normal">Cotizaciones Ganadas</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-normal">Unidades Pedidas</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-normal">Clientes</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-normal">Historial</th>
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
                            <span className="font-semibold text-slate-800 text-xs max-w-sm truncate group-hover/item:text-primary-strong transition-colors uppercase" title={p.desc}>
                              {p.desc}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          <span className="truncate max-w-[150px] inline-block text-[11px]" title={p.marcaPrincipal}>
                            {p.marcaPrincipal}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          <Etiqueta tono="neutral" tamano="normal" mono>
                            {p.vecesCotizado} RFQ{p.vecesCotizado > 1 ? 's' : ''}
                          </Etiqueta>
                        </td>
                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                          {p.enSeguimiento > 0
                            ? <button
                                type="button"
                                onClick={() => navigate(`/analisis/producto/${encodeURIComponent(p.desc)}?seguimiento=1`)}
                                aria-label={`Ver ${p.enSeguimiento} ítems en seguimiento de ${p.desc}`}
                                className="inline-flex rounded-lg cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                <Etiqueta tono="seguimiento" titulo={describirFasesSeguimiento(p.fasesSeguimiento)}>{p.enSeguimiento > 0 ? `${p.enSeguimiento}` : null}</Etiqueta>
                              </button>
                            : <span className="font-mono text-slate-300 text-xs">---</span>}
                        </td>
                        <DecisionSummaryColumns counts={p} basePath={`/analisis/producto/${encodeURIComponent(p.desc)}`} navigate={navigate} />
                        <td className="py-2.5 px-2.5 text-center">
                          <span className="inline-block font-mono text-slate-800 font-semibold text-xs">
                            {p.unidadesCotizadas.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          <Etiqueta tono="exito" tamano="normal" mono>
                            {p.vecesPedido}
                            {p.vecesCotizado > 0 && (
                              <span className="text-[10px] font-medium text-emerald-600">
                                ({Math.round((p.vecesPedido / p.vecesCotizado) * 100)}%)
                              </span>
                            )}
                          </Etiqueta>
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-800">
                          {p.unidadesPedidas.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-slate-500">
                          {p.totalClientes}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
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

      <TablePagination
        page={safeCurrentPage}
        totalPages={totalPages}
        totalItems={productosFiltrados.length}
        noun="productos"
        onPageChange={setCurrentPage}
      />
    </PageContainer>
  );
};
