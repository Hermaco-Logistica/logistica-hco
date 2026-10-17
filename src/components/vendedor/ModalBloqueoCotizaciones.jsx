import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, ArrowLeft, Clock, HelpCircle, Package } from 'lucide-react';
import { obtenerEscalaRojoTiempo } from '../../utils/cotizacionesEstancadasHelpers';

export const ModalBloqueoCotizaciones = ({ cotizaciones = [], onVolver = null }) => {
  const navigate = useNavigate();

  const handleIrADetalle = (solicitud) => {
    if (solicitud.tipo === 'Pedido Manual') {
      navigate(`/vendedor/pedido-manual/${solicitud.id}`);
    } else {
      navigate(`/vendedor/detalle/${solicitud.id}`);
    }
  };

  const formatFechaHora = (date) => {
    if (!date) return '---';
    try {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat('es-SV', {
        dateStyle: 'short',
        timeStyle: 'short',
        hour12: false,
        timeZone: 'America/El_Salvador'
      }).format(d);
    } catch {
      return '---';
    }
  };

  const formatDinero = (val) => {
    const num = Number(val || 0);
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderBadgeParcial = (solicitud) => {
    const estado = solicitud?.estado || solicitud?.estadoGlobal || '';
    if (estado === 'Pedido Parcial') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[9px] font-sans font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
          Pedido Parcial
        </span>
      );
    }
    if (estado === 'Cotizado Parcial') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[9px] font-sans font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          Cotizado Parcial
        </span>
      );
    }
    if (estado.toLowerCase().includes('parcial')) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[9px] font-sans font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          {estado}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        
        {/* Cabecera Minimalista */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 bg-slate-800 rounded-xl text-amber-400 shrink-0">
              <AlertCircle size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-tight uppercase truncate">
                  Cotizaciones Pendientes de Seguimiento
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono font-bold shrink-0">
                  {cotizaciones.length}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5 hidden sm:block truncate">
                Solicitudes con al menos un ítem cotizado con 5 o más días hábiles (sin contar domingos) sin seguimiento comercial.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (onVolver) onVolver();
              else navigate('/vendedor');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shrink-0 min-h-[36px]"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Regresar</span>
          </button>
        </div>

        {/* Tabla Desktop (>768px) / Cards Móvil (<768px) */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* Vista Desktop: Tabla limpia */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ref</th>
                  <th className="py-3 px-4">Cliente / Ítems Afectados</th>
                  <th className="py-3 px-4">
                    <div className="inline-flex items-center gap-1.5 cursor-help" title="Fecha de respuesta de Compras">
                      <span>Fecha Resp.</span>
                      <HelpCircle size={13} className="text-slate-400 hover:text-slate-600" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Tiempo</th>
                  <th className="py-3 px-4 text-right">
                    <div title="Total de ítems estancados">
                      <span>Aéreo (Estancado)</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <div title="Total de ítems estancados">
                      <span>Marítimo (Estancado)</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center w-36">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cotizaciones.map((c) => {
                  const esPedido = c.tipo === 'Pedido Manual';
                  const escalaClase = obtenerEscalaRojoTiempo(c.diasTranscurridos);
                  const itemsEst = c.itemsEstancados || [];
                  const totalAereoEst = c.totalesEstancados?.totalAereo ?? c.totalAereo;
                  const totalMaritimoEst = c.totalesEstancados?.totalMaritimo ?? c.totalMaritimo;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm align-top whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span>{c.correlativo || 'S/N'}</span>
                          {renderBadgeParcial(c)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top max-w-sm">
                        <div className="font-semibold text-slate-800 truncate">
                          {c.cliente || 'No especificado'}
                        </div>
                        {itemsEst.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Ítems estancados ({itemsEst.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {itemsEst.map((it, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200"
                                >
                                  <Package size={10} className="text-slate-400" />
                                  <span className="font-bold uppercase max-w-[150px] truncate">
                                    {it.descripcion || it.desc}
                                  </span>
                                  <span className="text-rose-700 font-mono font-bold">
                                    ({it._diasItem || c.diasTranscurridos}d)
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap align-top">
                        {formatFechaHora(c.fechaRespuestaCompradorParsed)}
                      </td>
                      <td className="py-3.5 px-4 text-center align-top">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs border text-[11px] font-mono tracking-tight ${escalaClase}`}>
                          <Clock size={11} />
                          {c.diasTranscurridos}d
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right align-top">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {formatDinero(totalAereoEst)}
                        </div>
                        {c.totalAereo > totalAereoEst && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Total cotiz: {formatDinero(c.totalAereo)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right align-top">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {esPedido ? '---' : formatDinero(totalMaritimoEst)}
                        </div>
                        {!esPedido && c.totalMaritimo > totalMaritimoEst && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Total cotiz: {formatDinero(c.totalMaritimo)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center align-top">
                        <button
                          onClick={() => handleIrADetalle(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer w-full justify-center"
                        >
                          <span>Atender</span>
                          <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vista Móvil: Tarjetas rectangulares */}
          <div className="md:hidden space-y-3">
            {cotizaciones.map((c) => {
              const esPedido = c.tipo === 'Pedido Manual';
              const escalaClase = obtenerEscalaRojoTiempo(c.diasTranscurridos);
              const itemsEst = c.itemsEstancados || [];
              const totalAereoEst = c.totalesEstancados?.totalAereo ?? c.totalAereo;
              const totalMaritimoEst = c.totalesEstancados?.totalMaritimo ?? c.totalMaritimo;

              return (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                        {c.correlativo || 'S/N'}
                      </span>
                      {renderBadgeParcial(c)}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-mono tracking-tight ${escalaClase}`}>
                      <Clock size={11} />
                      {c.diasTranscurridos}d
                    </span>
                  </div>

                  <div className="text-xs">
                    <div className="text-slate-400 font-medium text-[10px] uppercase">Cliente</div>
                    <div className="font-semibold text-slate-800 truncate">{c.cliente || '---'}</div>
                  </div>

                  {itemsEst.length > 0 && (
                    <div className="space-y-1.5 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-slate-500">
                        Ítems estancados ({itemsEst.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {itemsEst.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-slate-700 text-[10px] font-medium border border-slate-200"
                          >
                            <span className="font-bold uppercase max-w-[130px] truncate">{it.descripcion || it.desc}</span>
                            <span className="text-rose-700 font-mono font-bold">({it._diasItem || c.diasTranscurridos}d)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <div className="text-slate-400 font-medium text-[10px] uppercase">Aéreo Estancado</div>
                      <div className="font-mono font-bold text-slate-800">{formatDinero(totalAereoEst)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-medium text-[10px] uppercase">Marítimo Estancado</div>
                      <div className="font-mono font-bold text-slate-800">{esPedido ? '---' : formatDinero(totalMaritimoEst)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-slate-500 font-medium min-w-0">
                      <span className="text-slate-400 text-[10px] block uppercase">Resp. Compras</span>
                      <span className="truncate block">{formatFechaHora(c.fechaRespuestaCompradorParsed)}</span>
                    </div>
                    <button
                      onClick={() => handleIrADetalle(c)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shrink-0 min-h-[38px]"
                    >
                      <span>Atender</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Barra inferior */}
        <div className="p-3.5 sm:px-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Debe registrar resolución (pedido, contraoferta o venta perdida) para desbloquear nuevas solicitudes. Totales calculados sobre los ítems estancados.
          </span>
          <button
            onClick={() => {
              if (onVolver) onVolver();
              else navigate('/vendedor');
            }}
            className="text-slate-700 hover:text-slate-900 font-semibold underline cursor-pointer"
          >
            Ir al listado principal
          </button>
        </div>

      </div>
    </div>
  );
};
