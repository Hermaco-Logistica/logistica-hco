import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, X } from 'lucide-react';
import { Badge } from '../../components/Badge';
import CotizacionDocumento from '../../components/CotizacionDocumento';

export const DashboardCompras = ({ solicitudes, readOnly = false }) => {
  const navigate = useNavigate();
  const [solicitudVista, setSolicitudVista] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

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

  const formatMoneda = (valor) =>
    `$${Number(valor || 0).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const abrirVistaCotizacion = (solicitud) => setSolicitudVista(solicitud);
  const cerrarVistaCotizacion = () => setSolicitudVista(null);

  // Ordenar de más reciente a más antigua
  const sortedSolicitudes = [...solicitudes].sort((a, b) => {
    const getMs = (val) => {
      if (!val) return 0;
      if (typeof val === 'object') {
        if (typeof val.toDate === 'function') {
          try { return val.toDate().getTime(); } catch(e) {}
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

  const obtenerEstadoAccion = (estado) => {
    if (estado === 'Cotizado Parcial') return 'Cotizado Parcial';
    if (estado === 'Cotizado') return 'Cotizado';
    return 'Cotizar';
  };

  const obtenerColorAccion = (estado) => {
    if (estado === 'Cotizado Parcial') return 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700';
    if (estado === 'Cotizado') return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
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

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">Panel de Compras</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gestión de cotizaciones y logística</p>
        </div>
      </div>
      
      <div className="tf-surface-panel overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="tf-table-head-dark text-[10px] uppercase font-black tracking-widest">
              <th className="p-4">Referencia / Cliente</th>
              <th className="p-4">Vendedor</th>
              <th className="p-4">Fecha Solicitud</th>
              <th className="p-4 text-center">Total Cotizado (A / M)</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedSolicitudes.map((s) => {
              const itemsConPrecio = calcularItemsCotizados(s);
              const estadoVisible = s.estado === 'Cotizado Parcial' ? 'Cotizado Parcial' : s.estado === 'Cotizado' ? 'Cotizado' : 'Pendiente';
              const totalA = formatearTotal(s, 'A');
              const totalM = formatearTotal(s, 'M');

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
                    <span className="text-slate-500 font-bold">
                      {formatFechaHora(s.fechaS)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      {itemsConPrecio.length > 0 ? (
                        <>
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">A: {totalA}</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black w-28 text-center uppercase">M: {totalM}</span>
                          {estadoVisible === 'Cotizado Parcial' && (
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
                    <button 
                      onClick={() => {
                        if (!readOnly) {
                          if (s.estado === 'Cotizado' || s.estado === 'Cotizado Parcial') {
                            abrirVistaCotizacion(s);
                          } else {
                            navigate(`/calculadora/${s.id}`);
                          }
                        }
                      }}
                      disabled={readOnly}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border uppercase ${
                        readOnly
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : obtenerColorAccion(s.estado)
                      }`}
                    >
                      {readOnly
                        ? 'Ver'
                        : obtenerEstadoAccion(s.estado)}
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
            Página {currentPage} de {totalPages} ({solicitudes.length} solicitudes)
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