import React from 'react';
import './detalle.css';

/** Layout slots de cabecera, contexto, decisión, contenido principal y resumen lateral. */
export const DetalleLayout = ({ header, context, decision, items, documentation, summary, children, className = '' }) => (
  <div className={`detalle-page detalle-layout ${className}`}>
    {header && <div className="detalle-layout__head">{header}{context}</div>}
    {!header && context}
    {decision}
    {items || documentation || summary ? <div className="detalle-layout__grid"><div className="detalle-layout__main">{items}{documentation}</div>{summary && <div className="detalle-layout__aside">{summary}</div>}</div> : children}
  </div>
);
