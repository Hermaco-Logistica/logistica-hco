import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, ArrowLeft, CalendarDays, Clock, HelpCircle, ListChecks, Package, Plane, Ship, UserRound } from 'lucide-react';
import { obtenerDiasValidez, obtenerEscalaRojoTiempo } from '../../utils/cotizacionesEstancadasHelpers';
import { ESTADOS_SEGUIMIENTO_CLIENTE, obtenerResumenSeguimientoCliente } from '../../utils/seguimientoCliente';

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

  const renderBadgeSeguimiento = (solicitud) => {
    const resumen = obtenerResumenSeguimientoCliente(solicitud);
    const esCierre = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO;
    const esProrroga = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE;
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-xs text-[9px] font-sans font-bold uppercase tracking-wider border ${esCierre
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
        {esCierre ? 'Cierre requerido' : esProrroga ? 'Prórroga disponible' : 'Seguimiento requerido'}
      </span>
    );
  };

  const hayCierresRequeridos = cotizaciones.some((solicitud) => (
    obtenerResumenSeguimientoCliente(solicitud).estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO
  ));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 max-w-6xl w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        
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
                Solicitudes con al menos un ítem cotizado fuera de su vigencia configurada sin seguimiento comercial.
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
                  const escalaClase = obtenerEscalaRojoTiempo(c.diasTranscurridos, obtenerDiasValidez(c));
                  const itemsEst = c.itemsEstancados || [];
                  const totalAereoEst = c.totalesEstancados?.totalAereo ?? c.totalAereo;
                  const totalMaritimoEst = c.totalesEstancados?.totalMaritimo ?? c.totalMaritimo;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm align-top whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span>{c.correlativo || 'S/N'}</span>
                          {renderBadgeParcial(c)}
                          {renderBadgeSeguimiento(c)}
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
          <div className="md:hidden space-y-4">
            {cotizaciones.map((c) => {
              const esPedido = c.tipo === 'Pedido Manual';
              const escalaClase = obtenerEscalaRojoTiempo(c.diasTranscurridos, obtenerDiasValidez(c));
              const itemsEst = c.itemsEstancados || [];
              const totalAereoEst = c.totalesEstancados?.totalAereo ?? c.totalAereo;
              const totalMaritimoEst = c.totalesEstancados?.totalMaritimo ?? c.totalMaritimo;

              return (
                <article
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-mono font-black text-slate-900 text-base">
                        {c.correlativo || 'S/N'}
                      </span>
                      {renderBadgeParcial(c)}
                      {renderBadgeSeguimiento(c)}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold tracking-tight shrink-0 ${escalaClase}`}
                      title="Días sin seguimiento"
                    >
                      <Clock size={14} aria-hidden="true" />
                      <span>{c.diasTranscurridos} días</span>
                    </span>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <UserRound size={20} className="text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Cliente</div>
                      <div className="font-bold text-slate-800 break-words leading-snug">
                        {c.cliente || 'Sin cliente'}
                      </div>
                    </div>
                  </div>

                  {itemsEst.length > 0 && (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <ListChecks size={16} aria-hidden="true" />
                        <span>Ítems pendientes ({itemsEst.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {itemsEst.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 min-h-[36px] px-2.5 rounded-lg bg-white text-slate-700 text-xs font-medium border border-slate-200"
                          >
                            <Package size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
                            <span className="font-bold uppercase min-w-0 flex-1 break-words">
                              {it.descripcion || it.desc}
                            </span>
                            <span className="text-rose-700 font-mono font-bold shrink-0">
                              {it._diasItem || c.diasTranscurridos}d
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 min-h-[70px]">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] uppercase">
                        <Plane size={15} aria-hidden="true" /> Aéreo
                      </div>
                      <div className="font-mono font-bold text-slate-800 mt-1">
                        {formatDinero(totalAereoEst)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 min-h-[70px]">
                      <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[10px] uppercase">
                        <Ship size={15} aria-hidden="true" /> Marítimo
                      </div>
                      <div className="font-mono font-bold text-slate-800 mt-1">
                        {esPedido ? '---' : formatDinero(totalMaritimoEst)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex items-start gap-2 text-[11px] text-slate-500 font-medium min-w-0 flex-1">
                      <CalendarDays size={18} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="min-w-0">
                        <span className="text-slate-400 text-[10px] block uppercase font-bold">Última respuesta</span>
                        <span className="break-words block">{formatFechaHora(c.fechaRespuestaCompradorParsed)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleIrADetalle(c)}
                      aria-label={`Atender cotización ${c.correlativo || ''}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0 min-h-[48px]"
                    >
                      <span>Atender</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

        </div>

        {/* Barra inferior */}
        <div className="p-3.5 sm:px-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {hayCierresRequeridos
              ? 'Las solicitudes con cierre requerido deben resolverse como pedido o venta perdida para desbloquear nuevas solicitudes.'
              : 'Debe registrar seguimiento, pedido, contraoferta o venta perdida para desbloquear nuevas solicitudes.'}
            {' '}Totales calculados sobre los ítems estancados.
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


