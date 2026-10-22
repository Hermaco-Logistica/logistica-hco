import { obtenerDecisionItem } from './decisionMetrics';
import {
  esDecisionItem,
  prepararDatosDecisionItem
} from '../../../utils/decisionItemHelpers';

const obtenerDecisionMovimiento = (movimiento = {}) => {
  const solicitud = movimiento.solicitudOriginal || {};
  const item = movimiento.itemOriginal || {};
  const decision = obtenerDecisionItem(solicitud, item);

  if (decision) return decision;
  if (item.estadoItem === 'Anulado' || movimiento.estadoItem === 'Anulado' || solicitud.estado === 'Anulado') return 'Anulado';
  return null;
};

export const tieneMotivoConsultaMovimiento = (movimiento) => {
  if (!movimiento) return false;
  const item = movimiento.itemOriginal || {};
  const solicitud = movimiento.solicitudOriginal || {};

  return Boolean(
    movimiento.motivoAnulacion ||
    movimiento.motivoVentaPerdida ||
    item.motivoVentaPerdida ||
    solicitud.motivoVentaPerdida ||
    esDecisionItem(item) ||
    obtenerDecisionMovimiento(movimiento)
  );
};

export const obtenerTextoConsultaMovimiento = (movimiento) => {
  const decision = obtenerDecisionMovimiento(movimiento);
  if (decision === 'Venta Perdida') return 'Consultar motivo de venta perdida';
  if (decision === 'Rechazo') return 'Consultar motivo de rechazo';
  return 'Consultar motivo de anulación';
};

export const prepararDatosConsultaMovimiento = (movimiento) => {
  if (!movimiento) return null;

  const solicitudOriginal = movimiento.solicitudOriginal || {};
  const itemOriginal = movimiento.itemOriginal || {};
  const solicitudId = solicitudOriginal.id || movimiento.rfqId || '';
  const item = {
    ...itemOriginal,
    idx: movimiento.idxProducto,
    desc: itemOriginal.desc || itemOriginal.descripcion || movimiento.producto,
    producto: itemOriginal.producto || movimiento.producto,
    marca: itemOriginal.marca || movimiento.marca,
    motivoAnulacion: itemOriginal.motivoAnulacion || movimiento.motivoAnulacion,
    motivoVentaPerdida: itemOriginal.motivoVentaPerdida || movimiento.motivoVentaPerdida
  };
  const solicitud = {
    ...solicitudOriginal,
    id: solicitudId,
    correlativo: solicitudOriginal.correlativo || movimiento.correlativo,
    cliente: solicitudOriginal.cliente || movimiento.cliente
  };

  if (obtenerDecisionMovimiento(movimiento) === 'Venta Perdida') {
    return {
      tipo: 'ventaPerdida',
      data: {
        ...solicitud,
        items: [item]
      }
    };
  }

  const decision = prepararDatosDecisionItem({
    solicitud,
    item,
    fallbackIndex: movimiento.idxProducto || 0
  });

  return {
    tipo: 'decision',
    data: {
      ...decision,
      solicitudId,
      correlativo: solicitud.correlativo,
      cliente: solicitud.cliente,
      items: [decision]
    }
  };
};
