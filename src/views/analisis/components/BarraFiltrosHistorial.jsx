import React from 'react';
import { BarraFiltros, BotonExportar, BotonLimpiar, ContadorResultados, FiltroBusqueda, FiltroSegmentado, FiltroSelect } from '../../../components/filtros';
import { useMovil } from '../../../components/filtros/contexto';

/**
 * Barra de filtros de los Historiales (cliente, vendedor y producto). Solo presentación: no tiene estado ni lógica de filtrado; cada
 * Historial conserva su estado, sus claves de sesión y sus cálculos y pasa valores, `onChange`, opciones, conteos y handlers.
 *   - `chips`: elemento con los chips de contexto (ranura `encabezado`, variante plana); no cuentan ni los limpia `onLimpiar`.
 *   - `seguimiento`: elemento del conmutador (BotonSeguimiento, que edita ?seguimiento=1); `AvisoSeguimiento` queda en cada Historial.
 *   - `opcionesEstado`, `opcionesModalidad` ([strings]) y `opcionesCliente` llegan hechas; el select de Cliente solo con más de una.
 *   - Modalidad: segmentado con "Todas" + hasta 2 modalidades; con 3 (4 opciones en total no caben en una fila) pasa a select.
 *   - `soloAnulados`: oculta Estado y seguimiento; el resto se mantiene.
 *   - `filtrosActivos`: lo que hay en la hoja (estado, modalidad, seguimiento y cliente); `activosLimpiar`: todo lo que limpia (con la búsqueda).
 *   - `total`: movimientos mostrados (contador "Mostrando N movimientos").
 * Escritorio en dos filas (`filas`): 1) búsqueda, Cliente y Estado; 2) Modalidad y seguimiento, con Limpiar, Exportar y contador a la derecha.
 * Móvil: búsqueda en la barra y los demás controles en la hoja.
 */
export const BarraFiltrosHistorial = ({
  chips = null, busqueda = '', onBusqueda, placeholderBusqueda = 'Buscar…', soloAnulados = false,
  estado = '', onEstado, opcionesEstado = [], modalidad = '', onModalidad, opcionesModalidad = [], seguimiento = null,
  cliente = '', onCliente, opcionesCliente = [], filtrosActivos = 0, activosLimpiar = 0, onLimpiar, onExportar, total = 0
}) => {
  const movil = useMovil();
  const buscador = <FiltroBusqueda value={busqueda} onChange={onBusqueda} placeholder={placeholderBusqueda} ariaLabel={placeholderBusqueda.replace(/\.{3}|…$/, '')} className={movil ? '' : 'min-w-[18rem] flex-1'} />;
  const caja = (nodo) => (movil ? nodo : <div className="w-56 shrink-0">{nodo}</div>); // en escritorio las filas usan el ancho natural de cada control
  const selCliente = opcionesCliente.length > 1 && caja(<FiltroSelect value={cliente} onChange={onCliente} opciones={opcionesCliente} prefijo="Cliente:" etiqueta="Cliente" ariaLabel="Filtrar por cliente" />);
  const selEstado = !soloAnulados && caja(<FiltroSelect value={estado} onChange={onEstado} opciones={opcionesEstado} prefijo="Estado:" etiqueta="Estado" ariaLabel="Filtrar por estado" />);
  const selModalidad = opcionesModalidad.length > 2
    ? caja(<FiltroSelect value={modalidad} onChange={onModalidad} opciones={opcionesModalidad} etiquetaTodos="Todas" prefijo="Modalidad:" etiqueta="Modalidad" ariaLabel="Filtrar por modalidad" />)
    : <FiltroSegmentado value={modalidad} onChange={onModalidad} valorNeutro="" prefijo="Modalidad:" etiqueta="Modalidad" ariaLabel="Filtrar por modalidad" opciones={[{ value: '', label: 'Todas' }, ...opcionesModalidad.map((m) => ({ value: m, label: m }))]} />;
  const conSeguimiento = !soloAnulados && seguimiento;
  return (
    <BarraFiltros
      busquedaEnBarraMovil
      resultados={total}
      filtrosActivos={filtrosActivos}
      encabezado={chips}
      busqueda={movil ? buscador : null}
      filtros={movil ? <>{selCliente}{selEstado}{selModalidad}{conSeguimiento}</> : undefined}
      filas={movil ? undefined : [[buscador, selCliente, selEstado], [selModalidad, conSeguimiento && <div className="w-40 shrink-0">{seguimiento}</div>]].map((fila) => fila.filter(Boolean))}
      limpiar={<BotonLimpiar activos={activosLimpiar} onClick={onLimpiar} />}
      acciones={<BotonExportar etiqueta="Exportar movimientos" titulo="Exportar movimientos a Excel" onClick={onExportar} />}
      extremo={<ContadorResultados prefijo="Mostrando" total={total} singular="movimiento" plural="movimientos" />}
    />
  );
};
