import { obtenerTipoDecisionItem } from '../decisionItemHelpers';
import { normalizarItemVentaPerdida } from '../ventasPerdidasHelpers';

export const obtenerDetalleDecisionExportable = (item = {}, solicitud = {}, indice = 0, { aplicarMotivoGlobal = false } = {}) => {
  const esVentaPerdida = item.estadoItem === 'Venta Perdida'
    || Boolean(item.motivoVentaPerdida)
    || (aplicarMotivoGlobal && (solicitud.estado === 'Venta Perdida' || Boolean(solicitud.motivoVentaPerdida)));

  if (esVentaPerdida) {
    const motivo = normalizarItemVentaPerdida({ item, solicitud, fallbackIndex: indice });
    const registradoPor = obtenerNombreRegistrador(
      item.registradoPorNombre || item.nombreRegistradoPor || motivo.registradoPor,
      item,
      solicitud
    );
    return {
      motivo: motivo.motivoNombre || 'Venta perdida',
      comentario: motivo.comentario || '---',
      registradoPor
    };
  }

  const tipoDecision = obtenerTipoDecisionItem(item);
  if (!tipoDecision) {
    return {
      motivo: '---',
      comentario: '---',
      registradoPor: '---'
    };
  }

  const motivo = tipoDecision === 'rechazo'
    ? item.motivoRechazo || item.motivoEstadoItem
    : tipoDecision === 'denegacion'
      ? item.motivoDenegacion || item.motivoEstadoItem
      : item.motivoAnulacion || item.motivoEstadoItem;
  return {
    motivo: motivo || 'Sin motivo registrado',
    comentario: '---',
    registradoPor: obtenerNombreRegistrador(
      tipoDecision === 'anulacion' ? item.anuladoPor : item.negociacion?.ultimoCambio?.nombre,
      item,
      solicitud
    )
  };
};

function obtenerNombreRegistrador(valor, item = {}, solicitud = {}) {
  const candidatos = [
    valor,
    item.registradoPorNombre,
    item.nombreRegistradoPor,
    item.anuladoPorNombre,
    item.negociacion?.ultimoCambio?.nombre,
    solicitud.vendedorNombre,
    solicitud.vendedor
  ];
  const nombre = candidatos.find((candidato) => {
    const texto = String(candidato || '').trim();
    return texto && !texto.includes('@') && !['Vendedor', 'Compras', 'Usuario'].includes(texto);
  });
  return nombre || (valor && !String(valor).includes('@') ? String(valor).trim() : '---');
}
