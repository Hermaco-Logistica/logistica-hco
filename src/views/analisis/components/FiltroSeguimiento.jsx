import React from 'react';
import { Etiqueta } from '../../../components/Etiqueta';
import { FiltroConmutador } from '../../../components/filtros/FiltroConmutador';

const describirPeriodo = ({ periodo, fechaInicio, fechaFin, anioHistorico } = {}) => {
  if (periodo === '7d') return 'últimos 7 días';
  if (periodo === '30d') return 'últimos 30 días';
  if (periodo === '90d') return 'últimos 90 días';
  if (periodo === 'this_month') return 'este mes';
  if (periodo === 'this_year') return 'año actual';
  if (periodo === 'historico') return anioHistorico && anioHistorico !== 'todos' ? `año ${anioHistorico}` : 'todo el histórico';
  if (periodo === 'custom') return `${fechaInicio || 'inicio'} a ${fechaFin || 'fin'}`;
  return 'sin definir';
};

/**
 * Conmutador "En seguimiento" de los Historiales. El estado vive en la URL (?seguimiento=1);
 * el padre decide cómo editarla en `onChange`.
 */
export const BotonSeguimiento = ({ activo, onChange }) => (
  <FiltroConmutador activo={activo} onChange={onChange} etiqueta="En seguimiento" titulo="Mostrar solo los ítems en seguimiento de cliente (no cerrados)" />
);

/**
 * Aviso violeta bajo el título cuando el Historial está en la variante "En seguimiento".
 * `solicitudes` solo se pasa en Clientes y Vendedores, donde la lista cuenta solicitudes.
 */
export const AvisoSeguimiento = ({ solicitudes, items, filtroPeriodo, vendedor, cliente }) => {
  const contexto = [
    `periodo: ${describirPeriodo(filtroPeriodo)}`,
    vendedor ? `filtrado por vendedor ${vendedor}` : null,
    cliente ? `filtrado por cliente ${cliente}` : null
  ].filter(Boolean);
  return (
    <span className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
      <Etiqueta tono="seguimiento">Vista exclusiva de ítems en seguimiento</Etiqueta>
      <span className="text-xs font-medium text-slate-600">
        {solicitudes !== undefined && `${solicitudes} ${solicitudes === 1 ? 'solicitud' : 'solicitudes'} · `}
        {items} {items === 1 ? 'ítem' : 'ítems'} · {contexto.join(' · ')}
      </span>
    </span>
  );
};
