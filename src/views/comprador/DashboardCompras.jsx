import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Printer, X, Calendar as CalendarIcon, Trash2, Filter, 
  ChevronDown, ChevronUp, Clock, User, Plane, Ship, ChevronRight, Package, Ban 
} from 'lucide-react';
import { db, auth } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Badge } from '../../components/Badge';
import { MobileBadge } from '../../components/mobile';
import CotizacionDocumento from '../../components/CotizacionDocumento';
import { usePersistedState } from '../../hooks/usePersistedState';
import { normalizarBusqueda } from '../../utils/normalizers';
import { generarPlantillaAnulacion } from '../../utils/emailTemplates';
import { pdf } from '@react-pdf/renderer';
import CotizacionPDF from '../../components/CotizacionPDF';
import { clasificarSolicitud, etiquetaResultadoSolicitud, RESULTADOS_SOLICITUD } from '../../utils/clasificarSolicitud';

export const DashboardCompras = ({ solicitudes, readOnly = false }) => {
  const navigate = useNavigate();
  const [solicitudVista, setSolicitudVista] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados de filtros (persistidos en localStorage)
  const [ setFilterAccion] = usePersistedState('dc_filterAccion', '');
  const [filterEstado, setFilterEstado] = usePersistedState('dc_filterEstado', '');
  const [filterResultado, setFilterResultado] = usePersistedState('dc_filterResultado', '');
  const [filterVendedor, setFilterVendedor] = usePersistedState('dc_filterVendedor', '');
  const [searchTerm, setSearchTerm] = usePersistedState('dc_searchTerm', '');
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);
  
  const [modalAnulacionGlobal, setModalAnulacionGlobal] = useState({ open: false, rfqId: null, rfqData: null, motivo: '', enviando: false });

  const handleAnularSolicitudGlobal = async () => {
    if (!modalAnulacionGlobal.motivo.trim()) return alert("El motivo es obligatorio");
    setModalAnulacionGlobal(prev => ({ ...prev, enviando: true }));
    try {
      const docRef = doc(db, 'solicitudes', modalAnulacionGlobal.rfqId);
      const updatedProductos = modalAnulacionGlobal.rfqData.productos?.map(p => ({
        ...p,
        estadoItem: p.estadoItem === 'Anulado' ? 'Anulado' : 'Anulado',
        motivoAnulacion: p.estadoItem === 'Anulado' ? p.motivoAnulacion : modalAnulacionGlobal.motivo.trim(),
        fechaAnulacion: p.estadoItem === 'Anulado' ? p.fechaAnulacion : new Date(),
        anuladoPor: p.estadoItem === 'Anulado' ? p.anuladoPor : 'comprador'
      })) || [];
      const clasificacion = clasificarSolicitud(updatedProductos, 'Anulado');

      await updateDoc(docRef, {
        estado: clasificacion.estado,
        resultado: clasificacion.resultado,
        conteoItems: clasificacion.conteoItems,
        productos: updatedProductos
      });

      // --- Enviar correo de anulación al vendedor ---
      const rfqData = modalAnulacionGlobal.rfqData;
      if (rfqData.vendedorEmail) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const destinatarioTo = isLocal ? ["rvides@hermaco.net"] : [rfqData.vendedorEmail];
        const ccEmails = isLocal 
          ? ["rvides@hermaco.net"] 
          : [auth.currentUser.email, "logisticahco@hermaco.net"].filter(e => e && !["oventura@hermaco.net", "dhernandez@hermaco.net"].includes(e.toLowerCase()));
        
        const senderFrom = isLocal ? 'rvides@hermaco.net <rvides@hermaco.net>' : `${auth.currentUser.displayName || auth.currentUser.email?.split('@')[0]} <${auth.currentUser.email}>`;
        
        const bodyHtml = generarPlantillaAnulacion(rfqData, modalAnulacionGlobal.motivo.trim(), auth.currentUser.email, false);
        
        let pdfBase64 = null;
        try {
          const pdfDoc = <CotizacionPDF cotizacionData={{ ...rfqData, estado: 'Anulado', productos: updatedProductos }} />;
          const asPdf = pdf();
          asPdf.updateContainer(pdfDoc);
          const blob = await asPdf.toBlob();
          const reader = new FileReader();
          pdfBase64 = await new Promise((resolve, reject) => {
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
          });
        } catch (err) {
          console.error("Error generando PDF para anulación:", err);
        }

        try {
          const payload = {
            from: senderFrom,
            replyTo: auth.currentUser.email,
            to: destinatarioTo,
            cc: ccEmails,
            subject: `Anulación: ${rfqData.correlativo} - ${rfqData.cliente}`,
            bodyHtml
          };
          if (pdfBase64) {
            payload.attachments = [{ content: pdfBase64, nombre: `Anulacion_${rfqData.correlativo}.pdf` }];
          }

          await fetch('/.netlify/functions/send-email-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (e) {
          console.error("Error enviando correo de anulación:", e);
        }
      }

      alert('Solicitud anulada correctamente');
      setModalAnulacionGlobal({ open: false, rfqId: null, rfqData: null, motivo: '', enviando: false });
    } catch (error) {
      console.error(error);
      alert('Error al anular solicitud');
      setModalAnulacionGlobal(prev => ({ ...prev, enviando: false }));
    }
  };

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
  const obtenerResultadoSolicitud = (solicitud) => etiquetaResultadoSolicitud(
    solicitud.resultado || clasificarSolicitud(solicitud.productos, solicitud.estado).resultado
  );

  // Un ítem en consulta todavía no tiene FOB; debe poder retomarse desde
  // "Cotizar Restante" aunque ya exista una cotización parcial guardada.
  const tieneItemsPendientesPorCotizar = (solicitud) =>
    solicitud.productos?.some((p) => Number(p.fob || 0) <= 0);

  const obtenerEstadoAccion = (solicitud) => {
    const estado = solicitud.estado;
    const tienePendientes = tieneItemsPendientesPorCotizar(solicitud);

    if (estado === 'Anulado') return 'Ver Anulada';
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
    const tienePendientes = tieneItemsPendientesPorCotizar(solicitud);

    if (estado === 'Anulado') {
      return 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 cursor-default';
    }
    if ((estado === 'Pedido' || estado === 'Cotizado Parcial') && tienePendientes) {
      return 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700';
    }
    if (estado === 'Cotizado' || estado === 'Cotizado Parcial' || estado === 'Pedido') {
      return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
    }
    return 'bg-white border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white';
  };

  const calcularItemsCotizados = (solicitud) => {
    if (solicitud.tipo === 'Pedido Manual') {
      return solicitud.productos?.filter((p) => Number(p.precio) > 0) || [];
    }
    return solicitud.productos?.filter((p) => Number(p.fob) > 0) || [];
  };

  const formatearTotal = (solicitud, mod) => {
    const itemsConPrecio = calcularItemsCotizados(solicitud);
    if (solicitud.tipo === 'Pedido Manual') {
      const total = itemsConPrecio.reduce((acc, p) => acc + (Number(p.precio || 0) * Number(p.cantidad || p.cant || 0)), 0);
      return formatMoneda(total); // Mostrar subtotal sin IVA en el dashboard
    }
    const total = itemsConPrecio.reduce((acc, p) => {
      const factor = mod === 'A'
        ? (p.factorA || solicitud.factorA || 1)
        : (p.factorM || solicitud.factorM || 1.08);
      const margen = mod === 'A' ? (p.fva || 1.3) : (p.fvm || 1.25);
      return acc + (Number(p.fob || 0) * factor * margen * Number(p.cant || 0));
    }, 0);
    return formatMoneda(total);
  };

  // Obtener listas únicas de vendedores y estados para los filtros selectores
  const vendedoresDisponibles = Array.from(new Set(solicitudes.map(s => s.vendedorNombre).filter(Boolean)));
  const estadosDisponibles = Array.from(new Set(solicitudes.map(s => s.estado).filter(Boolean)));
  const resultadosDisponibles = Object.values(RESULTADOS_SOLICITUD);

  // Aplicar filtros
  const filteredSolicitudes = solicitudes.filter((s) => {
    if (filterEstado && s.estado !== filterEstado) return false;
    if (filterResultado && (s.resultado || clasificarSolicitud(s.productos, s.estado).resultado) !== filterResultado) return false;
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
  const totalPages = Math.max(1, Math.ceil(sortedSolicitudes.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedSolicitudes = sortedSolicitudes.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

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

  const filtrosActivosCount = [
    filterEstado,
    filterResultado,
    filterVendedor,
    (fechaInicio || fechaFin)
  ].filter(Boolean).length;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Modal Anulación Global */}
      {modalAnulacionGlobal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-black text-slate-800 mb-2">Anular Solicitud</h3>
            <p className="text-sm text-slate-500 mb-4">Ingresa el motivo de la anulación para la solicitud <b>{modalAnulacionGlobal.rfqData?.correlativo}</b>. Esta acción anulará todos sus ítems de forma irreversible.</p>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none text-sm font-medium h-24 mb-4"
              placeholder="Motivo (obligatorio)..."
              value={modalAnulacionGlobal.motivo}
              onChange={e => setModalAnulacionGlobal(prev => ({...prev, motivo: e.target.value}))}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setModalAnulacionGlobal({open: false, rfqId: null, rfqData: null, motivo: '', enviando: false})}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAnularSolicitudGlobal}
                disabled={modalAnulacionGlobal.enviando || !modalAnulacionGlobal.motivo.trim()}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {modalAnulacionGlobal.enviando ? 'Anulando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter italic">Panel de Compras</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gestión de cotizaciones y logística</p>
        </div>
      </div>

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
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
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
            <div className="relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Fecha</label>
              <div 
                className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold cursor-pointer text-slate-700" 
                onClick={() => setMostrarCalendario(!mostrarCalendario)}
              >
                <CalendarIcon size={14} className="text-slate-400 shrink-0" />
                <span className="truncate flex-1 select-none">{formattedRangoText()}</span>
                {(fechaInicio || fechaFin) && (
                  <button onClick={(e) => { e.stopPropagation(); clearRangoFechas(); }} className="hover:text-red-500 font-bold p-0.5">&times;</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONTROLES DE FILTROS DESKTOP (visible en >= md) */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
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
              setFilterResultado('');
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
      
      {/* VISTA MÓVIL: TARJETAS DETALLADAS Y ESPACIOSAS (< md) */}
      <div className="space-y-3.5 md:hidden mb-6">
        {paginatedSolicitudes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 font-bold text-xs border border-slate-200">
            No se encontraron cotizaciones con los filtros aplicados.
          </div>
        ) : (
          paginatedSolicitudes.map((s) => {
            const itemsConPrecio = calcularItemsCotizados(s);
            const tienePendientes = tieneItemsPendientesPorCotizar(s);
            const resultado = obtenerResultadoSolicitud(s);
            const totalA = formatearTotal(s, 'A');
            const totalM = formatearTotal(s, 'M');
            let fechaResp = s.tipo === 'Pedido Manual' && s.ultimaNotificacion?.en ? s.ultimaNotificacion.en : (s.fechaCotizacion || s.fechaRespuesta);
            if (s.estado === 'Anulado') {
              fechaResp = s.productos?.find(p => p.fechaAnulacion)?.fechaAnulacion || fechaResp;
            }
            const esPedidoManualTerminado = s.tipo === 'Pedido Manual' && s.productos && s.productos.length > 0 && s.productos.every(p => ['Pedido', 'Comprado', 'Denegado', 'Cancelado', 'Rechazado'].includes(p.estadoItem));

            return (
              <div
                key={s.id}
                onClick={() => {
                  if (!readOnly) {
                    if (s.tipo === 'Pedido Manual') {
                      navigate(`/compras/revision-pedido/${s.id}`);
                    } else {
                      navigate(`/calculadora/${s.id}`);
                    }
                  } else {
                    abrirVistaCotizacion(s);
                  }
                }}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative active:scale-[0.98] touch-manipulation"
              >
                {/* Header: Correlativo (Izq) y Estado (Der) */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] text-slate-400 tracking-wider">
                      {s.correlativo || '---'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <MobileBadge estado={s.estado} size="xs" className="shadow-xs" />
                    {resultado !== 'En proceso' && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{resultado}</span>
                    )}
                  </div>
                </div>

                {/* Body: Cliente y Vendedor */}
                <div className="mb-3">
                  <h3 className="font-black text-slate-800 text-sm uppercase leading-tight truncate pr-4">
                    {s.cliente || 'Sin cliente especificado'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase flex items-center gap-1">
                    <User size={10} className="text-slate-300" /> {s.vendedorNombre || s.vendedorEmail?.split('@')[0] || '---'}
                  </p>
                </div>

                {/* Resumen minimalista: Totales */}
                {s.tipo === 'Pedido Manual' ? (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 bg-yellow-50/50 px-2 py-1 rounded-md border border-yellow-100/50">
                      <span className="font-mono font-black text-[11px] text-yellow-900">Total: {formatearTotal(s)}</span>
                    </div>
                  </div>
                ) : itemsConPrecio.length > 0 ? (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 bg-emerald-50/50 px-2 py-1 rounded-md border border-emerald-100/50">
                      <Plane size={13} className="text-emerald-500" />
                      <span className="font-mono font-black text-[11px] text-emerald-900">{totalA}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-blue-50/50 px-2 py-1 rounded-md border border-blue-100/50">
                      <Ship size={13} className="text-blue-500" />
                      <span className="font-mono font-black text-[11px] text-blue-900">{totalM}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-[10px] font-bold text-slate-400 italic flex items-center gap-1">
                    <Package size={12} /> {s.productos?.length || 0} {(s.productos?.length === 1) ? 'ítem' : 'ítems'} esperando costeo...
                  </div>
                )}

                {/* Footer: Fechas y Botones */}
                <div className="flex flex-col gap-3 pt-3 border-t border-slate-50">
                  {/* Fechas */}
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                        <CalendarIcon size={10} /> {formatFechaHora(s.fechaS || s.fechaCreacion)}
                      </span>
                      {fechaResp ? (
                        <span className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1.5">
                          <Clock size={10} /> Resp: {formatFechaHora(fechaResp)}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-300 italic flex items-center gap-1.5">
                          <Clock size={10} /> En espera
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción originales del comprador */}
                  <div 
                    className="flex items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {s.tipo === 'Pedido Manual' ? (
                      readOnly ? (
                        <button 
                          onClick={() => navigate(`/vendedor/pedido-manual/${s.id}`)}
                          className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                        >
                          Ver Pedido
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => abrirVistaCotizacion(s)}
                            className="px-3.5 py-2 rounded-xl text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 uppercase transition-all shadow-xs"
                          >
                            PDF
                          </button>
                          <button 
                            onClick={() => navigate(`/compras/revision-pedido/${s.id}`)}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border ${
                              esPedidoManualTerminado
                                ? 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                                : 'bg-blue-600 hover:bg-blue-700 text-white border-transparent'
                            }`}
                          >
                            {esPedidoManualTerminado ? 'Ver Pedido' : 'Revisar Pedido'}
                          </button>
                        </>
                      )
                    ) : s.estado === 'Cotizado' || s.estado === 'Pedido' || (
                      (s.estado === 'Cotizado Parcial' || s.estado === 'Pedido Parcial') && !tienePendientes
                    ) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => abrirVistaCotizacion(s)}
                          className="px-3.5 py-2 rounded-xl text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 uppercase transition-all shadow-xs"
                        >
                          PDF
                        </button>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => navigate(`/calculadora/${s.id}?readOnly=true`)}
                            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm border border-emerald-200"
                          >
                            Detalle RFQ
                          </button>
                        )}
                      </>
                    ) : (s.estado === 'Cotizado Parcial' || s.estado === 'Pedido Parcial') ? (
                      <>
                        <button
                          type="button"
                          onClick={() => abrirVistaCotizacion(s)}
                          className="px-3.5 py-2 rounded-xl text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 uppercase transition-all shadow-xs"
                        >
                          PDF
                        </button>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => navigate(`/calculadora/${s.id}`)}
                            className="px-4 py-2 rounded-xl text-[10px] font-black bg-blue-600 text-white hover:bg-blue-700 uppercase transition-all shadow-sm"
                          >
                            Cotizar Restante
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {s.estado === 'Anulado' && (
                          <button
                            type="button"
                            onClick={() => abrirVistaCotizacion(s)}
                            className="px-3.5 py-2 rounded-xl text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 uppercase transition-all shadow-xs mr-2"
                          >
                            PDF
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (!readOnly) navigate(`/calculadora/${s.id}`);
                          }}
                          disabled={readOnly}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border ${
                            readOnly
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                              : obtenerColorAccion(s)
                          }`}
                        >
                          {readOnly ? 'En proceso' : obtenerEstadoAccion(s)}
                        </button>
                      </>
                    )}
                    {!readOnly && s.estado !== 'Pedido' && s.estado !== 'Pedido Parcial' && s.estado !== 'Anulado' && (
                      <button
                        type="button"
                        onClick={() => setModalAnulacionGlobal({ open: true, rfqId: s.id, rfqData: s, motivo: '', enviando: false })}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors ml-1"
                        title="Anular Solicitud Completa"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* VISTA DESKTOP: TABLA CLÁSICA (hidden en < md, visible en >= md) */}
      <div className="hidden md:block tf-surface-panel overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-175">
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
              const tienePendientesPorCotizar = tieneItemsPendientesPorCotizar(s);
              const resultado = obtenerResultadoSolicitud(s);
              const totalA = formatearTotal(s, 'A');
              const totalM = formatearTotal(s, 'M');

              let fechaResp = s.tipo === 'Pedido Manual' && s.ultimaNotificacion?.en 
                  ? s.ultimaNotificacion.en 
                  : (s.fechaCotizacion || s.fechaRespuesta);
                if (s.estado === 'Anulado') {
                  fechaResp = s.productos?.find(p => p.fechaAnulacion)?.fechaAnulacion || fechaResp;
                }
                
                const esPedidoManualTerminado = s.tipo === 'Pedido Manual' && s.productos && s.productos.length > 0 && s.productos.every(p => ['Pedido', 'Comprado', 'Denegado', 'Cancelado', 'Rechazado'].includes(p.estadoItem));

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
                      {s.tipo === 'Pedido Manual' ? (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">Total: {formatearTotal(s)}</span>
                      ) : itemsConPrecio.length > 0 ? (
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
                    <div className="flex flex-col items-center gap-1">
                      <Badge estado={s.estado} />
                      {resultado !== 'En proceso' && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{resultado}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {s.tipo === 'Pedido Manual' ? (
                        readOnly ? (
                          <button 
                            onClick={() => navigate(`/vendedor/pedido-manual/${s.id}`)}
                            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                          >
                            Ver Pedido
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirVistaCotizacion(s)}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all uppercase mr-2"
                            >
                              PDF
                            </button>
                            <button 
                              onClick={() => navigate(`/compras/revision-pedido/${s.id}`)}
                              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border ${
                                esPedidoManualTerminado
                                  ? 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white border-transparent'
                              }`}
                            >
                              {esPedidoManualTerminado ? 'Ver Pedido' : 'Revisar Pedido'}
                            </button>
                          </>
                        )
                      ) : s.estado === 'Cotizado' || s.estado === 'Pedido' || (
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
                              Detalle RFQ
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
                        <>
                          {s.estado === 'Anulado' && (
                            <button
                              type="button"
                              onClick={() => abrirVistaCotizacion(s)}
                              title="Ver / Imprimir PDF de Anulación"
                              className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all uppercase mr-2"
                            >
                              PDF
                            </button>
                          )}
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
                        </>
                      )}
                      {!readOnly && s.estado !== 'Pedido' && s.estado !== 'Pedido Parcial' && s.estado !== 'Anulado' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setModalAnulacionGlobal({ open: true, rfqId: s.id, rfqData: s, motivo: '', enviando: false }); }}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors ml-1"
                          title="Anular Solicitud Completa"
                        >
                          <Ban size={16} />
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

      {solicitudVista && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-100 rounded-3xl sm:rounded-4xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="bg-slate-900 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between text-white">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Oficial</p>
                <h3 className="text-base sm:text-lg font-black tracking-tight uppercase">Vista previa de cotización</h3>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={imprimirVistaCotizacion}
                  className="bg-violet-500 hover:bg-violet-600 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer size={14} /> <span className="hidden sm:inline">Imprimir / </span>PDF
                </button>
                <button
                  type="button"
                  onClick={cerrarVistaCotizacion}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 sm:p-2.5 rounded-full transition-all cursor-pointer"
                  aria-label="Cerrar vista previa"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-8 overflow-y-auto flex-1 bg-slate-50">
              <div id="cotizacion-print-area" className="bg-white shadow-sm rounded-2xl sm:rounded-3xl p-1 overflow-x-auto">
                <CotizacionDocumento cotizacionData={solicitudVista} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
