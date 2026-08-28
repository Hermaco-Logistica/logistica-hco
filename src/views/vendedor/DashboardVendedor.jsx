import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { Calendar as CalendarIcon } from 'lucide-react';
import { usePersistedState } from '../../hooks/usePersistedState';

export const DashboardVendedor = ({ solicitudes, canCreate = true, title = 'Mis Solicitudes' }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  // Estados de filtros (persistidos en localStorage)
  const [filterAccion, setFilterAccion] = usePersistedState('dv_filterAccion', '');
  const [filterEstado, setFilterEstado] = usePersistedState('dv_filterEstado', '');
  const [filterVendedor, setFilterVendedor] = usePersistedState('dv_filterVendedor', '');
  const [searchTerm, setSearchTerm] = usePersistedState('dv_searchTerm', '');

  // Estados de Rango de Fecha Popover
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesActual, setMesActual] = useState(new Date());
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

  const formatFechaHora = (timestamp) => {
    if (!timestamp?.toDate) return '---';
    const dateValue = timestamp.toDate();
    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
      timeZone: 'America/El_Salvador'
    }).format(dateValue);
  };

  const obtenerEstadoAccion = (estado) => {
    if (estado === 'Cotizado Parcial') return 'Cotizado Parcial';
    if (estado === 'Cotizado') return 'Cotizado';
    return 'Cotizar';
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
      const term = searchTerm.toLowerCase();
      const matchCorrelativo = s.correlativo?.toLowerCase().includes(term);
      const matchCliente = s.cliente?.toLowerCase().includes(term);
      if (!matchCorrelativo && !matchCliente) return false;
    }
    return true;
  });

  // Ordenar de más reciente a más antigua
  const sortedSolicitudes = [...filteredSolicitudes].sort((a, b) => {
    const getMs = (val) => {
      if (!val) return 0;
      if (typeof val === 'object') {
        if (typeof val.toDate === 'function') {
          try { return val.toDate().getTime(); } catch(_) {}
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
        setMostrarCalendario(false);
      }
    }
  };

  const getDiasDelMes = () => {
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    const primerDiaSemana = new Date(año, mes, 1).getDay();
    const totalDias = new Date(año, mes + 1, 0).getDate();
    
    const dias = [];
    for (let i = 0; i < primerDiaSemana; i++) dias.push(null);
    for (let i = 1; i <= totalDias; i++) dias.push(new Date(año, mes, i));
    return dias;
  };

  const cambiarMes = (offset) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + offset, 1));
  };

  const formattedRangoText = () => {
    if (!fechaInicio) return 'Elegir Rango / Día';
    const opt = { day: '2-digit', month: 'short' };
    const iniStr = fechaInicio.toLocaleDateString('es-ES', opt);
    if (!fechaFin) return iniStr;
    return `${iniStr} - ${fechaFin.toLocaleDateString('es-ES', opt)}`;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">{title}</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Estado de RFQs enviadas</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => navigate('/vendedor/nueva')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
          >
            + Nueva RFQ
          </button>
        )}
      </div>

      {/* Controles de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
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
              <button onClick={(e) => { e.stopPropagation(); setFechaInicio(null); setFechaFin(null); setCurrentPage(1); }} className="hover:text-red-500 font-bold p-0.5">&times;</button>
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

              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 mb-2">
                <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDiasDelMes().map((dia, idx) => {
                  if (!dia) return <div key={`empty-${idx}`} />;
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
      </div>
      
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
              <th className="p-4">Referencia / Cliente</th>
              <th className="p-4">Fechas (Solicitud / Respuesta)</th>
              <th className="p-4 text-center">Resumen Oferta (A / M)</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">OC Ref</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedSolicitudes.map((s) => {
              const itemsConPrecio = s.productos?.filter(p => Number(p.fob) > 0) || [];
              
              const totalA = itemsConPrecio.reduce((acc, p) => 
                acc + (p.fob * (s.factorA || 1) * (p.fva || 1.3) * p.cant), 0);
              
              const totalM = itemsConPrecio.reduce((acc, p) => 
                acc + (p.fob * (s.factorM || 1.08) * (p.fvm || 1.25) * p.cant), 0);

              const ocRefs = [...new Set((s.productos || []).filter(p => p.numOC).map(p => p.numOC))];
              const ocRefText = ocRefs.length > 0 ? ocRefs.join(', ') : '-';

              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="block font-black text-slate-800 text-lg leading-none">{s.correlativo}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase italic">EXT: {s.cliente}</span>
                  </td>
                  <td className="p-4 text-[11px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-bold uppercase text-[9px]">📥 Solicitud: <b className="text-slate-700 font-black">{formatFechaHora(s.fechaS)}</b></span>
                      <span className="text-emerald-600 font-black italic text-[9px] uppercase">
                        📤 {s.estado.includes('Parcial') ? 'Avance Recibido: ' : 'Respondida: '}
                        {s.fechaCotizacion?.toDate ? formatFechaHora(s.fechaCotizacion) : 'En proceso'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      {totalA > 0 ? (
                        <>
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">A: ${totalA.toFixed(2)}</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">M: ${totalM.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">En costeo...</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Badge estado={s.estado} />
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full uppercase">{ocRefText}</span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => navigate(`/vendedor/detalle/${s.id}`)}
                      className="bg-white border-2 border-slate-100 hover:border-slate-900 text-slate-900 px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 px-6 py-4 bg-slate-900 rounded-[1.5rem] text-white">
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
    </div>
  );
};