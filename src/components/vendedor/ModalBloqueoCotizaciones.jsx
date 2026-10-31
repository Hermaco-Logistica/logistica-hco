import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Package, Plane, Ship } from 'lucide-react';
import { Modal, ModalBoton, ModalEncabezado, ModalPestanas, ModalPie } from '../Modal';
import { ESTADOS_SEGUIMIENTO_CLIENTE, obtenerResumenSeguimientoCliente } from '../../utils/seguimientoCliente';
import { StatusChip } from '../detalle/StatusChip';
import { Etiqueta } from '../../components/Etiqueta';

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

  const renderChipsEstado = (solicitud, margen = 'mt-1') => {
    const resumen = obtenerResumenSeguimientoCliente(solicitud);
    const esCierre = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO;
    const esProrroga = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE;
    const estadoGlobal = solicitud?.estado || solicitud?.estadoGlobal || '';
    const esParcial = estadoGlobal.toLowerCase().includes('parcial');

    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${margen}`}>
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

  const volver = () => {
    if (onVolver) onVolver();
    else navigate('/vendedor');
  };

  return (
    <Modal etiqueta="Cotizaciones pendientes de seguimiento" variante="pantallaCompleta" ancho="completo" onCerrar={volver} cerrarAlClicFuera={false}>
      <ModalEncabezado
        titulo="Cotizaciones pendientes de seguimiento"
        subtitulo={<span className="hidden sm:inline">Solicitudes con al menos un ítem cotizado fuera de su vigencia configurada sin seguimiento comercial.</span>}
        referencia={`${cotizaciones.length} ${cotizaciones.length === 1 ? 'solicitud' : 'solicitudes'}`}
        icono={AlertTriangle}
        tono="aviso"
        onCerrar={volver}
        compactoMovil
      />

      <div className="px-3 pt-3 sm:px-6 sm:pt-5">
        <ModalPestanas
          etiqueta="Filtro de cotizaciones"
          tono="aviso"
          activa={pestana}
          onElegir={setPestana}
          opciones={[
            { clave: 'todas', texto: 'Todas', cantidad: cotizaciones.length },
            { clave: 'cierre', texto: <><span className="sm:hidden">Cierre</span><span className="hidden sm:inline">Cierre requerido</span></>, cantidad: cierresRequeridos.length },
            { clave: 'seguimiento', texto: <><span className="sm:hidden">Seguim.</span><span className="hidden sm:inline">Seguimiento requerido</span></>, cantidad: pendientesSeguimiento.length }
          ]}
        />
      </div>

        {/* Contenido: Tabla Desktop / Cards Móvil */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-[var(--detalle-surface-muted)] p-2.5 sm:p-6">
          
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
                                  <Etiqueta key={idx} tono="suave" tamano="normal" className="max-w-[170px]" titulo={it.descripcion || it.desc}>
                                    <Package size={10} className="text-[var(--detalle-text-subtle)] shrink-0" />
                                    <span className="truncate">{it.descripcion || it.desc}</span>
                                    <span className="font-mono text-[10px] text-[var(--detalle-accent-danger)] font-semibold shrink-0">
                                      ({it._diasItem || c.diasTranscurridos}d)
                                    </span>
                                  </Etiqueta>
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

              {/* Vista Móvil (< 768px): tarjetas compactas, prioridad a solicitud, cliente, ítems y totales */}
              <div className="md:hidden space-y-2">
                {cotizacionesVisibles.map((c) => {
                  const esPedido = c.tipo === 'Pedido Manual';
                  const itemsEst = c.itemsEstancados || [];
                  const totalAereoEst = c.totalesEstancados?.totalAereo ?? c.totalAereo;
                  const totalMaritimoEst = c.totalesEstancados?.totalMaritimo ?? c.totalMaritimo;

                  return (
                    <article
                      key={c.id}
                      className="space-y-2 rounded-[14px] border border-[var(--detalle-border)] bg-[var(--detalle-surface)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[13px] font-semibold text-[var(--detalle-text)]">
                          #{c.correlativo || 'S/N'}
                        </span>
                        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--detalle-text)] tabular-nums">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-[var(--detalle-accent-danger)]"
                            style={{ opacity: obtenerIntensidadAntiguedad(c.diasTranscurridos) }}
                            aria-hidden="true"
                          />
                          <span>{c.diasTranscurridos}d</span>
                        </div>
                      </div>

                      {renderChipsEstado(c, 'mt-0')}

                      <p className="line-clamp-2 break-words text-[13.5px] font-semibold leading-snug text-[var(--detalle-text)]">
                        {c.cliente || 'Sin cliente'}
                      </p>

                      {itemsEst.length > 0 && (
                        <p className="flex items-start gap-1.5 text-[12px] leading-snug text-[var(--detalle-text-muted)]">
                          <Package size={13} className="mt-px shrink-0 text-[var(--detalle-text-subtle)]" />
                          <span className="min-w-0 line-clamp-2">
                            {itemsEst.slice(0, 2).map((it) => it.descripcion || it.desc).join(' · ')}
                            {itemsEst.length > 2 && <span className="font-semibold"> +{itemsEst.length - 2} más</span>}
                          </span>
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex min-w-0 flex-1 items-center gap-3 font-mono text-[12px] font-semibold tabular-nums text-[var(--detalle-text)]">
                          <span className="inline-flex items-center gap-1"><Plane size={13} className="text-[var(--detalle-text-subtle)]" />{formatDinero(totalAereoEst)}</span>
                          {!esPedido && <span className="inline-flex items-center gap-1"><Ship size={13} className="text-[var(--detalle-text-subtle)]" />{formatDinero(totalMaritimoEst)}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleIrADetalle(c)}
                          style={{ backgroundColor: 'var(--tf-color-brand-strong)' }}
                          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
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

      <ModalPie className="justify-between">
        <span className="hidden min-w-0 flex-1 text-[12.5px] leading-snug text-neutral-500 sm:block">
          {cierresRequeridos.length > 0
            ? 'Las solicitudes con cierre requerido deben resolverse como pedido o venta perdida para desbloquear nuevas solicitudes.'
            : 'Debe registrar seguimiento, pedido, contraoferta o venta perdida para desbloquear nuevas solicitudes.'}
          {' '}Totales calculados sobre los ítems estancados.
        </span>
        <ModalBoton icono={ArrowLeft} onClick={volver} className="w-full sm:w-auto">Ir al listado principal</ModalBoton>
      </ModalPie>
    </Modal>
  );
};
