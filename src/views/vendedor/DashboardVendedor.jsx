import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Etiqueta } from '../../components/Etiqueta';
import { 
  Calendar as CalendarIcon, Trash2, AlertTriangle, AlertOctagon, AlertCircle, Filter, 
  ChevronDown, ChevronUp, Clock, User, Plane, Ship, ChevronRight, Hash, Package,
  Inbox, Send, ArrowRight, MessageCircleQuestion
} from 'lucide-react';
import { MobileBadge } from '../../components/mobile';
import { useCotizacionesEstancadas } from '../../hooks/useCotizacionesEstancadas';
import { usePersistedState } from '../../hooks/usePersistedState';
import { auth } from '../../firebase';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { enviarEvento } from '../../emails';
import { clasificarSolicitud, etiquetaResultadoSolicitud, RESULTADOS_SOLICITUD } from '../../utils/clasificarSolicitud';
import { ModalConsultaVentaPerdida } from '../../components/vendedor/ModalConsultaVentaPerdida';
import { ModalConsultaDecisionItem } from '../../components/pedidos/negociacion/ModalConsultaDecisionItem';
import { prepararDatosConsultaVentaPerdida, tieneVentaPerdidaSolicitud } from '../../utils/ventasPerdidasHelpers';
import { tieneDecisionSolicitud, prepararDatosDecisionSolicitud } from '../../utils/decisionItemHelpers';
import { ModalBloqueoCotizaciones } from '../../components/vendedor/ModalBloqueoCotizaciones';
import {
  filtrarSolicitudesDashboard,
  formatFechaHora,
  formatearRangoFechas,
  obtenerDiasDelMes,
  ordenarSolicitudesPorFecha
} from './dashboard/utils/dashboardVendedorHelpers';

// Fecha de corte: documentos creados ANTES de este deploy no pueden garantizar
// el valor correcto de emailEnviado (pueden ser undefined o false por razones ajenas).
// Se tratan como "correo ya enviado" para no mostrar el ícono de advertencia.
// Actualizar esta fecha cada vez que se haga un nuevo deploy que cambie este flujo.
const FECHA_CORTE_EMAIL = new Date('2026-10-06T00:00:00-06:00');

