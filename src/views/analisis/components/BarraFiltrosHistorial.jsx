import React from 'react';
import { BarraFiltros, BotonExportar, BotonLimpiar, ContadorResultados, FiltroBusqueda, FiltroSegmentado, FiltroSelect } from '../../../components/filtros';

/**
 * Barra de filtros de los Historiales (cliente, vendedor y producto). Solo presentación: no tiene estado ni lógica de filtrado; cada
 * Historial conserva su estado, sus claves de sesión y sus cálculos y pasa valores, `onChange`, opciones, conteos y handlers.
 *   - `chips`: elemento con los chips de contexto (ranura `encabezado`, variante plana); no cuentan ni los limpia `onLimpiar`.
 *   - `seguimiento`: elemento del conmutador (BotonSeguimiento, que edita ?seguimiento=1); `AvisoSeguimiento` queda en cada Historial.
 *   - `opcionesEstado`, `opcionesModalidad` ([strings]) y `opcionesCliente` llegan hechas; el select de Cliente solo con más de una.
 *   - `soloAnulados`: oculta Estado y seguimiento; el resto se mantiene.
 *   - `filtrosActivos`: lo que hay en la hoja (estado, modalidad, seguimiento y cliente); `activosLimpiar`: todo lo que limpia (con la búsqueda).
 *   - `total`: movimientos mostrados (contador "Mostrando N movimientos").
 */
export const BarraFiltrosHistorial = ({
  chips = null, busqueda = '', onBusqueda, placeholderBusqueda = 'Buscar…', soloAnulados = false,
  estado = '', onEstado, opcionesEstado = [], modalidad = '', onModalidad, opcionesModalidad = [], seguimiento = null,
  cliente = '', onCliente, opcionesCliente = [], filtrosActivos = 0, activosLimpiar = 0, onLimpiar, onExportar, total = 0
}) => (
  <BarraFiltros
    busquedaEnBarraMovil
    resultados={total}
    filtrosActivos={filtrosActivos}
    encabezado={chips}
    busqueda={<FiltroBusqueda value={busqueda} onChange={onBusqueda} placeholder={placeholderBusqueda} ariaLabel={placeholderBusqueda.replace(/\.{3}|…$/, '')} />}
    filtros={(
      <>
        {opcionesCliente.length > 1 && <FiltroSelect value={cliente} onChange={onCliente} opciones={opcionesCliente} prefijo="Cliente:" etiqueta="Cliente" ariaLabel="Filtrar por cliente" />}
        {!soloAnulados && <FiltroSelect value={estado} onChange={onEstado} opciones={opcionesEstado} prefijo="Estado:" etiqueta="Estado" ariaLabel="Filtrar por estado" />}
        <FiltroSegmentado value={modalidad} onChange={onModalidad} valorNeutro="" prefijo="Modalidad:" etiqueta="Modalidad" ariaLabel="Filtrar por modalidad" opciones={[{ value: '', label: 'Todas' }, ...opcionesModalidad.map((m) => ({ value: m, label: m }))]} />
        {!soloAnulados && seguimiento}
      </>
    )}
    limpiar={<BotonLimpiar activos={activosLimpiar} onClick={onLimpiar} />}
    acciones={<BotonExportar etiqueta="Exportar movimientos" titulo="Exportar movimientos a Excel" onClick={onExportar} />}
    extremo={<ContadorResultados prefijo="Mostrando" total={total} singular="movimiento" plural="movimientos" />}
  />
);
