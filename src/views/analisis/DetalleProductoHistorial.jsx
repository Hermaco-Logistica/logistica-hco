import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Package, 
  Plane, 
  Ship, 
  ExternalLink, 
  Calendar, 
  Building, 
  User, 
  TrendingUp,
  DollarSign,
  Clock,
  Link as LinkIcon,
  CheckCircle2,
  Download,
  X
} from 'lucide-react';
import { exportarMovimientosExcel } from '../../utils/exportarExcel';
import { Badge } from '../../components/Badge';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme, evaluarEstadoGanada } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';

export const DetalleProductoHistorial = ({ role, solicitudes = [], ordenesCompra = [] }) => {
  const params = useParams();
  const productId = params.productId || params['*'] || '';
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);

  const [searchTerm, setSearchTerm] = useSessionState('analisis_prod_hist_search', '');
  const [filterEstado, setFilterEstado] = useSessionState('analisis_prod_hist_estado', '');
  const [filterModalidad, setFilterModalidad] = useSessionState('analisis_prod_hist_modalidad', '');
  const [vendedorFilter, setVendedorFilter] = useSessionState('analisis_vendedor_filter', '');
  const [clienteFilter, setClienteFilter] = useSessionState('analisis_cliente_search', '');
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


  const mapFechasOC = useMemo(() => {
    const map = {};
    ordenesCompra.forEach((oc) => {
      const num = (oc.numeroOC || oc.numero || '').toString().trim();
      if (num && oc.fechaCreacion) {
        map[num] = oc.fechaCreacion;
      }
    });
    return map;
  }, [ordenesCompra]);

  // Decodificar el identificador de producto de la URL
  const decodedSearch = useMemo(() => {
    try {
      return decodeURIComponent(productId || '').trim();
    } catch {
      return (productId || '').trim();
    }
  }, [productId]);

  const targetSku = useMemo(() => {
    return (decodedSearch || '').trim().toUpperCase();
  }, [decodedSearch]);

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

  const formatMoneda = (val) => {
    if (!val || isNaN(val) || Number(val) <= 0) return '---';
    return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const truncarTexto = (val, max = 15) => {
    const str = (val ?? '').toString();
    return str.length > max ? `${str.slice(0, max)}…` : str;
  };

  // Extraer todos los movimientos históricos del producto
  const { movimientos, infoProducto } = useMemo(() => {
    const list = [];
    let nombreOficial = decodedSearch;
    const marcasSet = new Set();
    const IVA_TASA = 0.13;

    solicitudes.forEach((s) => {
      if (vendedorFilter && s.vendedorNombre !== vendedorFilter) return;
      if (clienteFilter) {
        const term = normalizarBusqueda(clienteFilter);
        if (!normalizarBusqueda(s.cliente || '').includes(term)) return;
      }
      if (!Array.isArray(s.productos)) return;

      s.productos.forEach((p, idx) => {
        const desc = (p.desc || p.descripcion || '').trim();
        const pSku = desc.toUpperCase();

        // Coincidencia estricta e idéntica por SKU (no agrupa similares, preserva puntos, plecas, guiones y comas)
        if (pSku && pSku === targetSku) {
          if (desc && (!nombreOficial || nombreOficial === decodedSearch)) {
            nombreOficial = desc;
          }
          if (p.marca) marcasSet.add(p.marca.trim());

          // Modalidad: Aéreo o Marítimo
          let modNormalizada = 'No asignada';
          const modRaw = (p.modalidad || s.modalidad || '').toString().trim();
          if (modRaw === 'A' || modRaw.toLowerCase().includes('aére') || modRaw.toLowerCase().includes('aere')) {
            modNormalizada = 'Aéreo';
          } else if (modRaw === 'M' || modRaw.toLowerCase().includes('marít') || modRaw.toLowerCase().includes('marit')) {
            modNormalizada = 'Marítimo';
          }

          // Unidades
          const unidades = Number(p.cant || p.cantidad || 1);

          // Precio Unitario
          let precioUnitario = Number(p.precioUnitario || p.precio || 0);
          if (!precioUnitario && p.fob) {
            const fobVal = Number(p.fob || 0);
            if (modNormalizada === 'Aéreo') {
              const factorA = Number(p.factorA || s.factorA || 1);
              const fva = Number(p.fva || 1.25);
              precioUnitario = Number(p.ventaA || p.precioAereo || (fobVal * factorA * fva));
            } else if (modNormalizada === 'Marítimo') {
              const factorM = Number(p.factorM || s.factorM || 1);
              const fvm = Number(p.fvm || 1.25);
              precioUnitario = Number(p.ventaM || p.precioMaritimo || (fobVal * factorM * fvm));
            } else if (p.subtotal && unidades > 0) {
              precioUnitario = Number(p.subtotal) / unidades;
            } else {
              precioUnitario = fobVal;
            }
          }

          // Valor Neto = precio unitario * unidades
          let valorNeto = Number(p.subtotal || 0);
          if (!valorNeto && precioUnitario > 0) {
            valorNeto = precioUnitario * unidades;
          }

          // Total con IVA (13%)
          const totalConIva = valorNeto > 0 ? valorNeto * (1 + IVA_TASA) : 0;

          // OC Referencia
          const ocRef = p.numOC || p.ocRef || p.numeroOC || s.numeroOC || s.linkOC || '';

          // Estado del ítem a nivel individual (ítem por ítem)
          let estadoItem = p.estadoItem;
          if (estadoItem === 'Pedido Parcial' || estadoItem === 'Comprado') {
            estadoItem = 'Pedido';
          } else if (!estadoItem) {
            if (s.estado === 'Pedido' || s.estado === 'Comprado') {
              estadoItem = 'Pedido';
            } else if (s.estado === 'Pedido Parcial') {
              const tienePrecio = Number(p.fob || p.precioUnitario || 0) > 0;
              estadoItem = tienePrecio ? 'Cotizado' : 'Pendiente';
            } else {
              estadoItem = s.estado || 'Pendiente';
            }
          }

          // Fechas diferenciadas:
          // 1. Fecha Solicitud (cuando el comercial creó la solicitud)
          const fechaSol = s.fechaS || s.fechaCreacion || null;

          // 2. Fecha Respuesta (cuando compras contestó / cotizó el producto)
          const tienePrecio = Number(p.fob || p.precioUnitario || 0) > 0 || ['Cotizado', 'Cotizado Parcial', 'Pedido', 'Pedido Parcial', 'Comprado'].includes(estadoItem);
          const fechaResp = p.fechaCotizacion || (tienePrecio ? (s.fechaCotizacion || s.fechaS) : null);

          // 3. Fecha OC (cuando se generó la orden de compra en ordenesCompra o en el ítem)
          const fechaOC = p.fechaOC || (ocRef ? mapFechasOC[ocRef.toString().trim()] : null);

          list.push({
            idMov: `${s.id}-${idx}`,
            rfqId: s.id,
            correlativo: s.correlativo || 'S/N',
            cliente: s.cliente || 'Consumidor Final',
            producto: desc,
            marca: (p.marca || '').trim(),
            vendedor: s.vendedorNombre || 'Sin asignar',
            fechaSol: fechaSol,
            fechaResp: fechaResp,
            fechaOC: fechaOC,
            fechaPrincipal: fechaResp || fechaSol,
            unidades: unidades,
            modalidad: modNormalizada,
            precioUnitario: precioUnitario,
            valorNeto: valorNeto,
            totalConIva: totalConIva,
            ocRef: ocRef,
            estado: estadoItem,
            fob: Number(p.fob || 0),
            itemOriginal: p,
            solicitudOriginal: s
          });
        }
      });
    });

    // Ordenar de más reciente a más antigua
    list.sort((a, b) => {
      const dateA = parseDate(a.fechaPrincipal)?.getTime() || 0;
      const dateB = parseDate(b.fechaPrincipal)?.getTime() || 0;
      return dateB - dateA;
    });

    return {
      movimientos: list,
      infoProducto: {
        nombre: (nombreOficial || decodedSearch).toUpperCase(),
        marca: Array.from(marcasSet).join(', ') || 'Sin marca especificada'
      }
    };
  }, [solicitudes, targetSku, decodedSearch, mapFechasOC, vendedorFilter, clienteFilter]);

  // Filtrado de la tabla según filtros y búsqueda
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filterEstado) {
        if (filterEstado === 'Pedido Parcial') {
          if (m.estado !== 'Pedido Parcial' && m.solicitudOriginal?.estado !== 'Pedido Parcial') return false;
        } else if (filterEstado === 'Pedido') {
          if (m.estado !== 'Pedido' && m.estado !== 'Comprado') return false;
        } else if (m.estado !== filterEstado) {
          return false;
        }
      }
      if (filterModalidad && m.modalidad !== filterModalidad) return false;

      if (searchTerm.trim()) {
        const term = normalizarBusqueda(searchTerm);
        const matchCorrelativo = normalizarBusqueda(m.correlativo).includes(term);
        const matchCliente = normalizarBusqueda(m.cliente).includes(term);
        const matchVendedor = normalizarBusqueda(m.vendedor).includes(term);
        const matchOC = normalizarBusqueda(m.ocRef).includes(term);
        if (!matchCorrelativo && !matchCliente && !matchVendedor && !matchOC) return false;
      }

      return true;
    });
  }, [movimientos, filterEstado, filterModalidad, searchTerm]);

  // Métricas dinámicas calculadas sobre los movimientos filtrados
  const metricas = useMemo(() => {
    const totalMovimientos = movimientosFiltrados.length;
    let unidadesTotales = 0;
    let unidadesEnPedido = 0;
    let pedidosCount = 0;
    let parcialesCount = 0;
    let sumaValorNeto = 0;
    let sumaTotalConIva = 0;
    const clientesSet = new Set();

    movimientosFiltrados.forEach((m) => {
      unidadesTotales += Number(m.unidades || 0);
      sumaValorNeto += Number(m.valorNeto || 0);
      sumaTotalConIva += Number(m.totalConIva || 0);
      if (m.cliente) clientesSet.add(normalizarBusqueda(m.cliente));
      const resGanada = evaluarEstadoGanada(m);
      if (resGanada.esGanada) {
        pedidosCount++;
        unidadesEnPedido += Number(m.unidades || 0);
      } else if (resGanada.esParcial && (m.estado === 'Pedido Parcial' || m.estado === 'Pedido' || m.estado === 'Comprado')) {
        parcialesCount++;
        unidadesEnPedido += Number(m.unidades || 0);
      }
    });

    const tasaConversion = totalMovimientos > 0 
      ? ((pedidosCount / totalMovimientos) * 100).toFixed(1)
      : 0;

    return {
      totalMovimientos,
      totalHistorico: movimientos.length,
      estaFiltrado: movimientosFiltrados.length !== movimientos.length,
      unidadesTotales,
      unidadesEnPedido,
      pedidosCount,
      parcialesCount,
      sumaValorNeto,
      sumaTotalConIva,
      clientesUnicos: clientesSet.size,
      tasaConversion
    };
  }, [movimientosFiltrados, movimientos.length]);

  const totalPages = Math.max(1, Math.ceil(movimientosFiltrados.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedMovimientos = movimientosFiltrados.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  const irADetalle = (m) => {
    if (role === 'comprador' && m.estado === 'Pendiente') {
      navigate(`/calculadora/${m.rfqId}`);
    } else {
      navigate(`/vendedor/detalle/${m.rfqId}`);
    }
  };

  // Bloqueo estricto para rol vendedor
  if (role === 'vendedor') {
    return <Navigate to="/vendedor" replace />;
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-7xl mx-auto space-y-5 pb-12">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/analisis/productos')}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200/80 transition-colors shadow-xs cursor-pointer shrink-0 mt-1 sm:mt-0"
            title="Volver a Catálogo de Productos"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold tracking-wider px-2.5 py-0.5 rounded-full ${theme.bgBadge}`}>
                Historial de Producto
              </span>
              {infoProducto.marca !== 'Sin marca especificada' && (
                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                  {infoProducto.marca}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 max-w-3xl line-clamp-2 uppercase">
              {infoProducto.nombre}
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Trazabilidad en solicitudes RFQ y órdenes de compra
            </p>
          </div>
        </div>
      </div>

      {/* TARJETAS RESUMEN DEL PRODUCTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Veces Cotizado</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
              <Package size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metricas.totalMovimientos}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
              En diferentes RFQs
            </div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Unidades Solicitadas</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
              <Package size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metricas.unidadesTotales.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-emerald-700 mt-0.5">
              {metricas.unidadesEnPedido.toLocaleString()} en pedido
            </div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Valor Neto Total</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight truncate" title={formatMoneda(metricas.sumaValorNeto)}>
              {formatMoneda(metricas.sumaValorNeto)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
              {metricas.estaFiltrado ? `${metricas.totalMovimientos} de ${metricas.totalHistorico} filtrados` : 'Total sin IVA'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total con IVA (13%)</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold font-mono text-emerald-700 tracking-tight truncate" title={formatMoneda(metricas.sumaTotalConIva)}>
              {formatMoneda(metricas.sumaTotalConIva)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
              {metricas.estaFiltrado ? 'Impuestos incluidos (filtrado)' : 'Impuestos incluidos'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Efectividad / Clientes</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight flex items-baseline gap-1">
              {metricas.tasaConversion}
              <span className="text-xs font-normal text-slate-400">%</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
              {metricas.pedidosCount} ganadas {metricas.parcialesCount > 0 && <span className="text-amber-600 font-semibold">(+{metricas.parcialesCount} parc.)</span>} / {metricas.totalMovimientos} cotizadas
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por RFQ, cliente, vendedor u OC..."
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

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filtro estado */}
          <select
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50/80 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 cursor-pointer"
          >
            <option value="">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Cotizado">Cotizado</option>
            <option value="Cotizado Parcial">Cotizado Parcial</option>
            <option value="Pedido">Pedido</option>
            <option value="Pedido Parcial">Pedido Parcial</option>
            <option value="Comprado">Comprado</option>
          </select>

          {/* Filtro modalidad */}
          <select
            value={filterModalidad}
            onChange={(e) => { setFilterModalidad(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50/80 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 cursor-pointer"
          >
            <option value="">Todas las Modalidades</option>
            <option value="Aéreo">Aéreo</option>
            <option value="Marítimo">Marítimo</option>
            <option value="No asignada">No asignada</option>
          </select>

          {(filterEstado || filterModalidad || searchTerm) && (
            <button
              type="button"
              onClick={() => { setFilterEstado(''); setFilterModalidad(''); setSearchTerm(''); }}
              className="text-xs font-medium text-slate-400 hover:text-rose-600 px-2 py-1 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const filtrosActivos = ['Historial Completo'];
              if (filterEstado) filtrosActivos.push(`Estado: ${filterEstado}`);
              if (filterModalidad) filtrosActivos.push(`Modalidad: ${filterModalidad}`);
              if (searchTerm.trim()) filtrosActivos.push(`Búsqueda: "${searchTerm.trim()}"`);

              const dataConProd = movimientosFiltrados.map(m => ({
                ...m,
                producto: m.producto || infoProducto.nombre,
                marca: m.marca || infoProducto.marca
              }));
              exportarMovimientosExcel(
                dataConProd,
                `historial_producto_${infoProducto.nombre || productId}`,
                {
                  titulo: `CONTROL DE LOGÍSTICA - HISTORIAL DE PRODUCTO: ${(infoProducto.nombre || productId).toUpperCase()}`,
                  periodoLabel: filtrosActivos.join(' | ')
                }
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ml-auto"
            title="Exportar historial del producto a Excel"
          >
            <Download size={13} />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* TABLA DE MOVIMIENTOS HISTÓRICOS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {paginatedMovimientos.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-medium">
            No se registraron movimientos con los filtros seleccionados.
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
                  <th className="py-2.5 px-3 whitespace-nowrap">RFQ</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Fecha Sol.</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Fecha Resp.</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Fecha OC</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Cliente</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Producto</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Marca</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Vendedor</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Modalidad</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Unidades</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Precio Unit.</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Valor Neto</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Total (IVA)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">OC Ref</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Estado</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Resultado</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedMovimientos.map((m) => {
                  const esAereo = m.modalidad === 'Aéreo';
                  const esMaritimo = m.modalidad === 'Marítimo';

                  return (
                    <tr key={m.idMov} className="hover:bg-slate-50/80 transition-colors">
                      {/* Correlativo RFQ */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200/80 inline-block whitespace-nowrap">
                            {m.correlativo}
                          </span>
                          {m.solicitudOriginal?.estado === 'Pedido Parcial' && (
                            <span 
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80 shrink-0 whitespace-nowrap"
                              title="La solicitud original es Pedido Parcial"
                            >
                              Parcial
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Fecha Solicitud */}
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400 shrink-0" />
                          <span>{formatFecha(m.fechaSol)}</span>
                        </div>
                      </td>

                      {/* Fecha Respuesta / Cotización */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        {m.fechaResp ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Clock size={12} className="text-slate-400 shrink-0" />
                            <span>{formatFecha(m.fechaResp)}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">Pendiente</span>
                        )}
                      </td>

                      {/* Fecha OC */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        {m.fechaOC ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Calendar size={12} className="text-slate-400 shrink-0" />
                            <span>{formatFecha(m.fechaOC)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">---</span>
                        )}
                      </td>

                      {/* Cliente: enlace directo a su detalle */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Building size={12} className="text-slate-400 shrink-0" />
                          <button
                            type="button"
                            onClick={() => navigate(`/analisis/cliente/${encodeURIComponent(m.cliente)}`)}
                            className="font-medium text-slate-800 hover:text-blue-600 transition-colors text-left cursor-pointer"
                            title={`Ver historial de ${m.cliente}`}
                          >
                            {truncarTexto(m.cliente, 20)}
                          </button>
                        </div>
                      </td>

                      {/* Producto */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Package size={12} className="text-slate-400 shrink-0" />
                          <span
                            className="font-semibold text-slate-800 text-left truncate max-w-[220px] uppercase text-xs"
                            title={m.producto || infoProducto.nombre}
                          >
                            {truncarTexto(m.producto || infoProducto.nombre, 28)}
                          </span>
                        </div>
                      </td>

                      {/* Marca */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {m.marca ? (
                          <span className="text-[11px] font-semibold text-slate-700 uppercase">
                            {m.marca}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">---</span>
                        )}
                      </td>

                      {/* Vendedor: enlace directo a su detalle */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <User size={12} className="text-slate-400 shrink-0" />
                          <button
                            type="button"
                            onClick={() => navigate(`/analisis/vendedor/${encodeURIComponent(m.vendedor)}`)}
                            className="font-medium text-slate-700 hover:text-blue-600 transition-colors text-left cursor-pointer"
                            title={`Ver historial de ${m.vendedor}`}
                          >
                            {m.vendedor}
                          </button>
                        </div>
                      </td>

                      {/* Modalidad */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {esAereo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200/60 whitespace-nowrap">
                            <Plane size={11} /> Aéreo
                          </span>
                        ) : esMaritimo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap">
                            <Ship size={11} /> Marítimo
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            {m.modalidad}
                          </span>
                        )}
                      </td>

                      {/* Unidades Cotizadas */}
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800 text-xs whitespace-nowrap">
                        {m.unidades.toLocaleString()}
                      </td>

                      {/* Precio Unitario */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatMoneda(m.precioUnitario)}
                      </td>

                      {/* Valor Neto (precio unitario * unidades) */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {formatMoneda(m.valorNeto)}
                      </td>

                      {/* Total con IVA (13%) */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {formatMoneda(m.totalConIva)}
                      </td>

                      {/* OC Ref */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {m.ocRef ? (
                          m.ocRef.startsWith('http') ? (
                            <a
                              href={m.ocRef}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded-md whitespace-nowrap"
                            >
                              <LinkIcon size={11} /> Ver OC
                            </a>
                          ) : (
                            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
                              {m.ocRef}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300 text-[11px]">---</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <Badge estado={m.estado} roleTheme={theme} />
                      </td>

                      {/* Resultado (Ganada / Cotizada / Pendiente) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {(() => {
                          const res = evaluarEstadoGanada(m);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${res.badgeClase}`}>
                              {res.esGanada && <CheckCircle2 size={11} className="shrink-0" />}
                              <span>{res.label}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Acción */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => irADetalle(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Abrir <ExternalLink size={11} />
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
              Página {safeCurrentPage} de {totalPages} ({movimientosFiltrados.length} movimientos)
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