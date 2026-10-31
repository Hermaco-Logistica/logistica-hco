import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal, ModalBoton, ModalCallout, ModalCuerpo, ModalDetalle, ModalEncabezado, ModalPie, ModalSeccion } from '../../../components/Modal';
import { ArrowRight, CalendarClock, Check, ChevronDown, ChevronUp, Inbox, MessageCircleQuestion, MessageSquareText, Send, X } from 'lucide-react';
import { completarAnclasProrroga, obtenerFechaVencimientoProrroga, obtenerFechasVencimientoProrroga } from '../../../utils/prorrogasCliente';
import { StatusChip } from '../../../components/detalle/StatusChip';
import { textoDeRol } from '../../../utils/etiquetas';
import { ProrrogaItemsAfectados } from './ProrrogaItemsAfectados';

const LIMITE_CARACTERES_MOTIVO = 50;

const obtenerFecha = (fecha) => {
  if (!fecha) return null;
  if (typeof fecha.toDate === 'function') return fecha.toDate();
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  return Number.isNaN(valor.getTime()) ? null : valor;
};

const fechaTexto = (fecha) => {
  const valor = obtenerFecha(fecha);
  return valor
    ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: 'America/El_Salvador' }).format(valor)
    : 'Sin fecha';
};

const fechasTexto = (fechas = []) => {
  const ordenadas = fechas.filter(Boolean).slice().sort((a, b) => a - b);
  const unicas = [...new Set(ordenadas.map(fechaTexto))];
  if (!unicas.length) return 'Sin fecha';
  return unicas.length === 1 ? unicas[0] : `${unicas[0]} – ${unicas[unicas.length - 1]}`;
};

/** Contenedor que anima suavemente su altura al abrir y cerrar. El contenido se monta la primera vez que se abre. */
const ExpansionSuave = ({ abierto, montado, children }) => (
  <div className="prorrogas-expand" data-abierto={abierto} inert={!abierto}>
    <div className="prorrogas-expand__inner">{montado && children}</div>
  </div>
);

