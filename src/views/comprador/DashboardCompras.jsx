import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, X, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Badge } from '../../components/Badge';
import CotizacionDocumento from '../../components/CotizacionDocumento';
import { usePersistedState } from '../../hooks/usePersistedState';
import { normalizarBusqueda } from '../../utils/normalizers';

export const DashboardCompras = ({ solicitudes, readOnly = false }) => {
  const navigate = useNavigate();
  const [solicitudVista, setSolicitudVista] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados de filtros (persistidos en localStorage)
  const [filterAccion, setFilterAccion] = usePersistedState('dc_filterAccion', '');
  const [filterEstado, setFilterEstado] = usePersistedState('dc_filterEstado', '');
  const [filterVendedor, setFilterVendedor] = usePersistedState('dc_filterVendedor', '');
  const [searchTerm, setSearchTerm] = usePersistedState('dc_searchTerm', '');

  // Estados de Rango de Fecha Personalizado
  const [fechaInicio, setFechaInicio] = useState(null); // Date object
  const [fechaFin, setFechaFin] = useState(null);       // Date object
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesActual, setMesActual] = useState(new Date()); // Para navegar en el calendario
  const refCalendario = useRef(null);

  // Cerrar calendario al hacer clic fuera
  useEffect(() => {
    const clickFuera = (e) => {
      if (refCalendario.current && !refCalendario.current.contains(e.target)) {
        setMostrarCalendario(false);
      }
    };
    document.addEventListener('mousedown', clickFuera);
    return () => document.removeEventListener('mousedown', clickFuera);
  }, []);

  const formatFechaHora = (value) => {
    if (!value) return '---';
    let dateValue = null;
    if (typeof value.toDate === 'function') {
      dateValue = value.toDate();
    } else if (typeof value.seconds === 'number') {
      dateValue = new Date(value.seconds * 1000);
    } else if (value instanceof Date) {
      dateValue = value;
    } else {
      const ms = Date.parse(value);
      if (!isNaN(ms)) dateValue = new Date(ms);
    }

    if (!dateValue) return '---';
    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
      timeZone: 'America/El_Salvador'
    }).format(dateValue);
  };

  const formatMoneda = (valor) =>
    `$${Number(valor || 0).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const abrirVistaCotizacion = (solicitud) => setSolicitudVista(solicitud);
  const cerrarVistaCotizacion = () => setSolicitudVista(null);

  const obtenerEstadoAccion = (solicitud) => {
    const estado = solicitud.estado;
    const tienePendientes = solicitud.productos?.some((p) =>
      Number(p.fob || 0) <= 0 && !p.enConsulta && p.estadoItem !== 'En consulta'
    );
    
    if (estado === 'Pedido') {
      return tienePendientes ? 'Cotizar Restante' : 'Ver Cotización';
    }
    if (estado === 'Cotizado Parcial') {
      return tienePendientes ? 'Cotizar Restante' : 'Ver Cotización';
    }
    if (estado === 'Cotizado') return 'Ver Cotización';
    return 'Cotizar';
  };

  const obtenerColorAccion = (solicitud) => {
    const estado = solicitud.estado;
    const tienePendientes = solicitud.productos?.some((p) =>
      Number(p.fob || 0) <= 0 && !p.enConsulta && p.estadoItem !== 'En consulta'
    );
    
    if ((estado === 'Pedido' || estado === 'Cotizado Parcial') && tienePendientes) {
      return 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700';
    }
    if (estado === 'Cotizado' || estado === 'Cotizado Parcial' || estado === 'Pedido') {
      return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
    }
    return 'bg-white border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white';
  };

  const calcularItemsCotizados = (solicitud) => solicitud.productos?.filter((p) => Number(p.fob) > 0) || [];

  const formatearTotal = (solicitud, mod) => {
    const itemsConPrecio = calcularItemsCotizados(solicitud);
    const total = itemsConPrecio.reduce((acc, p) => {
      const factor = mod === 'A' ? (solicitud.factorA || 1) : (solicitud.factorM || 1.08);
      const margen = mod === 'A' ? (p.fva || 1.3) : (p.fvm || 1.25);
      return acc + (Number(p.fob || 0) * factor * margen * Number(p.cant || 0));
    }, 0);
    return formatMoneda(total);
  };

  // Obtener listas únicas de vendedores y estados para los filtros selectores
  const vendedoresDisponibles = Array.from(new Set(solicitudes.map(s => s.vendedorNombre).filter(Boolean)));
  const estadosDisponibles = Array.from(new Set(solicitudes.map(s => s.estado).filter(Boolean)));

  // Aplicar filtros
  const filteredSolicitudes = solicitudes.filter((s) => {
    if (filterAccion) {
      const accionReal = obtenerEstadoAccion(s.estado);
      if (accionReal !== filterAccion) return false;
    }
    if (filterEstado && s.estado !== filterEstado) return false;
    if (filterVendedor && s.vendedorNombre !== filterVendedor) return false;
    
    if (s.fechaS) {
      const fechaSDate = s.fechaS.toDate ? s.fechaS.toDate() : new Date(s.fechaS);
      // Normalizar horas a las 00:00:00 para comparar solo fechas locales
      const dComp = new Date(fechaSDate.getFullYear(), fechaSDate.getMonth(), fechaSDate.getDate());
      
      if (fechaInicio) {
        const dIni = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
        if (dComp < dIni) return false;
      }
      if (fechaFin) {
        const dFin = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
        if (dComp > dFin) return false;
      }
    } else if (fechaInicio || fechaFin) {
      return false;
    }

    if (searchTerm) {
      const termNormalized = normalizarBusqueda(searchTerm);
      if (termNormalized) {
        const matchCorrelativo = normalizarBusqueda(s.correlativo).includes(termNormalized);
        const matchCliente = normalizarBusqueda(s.cliente).includes(termNormalized);
        const matchProducto = s.productos?.some(p => 
          normalizarBusqueda(p.desc).includes(termNormalized) || 
          normalizarBusqueda(p.marca).includes(termNormalized)
        );
        if (!matchCorrelativo && !matchCliente && !matchProducto) return false;
      }
    }
    return true;
  });

  // Ordenar de más reciente a más antigua
  const sortedSolicitudes = [...filteredSolicitudes].sort((a, b) => {
    const getMs = (val) => {
      if (!val) return 0;
      if (typeof val === 'object') {
        if (typeof val.toDate === 'function') {
          try { return val.toDate().getTime(); } catch { return 0; }
        }
        if (typeof val.seconds === 'number') {
          return val.seconds * 1000;
        }
      }
      const ms = Date.parse(val);
      return isNaN(ms) ? 0 : ms;
    };
    return getMs(b.fechaS) - getMs(a.fechaS);
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedSolicitudes.length / itemsPerPage);
  const paginatedSolicitudes = sortedSolicitudes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const imprimirVistaCotizacion = () => {
    if (!solicitudVista) return;

    const printContent = document.getElementById('cotizacion-print-area').innerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.write('<html><head><title>Cotizacion_' + (solicitudVista?.correlativo || 'Documento') + '</title>');
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleNode) => {
      doc.write(styleNode.outerHTML);
    });
    doc.write('</head><body class="bg-white p-8">');
    doc.write(printContent);
    doc.write('</body></html>');
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  // Lógica del Calendario
  const handleSelectDia = (diaDate) => {
    setCurrentPage(1);
    if (!fechaInicio || (fechaInicio && fechaFin)) {
      setFechaInicio(diaDate);
      setFechaFin(null);
    } else if (fechaInicio && !fechaFin) {
      if (diaDate < fechaInicio) {
        setFechaInicio(diaDate);
      } else {
        setFechaFin(diaDate);
        setMostrarCalendario(false); // Autocerrar al completar rango
      }
    }
  };

  const clearRangoFechas = () => {
    setFechaInicio(null);
    setFechaFin(null);
    setCurrentPage(1);
  };

  const getDiasDelMes = () => {
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    const primerDiaSemana = new Date(año, mes, 1).getDay();
    const totalDias = new Date(año, mes + 1, 0).getDate();
    
    const dias = [];
    // Espacios vacíos al inicio de la semana
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }
    for (let i = 1; i <= totalDias; i++) {
      dias.push(new Date(año, mes, i));
    }
    return dias;
  };

  const cambiarMes = (offset) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + offset, 1));
  };

  const formattedRangoText = () => {
    if (!fechaInicio) return 'Elegir Rango / Día';
    const opt = { day: '2-digit', month: 'short' };
    const iniStr = fechaInicio.toLocaleDateString('es-ES', opt);
    if (!fechaFin) return iniStr; // Día único
    return `${iniStr} - ${fechaFin.toLocaleDateString('es-ES', opt)}`;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">Panel de Compras</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gestión de cotizaciones y logística</p>
        </div>
      </div>

      {/* Controles de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Buscar (Ref / Cliente)</label>
          <input 
            type="text" 
            placeholder="Escribe para buscar..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700"
          />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Acción</label>
          <select 
            value={filterAccion} 
            onChange={(e) => { setFilterAccion(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700 cursor-pointer"
          >
            <option value="">TODAS LAS ACCIONES</option>
            <option value="Cotizar">COTIZAR</option>
            <option value="Cotizado">COTIZADO</option>
            <option value="Cotizado Parcial">COTIZADO PARCIAL</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Estado</label>
          <select 
            value={filterEstado} 
            onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700 cursor-pointer"
          >
            <option value="">TODOS LOS ESTADOS</option>
            {estadosDisponibles.map(est => (
              <option key={est} value={est}>{est.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Vendedor</label>
          <select 
            value={filterVendedor} 
            onChange={(e) => { setFilterVendedor(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700 cursor-pointer"
          >
            <option value="">TODOS LOS VENDEDORES</option>
            {vendedoresDisponibles.map(vend => (
              <option key={vend} value={vend}>{vend.toUpperCase()}</option>
            ))}
          </select>
        </div>
        
        {/* Rango de Fecha Calendario Popover */}
        <div className="relative" ref={refCalendario}>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Fecha</label>
          <div className="flex items-center gap-1 bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold cursor-pointer text-slate-700" onClick={() => setMostrarCalendario(!mostrarCalendario)}>
            <CalendarIcon size={14} className="text-slate-400 shrink-0" />
            <span className="truncate flex-1 select-none">{formattedRangoText()}</span>
            {(fechaInicio || fechaFin) && (
              <button onClick={(e) => { e.stopPropagation(); clearRangoFechas(); }} className="hover:text-red-500 font-bold p-0.5">&times;</button>
            )}
          </div>

          {mostrarCalendario && (
            <div className="absolute right-0 mt-2 z-30 bg-white border border-slate-200 shadow-2xl rounded-3xl p-5 w-72 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={() => cambiarMes(-1)} className="hover:bg-slate-100 p-1.5 rounded-lg font-black text-slate-600">&lt;</button>
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  {mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" onClick={() => cambiarMes(1)} className="hover:bg-slate-100 p-1.5 rounded-lg font-black text-slate-600">&gt;</button>
              </div>

              {/* Días de la Semana */}
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 mb-2">
                <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
              </div>

              {/* Cuadrícula de días */}
              <div className="grid grid-cols-7 gap-1">
                {getDiasDelMes().map((dia, idx) => {
                  if (!dia) return <div key={`empty-${idx}`} />;
                  
                  // Comparaciones
                  const timestampDia = dia.getTime();
                  const isInicio = fechaInicio && timestampDia === fechaInicio.getTime();
                  const isFin = fechaFin && timestampDia === fechaFin.getTime();
                  const isRango = fechaInicio && fechaFin && timestampDia > fechaInicio.getTime() && timestampDia < fechaFin.getTime();
                  
                  let bgClass = 'hover:bg-slate-100 text-slate-700';
                  if (isInicio || isFin) bgClass = 'bg-slate-900 text-white rounded-full font-black';
                  if (isRango) bgClass = 'bg-slate-100 text-slate-900 rounded-none';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDia(dia)}
                      className={`text-center py-1 text-[11px] font-bold rounded-full transition-all ${bgClass}`}
                    >
                      {dia.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-end w-fit pb-1">
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterAccion('');
              setFilterEstado('');
              setFilterVendedor('');
              setFechaInicio(null);
              setFechaFin(null);
              setCurrentPage(1);
            }}
            title="Limpiar filtros"
            className="flex items-center justify-center bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl w-10 h-10 border border-slate-100 transition-all cursor-pointer shadow-sm"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="tf-surface-panel overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="tf-table-head-dark text-[10px] uppercase font-black tracking-widest">
              <th className="p-4">Referencia / Cliente</th>
              <th className="p-4">Vendedor</th>
              <th className="p-4">Fechas (Solicitud / Respuesta)</th>
              <th className="p-4 text-center">Total Cotizado (A / M)</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedSolicitudes.map((s) => {
              const itemsConPrecio = calcularItemsCotizados(s);
              const tienePendientesPorCotizar = s.productos?.some((p) =>
                Number(p.fob || 0) <= 0 && !p.enConsulta && p.estadoItem !== 'En consulta'
              );
              const totalA = formatearTotal(s, 'A');
              const totalM = formatearTotal(s, 'M');

              const fechaResp = s.fechaCotizacion || s.fechaRespuesta;

              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="block font-black text-slate-800 text-lg leading-none">{s.correlativo}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase italic">{s.cliente}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700 uppercase">{s.vendedorNombre}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{s.vendedorEmail}</span>
                    </div>
                  </td>
                  <td className="p-4 text-[11px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-bold uppercase text-[9px]">📥 Solicitud: <b className="text-slate-700 font-black">{formatFechaHora(s.fechaS || s.fechaCreacion)}</b></span>
                      <span className="text-emerald-600 font-black italic text-[9px] uppercase">
                        📤 Resp: {fechaResp ? formatFechaHora(fechaResp) : 'En espera'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      {itemsConPrecio.length > 0 ? (
                        <>
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">A: {totalA}</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">M: {totalM}</span>
                          {s.estado === 'Cotizado Parcial' && (
                            <span className="text-[9px] font-black text-blue-600 uppercase italic tracking-widest">Parcial</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Sin cotizar</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Badge estado={s.estado} />
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {s.estado === 'Cotizado' || s.estado === 'Pedido' || (
                        (s.estado === 'Cotizado Parcial' || s.estado === 'Pedido Parcial') && !tienePendientesPorCotizar
                      ) ? (
                        <>
                          <button
                            onClick={() => abrirVistaCotizacion(s)}
                            title="Ver / Imprimir PDF de Cotización"
                            className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all uppercase"
                          >
                            {readOnly ? 'Ver Cotización' : (s.estado === 'Cotizado Parcial' ? 'Cotizado' : 'PDF')}
                          </button>
                          {!readOnly && (
                            <button
                              onClick={() => navigate(`/calculadora/${s.id}?readOnly=true`)}
                              title="Ver desglose completo en la calculadora (Solo lectura)"
                              className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all uppercase shadow-sm"
                            >
                              Ver Detalle
                            </button>
                          )}
                        </>
                      ) : (s.estado === 'Cotizado Parcial' || s.estado === 'Pedido Parcial') ? (
                        <>
                          <button
                            onClick={() => abrirVistaCotizacion(s)}
                            title="Ver / Imprimir PDF de Avance Parcial"
                            className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all uppercase"
                          >
                            {readOnly ? 'Ver Cotización' : 'PDF'}
                          </button>
                          {!readOnly && (
                            <button
                              onClick={() => navigate(`/calculadora/${s.id}`)}
                              title="Continuar cotizando los ítems restantes"
                              className="px-4 py-1.5 rounded-xl text-[10px] font-black bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 transition-all uppercase shadow-sm"
                            >
                              Cotizar Restante
                            </button>
                          )}
                        </>
                      ) : (
                        <button 
                          onClick={() => {
                            if (!readOnly) {
                              navigate(`/calculadora/${s.id}`);
                            }
                          }}
                          disabled={readOnly}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border uppercase ${
                            readOnly
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : obtenerColorAccion(s)
                          }`}
                        >
                          {readOnly ? 'En proceso' : obtenerEstadoAccion(s)}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 px-6 py-4 bg-slate-900 rounded-3xl text-white">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            Anterior
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Página {currentPage} de {totalPages} ({sortedSolicitudes.length} solicitudes)
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            Siguiente
          </button>
        </div>
      )}

      {solicitudVista && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-4xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-8 py-5 flex items-center justify-between text-white">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Oficial</p>
                <h3 className="text-lg font-black tracking-tight uppercase">Vista previa de cotización</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={imprimirVistaCotizacion}
                  className="bg-violet-500 hover:bg-violet-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Printer size={14} /> Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={cerrarVistaCotizacion}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-full transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
              <div id="cotizacion-print-area" className="bg-white shadow-sm rounded-3xl p-1">
                <CotizacionDocumento cotizacionData={solicitudVista} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
