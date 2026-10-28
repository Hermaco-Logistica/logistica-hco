import React from 'react';

/** Tabla configurable por columnas o contenedor para conservar filas operativas existentes. */
export const ItemsTable = ({
  columns = [],
  rows = [],
  getRowKey = (row, index) => row?.id ?? index,
  selectedKey,
  readOnly = false,
  emptyMessage = 'No hay ítems para mostrar.',
  loading = false,
  error = '',
  children,
  className = ''
}) => {
  if (loading || error || (!children && rows.length === 0)) {
    return (
      <section className={`detalle-items ${className}`} aria-busy={loading || undefined}>
        {loading ? <div className="detalle-items__state">Cargando ítems…</div>
          : error ? <div role="alert" className="detalle-items__state">{error}</div>
            : <div className="detalle-items__empty">{emptyMessage}</div>}
      </section>
    );
  }

  const columnasVisibles = columns.filter((column) => !readOnly || !column.action);
  return (
    <section className={`detalle-items ${className}`} data-read-only={readOnly || undefined}>
      {children || <>
        <div className="hidden overflow-x-auto md:block">
          <table className="detalle-items__table">
            <thead><tr>{columnasVisibles.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr className="detalle-items__row" data-selected={getRowKey(row, index) === selectedKey || undefined} key={getRowKey(row, index)}>
                {columnasVisibles.map((column) => <td key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="detalle-items__mobile md:hidden">
          {rows.map((row, index) => <article className="detalle-items__card" key={getRowKey(row, index)}>
            {columnasVisibles.map((column) => <div className="detalle-items__field" key={column.key}>
              <span className="detalle-items__field-label">{column.label}</span>
              <span className="detalle-items__field-value">{column.render ? column.render(row, index) : row[column.key]}</span>
            </div>)}
          </article>)}
        </div>
      </>}
    </section>
  );
};