/** Menú desplegable para comprador con prórroga pendiente: Atender, Aceptar o Rechazar (portaled a document.body) */
const AccionesDropdown = ({ solicitud, record, onAtender, onResponder }) => {
  const [abierto, setAbierto] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0, openUpward: false });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const toggleDropdown = () => {
    if (abierto) {
      setAbierto(false);
    } else if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 150;
      setCoords({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
        openUpward
      });
      setAbierto(true);
    }
  };

  useEffect(() => {
    if (!abierto) return;
    const clickAfuera = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setAbierto(false);
      }
    };
    const handleClose = () => setAbierto(false);

    document.addEventListener('pointerdown', clickAfuera);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);

    return () => {
      document.removeEventListener('pointerdown', clickAfuera);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className="prorrogas-btn-action prorrogas-btn-action--atender font-semibold"
        aria-expanded={abierto}
      >
        <span>Acción</span>
        <ChevronDown size={13} className={`transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: coords.openUpward ? undefined : `${coords.top}px`,
            bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : undefined,
            right: `${coords.right}px`,
            zIndex: 9999
          }}
          className="min-w-[150px] rounded-[8px] border border-[var(--detalle-border)] bg-[var(--detalle-surface)] p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              onAtender(solicitud);
            }}
            className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[12px] font-semibold text-[var(--detalle-text)] hover:bg-[var(--detalle-surface-muted)] transition-colors cursor-pointer text-left"
          >
            <ArrowRight size={13} className="shrink-0 text-[var(--detalle-text-muted)]" />
            <span>Atender</span>
          </button>

          <div className="my-1 border-t border-[var(--detalle-border)]" />

          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              onResponder(solicitud, record.prorroga, 'aprobada');
            }}
            className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[12px] font-semibold text-[var(--detalle-accent-success)] hover:bg-[var(--detalle-bg-success)] transition-colors cursor-pointer text-left"
          >
            <Check size={13} className="shrink-0" />
            <span>Aceptar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              onResponder(solicitud, record.prorroga, 'rechazada');
            }}
            className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[12px] font-semibold text-[var(--detalle-accent-danger)] hover:bg-[var(--detalle-bg-danger)] transition-colors cursor-pointer text-left"
          >
            <X size={13} className="shrink-0" />
            <span>Rechazar</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

/** Presenta una prórroga o evento de revisión en tarjeta móvil o fila de escritorio. */
export const ProrrogaRegistro = ({ record, view, puedeResponder, onAtender, onResponder, mostrarVendedor = true, rol }) => {
  const [expandido, setExpandido] = useState(false);
  const [itemsMontados, setItemsMontados] = useState(false);
  const [modalMotivoOpen, setModalMotivoOpen] = useState(false);
  const { solicitud } = record;
  const esRevision = record.tipo === 'revision';
  const cierreRegistro = record.cierre;
  const registroCerrado = Boolean(cierreRegistro?.cerrado);

  let statusKey = 'info';
  let statusLabel = '';
  let descripcionEstado = '';
  let metadatos = [];
  let gridMobileFacts = [];
  let plazoFilas = [];

  if (esRevision) {
    const { revision, item } = record;
    const ultimaRevision = Number(revision.numero || 0) >= Number(item.seguimientoCliente?.cantidadRevisiones || 0);
    const vencimiento = obtenerFecha(revision.fechaVencimientoRevision);
    const vencida = Boolean(vencimiento && vencimiento <= new Date());

    if (registroCerrado) {
      statusKey = 'resuelta';
      statusLabel = 'Cerrada';
    } else if (!ultimaRevision) {
      statusKey = 'reprogramada';
      statusLabel = 'Reprogramada';
    } else if (vencida) {
      statusKey = 'plazo_vencido';
      statusLabel = 'Plazo vencido';
    } else {
      statusKey = 'en_revision';
      statusLabel = 'En revisión';
    }

    descripcionEstado = [
      revision.comentario || `Revisión ${revision.numero || item.seguimientoCliente?.cantidadRevisiones || 1} · Ítem ${record.indiceItem + 1}`,
      cierreRegistro?.motivo
    ].filter(Boolean).join(' · ');
    metadatos = [
      ['Tiempo adicional', revision.diasExtension ? `${revision.diasExtension} días hábiles` : 'Según validez'],
      ['Vencimiento base', fechaTexto(revision.fechaInicioRevision)],
      ['Revisión hasta', fechaTexto(revision.fechaVencimientoRevision)],
      ['Registrada', fechaTexto(revision.fechaRevision)],
      ['Registrada por', revision.registradoPor || solicitud.vendedorEmail || 'Vendedor']
    ];

    plazoFilas = [
      { icono: CalendarClock, etiqueta: 'Revisión hasta', valor: fechaTexto(revision.fechaVencimientoRevision), destacada: true },
      { icono: Inbox, etiqueta: 'Base', valor: fechaTexto(revision.fechaInicioRevision) },
      { icono: Send, etiqueta: 'Registrada', valor: fechaTexto(revision.fechaRevision) }
    ];

    gridMobileFacts = [
      { label: 'Revisión hasta', value: fechaTexto(revision.fechaVencimientoRevision), highlight: true },
      { label: 'Tiempo adicional', value: revision.diasExtension ? `${revision.diasExtension} días` : 'Según validez', highlight: true },
      { label: 'Vencimiento base', value: fechaTexto(revision.fechaInicioRevision), highlight: false },
      { label: 'Registrada por', value: revision.registradoPor || solicitud.vendedorEmail || 'Vendedor', highlight: false }
    ];
  } else {
    const { prorroga } = record;
    const aprobada = prorroga.estado === 'aprobada';
    const pendiente = prorroga.estado === 'pendiente';

    statusKey = registroCerrado ? 'resuelta' : pendiente ? 'pendiente' : aprobada ? 'aprobada' : 'rechazada';
    statusLabel = registroCerrado ? 'Cerrada' : pendiente ? 'Pendiente' : aprobada ? 'Aprobada' : 'Rechazada';

    const prorrogaConAnclas = completarAnclasProrroga(solicitud, prorroga);
    const fechas = obtenerFechasVencimientoProrroga(prorrogaConAnclas);
    const fechaFinal = obtenerFechaVencimientoProrroga(prorrogaConAnclas);
    const fechasFinales = fechas.map(({ fechaFin }) => fechaFin);
    const nuevaFechaLimiteStr = fechasTexto(fechasFinales.length ? fechasFinales : [fechaFinal]);
    const vencimientoBaseStr = fechasTexto(fechas.map(({ fechaInicio }) => fechaInicio));

    metadatos = [
      ['Nueva fecha límite', nuevaFechaLimiteStr],
      ['Días solicitados', `${prorroga.diasSolicitados || 0} días hábiles`],
      ['Vencimiento base', vencimientoBaseStr],
      ['Días aprobados', aprobada ? `${prorroga.diasAprobados || 0} días hábiles` : '—'],
      ['Solicitada', fechaTexto(prorroga.fechaSolicitud)],
      ['Atendida por', cierreRegistro?.motivo || prorroga.respondidoPor || (pendiente ? 'Pendiente Compras' : 'Sin dato')]
    ];

    plazoFilas = [
      { icono: CalendarClock, etiqueta: 'Nueva límite', valor: nuevaFechaLimiteStr, destacada: true },
      { icono: Inbox, etiqueta: 'Base', valor: vencimientoBaseStr },
      { icono: Send, etiqueta: 'Solicitada', valor: fechaTexto(prorroga.fechaSolicitud) }
    ];

    gridMobileFacts = [
      { label: 'Nueva fecha límite', value: nuevaFechaLimiteStr, highlight: true },
      { label: 'Días solicitados', value: `${prorroga.diasSolicitados || 0} días`, highlight: true },
      { label: 'Vencimiento base', value: vencimientoBaseStr, highlight: false },
      { label: 'Atendida por', value: cierreRegistro?.motivo || prorroga.respondidoPor || (pendiente ? 'Pendiente Compras' : 'Sin dato'), highlight: false }
    ];

    descripcionEstado = [prorroga.motivo || 'Sin comentario del vendedor.', cierreRegistro?.motivo]
      .filter(Boolean)
      .join(' · ');
  }

  const esCompleta = Boolean(record.cobertura?.completa);
  const itemsAfectados = record.cobertura?.itemsAfectados || 0;
  const totalItems = record.cobertura?.totalItems || 0;
  const mostrarDetalleItems = !esCompleta;
  const textoCobertura = esCompleta
    ? `Completa · ${totalItems}/${totalItems} ítems`
    : `Parcial · ${itemsAfectados}/${totalItems} ítems`;

  const resumenEventos = [
    record.cantidadRevisiones > 0 && `${record.cantidadRevisiones} ${record.cantidadRevisiones === 1 ? 'revisión' : 'revisiones'}`,
    record.cantidadProrrogas > 0 && `${record.cantidadProrrogas} ${record.cantidadProrrogas === 1 ? 'prórroga' : 'prórrogas'}`
  ].filter(Boolean).join(' · ');

  const vendedor = solicitud.vendedorNombre || solicitud.vendedorEmail || record.revision?.registradoPor || 'Vendedor';
  const vendedorCorreo = solicitud.vendedorNombre ? solicitud.vendedorEmail : '';
  const cliente = solicitud.cliente || record.prorroga?.cliente || 'Cliente sin nombre';
  const tipo = solicitud.tipo || record.prorroga?.tipoSolicitud || 'RFQ';
  const referencia = solicitud.correlativo || 'Sin ref';
  const rondaSub = esRevision
    ? `${record.cantidadRevisiones || 1} ${record.cantidadRevisiones === 1 ? 'revisión' : 'revisiones'}`
    : `Ronda ${record.prorroga?.ronda || 1}`;

  const esPendiente = !esRevision && record.prorroga?.estado === 'pendiente';
  const mostrarRespuesta = puedeResponder && esPendiente && !registroCerrado;

  const alternarItems = () => {
    setItemsMontados(true);
    setExpandido((prev) => !prev);
  };

  const motivoTextoLimpio = String(descripcionEstado || '').trim();
  const motivoEsLargo = motivoTextoLimpio.length > LIMITE_CARACTERES_MOTIVO;
  const motivoVisible = motivoEsLargo
    ? `${motivoTextoLimpio.slice(0, LIMITE_CARACTERES_MOTIVO).trimEnd()}...`
    : motivoTextoLimpio;

  const tituloMotivo = esRevision ? 'Comentario y datos de la revisión' : 'Motivo y datos de la prórroga';
  const modalMotivoJSX = modalMotivoOpen && (
    <Modal etiqueta={tituloMotivo} onCerrar={() => setModalMotivoOpen(false)}>
      <ModalEncabezado
        titulo={tituloMotivo}
        subtitulo={cliente}
        referencia={`#${referencia}`}
        icono={esRevision ? CalendarClock : MessageSquareText}
        tono={esRevision ? 'aviso' : 'info'}
        onCerrar={() => setModalMotivoOpen(false)}
      />
      <ModalCuerpo>
        <ModalCallout tono="neutral" icono={MessageSquareText}>
          <span className="whitespace-pre-wrap break-words">{motivoTextoLimpio}</span>
        </ModalCallout>
        {metadatos.length > 0 && <ModalDetalle datos={metadatos.map(([etiqueta, valor]) => ({ etiqueta, valor }))} />}
        {!esRevision && record.prorroga?.respuestaComprador && (
          <ModalSeccion etiqueta="Respuesta de Compras">
            <ModalCallout tono="info" icono={MessageSquareText}>{record.prorroga.respuestaComprador}</ModalCallout>
          </ModalSeccion>
        )}
      </ModalCuerpo>
      <ModalPie>
        <ModalBoton variante="primario" tono="neutral" onClick={() => setModalMotivoOpen(false)}>Cerrar</ModalBoton>
      </ModalPie>
    </Modal>
  );

  if (view === 'mobile') {
    return (
      <article className="prorrogas-mobile-card">
        {/* Fila 1: Referencia (mono) + StatusChip */}
        <div className="prorrogas-mobile-head">
          <span className="font-mono text-[12px] font-semibold text-[var(--detalle-text)]">#{referencia}</span>
          <StatusChip status={statusKey} label={statusLabel} />
        </div>

        {/* Título = cliente (14px peso 600, sentence case) */}
        <div>
          <h2 className="prorrogas-mobile-title">{cliente}</h2>
          <div className="mt-1 text-[12px] text-[var(--detalle-text-muted)]">
            {mostrarVendedor ? `${vendedor} · ` : ''}{tipo} · {rondaSub}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--detalle-text-muted)]">
            {esCompleta && <Check size={13} className="text-[var(--detalle-accent-success)]" aria-hidden="true" />}
            <span>{textoCobertura}</span>
            {resumenEventos && <span>· {resumenEventos}</span>}
          </div>
        </div>

        {/* Motivo con recorte a 50 caracteres y Ver más */}
        <div className="text-[13px] leading-snug text-[var(--detalle-text)] m-0">
          <span>{motivoVisible}</span>
          {motivoEsLargo && (
            <button
              type="button"
              onClick={() => setModalMotivoOpen(true)}
              className="ml-1 inline-flex items-center text-[12px] font-semibold text-[var(--detalle-accent-info)] hover:underline cursor-pointer align-baseline"
            >
              Ver más
            </button>
          )}
        </div>

        {/* Ver ítems botón de texto */}
        {mostrarDetalleItems && (
          <div>
            <button
              type="button"
              aria-expanded={expandido}
              onClick={alternarItems}
              className="prorrogas-btn-items"
            >
              <span>{expandido ? 'Ocultar ítems' : 'Ver ítems'}</span>
              <ChevronDown size={13} className={`transition-transform duration-300 ${expandido ? 'rotate-180' : ''}`} />
            </button>
            <ExpansionSuave abierto={expandido} montado={itemsMontados}>
              <div className="mt-2 pt-2 border-t border-[var(--detalle-border)]">
                <ProrrogaItemsAfectados solicitud={solicitud} record={record} />
              </div>
            </ExpansionSuave>
          </div>
        )}

        {/* Línea de 1px + Rejilla 2x2 de datos clave */}
        <div className="prorrogas-mobile-facts">
          {gridMobileFacts.map((fact) => (
            <div
              key={fact.label}
              className={`prorrogas-mobile-fact ${fact.highlight ? 'prorrogas-mobile-fact--highlight' : ''}`}
            >
              <span className="prorrogas-mobile-fact-label">{fact.label}</span>
              <span className="prorrogas-mobile-fact-val">{fact.value}</span>
            </div>
          ))}
        </div>

        {/* Pie con acciones en móvil */}
        <div className="prorrogas-mobile-actions">
          {mostrarRespuesta ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onResponder(solicitud, record.prorroga, 'rechazada')}
                  className="prorrogas-mobile-btn prorrogas-mobile-btn--rechazar"
                >
                  <X size={14} /> Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => onResponder(solicitud, record.prorroga, 'aprobada')}
                  className="prorrogas-mobile-btn prorrogas-mobile-btn--aprobar"
                >
                  <Check size={14} /> Aceptar
                </button>
              </div>
              <button
                type="button"
                onClick={() => onAtender(solicitud)}
                className="prorrogas-mobile-btn prorrogas-mobile-btn--atender"
              >
                Atender <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onAtender(solicitud)}
              className="prorrogas-mobile-btn prorrogas-mobile-btn--atender"
            >
              Atender <ArrowRight size={14} />
            </button>
          )}
        </div>

        {modalMotivoJSX}
      </article>
    );
  }

  // Vista de tabla: Solicitud | Vendedor (si aplica) | Estado | Motivo | Plazo | Acción.
  const columnas = mostrarVendedor ? 6 : 5;
  return (
    <>
      <tr className="prorrogas-tr">
        {/* Solicitud */}
        <td className="prorrogas-td">
          <div className="prorrogas-cell-ref">#{referencia}</div>
          <div className="prorrogas-cell-cliente" title={cliente}>{cliente}</div>
          <div className="prorrogas-cell-sub">{tipo}</div>
        </td>

        {/* Vendedor (se omite cuando quien mira es el propio vendedor) */}
        {mostrarVendedor && (
          <td className="prorrogas-td">
            <div className="prorrogas-cell-vendedor" title={vendedor}>{vendedor}</div>
            {vendedorCorreo && <div className="prorrogas-cell-sub" title={vendedorCorreo}>{vendedorCorreo}</div>}
          </td>
        )}

        {/* Estado + ronda + cobertura + ver ítems */}
        <td className="prorrogas-td">
          <div className="prorrogas-cell-status">
            <StatusChip status={statusKey} label={statusLabel} />
            <div className="prorrogas-status-meta prorrogas-status-meta--ronda">{rondaSub}</div>
            <div className="prorrogas-status-meta">
              {esCompleta && <Check size={12} className="text-[var(--detalle-accent-success)]" aria-hidden="true" />}
              <span>{textoCobertura}</span>
            </div>
            {resumenEventos && (
              <div className="text-[11px] text-[var(--detalle-text-subtle)]">
                {resumenEventos}
              </div>
            )}
            {mostrarDetalleItems && (
              <button
                type="button"
                aria-expanded={expandido}
                onClick={alternarItems}
                className="prorrogas-btn-items"
              >
                <span>{expandido ? 'Ocultar ítems' : 'Ver ítems'}</span>
                <ChevronDown size={13} className={`transition-transform duration-300 ${expandido ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </td>

        {/* Motivo: icono de consulta que abre el resumen */}
        <td className="prorrogas-td">
          <button
            type="button"
            onClick={() => setModalMotivoOpen(true)}
            className="prorrogas-btn-consulta"
            title={esRevision ? 'Consultar comentario de la revisión' : 'Consultar motivo de la prórroga'}
          >
            <MessageCircleQuestion size={13} /> Consulta
          </button>
        </td>

        {/* Plazo: icono + fecha (sin hora) */}
        <td className="prorrogas-td">
          <ul className="prorrogas-fechas">
            {plazoFilas.map((fila) => {
              const Icono = fila.icono;
              const colorRol = textoDeRol(rol);
              return (
                <li key={fila.etiqueta} className={`prorrogas-fecha-fila ${fila.destacada ? 'prorrogas-fecha-fila--destacada' : ''}`}>
                  <Icono size={12} className={`prorrogas-fecha-icono ${colorRol} ${fila.destacada ? '' : 'opacity-60'}`} aria-hidden="true" />
                  <span className="prorrogas-fecha-etiqueta">{fila.etiqueta}:</span>
                  <b className={`prorrogas-fecha-valor ${fila.destacada ? colorRol : 'text-[var(--detalle-text)]'}`}>{fila.valor}</b>
                </li>
              );
            })}
          </ul>
        </td>

        {/* Acción */}
        <td className="prorrogas-td text-right">
          <div className="prorrogas-actions-desktop">
            {mostrarRespuesta ? (
              <AccionesDropdown
                solicitud={solicitud}
                record={record}
                onAtender={onAtender}
                onResponder={onResponder}
              />
            ) : (
              <button
                type="button"
                onClick={() => onAtender(solicitud)}
                className="prorrogas-btn-action prorrogas-btn-action--atender"
              >
                <span>Atender</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Fila de ítems afectados: se abre y se cierra con animación de altura */}
      {mostrarDetalleItems && itemsMontados && (
        <tr className="prorrogas-expanded-row">
          <td colSpan={columnas} className="prorrogas-expanded-cell">
            <ExpansionSuave abierto={expandido} montado={itemsMontados}>
              <div className="prorrogas-expand__contenido">
                <ProrrogaItemsAfectados solicitud={solicitud} record={record} />
              </div>
            </ExpansionSuave>
          </td>
        </tr>
      )}

      {modalMotivoJSX}
    </>
  );
};