export const DashboardVendedor = ({ solicitudes, canCreate = true, title = 'Mis Solicitudes', role }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const { cotizacionesEstancadas, tieneBloqueo } = useCotizacionesEstancadas({ solicitudes, role });

  // Estados de filtros (persistidos en localStorage)
  const [, setFilterAccion] = usePersistedState('dv_filterAccion', '');
  const [filterEstado, setFilterEstado] = usePersistedState('dv_filterEstado', '');
  const [filterResultado, setFilterResultado] = usePersistedState('dv_filterResultado', '');
  const [filterVendedor, setFilterVendedor] = usePersistedState('dv_filterVendedor', '');
  const [filterProrroga, setFilterProrroga] = usePersistedState('dv_filterProrroga', '');
  const [searchTerm, setSearchTerm] = usePersistedState('dv_searchTerm', '');
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);

  const [consultaVentaPerdidaData, setConsultaVentaPerdidaData] = useState(null);
  const [consultaDecisionData, setConsultaDecisionData] = useState(null);
  const [consultaAnimacionTick, setConsultaAnimacionTick] = useState(0);
  const [modalBloqueoOpen, setModalBloqueoOpen] = useState(false);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setConsultaAnimacionTick(prev => prev + 1);
    }, 5000);
    return () => window.clearInterval(intervalo);
  }, []);

  const abrirConsultaVentaPerdida = (solicitud) => {
    setConsultaVentaPerdidaData(prepararDatosConsultaVentaPerdida({ solicitud }));
  };

  const abrirConsultaDecision = (solicitud) => {
    setConsultaDecisionData(prepararDatosDecisionSolicitud(solicitud));
  };


  // Estados de Rango de Fecha Popover
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesActual, setMesActual] = useState(new Date());
  const refCalendario = useRef(null);
  const refCalendarioMobile = useRef(null);

  // Cerrar calendario al hacer clic fuera
  useEffect(() => {
    const clickFuera = (e) => {
      if (refCalendario.current && !refCalendario.current.contains(e.target) && !refCalendarioMobile.current?.contains(e.target)) {
        setMostrarCalendario(false);
      }
    };
    document.addEventListener('mousedown', clickFuera);
    return () => document.removeEventListener('mousedown', clickFuera);
  }, []);

  const [reenviandoId, setReenviandoId] = useState(null);
  const [reenviandoPedidoId, setReenviandoPedidoId] = useState(null);

  const handleReenviarCorreo = async (s) => {
    setReenviandoId(s.id);
    try {
      const { ok } = await enviarEvento('solicitud_creada', { solicitud: s });
      if (!ok) throw new Error('Fallo al enviar correo');
      await updateDoc(doc(db, 'solicitudes', s.id), { emailEnviado: true });
      alert('Correo reenviado exitosamente');
    } catch (e) {
      alert('No se pudo reenviar el correo. Intenta de nuevo.');
      console.error(e);
    } finally {
      setReenviandoId(null);
    }
  };

  const handleReenviarCorreoPedido = async (s) => {
    setReenviandoPedidoId(s.id);
    try {
      const vendedorEmail = auth.currentUser?.email || s.vendedorEmail || '';
      const pedido = {
        solicitudId: s.id,
        correlativoRFQ: s.correlativo,
        tipoSolicitud: s.tipo,
        cliente: s.cliente,
        vendedorNombre: auth.currentUser?.displayName || s.vendedorNombre || vendedorEmail.split('@')[0],
        vendedorEmail,
        esPedidoParcial: s.estado === 'Pedido Parcial',
        productos: s.productos || [],
        linkOC: s.linkOC || '',
        notasPedido: s.notasPedido || ''
      };
      const { ok } = await enviarEvento('pedido_confirmado', { pedido, solicitud: s });
      if (!ok) throw new Error('Fallo al enviar correo de pedido');
      await updateDoc(doc(db, 'solicitudes', s.id), { pedidoEmailEnviado: true });
      alert('Correo de pedido reenviado exitosamente');
    } catch (e) {
      alert('No se pudo reenviar el correo de pedido. Intenta de nuevo.');
      console.error(e);
    } finally {
      setReenviandoPedidoId(null);
    }
  };

  // Obtener listas únicas de vendedores y estados para los filtros selectores
  const vendedoresDisponibles = Array.from(new Set(solicitudes.map(s => s.vendedorNombre).filter(Boolean)));
  const estadosDisponibles = Array.from(new Set(solicitudes.map(s => s.estado).filter(Boolean)));
  const resultadosDisponibles = Object.values(RESULTADOS_SOLICITUD);
  const usuarioActualId = auth.currentUser?.uid || '';
  const usuarioActualEmail = (auth.currentUser?.email || '').toLowerCase();

  const filteredSolicitudes = filtrarSolicitudesDashboard({
    solicitudes,
    role,
    usuarioActualId,
    usuarioActualEmail,
    filterEstado,
    filterResultado,
    filterVendedor,
    filterProrroga,
    fechaInicio,
    fechaFin,
    searchTerm
  });
  const sortedSolicitudes = ordenarSolicitudesPorFecha(filteredSolicitudes);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(sortedSolicitudes.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedSolicitudes = sortedSolicitudes.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  // Lógica del calendario
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

  const cambiarMes = (offset) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + offset, 1));
  };

  const formattedRangoText = formatearRangoFechas(fechaInicio, fechaFin);

  const filtrosActivosCount = [
    filterEstado,
    filterResultado,
    filterVendedor,
    role === 'gerente' ? filterProrroga : '',
    (fechaInicio || fechaFin)
  ].filter(Boolean).length;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter italic">{title}</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Estado de RFQs enviadas</p>
        </div>
        {canCreate && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => navigate('/vendedor/nueva-rfq')}
              className="flex-1 sm:flex-none justify-center bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 sm:px-5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
            >
              + Nueva RFQ
            </button>
            <button 
              onClick={() => navigate('/vendedor/nuevo-pedido')}
              className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:px-5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
            >
              + Pedido Manual
            </button>
          </div>
        )}
      </div>

      {/* Banner único de bloqueo para solicitudes estancadas */}
      {tieneBloqueo && (
        <div className="mb-5 rounded-[10px] border border-[var(--detalle-border)] bg-[var(--detalle-surface)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="inline-flex w-8 h-8 items-center justify-center rounded-[6px] bg-[var(--detalle-bg-warning)] text-[var(--detalle-accent-warning)] shrink-0 mt-0.5">
              <AlertCircle size={16} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[var(--detalle-text)]">
                  Creación bloqueada
                </span>
                <Etiqueta tono="neutral" tamano="normal" mono className="bg-[var(--detalle-bg-warning)] text-[var(--detalle-accent-warning)]">
                  {cotizacionesEstancadas.length} estancada(s)
                </Etiqueta>
              </div>
              <p className="text-[12px] text-[var(--detalle-text-muted)] mt-0.5 leading-normal">
                Tienes cotizaciones o pedidos parciales con ítems fuera de su vigencia configurada pendientes de seguimiento. Debes atenderlos o cerrarlos para habilitar nuevas solicitudes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalBloqueoOpen(true)}
            style={{ backgroundColor: 'var(--tf-color-brand-strong)' }}
            className="shrink-0 w-full sm:w-auto inline-flex h-[32px] items-center justify-center gap-1.5 px-3 text-[12px] font-semibold text-white rounded-[6px] transition-opacity hover:opacity-90 cursor-pointer"
          >
            <span>Atender</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {modalBloqueoOpen && (
        <ModalBloqueoCotizaciones
          cotizaciones={cotizacionesEstancadas}
          onVolver={() => setModalBloqueoOpen(false)}
        />
      )}

      {/* BARRA DE FILTROS MÓVIL (visible en < md) */}
      <div className="md:hidden bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Buscar Ref o Cliente..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-slate-400 text-slate-700"
            />
          </div>
          <button
            type="button"
            onClick={() => setMostrarFiltrosMobile(!mostrarFiltrosMobile)}
            className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
              filtrosActivosCount > 0 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Filter size={14} />
            <span>Filtros{filtrosActivosCount > 0 ? ` (${filtrosActivosCount})` : ''}</span>
            {mostrarFiltrosMobile ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {(searchTerm || filtrosActivosCount > 0) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterEstado('');
                setFilterResultado('');
                setFilterVendedor('');
                setFilterProrroga('');
                setFechaInicio(null);
                setFechaFin(null);
                setCurrentPage(1);
              }}
              title="Limpiar filtros"
              className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {mostrarFiltrosMobile && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-200">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Resultado</label>
              <select value={filterResultado} onChange={(e) => { setFilterResultado(e.target.value); setCurrentPage(1); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 cursor-pointer">
                <option value="">TODOS LOS RESULTADOS</option>
                {resultadosDisponibles.map(resultado => <option key={resultado} value={resultado}>{etiquetaResultadoSolicitud(resultado).toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Estado</label>
              <select 
                value={filterEstado} 
                onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="">TODOS LOS ESTADOS</option>
                {estadosDisponibles.map(est => (
                  <option key={est} value={est}>{est.toUpperCase()}</option>
                ))}
              </select>
            </div>
            {role !== 'vendedor' && (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Vendedor</label>
                <select 
                  value={filterVendedor} 
                  onChange={(e) => { setFilterVendedor(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="">TODOS LOS VENDEDORES</option>
                  {vendedoresDisponibles.map(vend => (
                    <option key={vend} value={vend}>{vend.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}
            {role === 'gerente' && (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Prórroga</label>
                <select value={filterProrroga} onChange={(e) => { setFilterProrroga(e.target.value); setCurrentPage(1); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 cursor-pointer">
                  <option value="">TODAS LAS PRÓRROGAS</option>
                  <option value="propias">PRÓRROGAS PROPIAS</option>
                  <option value="otros">PRÓRROGAS DE OTROS</option>
                  <option value="sin">SIN PRÓRROGA</option>
                </select>
              </div>
            )}
            <div className="relative" ref={refCalendarioMobile}>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Fecha</label>
              <div 
                className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold cursor-pointer text-slate-700" 
                onClick={() => setMostrarCalendario(!mostrarCalendario)}
              >
                <CalendarIcon size={14} className="text-slate-400 shrink-0" />
                <span className="truncate flex-1 select-none">{formattedRangoText}</span>
                {(fechaInicio || fechaFin) && (
                  <button onClick={(e) => { e.stopPropagation(); setFechaInicio(null); setFechaFin(null); setCurrentPage(1); }} className="hover:text-red-500 font-bold p-0.5">&times;</button>
                )}
              </div>
              {mostrarCalendario && (
                <div className="absolute right-0 mt-2 z-40 bg-white border border-slate-200 shadow-2xl rounded-3xl p-5 w-72 animate-in fade-in slide-in-from-top-3 duration-200">
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
                    {obtenerDiasDelMes(mesActual).map((dia, idx) => {
                      if (!dia) return <div key={`empty-mobile-${idx}`} />;
                      const timestampDia = dia.getTime();
                      const isInicio = fechaInicio && timestampDia === fechaInicio.getTime();
                      const isFin = fechaFin && timestampDia === fechaFin.getTime();
                      const isRango = fechaInicio && fechaFin && timestampDia > fechaInicio.getTime() && timestampDia < fechaFin.getTime();
                      let bgClass = 'hover:bg-slate-100 text-slate-700';
                      if (isInicio || isFin) bgClass = 'bg-slate-900 text-white rounded-full font-black';
                      if (isRango) bgClass = 'bg-slate-100 text-slate-900 rounded-none';
                      return (
                        <button key={idx} type="button" onClick={() => handleSelectDia(dia)} className={`text-center py-1 text-[11px] font-bold rounded-full transition-all ${bgClass}`}>
                          {dia.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CONTROLES DE FILTROS DESKTOP (visible en >= md) */}
      <div className={`hidden md:grid grid-cols-1 sm:grid-cols-2 ${role === 'vendedor' ? 'md:grid-cols-5' : 'md:grid-cols-6'} gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm`}>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Resultado</label>
          <select value={filterResultado} onChange={(e) => { setFilterResultado(e.target.value); setCurrentPage(1); }} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700 cursor-pointer">
            <option value="">TODOS LOS RESULTADOS</option>
            {resultadosDisponibles.map(resultado => <option key={resultado} value={resultado}>{etiquetaResultadoSolicitud(resultado).toUpperCase()}</option>)}
          </select>
        </div>
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
        {role !== 'vendedor' && (
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
        )}
        {role === 'gerente' && (
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Prórroga</label>
            <select value={filterProrroga} onChange={(e) => { setFilterProrroga(e.target.value); setCurrentPage(1); }} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-slate-300 transition-all text-slate-700 cursor-pointer">
              <option value="">TODAS LAS PRÓRROGAS</option>
              <option value="propias">PRÓRROGAS PROPIAS</option>
              <option value="otros">PRÓRROGAS DE OTROS</option>
              <option value="sin">SIN PRÓRROGA</option>
            </select>
          </div>
        )}
        
        {/* Rango de Fecha Calendario Popover */}
        <div className="relative" ref={refCalendario}>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Fecha</label>
          <div className="flex items-center gap-1 bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold cursor-pointer text-slate-700" onClick={() => setMostrarCalendario(!mostrarCalendario)}>
            <CalendarIcon size={14} className="text-slate-400 shrink-0" />
            <span className="truncate flex-1 select-none">{formattedRangoText}</span>
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
                {obtenerDiasDelMes(mesActual).map((dia, idx) => {
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

        <div className="flex flex-col justify-end w-fit pb-1">
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterAccion('');
              setFilterEstado('');
              setFilterResultado('');
              setFilterVendedor('');
              setFilterProrroga('');
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
      
      {/* VISTA MÓVIL: TARJETAS DETALLADAS Y ESPACIOSAS (< md) */}
      <div className="space-y-3.5 md:hidden mb-6">
        {paginatedSolicitudes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 font-bold text-xs border border-slate-200">
            No se encontraron solicitudes con los filtros aplicados.
          </div>
        ) : (
          paginatedSolicitudes.map((s) => {
            const esPedidoManual = s.tipo === 'Pedido Manual';
            const resultado = etiquetaResultadoSolicitud(s.resultado || clasificarSolicitud(s.productos, s.estado).resultado);
            const itemsConPrecio = esPedidoManual 
              ? s.productos?.filter(p => Number(p.precio) > 0) || []
              : s.productos?.filter(p => Number(p.fob) > 0) || [];
            const esPedidoConfirmado = s.estado === 'Pedido' || s.estado === 'Pedido Parcial';
            
            const totalA = itemsConPrecio.reduce((acc, p) => 
              acc + (p.fob * (p.factorA || s.factorA || 1) * (p.fva || 1.3) * p.cant), 0);
            
            const totalM = itemsConPrecio.reduce((acc, p) => 
              acc + (p.fob * (p.factorM || s.factorM || 1.08) * (p.fvm || 1.25) * p.cant), 0);

            const totalManual = esPedidoManual 
              ? itemsConPrecio.reduce((acc, p) => acc + (Number(p.precio || 0) * Number(p.cantidad || p.cant || 0)), 0)
              : 0;

            const ocRefs = [...new Set((s.productos || []).filter(p => p.numOC).map(p => p.numOC))];
            const ocRefText = ocRefs.length > 0 ? ocRefs.join(', ') : '';
            const hayMotivoDecision = tieneDecisionSolicitud(s);
            const hayMotivoVentaPerdida = s.estado === 'Venta Perdida' || tieneVentaPerdidaSolicitud(s);
            const indiceConsultaAnimada = hayMotivoDecision && hayMotivoVentaPerdida
              ? consultaAnimacionTick % 2
              : 0;

            return (
              <div
                key={s.id}
                onClick={() => navigate(s.tipo === 'Pedido Manual' ? `/vendedor/pedido-manual/${s.id}` : `/vendedor/detalle/${s.id}`)}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative active:scale-[0.98] touch-manipulation"
              >
                {/* Header: Correlativo + Alertas (Izq) y Estado (Der) */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] text-slate-400 tracking-wider">
                      {s.correlativo || '---'}
                    </span>
                    {s.emailEnviado === false && (s.fechaS?.toDate?.() ?? new Date(0)) >= FECHA_CORTE_EMAIL && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleReenviarCorreo(s); }}
                        disabled={reenviandoId === s.id}
                        title="Reenviar correo a Compras"
                        className="p-1 rounded bg-rose-50 text-rose-500 hover:bg-rose-100 active:scale-95 transition-colors"
                      >
                        <AlertTriangle size={12} />
                      </button>
                    )}
                    {esPedidoConfirmado && s.pedidoEmailEnviado === false && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleReenviarCorreoPedido(s); }}
                        disabled={reenviandoPedidoId === s.id}
                        title="Reenviar correo de pedido"
                        className="p-1 rounded bg-amber-50 text-amber-500 hover:bg-amber-100 active:scale-95 transition-colors"
                      >
                        <AlertTriangle size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <MobileBadge estado={s.estado} size="xs" className="shadow-xs" />
                      {s.estado === 'Venta Perdida' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirConsultaVentaPerdida(s);
                          }}
                          title="Ver motivo de venta perdida"
                          className="hidden md:inline-flex p-0.5 rounded text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                        >
                          <MessageCircleQuestion size={13} />
                        </button>
                      )}
                    </div>
                    {s.estado !== 'Venta Perdida' && (resultado !== 'En proceso' || tieneDecisionSolicitud(s) || tieneVentaPerdidaSolicitud(s)) && (
                      <div className="flex items-center gap-1">
                          {resultado !== 'En proceso' && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{resultado}</span>
                          )}
                          {tieneDecisionSolicitud(s) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirConsultaDecision(s);
                              }}
                              title="Ver motivo de la decisión (anulación, rechazo o denegación)"
                              className="hidden md:inline-flex p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                              <MessageCircleQuestion size={13} />
                            </button>
                          )}
                          {s.estado !== 'Venta Perdida' && tieneVentaPerdidaSolicitud(s) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirConsultaVentaPerdida(s);
                              }}
                              title="Ver motivo de venta perdida"
                              className="hidden md:inline-flex p-0.5 rounded text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                            >
                              <MessageCircleQuestion size={13} />
                            </button>
                          )}
                        </div>
                    )}
                  </div>
                </div>

                {/* Body: Cliente y Totals */}
                <div className="mb-3">
                  <h3 className="font-black text-slate-800 text-sm uppercase leading-tight truncate pr-4">
                    {s.cliente || 'Sin cliente especificado'}
                  </h3>
                  {ocRefText && (
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 font-mono flex items-center gap-1">
                      <Hash size={10} /> {ocRefText}
                    </p>
                  )}
                </div>

                {/* Resumen minimalista */}
                {esPedidoManual ? (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 bg-yellow-50/50 px-2 py-1 rounded-md border border-yellow-100/50">
                      <span className="font-mono font-black text-[11px] text-yellow-900">Total: ${totalManual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ) : totalA > 0 ? (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 bg-emerald-50/50 px-2 py-1 rounded-md border border-emerald-100/50">
                      <Plane size={13} className="text-emerald-500" />
                      <span className="font-mono font-black text-[11px] text-emerald-900">${totalA.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-blue-50/50 px-2 py-1 rounded-md border border-blue-100/50">
                      <Ship size={13} className="text-blue-500" />
                      <span className="font-mono font-black text-[11px] text-blue-900">${totalM.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-[10px] font-bold text-slate-400 italic flex items-center gap-1">
                    <Package size={12} /> {s.productos?.length || 0} {(s.productos?.length === 1) ? 'ítem' : 'ítems'} en costeo...
                  </div>
                )}

                {/* Footer: Fechas y Flecha */}
                <div className="flex items-end justify-between pt-3 border-t border-slate-50">
                  <div className="flex flex-col gap-1.5 mt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <Clock size={10} /> Solicitado: {formatFechaHora(s.fechaS || s.fechaCreacion)}
                    </span>
                    {(() => {
                        let fResp = s.tipo === 'Pedido Manual' && s.ultimaNotificacion?.en ? s.ultimaNotificacion.en : (s.fechaCotizacion || s.fechaRespuesta);
                        if (s.estado === 'Anulado') fResp = s.productos?.find(p => p.fechaAnulacion)?.fechaAnulacion || fResp;
                        return fResp?.toDate || fResp ? (
                          <span className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1.5">
                            <Clock size={10} /> Resp: {formatFechaHora(fResp)}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-300 italic flex items-center gap-1.5">
                            <Clock size={10} /> En espera
                          </span>
                        );
                      })()}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-wide">
                        {s.vendedorNombre || s.vendedorEmail?.split('@')[0] || '---'}
                      </span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-100 transition-colors">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
                {(s.estado === 'Venta Perdida' || tieneDecisionSolicitud(s) || tieneVentaPerdidaSolicitud(s)) && (
                  <div
                    className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 md:hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {hayMotivoDecision && (
                      <button
                        key={`decision-${consultaAnimacionTick}`}
                        type="button"
                        onClick={() => abrirConsultaDecision(s)}
                        aria-label="Consultar motivo de anulación, rechazo o denegación"
                        title="Consultar motivo de anulación, rechazo o denegación"
                        className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-transform active:scale-95 ${indiceConsultaAnimada === 0 ? 'animate-consulta-motivo' : ''}`}
                      >
                        <MessageCircleQuestion size={17} />
                      </button>
                    )}
                    {hayMotivoVentaPerdida && (
                      <button
                        key={`venta-perdida-${consultaAnimacionTick}`}
                        type="button"
                        onClick={() => abrirConsultaVentaPerdida(s)}
                        aria-label="Consultar motivo de venta perdida"
                        title="Consultar motivo de venta perdida"
                        className={`flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm transition-transform active:scale-95 ${indiceConsultaAnimada === (hayMotivoDecision ? 1 : 0) ? 'animate-consulta-motivo' : ''}`}
                      >
                        <MessageCircleQuestion size={17} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* VISTA DESKTOP: TABLA CLÁSICA (hidden en < md, visible en >= md) */}
      <div className="hidden md:block bg-white rounded-3xl shadow-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-175">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
              <th className="p-4">Referencia / Cliente</th>
              <th className="p-4">Vendedor</th>
              <th className="p-4">Fechas (Solicitud / Respuesta)</th>
              <th className="p-4 text-center">Resumen Oferta (A / M)</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">OC Ref</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedSolicitudes.map((s) => {
              const esPedidoManual = s.tipo === 'Pedido Manual';
              const resultado = etiquetaResultadoSolicitud(s.resultado || clasificarSolicitud(s.productos, s.estado).resultado);
              const itemsConPrecio = esPedidoManual
                ? s.productos?.filter(p => Number(p.precio) > 0) || []
                : s.productos?.filter(p => Number(p.fob) > 0) || [];
            const esPedidoConfirmado = s.estado === 'Pedido' || s.estado === 'Pedido Parcial';
              
              const totalA = itemsConPrecio.reduce((acc, p) => 
                acc + (p.fob * (p.factorA || s.factorA || 1) * (p.fva || 1.3) * p.cant), 0);
              
              const totalM = itemsConPrecio.reduce((acc, p) => 
                acc + (p.fob * (p.factorM || s.factorM || 1.08) * (p.fvm || 1.25) * p.cant), 0);

              const totalManual = esPedidoManual 
                ? itemsConPrecio.reduce((acc, p) => acc + (Number(p.precio || 0) * Number(p.cantidad || p.cant || 0)), 0)
                : 0;

              const ocRefs = [...new Set((s.productos || []).filter(p => p.numOC).map(p => p.numOC))];
              const ocRefText = ocRefs.length > 0 ? ocRefs.join(', ') : '-';

              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="block font-black text-slate-800 text-lg leading-none">{s.correlativo}</span>
                      {s.emailEnviado === false && (s.fechaS?.toDate?.() ?? new Date(0)) >= FECHA_CORTE_EMAIL && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReenviarCorreo(s); }}
                          disabled={reenviandoId === s.id}
                          title="Enviar correo a Compras"
                          className={`p-1 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors ${reenviandoId === s.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <AlertTriangle size={14} />
                        </button>
                      )}
                      {esPedidoConfirmado && s.pedidoEmailEnviado === false && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReenviarCorreoPedido(s); }}
                          disabled={reenviandoPedidoId === s.id}
                          title={`Enviar correo de ${s.estado.toLowerCase()} a Compras`}
                          className={`p-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors ${reenviandoPedidoId === s.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <AlertTriangle size={14} />
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase italic">EXT: {s.cliente}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700 uppercase">{s.vendedorNombre || '-'}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{s.vendedorEmail}</span>
                    </div>
                  </td>
                  <td className="p-4 text-[11px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-bold uppercase text-[9px] flex items-center gap-1"><Inbox size={12} className="text-slate-400 shrink-0" /> Solicitud: <b className="text-slate-700 font-black">{formatFechaHora(s.fechaS || s.fechaCreacion)}</b></span>
                      <span className="text-emerald-600 font-black italic text-[9px] uppercase flex items-center gap-1">
                        <Send size={12} className="text-emerald-500 shrink-0" /> {s.tipo === 'Pedido Manual' ? 'Resp: ' : (s.estado.includes('Parcial') ? 'Avance Recibido: ' : 'Respondida: ')}
                        {(() => {
                            let fResp = s.tipo === 'Pedido Manual' && s.ultimaNotificacion?.en ? s.ultimaNotificacion.en : (s.fechaCotizacion || s.fechaRespuesta);
                            if (s.estado === 'Anulado') fResp = s.productos?.find(p => p.fechaAnulacion)?.fechaAnulacion || fResp;
                            return fResp?.toDate || fResp ? formatFechaHora(fResp) : 'En espera';
                          })()}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      {esPedidoManual ? (
                        <Etiqueta tono="amarillo" className="w-28 text-center">Total: ${totalManual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Etiqueta>
                      ) : totalA > 0 ? (
                        <>
                          <Etiqueta tono="exito" className="w-28 text-center">A: ${totalA.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Etiqueta>
                          <Etiqueta tono="azul" className="w-28 text-center">M: ${totalM.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Etiqueta>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">En costeo...</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <Etiqueta dominio="estadoSolicitud" valor={s.estado} />
                        {s.estado === 'Venta Perdida' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirConsultaVentaPerdida(s);
                            }}
                            title="Ver motivo de venta perdida"
                            className="hidden md:inline-flex p-0.5 rounded text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                          >
                            <MessageCircleQuestion size={13} />
                          </button>
                        )}
                      </div>
                      {s.estado !== 'Venta Perdida' && (resultado !== 'En proceso' || tieneDecisionSolicitud(s) || tieneVentaPerdidaSolicitud(s)) && (
                          <div className="flex items-center gap-1">
                            {resultado !== 'En proceso' && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{resultado}</span>
                            )}
                            {tieneDecisionSolicitud(s) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirConsultaDecision(s);
                                }}
                                title="Ver motivo de la decisión (anulación, rechazo o denegación)"
                                className="hidden md:inline-flex p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                              >
                                <MessageCircleQuestion size={13} />
                              </button>
                            )}
                            {s.estado !== 'Venta Perdida' && tieneVentaPerdidaSolicitud(s) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirConsultaVentaPerdida(s);
                                }}
                                title="Ver motivo de venta perdida"
                                className="hidden md:inline-flex p-0.5 rounded text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                              >
                                <MessageCircleQuestion size={13} />
                              </button>
                            )}
                          </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Etiqueta tono="neutral">{ocRefText}</Etiqueta>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => navigate(s.tipo === 'Pedido Manual' ? `/vendedor/pedido-manual/${s.id}` : `/vendedor/detalle/${s.id}`)}
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 p-4 sm:px-6 bg-slate-900 rounded-2xl sm:rounded-3xl text-white select-none">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <button
              onClick={() => setCurrentPage(Math.max(safeCurrentPage - 1, 1))}
              disabled={safeCurrentPage === 1}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
            >
              Anterior
            </button>
            <span className="sm:hidden text-[11px] font-bold text-slate-300">
              {safeCurrentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(safeCurrentPage + 1, totalPages))}
              disabled={safeCurrentPage === totalPages}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
            >
              Siguiente
            </button>
          </div>
          <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-widest text-slate-300">
            Página {safeCurrentPage} de {totalPages} ({sortedSolicitudes.length} solicitudes)
          </span>
        </div>
      )}

      {/* Modal Consulta Venta Perdida (Comercial) */}
      <ModalConsultaVentaPerdida
        isOpen={consultaVentaPerdidaData !== null}
        onClose={() => setConsultaVentaPerdidaData(null)}
        data={consultaVentaPerdidaData}
      />

      {/* Modal Consulta Decisión (Anulaciones, Rechazos, Denegaciones) */}
      <ModalConsultaDecisionItem
        isOpen={consultaDecisionData !== null}
        onClose={() => setConsultaDecisionData(null)}
        data={consultaDecisionData}
      />
    </div>
  );
};
