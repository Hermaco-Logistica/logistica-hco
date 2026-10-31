import React from 'react';
import { Etiqueta } from '../Etiqueta';

/**
 * Estado en tarjetas móviles. Es un envoltorio de <Etiqueta />: el estilo, el color y el ícono salen de
 * src/utils/etiquetas.js (dominios estadoSolicitud y estadoOC), no se definen aquí.
 */

// Estados de logística / órdenes de compra (DashboardPedidos, GestionOC).
const ESTADOS_LOGISTICOS = new Set([
  'Por Procesar', 'OC Generada', 'Tránsito', 'En Tránsito', 'Aduana', 'En Aduana',
  'Recibido', 'Recibido (Almacén)', 'Entregado', 'Entregado Cliente'
]);

// Textos cortos para valores con variantes.
const TEXTOS = {
  'Tránsito': 'En Tránsito',
  'Aduana': 'En Aduana',
  'Recibido (Almacén)': 'Recibido',
  'Entregado Cliente': 'Entregado',
  'En consulta': 'En Consulta'
};

const TAMANO_POR_SIZE = { xs: 'compacta', sm: 'normal', lg: 'grande' };

export const MobileBadge = ({
  estado,
  label,
  size = 'sm',
  className = '',
  showIcon = true
}) => (
  <Etiqueta
    dominio={ESTADOS_LOGISTICOS.has(estado) ? 'estadoOC' : 'estadoSolicitud'}
    valor={TEXTOS[estado] || estado}
    tamano={TAMANO_POR_SIZE[size] || 'normal'}
    sinIcono={!showIcon}
    className={`shrink-0 ${className}`.trim()}
  >
    {label || TEXTOS[estado] || estado || '-'}
  </Etiqueta>
);
