import React from 'react';
import { Etiqueta } from '../../../components/Etiqueta';
import { obtenerEtiquetaDecision } from '../utils/decisionFilter';

const CLAVE_DECISION = { anulados: 'anulacion', 'ventas-perdidas': 'venta_perdida', rechazos: 'rechazo' };

export const DecisionBadge = ({ decisionFilter, withIcon = false }) => (
  <Etiqueta dominio="decision" valor={CLAVE_DECISION[decisionFilter] || 'anulacion'} sinIcono={!withIcon}>
    {obtenerEtiquetaDecision(decisionFilter)}
  </Etiqueta>
);
