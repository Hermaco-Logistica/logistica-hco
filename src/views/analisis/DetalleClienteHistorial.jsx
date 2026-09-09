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
  CheckCircle2
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { normalizarBusqueda } from '../../utils/normalizers';
import { getRoleTheme, evaluarEstadoGanada } from './theme';
import { useSessionState } from '../../hooks/usePersistedState';

export const DetalleClienteHistorial = ({ role, solicitudes = [], ordenesCompra = [] }) => {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const theme = useMemo(() => getRoleTheme(role), [role]);

  const [searchTerm, setSearchTerm] = useSessionState('analisis_cli_hist_search', '');
  const [filterEstado, setFilterEstado] = useSessionState('analisis_cli_hist_estado', '');
  const [filterModalidad, setFilterModalidad] = useSessionState('analisis_cli_hist_modalidad', '');
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

  // Decodificar el identificador de cliente de la URL
  const decodedSearch = useMemo(() => {
    try {
      return decodeURIComponent(clienteId || '').trim();
    } catch {
      return (clienteId || '').trim();
    }
  }, [clienteId]);

  const targetKey = useMemo(() => {
    return normalizarBusqueda(decodedSearch);
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

  const truncarTexto = (val, max = 25) => {
    const str = (val ?? '').toString();
    return str.length > max ? `${str.slice(0, max)}…` : str;
  };

  // Extraer todos los movimientos de productos correspondientes a este cliente
  const { movimientos, infoCliente } = useMemo(() => {
    const list = [];
    let nombreOficial = decodedSearch;
    const rfqsSet = new Set();
    const vendedoresSet = new Set();
    const IVA_TASA = 0.13;

    solicitudes.forEach((s) => {
      const clienteNombre = (s.cliente || 'Consumidor Final').trim();
      const normCliente = normalizarBusqueda(clienteNombre);

      // Coincidencia exacta o normalizada
      if (normCliente === targetKey || (targetKey && normCliente.includes(targetKey))) {
        if (clienteNombre && (!nombreOficial || clienteNombre.length > nombreOficial.length)) {
          nombreOficial = clienteNombre;
        }

        if (s.correlativo) rfqsSet.add(s.correlativo);
        if (s.vendedorNombre) vendedoresSet.add(s.vendedorNombre.trim());

        const productosLista = Array.isArray(s.productos) && s.productos.length > 0 
          ? s.productos 
          : [{ desc: 'Sin productos detallados', cant: 1 }];

        productosLista.forEach((p, idx) => {
          const descProducto = (p.desc || p.descripcion || 'Sin descripción').trim().toUpperCase();
          const marcaProducto = (p.marca || '').trim();

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

          // Estado del ítem o de la solicitud
          const estadoItem = p.estadoItem || s.estado || 'Pendiente';

          // Fechas diferenciadas:
          // 1. Fecha Solicitud
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
            producto: descProducto,
            marca: marcaProducto,
            cliente: clienteNombre,
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
        });
      }
    });

    // Ordenar de más reciente a más antigua
    list.sort((a, b) => {
      const dateA = parseDate(a.fechaPrincipal)?.getTime() || 0;
      const dateB = parseDate(b.fechaPrincipal)?.getTime() || 0;
      return dateB - dateA;
    });

    return {
      movimientos: list,
      infoCliente: {
        nombre: nombreOficial || decodedSearch,
        totalRfqs: rfqsSet.size,
        vendedores: Array.from(vendedoresSet).join(', ') || 'Sin vendedor asignado'
      }
    };
  }, [solicitudes, targetKey, decodedSearch, mapFechasOC]);

  // Filtrado de la tabla según filtros y búsqueda
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filterEstado && m.estado !== filterEstado) return false;
      if (filterModalidad && m.modalidad !== filterModalidad) return false;

      if (searchTerm.trim()) {
        const term = normalizarBusqueda(searchTerm);
        const matchCorrelativo = normalizarBusqueda(m.correlativo).includes(term);
        const matchProducto = normalizarBusqueda(m.producto).includes(term);
        const matchMarca = normalizarBusqueda(m.marca).includes(term);
        const matchVendedor = normalizarBusqueda(m.vendedor).includes(term);
        const matchOC = normalizarBusqueda(m.ocRef).includes(term);
        if (!matchCorrelativo && !matchProducto && !matchMarca && !matchVendedor && !matchOC) return false;
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
    const productosSet = new Set();
    const rfqsSet = new Set();

    movimientosFiltrados.forEach((m) => {
      unidadesTotales += Number(m.unidades || 0);
      sumaValorNeto += Number(m.valorNeto || 0);
      sumaTotalConIva += Number(m.totalConIva || 0);
      if (m.producto) productosSet.add(normalizarBusqueda(m.producto));
      if (m.correlativo) rfqsSet.add(m.correlativo);
      if (m.estado === 'Pedido' || m.estado === 'Comprado') {
        pedidosCount++;
        unidadesEnPedido += Number(m.unidades || 0);
      } else if (m.estado === 'Pedido Parcial') {
        parcialesCount++;
      }
    });

    const tasaConversion = totalMovimientos > 0 
      ? ((pedidosCount / totalMovimientos) * 100).toFixed(1)
      : 0;

    return {
      totalMovimientos,
      totalHistorico: movimientos.length,
      estaFiltrado: movimientosFiltrados.length !== movimientos.length,
      rfqsUnicas: rfqsSet.size,
      unidadesTotales,
      unidadesEnPedido,
      pedidosCount,
      parcialesCount,
      sumaValorNeto,
      sumaTotalConIva,
      productosUnicos: productosSet.size,
      tasaConversion
    };
  }, [movimientosFiltrados, movimientos.length]);

  const totalPages = Math.max(1, Math.ceil(movimientosFiltrados.length / itemsPerPage));
  const paginatedMovimientos = movimientosFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            onClick={() => navigate('/analisis/clientes')}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200/80 transition-colors shadow-xs cursor-pointer shrink-0 mt-1 sm:mt-0"
            title="Volver a Directorio de Clientes"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold tracking-wider px-2.5 py-0.5 rounded-full ${theme.bgBadge}`}>
                Historial de Cliente
              </span>
              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Building size={11} className="text-slate-400" />
                {infoCliente.totalRfqs} {infoCliente.totalRfqs === 1 ? 'RFQ' : 'RFQs'} registradas
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 max-w-3xl line-clamp-2">
              {infoCliente.nombre}
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Trazabilidad de productos cotizados en solicitudes RFQ y órdenes de compra
            </p>
          </div>
        </div>
      </div>

      {/* TARJETAS RESUMEN DEL CLIENTE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Productos Únicos</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center shrink-0">
              <Package size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metricas.productosUnicos}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
              {metricas.totalMovimientos} cotizaciones en {metricas.rfqsUnicas} {metricas.rfqsUnicas === 1 ? 'RFQ' : 'RFQs'}
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
            <span className="text-[10px] font-bold uppercase tracking-wider">Efectividad / Pedidos</span>
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
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por RFQ, producto, marca, vendedor u OC..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:border-slate-400 transition-colors"
          />
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
        </div>
      </div>

      {/* TABLA DE PRODUCTOS HISTÓRICOS DEL CLIENTE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {paginatedMovimientos.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-medium">
            No se registraron productos o movimientos con los filtros seleccionados.
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
                  <th className="py-2.5 px-3 whitespace-nowrap">Producto</th>
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
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200/80 inline-block whitespace-nowrap">
                          {m.correlativo}
                        </span>
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

                      {/* Producto */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Package size={12} className="text-slate-400 shrink-0" />
                          <button
                            type="button"
                            onClick={() => navigate(`/analisis/producto/${encodeURIComponent(m.producto)}`)}
                            className="font-semibold text-slate-800 hover:text-blue-600 transition-colors text-left truncate max-w-[220px] cursor-pointer uppercase text-xs"
                            title={`Ver historial de este producto: ${m.producto}`}
                          >
                            {truncarTexto(m.producto, 28)}
                          </button>
                          {m.marca && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0">
                              {m.marca}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vendedor */}
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
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-medium text-xs rounded-lg transition-all cursor-pointer"
            >
              Anterior
            </button>
            <span className="text-[11px] font-medium text-slate-400">
              Página {currentPage} de {totalPages} ({movimientosFiltrados.length} productos)
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
