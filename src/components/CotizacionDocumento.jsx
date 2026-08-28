import React from 'react';

export default function CotizacionDocumento({ cotizacionData }) {
  if (!cotizacionData) return null;

  const {
    correlativo,
    vendedorNombre,
    cliente,
    vendedorEmail,
    fechaS,
    fechaCotizacion,
    validez = '5 días hábiles',
    productos = [],
    factorA = 1,
    factorM = 1.08,
  } = cotizacionData;

  // Formatear fecha
  let fechaFormateada = '';
  if (fechaS?.toDate) {
    fechaFormateada = fechaS.toDate().toLocaleDateString('es-SV');
  } else if (fechaS?.seconds) {
    fechaFormateada = new Date(fechaS.seconds * 1000).toLocaleDateString('es-SV');
  } else if (fechaCotizacion) {
    fechaFormateada = new Date(fechaCotizacion).toLocaleDateString('es-SV');
  } else {
    fechaFormateada = new Date().toLocaleDateString('es-SV');
  }

  // Lógica de cálculos dinámicos basados en factorA y factorM
  const subtotalAereo = productos.reduce((acc, item) => {
    const fobVal = Number(item.fob || 0);
    const ventaA = fobVal * factorA * (item.fva || 1.30);
    return acc + (Number(item.cant || 0) * ventaA);
  }, 0);

  const subtotalMaritimo = productos.reduce((acc, item) => {
    const fobVal = Number(item.fob || 0);
    const ventaM = fobVal * factorM * (item.fvm || 1.25);
    return acc + (Number(item.cant || 0) * ventaM);
  }, 0);
  
  const IVA_TASA = 0.13; 
  const totalAereo = subtotalAereo * (1 + IVA_TASA);
  const totalMaritimo = subtotalMaritimo * (1 + IVA_TASA);

  const FILAS_VISTAS = 18;
  const filas = Array.from(
    { length: Math.max(productos.length, FILAS_VISTAS) },
    (_, index) => productos[index] || null
  );

  const formatMoneda = (val) => {
    return val > 0 
      ? `$${val.toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '$0.00';
  };

  const getDescripcionItem = (item) => (item?.codigo || item?.item || item?.sku || item?.descripcion || item?.desc || '').toString().toUpperCase();

  const pageStyle = {
    width: '100%',
    maxWidth: '760px',
    margin: '0 auto',
    padding: '18px 20px 22px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#111111',
    backgroundColor: '#ffffff',
    lineHeight: '1.25'
  };

  const headerLabelStyle = {
    color: '#444444',
    fontSize: '11px',
    padding: '0 6px 3px 0',
    whiteSpace: 'nowrap',
    verticalAlign: 'top'
  };

  const headerValueStyle = {
    color: '#111111',
    fontSize: '11px',
    padding: '0 12px 3px 0',
    whiteSpace: 'nowrap',
    verticalAlign: 'top'
  };

  const cellStyle = {
    borderBottom: '1px solid #7d7d7d',
    padding: '5px 6px',
    fontSize: '11px',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  return (
    <div className="cotizacion-documento" style={pageStyle}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
        <tbody>
          <tr>
            <td style={{ width: '45%', verticalAlign: 'top', paddingRight: '12px' }}>
              <div style={{ fontWeight: 'normal', fontSize: '12px', marginBottom: '2px' }}>Centro Industrial Hermaco, S.A. DE C.V.</div>
              <div style={{ color: '#222222', fontSize: '11px', lineHeight: '1.4' }}>
                Carretera panamericana, km 67 1/2<br />
                Bo. San Antonio, Santa Ana Centro<br />
                Santa Ana, El Salvador<br />
                Departamento de compras
              </div>
            </td>
            <td style={{ width: '55%', verticalAlign: 'top' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={headerLabelStyle}>N° Cotización</td>
                    <td style={headerValueStyle}>{correlativo}</td>
                    <td style={headerLabelStyle}>Fecha</td>
                    <td style={{ ...headerValueStyle, textAlign: 'right' }}>{fechaFormateada}</td>
                  </tr>
                  <tr>
                    <td style={headerLabelStyle}>Vendedor</td>
                    <td style={headerValueStyle}>{vendedorNombre}</td>
                    <td style={headerLabelStyle}>Validez hasta</td>
                    <td style={{ ...headerValueStyle, textAlign: 'right' }}>{validez}</td>
                  </tr>
                  <tr>
                    <td style={headerLabelStyle}>Cliente</td>
                    <td style={headerValueStyle}>{cliente}</td>
                    <td style={headerLabelStyle}>&nbsp;</td>
                    <td style={headerValueStyle}>&nbsp;</td>
                  </tr>
                  <tr>
                    <td style={headerLabelStyle}>Correo</td>
                    <td style={{ ...headerValueStyle, color: '#111111' }}>{vendedorEmail || ''}</td>
                    <td style={headerLabelStyle}>&nbsp;</td>
                    <td style={headerValueStyle}>&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: '14px' }}>
        <thead>
          <tr>
            <th style={{ ...cellStyle, backgroundColor: '#1f5b98', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #153d66', paddingTop: '5px', paddingBottom: '5px', width: '12%' }}>Item</th>
            <th style={{ ...cellStyle, backgroundColor: '#1f5b98', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #153d66', paddingTop: '5px', paddingBottom: '5px', width: '7%' }}>Cantidad</th>
            <th style={{ ...cellStyle, backgroundColor: '#1f5b98', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #153d66', paddingTop: '5px', paddingBottom: '5px', width: '11%' }}>Precio Aéreo</th>
            <th style={{ ...cellStyle, backgroundColor: '#1f5b98', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #153d66', paddingTop: '5px', paddingBottom: '5px', width: '11%' }}>Precio Marítimo</th>
            <th style={{ ...cellStyle, backgroundColor: '#1f5b98', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #153d66', paddingTop: '5px', paddingBottom: '5px', width: '10%' }}>Marca</th>
            <th style={{ ...cellStyle, backgroundColor: '#1f5b98', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #153d66', paddingTop: '3px', paddingBottom: '3px', width: '13%' }}>Entrega Aéreo<br />(días hábiles)</th>
            <th style={{ ...cellStyle, backgroundColor: '#1f5b98', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #153d66', paddingTop: '3px', paddingBottom: '3px', width: '13%' }}>Entrega Marítimo<br />(días hábiles)</th>
            <th style={{ ...cellStyle, backgroundColor: '#1f5b98', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #153d66', paddingTop: '5px', paddingBottom: '5px', width: '11%' }}>Total Aéreo</th>
            <th style={{ ...cellStyle, backgroundColor: '#1f5b98', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #153d66', paddingTop: '5px', paddingBottom: '5px', width: '12%' }}>Total Marítimo</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((item, index) => {
            const fobVal = Number(item?.fob || 0);
            const precioA = fobVal * factorA * (item?.fva || 1.30);
            const precioM = fobVal * factorM * (item?.fvm || 1.25);
            const tAereo = Number(item?.cant || 0) * precioA;
            const tMaritimo = Number(item?.cant || 0) * precioM;

            return (
              <tr key={index}>
                <td style={{ ...cellStyle, backgroundColor: '#c9dbef', textAlign: 'center', fontWeight: 'normal', color: '#344b61' }}>{getDescripcionItem(item)}</td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>{item?.cant ?? ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{precioA > 0 ? formatMoneda(precioA) : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{precioM > 0 ? formatMoneda(precioM) : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'center', textTransform: 'uppercase' }}>{item?.marca || ''}</td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>{item?.entregaA || ''}</td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>{item?.entregaM || ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{tAereo > 0 ? formatMoneda(tAereo) : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{tMaritimo > 0 ? formatMoneda(tMaritimo) : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td style={{ width: '40%', verticalAlign: 'top', paddingRight: '16px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>Términos y condiciones:</div>
              <div style={{ fontSize: '11px', lineHeight: '1.55', color: '#222222' }}>
                Precios aéreos sujetos a cantidad/ítems cotizados.<br />
                Si la OC difiere de cantidad aérea, se cotizará nuevamente.<br />
                La oferta está sujeta a cambios de disponibilidad del proveedor.<br />
                Notas adicionales pueden decirse en correo.
              </div>
            </td>
            
            <td style={{ width: '22%', verticalAlign: 'top', padding: '0', backgroundColor: '#f2c52e' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '5px 8px 3px 8px', color: '#4a3b00' }}>Subtotal aéreo</td>
                    <td style={{ padding: '5px 8px 3px 8px', textAlign: 'right', fontWeight: 'bold', color: '#4a3b00' }}>{formatMoneda(subtotalAereo)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 8px', color: '#4a3b00' }}>Subtotal marítimo</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 'bold', color: '#4a3b00' }}>{formatMoneda(subtotalMaritimo)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 8px', color: '#4a3b00' }}>IVA</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 'bold', color: '#4a3b00' }}>13%</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 8px', color: '#4a3b00' }}>Total aéreo</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 'bold', color: '#4a3b00' }}>{formatMoneda(totalAereo)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 8px 6px 8px', color: '#4a3b00' }}>Total marítimo</td>
                    <td style={{ padding: '3px 8px 6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#4a3b00' }}>{formatMoneda(totalMaritimo)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}