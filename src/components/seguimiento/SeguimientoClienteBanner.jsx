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
  puedeSolicitarProrroga = false,
  prorrogaPendiente = false,
  solicitud,
  role
}) => {
  if (!resumen) return null;

  if (resumen.solicitudCerrada) {
    const revisiones = Number(resumen.revisionesTotales || 0);
    const prorrogas = Number(resumen.prorrogasTotales || 0);
    return <DecisionPanel role={role} tone="success" title={`Solicitud cerrada · ${resumen.estadoCierre || 'Completado'}`} resolved meta={`Tuvo ${revisiones} ${revisiones === 1 ? 'revisión' : 'revisiones'} · ${prorrogas} ${prorrogas === 1 ? 'prórroga' : 'prórrogas'}`} />;
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
      ? <>Se solicitaron {resumen.diasProrrogaSolicitados} días hábiles adicionales. {resumen.motivoProrroga && <span>Motivo: {resumen.motivoProrroga}</span>}</>
      : esProrrogaRechazada
        ? <>Compras rechazó la solicitud. {resumen.respuestaProrroga && <span>{resumen.respuestaProrroga}</span>}</>
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
  const tiempoRestante = !fechaLimite
    ? 'Sin fecha definida'
    : vencida
    ? horasTranscurridasDesdeVencimiento !== null && horasTranscurridasDesdeVencimiento < 24
      ? `${horasTranscurridasDesdeVencimiento} horas vencidas`
      : `${diasDesdeVencimiento} días vencidos`
    : diasHastaLimite === 0 && horasHastaLimite !== null
      ? `${Math.max(0, horasHastaLimite)} horas`
      : `${diasHastaLimite} días hábiles`;
  const actions = (puedeMarcarRevision || puedeSolicitarProrroga) && !esCierre && !esPendiente
    ? [{ label: esProrrogaDisponible || (!puedeMarcarRevision && puedeSolicitarProrroga) ? 'Solicitar prórroga' : etiquetaAccion, icon: <CalendarClock size={15} />, onClick: onMarcarRevision }]
    : [];
  const facts = [
    ...(resumen.estadoProrroga ? [{ label: 'Prórroga solicitada', value: `${resumen.diasProrrogaSolicitados || resumen.diasProrrogaAprobados || 0} días hábiles · ${resumen.estadoProrroga}` }] : []),
    { label: esPendiente ? 'Fecha solicitada hasta' : 'Fecha límite', value: formatearFecha(fechaLimite), overdue: vencida },
    { label: 'Tiempo restante', value: tiempoRestante, overdue: vencida }
  ];
  const status = esPendiente ? 'pending' : esProrrogaAprobada ? 'aprobada' : esProrrogaRechazada ? 'rechazada' : esCierre || esVencido ? 'vencida' : 'info';
  const statusLabel = esPendiente ? 'Pendiente' : esProrrogaAprobada ? 'Aprobada' : esProrrogaRechazada ? 'Rechazada' : esCierre || esVencido ? 'Vencida' : 'Seguimiento';

  return (
    <DecisionPanel role={role} tone={tone} title={title} meta={{ status, label: statusLabel }} description={description} facts={facts} actions={actions} actionContent={esPendiente ? <AccionesRespuestaProrroga solicitud={solicitud} prorroga={solicitud?.prorrogaCliente} role={role} compacto /> : null}>
      {esProrrogaAprobada && <span className="block">Vigencia: {formatearFecha(resumen.fechaInicioProrroga)} → {formatearFecha(resumen.fechaFinProrroga)} · aprobada por {resumen.respondidoPorProrroga || 'Compras'}{resumen.fechaRespuestaProrroga ? ` · ${formatearFecha(resumen.fechaRespuestaProrroga)}` : ''}</span>}
      {esProrrogaRechazada && resumen.respondidoPorProrroga && <span className="block">Respondida por {resumen.respondidoPorProrroga}{resumen.fechaRespuestaProrroga ? ` · ${formatearFecha(resumen.fechaRespuestaProrroga)}` : ''}</span>}
    </DecisionPanel>
  );
};
