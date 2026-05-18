export const DHL_STATUS_LABELS = {
  PU: 'Recogido por DHL',
  PL: 'Procesado en instalacion',
  AF: 'Llego a instalacion',
  DF: 'Salio de instalacion',
  TR: 'En transito',
  WC: 'En camino al destinatario',
  OH: 'Envio retenido',
  RR: 'Aduana iniciada',
  IC: 'En proceso de aduana',
  UD: 'Evento de aduana',
  CR: 'Aduana liberada',
  OK: 'Entregado',
  delivered: 'Entregado',
  failure: 'Fallo en entrega',
};

export const DSV_STATUS_LABELS = {
  BOOKING: 'Reserva de envio creada',
  BOOKING_CONFIRMED: 'Reserva confirmada por el transportista',
  DOCS_RECEIVED: 'Documentos recibidos',
  DOCS_RELEASED: 'Documentos liberados',
  REQUESTED_PICKUP: 'Recoleccion solicitada',
  ESTIMATED_PICKUP: 'Recoleccion programada',
  PCF: 'Carga recolectada',
  RCS: 'Carga recibida en bodega',
  ECC: 'Aduana de exportacion liberada',
  ECL: 'Aduana de exportacion en proceso',
  ECD: 'Aduana de exportacion: documentos requeridos',
  ETD: 'Salida estimada del puerto de origen',
  DEP: 'Zarpe confirmado desde origen',
  ETD_UPDATED: 'Fecha de salida actualizada',
  ARV: 'Arribo al puerto de destino',
  ETA: 'Llegada estimada al puerto de destino',
  ETA_UPDATED: 'Fecha de llegada actualizada',
  TRA: 'Transbordo en puerto intermedio',
  ICC: 'Aduana de importacion liberada',
  ICL: 'Aduana de importacion en proceso',
  ICD: 'Aduana de importacion: documentos requeridos',
  REQUESTED_DELIVERY: 'Entrega solicitada',
  ESTIMATED_DELIVERY: 'Entrega programada',
  DLV: 'Entregado al destinatario',
  Z70: 'Carga entregada - responsabilidad transferida',
  DEL: 'Entrega con retraso',
  DMG: 'Danio reportado en la carga',
  MSC: 'Carga extraviada temporalmente',
  HLD: 'Carga retenida (aduana u otro)',
  SHD: 'Entrega parcial realizada',
};

export const SHIPMENT_STATUS_LABELS = {
  COMPLETED: 'Entregado',
  IN_TRANSIT: 'En transito',
  BOOKED: 'Reservado',
  PICKED_UP: 'Recolectado',
  AT_CUSTOMS: 'En aduana',
  DELAYED: 'Con retraso',
  CANCELLED: 'Cancelado',
};

export const DSV_COMPLETED_CODES = new Set(['Z70', 'ARV', 'DEP', 'ECC', 'BOOKING', 'PCF']);
export const DSV_TRANSIT_CODES = new Set(['ETA', 'ETD', 'ARV', 'DEP']);
export const DSV_CUSTOMS_CODES = new Set(['ECC']);
export const DSV_PICKUP_CODES = new Set(['ESTIMATED_PICKUP', 'REQUESTED_PICKUP', 'PCF']);
export const DSV_DELIVERY_CODES = new Set(['ESTIMATED_DELIVERY', 'REQUESTED_DELIVERY']);
