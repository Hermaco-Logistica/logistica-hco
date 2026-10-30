import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Package, Plane, Ship, UserRound } from 'lucide-react';
import { ESTADOS_SEGUIMIENTO_CLIENTE, obtenerResumenSeguimientoCliente } from '../../utils/seguimientoCliente';
import { StatusChip } from '../detalle/StatusChip';

const obtenerIntensidadAntiguedad = (dias) => {
  const diasTranscurridos = Math.max(0, Number(dias) || 0);
  const progreso = Math.min(diasTranscurridos / 14, 1);
  return 0.3 + (progreso * 0.7);
};

export const ModalBloqueoCotizaciones = ({ cotizaciones = [], onVolver = null }) => {
  const navigate = useNavigate();
  const [pestana, setPestana] = useState('todas');

  const handleIrADetalle = (solicitud) => {
    if (solicitud.tipo === 'Pedido Manual') {
      navigate(`/vendedor/pedido-manual/${solicitud.id}`);
    } else {
      navigate(`/vendedor/detalle/${solicitud.id}`);
    }
  };

  const formatFechaHora = (date) => {
    if (!date) return '—';
    try {
      const d = date instanceof Date ? date : typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      if (Number.isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('es-SV', {
        dateStyle: 'short',
        timeStyle: 'short',
        hour12: false,
        timeZone: 'America/El_Salvador'
      }).format(d);
    } catch {
      return '—';
    }
  };

  const formatDinero = (val) => {
    if (val === null || val === undefined || val === '' || val === '---') return '—';
    const num = Number(val);
    if (Number.isNaN(num) || num <= 0) return '—';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderChipsEstado = (solicitud) => {
    const resumen = obtenerResumenSeguimientoCliente(solicitud);
    const esCierre = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO;
    const esProrroga = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE;
    const estadoGlobal = solicitud?.estado || solicitud?.estadoGlobal || '';
    const esParcial = estadoGlobal.toLowerCase().includes('parcial');

    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        {esCierre ? (
          <StatusChip status="cierre_requerido" label="Cierre requerido" />
        ) : esProrroga ? (
          <StatusChip status="prorroga_disponible" label="Prórroga disponible" />
        ) : (
          <StatusChip status="seguimiento_requerido" label="Seg. requerido" />
        )}
        {esParcial && (
          <StatusChip status="parcial" label={estadoGlobal} />
        )}
      </div>
    );
  };

  const cierresRequeridos = cotizaciones.filter((c) => (
    obtenerResumenSeguimientoCliente(c).estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO
  ));
  const pendientesSeguimiento = cotizaciones.filter((c) => (
    obtenerResumenSeguimientoCliente(c).estado !== ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO
  ));

  const cotizacionesVisibles = pestana === 'cierre' ? cierresRequeridos
    : pestana === 'seguimiento' ? pendientesSeguimiento
    : cotizaciones;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="flex flex-col w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[90vh] bg-white rounded-none sm:rounded-[10px] border-0 sm:border border-[var(--detalle-border)] shadow-2xl overflow-hidden animate-in fade-in duration-150">
        
        {/* Cabecera con var(--tf-color-sidebar) */}
        <header
          style={{ backgroundColor: 'var(--tf-color-sidebar)' }}
          className="flex items-center justify-between px-5 py-4 text-white border-b border-white/10 gap-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-[16px] font-semibold text-white tracking-normal m-0 leading-tight">
                Cotizaciones pendientes de seguimiento
              </h2>
              <span className="rounded-[6px] bg-white/15 px-2 py-0.5 text-[12px] font-medium tabular-nums text-slate-200">
                {cotizaciones.length}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-slate-300 font-normal leading-normal">
              Solicitudes con al menos un ítem cotizado fuera de su vigencia configurada sin seguimiento comercial.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onVolver) onVolver();
              else navigate('/vendedor');
            }}
            className="inline-flex h-[36px] items-center gap-1.5 rounded-[6px] border border-white/20 bg-white/10 px-3 text-[12px] font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Regresar</span>
          </button>
        </header>

        {/* Pestañas de filtrado (Todas / Cierre requerido / Seguimiento requerido) */}
        <nav
          className="grid grid-cols-3 gap-1.5 border-y border-[var(--detalle-border)] bg-[var(--detalle-surface)] px-2 sm:px-5"
          aria-label="Filtro de cotizaciones"
        >
          {[
            ['todas', 'Todas', cotizaciones.length],
            ['cierre', 'Cierre requerido', cierresRequeridos.length],
            ['seguimiento', 'Seguimiento requerido', pendientesSeguimiento.length]
          ].map(([valor, etiqueta, total]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setPestana(valor)}
              aria-pressed={pestana === valor}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-2 text-center text-[12px] leading-tight transition-colors cursor-pointer sm:flex-row sm:gap-1.5 sm:py-3 sm:text-[13px] ${
                pestana === valor
                  ? 'border-[var(--tf-color-brand)] text-[var(--detalle-text)] font-semibold'
                  : 'border-transparent text-[var(--detalle-text-muted)] font-medium hover:text-[var(--detalle-text)]'
              }`}
            >
              <span className="min-w-0">{etiqueta}</span>
              <span className="shrink-0 text-[11px] text-[var(--detalle-text-subtle)] font-normal tabular-nums">({total})</span>
            </button>
          ))}
        </nav>

        {/* Contenido: Tabla Desktop / Cards Móvil */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-[var(--detalle-surface-muted)] p-3 sm:p-6">
          
          {cotizacionesVisibles.length === 0 ? (
            <div className="py-12 text-center text-[13px] font-medium text-[var(--detalle-text-muted)]">
              No hay cotizaciones en esta pestaña.
            </div>
          ) : (
            <>
              {/* Vista Desktop (≥ 768px): fixed layout sin desborde horizontal en ≥ 1100px */}
              <div className="hidden md:block rounded-[10px] border border-[var(--detalle-border)] bg-[var(--detalle-surface)] overflow-x-auto">
                <table className="w-full text-left" style={{ tableLayout: 'fixed', minWidth: '980px' }}>
                  <colgroup>
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                  </colgroup>
                  <thead
                    style={{ backgroundColor: 'var(--tf-color-sidebar)' }}
                    className="sticky top-0 z-10 text-[11px] font-semibold uppercase tracking-wider text-slate-200"
                  >
                    <tr>
                      <th className="px-4 py-3">Solicitud</th>
                      <th className="px-4 py-3">Cliente / Ítems</th>
                      <th className="px-4 py-3">Fecha resp.</th>
                      <th className="px-4 py-3">Tiempo</th>
                      <th className="px-4 py-3 text-right">Aéreo</th>
                      <th className="px-4 py-3 text-right">Marítimo</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--detalle-border)] bg-white text-[13px]">
                    {cotizacionesVisibles.map((c) => {
                      const esPedido = c.tipo === 'Pedido Manual';
                      const itemsEst = c.itemsEstancados || [];
                      const totalAereoEst = c.totalesEstancados?.totalAereo ?? c.totalAereo;
                      const totalMaritimoEst = c.totalesEstancados?.totalMaritimo ?? c.totalMaritimo;

                      return (
                        <tr key={c.id} className="hover:bg-[var(--detalle-surface-muted)] transition-colors">
                          {/* Solicitud: ref mono + chips */}
                          <td className="px-4 py-3.5 align-top">
                            <span className="font-mono text-[12px] font-semibold text-[var(--detalle-text)]">
                              #{c.correlativo || 'S/N'}
                            </span>
                            {renderChipsEstado(c)}
                          </td>

                          {/* Cliente e ítems estancados: máx 2 visibles + N más */}
                          <td className="px-4 py-3.5 align-top">
                            <div className="font-semibold text-[var(--detalle-text)] truncate" title={c.cliente || 'No especificado'}>
                              {c.cliente || 'No especificado'}
                            </div>
                            {itemsEst.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                {itemsEst.slice(0, 2).map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--detalle-border)] bg-[var(--detalle-surface-muted)] px-1.5 py-0.5 text-[11px] text-[var(--detalle-text)] max-w-[170px]"
                                    title={it.descripcion || it.desc}
                                  >
                                    <Package size={10} className="text-[var(--detalle-text-subtle)] shrink-0" />
                                    <span className="truncate">{it.descripcion || it.desc}</span>
                                    <span className="font-mono text-[10px] text-[var(--detalle-accent-danger)] font-semibold shrink-0">
                                      ({it._diasItem || c.diasTranscurridos}d)
                                    </span>
                                  </span>
                                ))}
                                {itemsEst.length > 2 && (
                                  <span className="text-[11px] font-medium text-[var(--detalle-text-muted)]">
                                    +{itemsEst.length - 2} más
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Fecha de respuesta */}
                          <td className="px-4 py-3.5 align-top text-[12px] text-[var(--detalle-text-muted)] tabular-nums whitespace-nowrap">
                            {formatFechaHora(c.fechaRespuestaCompradorParsed)}
                          </td>

                          {/* Tiempo: texto con punto en tono vencida, sin bloque rojo sólido */}
                          <td className="px-4 py-3.5 align-top">
                            <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--detalle-text)] tabular-nums">
                              <span
                                className="w-2 h-2 rounded-full bg-[var(--detalle-accent-danger)] shrink-0 transition-opacity"
                                style={{ opacity: obtenerIntensidadAntiguedad(c.diasTranscurridos) }}
                                aria-hidden="true"
                              />
                              <span>{c.diasTranscurridos}d</span>
                            </div>
                          </td>

                          {/* Aéreo: alineado derecha, tabular-nums */}
                          <td className="px-4 py-3.5 align-top text-right">
                            <div className="font-mono text-[12px] font-semibold text-[var(--detalle-text)] tabular-nums">
                              {formatDinero(totalAereoEst)}
                            </div>
                          </td>

                          {/* Marítimo: alineado derecha, tabular-nums */}
                          <td className="px-4 py-3.5 align-top text-right">
                            <div className="font-mono text-[12px] font-semibold text-[var(--detalle-text)] tabular-nums">
                              {esPedido ? '—' : formatDinero(totalMaritimoEst)}
                            </div>
                          </td>

                          {/* Acción: botón de 32px con var(--tf-color-brand-strong) */}
                          <td className="px-4 py-3.5 align-top text-right">
                            <button
                              type="button"
                              onClick={() => handleIrADetalle(c)}
                              style={{ backgroundColor: 'var(--tf-color-brand-strong)' }}
                              className="inline-flex h-[32px] w-full items-center justify-center gap-1 rounded-[6px] px-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
                            >
                              <span>Atender</span>
                              <ArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista Móvil (< 768px): Tarjetas discretas */}
              <div className="md:hidden space-y-3">
                {cotizacionesVisibles.map((c) => {
                  const esPedido = c.tipo === 'Pedido Manual';
                  const itemsEst = c.itemsEstancados || [];
                  const totalAereoEst = c.totalesEstancados?.totalAereo ?? c.totalAereo;
                  const totalMaritimoEst = c.totalesEstancados?.totalMaritimo ?? c.totalMaritimo;

                  return (
                    <article
                      key={c.id}
                      className="rounded-[10px] border border-[var(--detalle-border)] bg-[var(--detalle-surface)] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-[var(--detalle-border)] pb-2.5">
                        <div>
                          <span className="font-mono text-[13px] font-semibold text-[var(--detalle-text)]">
                            #{c.correlativo || 'S/N'}
                          </span>
                          {renderChipsEstado(c)}
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--detalle-text)] tabular-nums">
                          <span
                            className="w-2 h-2 rounded-full bg-[var(--detalle-accent-danger)] shrink-0 transition-opacity"
                            style={{ opacity: obtenerIntensidadAntiguedad(c.diasTranscurridos) }}
                            aria-hidden="true"
                          />
                          <span>{c.diasTranscurridos}d</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--detalle-text-subtle)] font-medium">
                          <UserRound size={13} />
                          <span>Cliente:</span>
                        </div>
                        <div className="text-[13px] font-semibold text-[var(--detalle-text)] break-words leading-snug mt-0.5">
                          {c.cliente || 'Sin cliente'}
                        </div>
                      </div>

                      {itemsEst.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-medium text-[var(--detalle-text-subtle)] block">
                            Ítems estancados ({itemsEst.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {itemsEst.slice(0, 2).map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1 rounded-[4px] border border-[var(--detalle-border)] bg-[var(--detalle-surface-muted)] px-2 py-1 text-[11px] text-[var(--detalle-text)]"
                              >
                                <Package size={12} className="text-[var(--detalle-text-subtle)] shrink-0" />
                                <span className="font-medium truncate max-w-[180px]">
                                  {it.descripcion || it.desc}
                                </span>
                                <span className="font-mono text-[10px] font-semibold text-[var(--detalle-accent-danger)] shrink-0">
                                  ({it._diasItem || c.diasTranscurridos}d)
                                </span>
                              </div>
                            ))}
                            {itemsEst.length > 2 && (
                              <span className="text-[11px] font-medium text-[var(--detalle-text-muted)] self-center">
                                +{itemsEst.length - 2} más
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[12px] pt-1">
                        <div className="rounded-[6px] border border-[var(--detalle-border)] bg-[var(--detalle-surface-muted)] p-2">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--detalle-text-subtle)]">
                            <Plane size={13} /> Aéreo
                          </div>
                          <div className="font-mono font-semibold text-[var(--detalle-text)] mt-0.5 tabular-nums">
                            {formatDinero(totalAereoEst)}
                          </div>
                        </div>
                        <div className="rounded-[6px] border border-[var(--detalle-border)] bg-[var(--detalle-surface-muted)] p-2">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--detalle-text-subtle)]">
                            <Ship size={13} /> Marítimo
                          </div>
                          <div className="font-mono font-semibold text-[var(--detalle-text)] mt-0.5 tabular-nums">
                            {esPedido ? '—' : formatDinero(totalMaritimoEst)}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleIrADetalle(c)}
                          style={{ backgroundColor: 'var(--tf-color-brand-strong)' }}
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[6px] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
                        >
                          <span>Atender</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

        </div>

        {/* Nota del pie con 12px muted y enlace de texto */}
        <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-[var(--detalle-border)] bg-[var(--detalle-surface-muted)] px-5 py-3 text-[12px] text-[var(--detalle-text-muted)]">
          <span>
            {cierresRequeridos.length > 0
              ? 'Las solicitudes con cierre requerido deben resolverse como pedido o venta perdida para desbloquear nuevas solicitudes.'
              : 'Debe registrar seguimiento, pedido, contraoferta o venta perdida para desbloquear nuevas solicitudes.'}
            {' '}Totales calculados sobre los ítems estancados.
          </span>
          <button
            type="button"
            onClick={() => {
              if (onVolver) onVolver();
              else navigate('/vendedor');
            }}
            className="font-medium text-[var(--detalle-text)] underline hover:text-[var(--tf-color-brand-strong)] transition-colors cursor-pointer shrink-0"
          >
            Ir al listado principal
          </button>
        </footer>

      </div>
    </div>
  );
};
