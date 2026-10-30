import React from 'react';
import { CalendarClock } from 'lucide-react';
import { ESTADOS_SEGUIMIENTO_CLIENTE } from '../../utils/seguimientoCliente';
import { DecisionPanel } from '../detalle/DecisionPanel';
import { AccionesRespuestaProrroga } from './AccionesRespuestaProrroga';
import { calcularDiasHabilesEntre } from '../../utils/diasHabiles';

const formatearFecha = (fecha) => fecha
  ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: 'America/El_Salvador' }).format(fecha)
  : 'Sin fecha';

/** Adaptador visual compartido; conserva la API existente del banner de seguimiento. */
export const SeguimientoClienteBanner = ({
  resumen,
  puedeMarcarRevision = false,
  onMarcarRevision,
  etiquetaAccion = 'Mantener en revisión',
  cantidadItemsAccion = null,
  puedeSolicitarProrroga = false,
  prorrogaPendiente = false,
  solicitud,
  role
}) => {
  if (!resumen) return null;

  if (resumen.solicitudCerrada) {
    const revisiones = Number(resumen.revisionesTotales || 0);
    const prorrogas = Number(resumen.prorrogasTotales || 0);
    return (
      <DecisionPanel
        role={role}
        tone="success"
        title={`Solicitud cerrada · ${resumen.estadoCierre || 'Completado'}`}
        resolved
        meta={`Tuvo ${revisiones} ${revisiones === 1 ? 'revisión' : 'revisiones'} · ${prorrogas} ${prorrogas === 1 ? 'prórroga' : 'prórrogas'}`}
      />
    );
  }

  const esCierre = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.CIERRE_REQUERIDO;
  const esRevision = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.EN_REVISION;
  const esVencido = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.ALERTA_INICIAL;
  const esProrrogaDisponible = resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.PRORROGA_DISPONIBLE;
  const esProrrogaAprobada = resumen.estadoProrroga === 'aprobada';
  const esProrrogaRechazada = resumen.estadoProrroga === 'rechazada';
  const esPendiente = resumen.estadoProrroga === 'pendiente' || prorrogaPendiente;

  if (!resumen.nivelAviso && resumen.estado === ESTADOS_SEGUIMIENTO_CLIENTE.VIGENTE && !esProrrogaAprobada && !esPendiente && !esProrrogaRechazada) return null;

  const tone = esCierre || esVencido || esProrrogaRechazada ? 'danger'
    : esProrrogaAprobada ? 'success'
      : esRevision || esProrrogaDisponible || esPendiente ? 'info' : 'warning';

  const title = esCierre ? 'Cierre requerido'
    : esPendiente ? 'Prórroga pendiente de Compras'
      : esProrrogaRechazada ? 'Prórroga rechazada'
        : esRevision ? 'Revisión en curso'
          : esProrrogaDisponible ? 'Prórroga formal disponible'
            : esProrrogaAprobada ? 'Prórroga aprobada'
              : esVencido ? 'Seguimiento requerido' : 'Solicitud próxima a vencer';

  const description = esCierre
    ? 'El período adicional venció. Debes cerrar los ítems pendientes como pedido o venta perdida.'
    : esPendiente
      ? <><span>Se solicitaron {resumen.diasProrrogaSolicitados} días hábiles adicionales.</span>{resumen.motivoProrroga && <span> Motivo: {resumen.motivoProrroga}</span>}</>
      : esProrrogaRechazada
        ? <><span>Compras rechazó la solicitud.</span>{resumen.respuestaProrroga && <span> {resumen.respuestaProrroga}</span>}</>
        : esRevision
          ? `La revisión está activa. Quedan ${resumen.diasRestantes} días hábiles.`
          : esProrrogaDisponible
            ? 'Ya se utilizaron las revisiones permitidas. Solicita una prórroga formal si el cliente necesita más tiempo.'
            : esProrrogaAprobada
              ? `Compras aprobó ${resumen.diasProrrogaAprobados} días hábiles adicionales.`
              : esVencido
                ? 'La vigencia configurada venció. Mantén la solicitud en revisión o solicita una prórroga formal.'
                : 'La solicitud está próxima a vencer. Conviene dar seguimiento con el cliente.';

  const fechaLimite = (esProrrogaAprobada || esPendiente) && resumen.fechaFinProrroga
    ? resumen.fechaFinProrroga
    : resumen.fechaAlertaInicial;

  const ahora = new Date();
  const horasHastaLimite = fechaLimite ? Math.ceil((fechaLimite.getTime() - ahora.getTime()) / (60 * 60 * 1000)) : null;
  const vencida = esCierre || Boolean(fechaLimite && ahora >= fechaLimite);
  const diasHastaLimite = fechaLimite && !vencida ? calcularDiasHabilesEntre(ahora, fechaLimite) : 0;
  const diasDesdeVencimiento = fechaLimite && vencida ? calcularDiasHabilesEntre(fechaLimite, ahora) : 0;
  const horasTranscurridasDesdeVencimiento = Number(horasHastaLimite) < 0 ? Math.abs(Number(horasHastaLimite)) : null;

  // B: "Vencida hace" cuando está vencida; valor sin la palabra "vencidos"
  const etiquetaTiempo = vencida ? 'Vencida hace' : 'Tiempo restante';
  const valorTiempo = !fechaLimite
    ? 'Sin fecha definida'
    : vencida
      ? horasTranscurridasDesdeVencimiento !== null && horasTranscurridasDesdeVencimiento < 24
        ? `${horasTranscurridasDesdeVencimiento} horas`
        : `${diasDesdeVencimiento} días hábiles`
      : diasHastaLimite === 0 && horasHastaLimite !== null
        ? `${Math.max(0, horasHastaLimite)} horas`
        : `${diasHastaLimite} días hábiles`;

  const etiquetaAccionBase = !puedeMarcarRevision && puedeSolicitarProrroga
    ? 'Solicitar prórroga'
    : etiquetaAccion;
  const etiquetaAccionCompleta = cantidadItemsAccion === null
    ? etiquetaAccionBase
    : `${etiquetaAccionBase} (${cantidadItemsAccion})`;
  const actions = (puedeMarcarRevision || puedeSolicitarProrroga) && !esCierre && !esPendiente
    ? [{ label: etiquetaAccionCompleta, icon: <CalendarClock size={15} />, onClick: onMarcarRevision }]
    : [];

  // B: prórroga solicitada — quita "· estado" cuando el chip ya refleja ese estado
  const prorrogaFacts = resumen.estadoProrroga ? [{
    label: 'Prórroga solicitada',
    value: `${resumen.diasProrrogaSolicitados || resumen.diasProrrogaAprobados || 0} días hábiles`
  }] : [];

  const facts = [
    ...prorrogaFacts,
    { label: esPendiente ? 'Fecha solicitada hasta' : 'Fecha límite', value: formatearFecha(fechaLimite), overdue: vencida },
    { label: etiquetaTiempo, value: valorTiempo, overdue: vencida }
  ];

  // B: chip — esCierre al inicio de la cadena → "Vencida", no "Aprobada"
  const status = esCierre ? 'vencida'
    : esPendiente ? 'pendiente'
      : esProrrogaAprobada ? 'aprobada'
        : esProrrogaRechazada ? 'rechazada'
          : esVencido ? 'vencida' : 'info';

  const statusLabel = esCierre ? 'Vencida'
    : esPendiente ? 'Pendiente'
      : esProrrogaAprobada ? 'Aprobada'
        : esProrrogaRechazada ? 'Rechazada'
          : esVencido ? 'Vencida' : 'Seguimiento';

  return (
    <DecisionPanel
      role={role}
      tone={tone}
      title={title}
      meta={{ status, label: statusLabel }}
      description={description}
      facts={facts}
      actions={actions}
      actionContent={esPendiente ? <AccionesRespuestaProrroga solicitud={solicitud} prorroga={solicitud?.prorrogaCliente} role={role} compacto /> : null}
    >
      {esProrrogaAprobada && (
        <span className="block">
          Vigencia: {formatearFecha(resumen.fechaInicioProrroga)} → {formatearFecha(resumen.fechaFinProrroga)} · aprobada por {resumen.respondidoPorProrroga || 'Compras'}{resumen.fechaRespuestaProrroga ? ` · ${formatearFecha(resumen.fechaRespuestaProrroga)}` : ''}
        </span>
      )}
      {esProrrogaRechazada && resumen.respondidoPorProrroga && (
        <span className="block">
          Respondida por {resumen.respondidoPorProrroga}{resumen.fechaRespuestaProrroga ? ` · ${formatearFecha(resumen.fechaRespuestaProrroga)}` : ''}
        </span>
      )}
    </DecisionPanel>
  );
};
