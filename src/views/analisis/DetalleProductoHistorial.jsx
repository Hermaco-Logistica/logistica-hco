import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  X,
  ChevronDown
} from 'lucide-react';
import { exportarMovimientosExcel } from '../../utils/exportarExcel';
import { Badge } from '../../components/Badge';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme, evaluarEstadoGanada } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';

const MovimientoCard = ({ m, theme, formatFecha, formatMoneda, evaluarEstadoGanada, irADetalle }) => {
  const [expanded, setExpanded] = useState(false);
  const esAereo = m.modalidad === 'Aéreo';
  const esMaritimo = m.modalidad === 'Marítimo';
  const res = evaluarEstadoGanada(m);

  return (
    <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 group">
      
      {/* Marca de agua de fondo con el RFQ (Usando paleta de rol) */}
      <div className={`absolute right-0 bottom-0 pointer-events-none z-0 translate-x-[15%] translate-y-[20%] overflow-hidden opacity-[0.03] ${theme.textAccent}`}>
        <span className="font-black text-[90px] tracking-tighter leading-none select-none">
          {m.correlativo.slice(-3)}
        </span>
      </div>

      {/* HEADER COMPACTO */}
      <button 
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="relative z-10 w-full p-4 flex flex-col gap-2.5 text-left cursor-pointer focus:outline-none hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex justify-between items-start w-full gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm border ${res.badgeClase}`}>
                {res.label}
              </span>
              <span className="text-slate-300 text-[9px]">•</span>
              <span className="text-slate-500 font-mono font-medium text-[10px] uppercase">{m.correlativo}</span>
              {res.esParcial && (
                <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Parcial</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 text-sm truncate">{m.cliente}</span>
              {esAereo && <Plane size={12} className="text-slate-400 shrink-0" />}
              {esMaritimo && <Ship size={12} className="text-slate-400 shrink-0" />}
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">Vend: {m.vendedor}</p>
          </div>

          {/* Bloque de valores financieros a la derecha */}
          <div className="flex flex-col items-end shrink-0 pl-2 justify-center">
            <span className="text-[10px] text-slate-500 font-mono mb-0.5 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60">{m.unidades.toLocaleString()} u.</span>
            <span className="font-mono font-bold text-slate-900 text-[13px] mt-1">{formatMoneda(m.valorNeto)}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center w-full pt-2 border-t border-slate-100 mt-1">
           <span className="text-[10px] text-slate-400 font-medium">{formatFecha(m.fechaSol)}</span>
           <ChevronDown 
            size={14} 
            className={`text-slate-400 shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* CONTENIDO EXPANDIDO */}
      <div 
        className={`relative z-10 grid transition-[grid-template-rows] duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4 space-y-2 pt-2 border-t border-slate-100/60 bg-white/40 backdrop-blur-sm">
            {/* Filas estilo wallet/pases */}
            <div className="space-y-0 text-[11px]">
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500">RFQ</span>
                <span className="font-mono text-slate-700">{m.correlativo}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500">Fecha Sol.</span>
                <span className="font-mono text-slate-700">{formatFecha(m.fechaSol)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500">Fecha Resp.</span>
                <span className="font-mono text-slate-700">{m.fechaResp ? formatFecha(m.fechaResp) : 'Pendiente'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500">Fecha OC</span>
                <span className="font-mono text-slate-700">{m.fechaOC ? formatFecha(m.fechaOC) : '---'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500">Modalidad</span>
                <span className="font-medium text-slate-700">{m.modalidad}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500">Marca</span>
                <span className="font-medium text-slate-700 truncate max-w-35 text-right" title={m.marca || 'N/D'}>{m.marca || 'N/D'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500">Unidades</span>
                <span className="font-mono font-semibold text-slate-700">{m.unidades.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500">Precio Unit.</span>
                <span className="font-mono text-slate-700">{formatMoneda(m.precioUnitario)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500 font-semibold">Valor Neto</span>
                <span className="font-mono font-bold text-slate-900">{formatMoneda(m.valorNeto)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60">
                <span className="text-slate-500">Total (IVA)</span>
                <span className="font-mono text-slate-500">{formatMoneda(m.totalConIva)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100/60 items-center">
                <span className="text-slate-500">Estado / Sistema</span>
                <Badge estado={m.estado} roleTheme={theme} className="scale-90 origin-right" />
              </div>
              {m.ocRef && (
                <div className="flex justify-between py-1.5 border-b border-slate-100/60 items-center">
                  <span className="text-slate-500">OC Ref</span>
                  {m.ocRef.startsWith('http') ? (
                    <a href={m.ocRef} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline flex items-center gap-1">
                      <LinkIcon size={10} /> Link
                    </a>
                  ) : (
                    <span className="font-mono text-slate-700">{m.ocRef}</span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors px-1 py-1 cursor-pointer"
              >
                Cerrar detalle
              </button>
              <button
                type="button"
                onClick={() => irADetalle(m)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
              >
                Ver RFQ <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DetalleProductoHistorial = ({ role, solicitudes = [], ordenesCompra = [] }) => {
  const params = useParams();
  const productId = params.productId || params['*'] || '';
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);

  // Hacer scroll automático hacia arriba al cargar la vista
  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, []);

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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm ${theme.bgBadge}`}>
                Historial de Producto
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-2.5 truncate uppercase">
                  {infoProducto.nombre}
                </h1>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Package size={13} className="text-slate-400" />
                    Marca: <strong className="text-slate-700 uppercase">{infoProducto.marca !== 'Sin marca especificada' ? infoProducto.marca : 'N/D'}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETAS RESUMEN DEL PRODUCTO */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <Package size={14} className="text-slate-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Veces Cotizado</span>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-slate-800 tracking-tight">
              {metricas.totalMovimientos}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 truncate">
              En diferentes RFQs
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <Package size={14} className="text-slate-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Unid. Solicitadas</span>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-slate-800 tracking-tight">
              {metricas.unidadesTotales.toLocaleString()}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-emerald-600 mt-0.5 truncate">
              {metricas.unidadesEnPedido.toLocaleString()} en pedido
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <DollarSign size={14} className="text-slate-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Valor Neto Total</span>
          </div>
          <div>
            <div className="text-base sm:text-xl font-bold font-mono text-slate-800 tracking-tight truncate" title={formatMoneda(metricas.sumaValorNeto)}>
              {formatMoneda(metricas.sumaValorNeto)}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 truncate">
              {metricas.estaFiltrado ? `${metricas.totalMovimientos} de ${metricas.totalHistorico} filt.` : 'Total sin IVA'}
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <DollarSign size={14} className="text-slate-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Total (IVA 13%)</span>
          </div>
          <div>
            <div className="text-base sm:text-xl font-bold font-mono text-emerald-600 tracking-tight truncate" title={formatMoneda(metricas.sumaTotalConIva)}>
              {formatMoneda(metricas.sumaTotalConIva)}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 truncate">
              {metricas.estaFiltrado ? 'Impuestos (filt.)' : 'Impuestos incluidos'}
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <TrendingUp size={14} className="text-slate-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Efectividad</span>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-slate-800 tracking-tight flex items-baseline gap-1">
              {metricas.tasaConversion}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400">%</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 truncate">
              {metricas.pedidosCount} gan. {metricas.parcialesCount > 0 && <span className="text-amber-600 font-semibold">(+{metricas.parcialesCount} pc.)</span>} / {metricas.totalMovimientos} cots.
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row gap-2 sm:gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por RFQ, cliente..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-lg text-xs text-slate-700 outline-none focus:border-slate-300 focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2">
            {vendedorFilter && (
              <div className="flex-1 sm:flex-none inline-flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200/70 rounded-lg text-xs shadow-sm">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <User size={12} className="text-slate-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">Vend:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[100px]">{vendedorFilter}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setVendedorFilter(''); setCurrentPage(1); }}
                  className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            )}
            {clienteFilter && (
              <div className="flex-1 sm:flex-none inline-flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200/70 rounded-lg text-xs shadow-sm">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Building size={12} className="text-slate-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">Cli:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[100px]">{clienteFilter}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setClienteFilter(''); setCurrentPage(1); }}
                  className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            {/* Filtro estado */}
            <select
              value={filterEstado}
              onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200/70 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-300 focus:bg-white cursor-pointer"
            >
              <option value="">Estados (Todos)</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Cotizado">Cotizado</option>
              <option value="Cotizado Parcial">Cot. Parcial</option>
              <option value="Pedido">Pedido</option>
              <option value="Pedido Parcial">Ped. Parcial</option>
              <option value="Comprado">Comprado</option>
            </select>

            {/* Filtro modalidad */}
            <select
              value={filterModalidad}
              onChange={(e) => { setFilterModalidad(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200/70 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-300 focus:bg-white cursor-pointer"
            >
              <option value="">Modalidad (Todas)</option>
              <option value="Aéreo">Aéreo</option>
              <option value="Marítimo">Marítimo</option>
              <option value="No asignada">No asignada</option>
            </select>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 mt-1 sm:mt-0">
            {(filterEstado || filterModalidad || searchTerm) && (
              <button
                type="button"
                onClick={() => { setFilterEstado(''); setFilterModalidad(''); setSearchTerm(''); }}
                className="text-xs font-medium text-slate-500 hover:text-rose-600 px-2 py-1 transition-colors"
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
              className="inline-flex justify-center items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 rounded-lg text-xs font-bold transition-all shadow-sm w-full sm:w-auto"
              title="Exportar historial del producto a Excel"
            >
              <Download size={13} />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLA DE MOVIMIENTOS HISTÓRICOS */}
      <div className="bg-transparent sm:bg-white sm:rounded-2xl sm:border sm:border-slate-200/80 sm:shadow-xs overflow-hidden flex flex-col">
        {paginatedMovimientos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 text-slate-400 text-xs font-medium mt-2">
            No se registraron movimientos con los filtros seleccionados.
          </div>
        ) : (
          <>
          {/* VISTA MÓVIL (Tarjetas Expansibles) */}
          <div className="md:hidden space-y-3 mt-2">
            {paginatedMovimientos.map((m) => (
              <MovimientoCard 
                key={m.idMov} 
                m={m} 
                theme={theme} 
                formatFecha={formatFecha} 
                formatMoneda={formatMoneda} 
                evaluarEstadoGanada={evaluarEstadoGanada} 
                irADetalle={irADetalle} 
              />
            ))}
          </div>

          {/* VISTA DESKTOP (Tabla) */}
          <div
            ref={scrollContainerRef}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            className="hidden md:block overflow-x-auto overflow-y-auto overscroll-contain cursor-grab active:cursor-grabbing select-none h-[52vh] min-h-[380px] max-h-[620px] sm:h-[56vh] lg:h-[60vh]"
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
          </>
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