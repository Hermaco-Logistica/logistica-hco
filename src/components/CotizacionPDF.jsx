import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: '30 30',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111111',
    lineHeight: 1.2
  },
  headerTable: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  headerCol1: {
    width: '32%',
    paddingRight: 8,
  },
  headerCol2: {
    width: '68%',
  },
  empresaTitle: {
    fontSize: 8,
    marginBottom: 1,
  },
  empresaText: {
    color: '#222222',
    fontSize: 6.5,
    lineHeight: 1.3,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
    alignItems: 'center',
  },
  // Columna 1: Etiquetas principales (N° Cotización, Vendedor, Cliente, Correo)
  infoLabelCol1: {
    color: '#444444',
    width: '16%',
    fontSize: 6.5,
  },
  // Columna 2: Valores principales cortos (RFQ-..., Vendedor)
  infoValueCol1: {
    color: '#111111',
    width: '40%',
    fontSize: 6.5,
    paddingRight: 4,
  },
  // Valor ancho para Cliente y Correo (ocupa Columna 2 + 3 + 4)
  infoValueFull: {
    color: '#111111',
    width: '84%',
    fontSize: 6.5,
  },
  // Columna 3: Etiquetas secundarias (Fecha, Validez)
  infoLabelCol2: {
    color: '#444444',
    width: '22%',
    fontSize: 6.5,
    textAlign: 'right',
    paddingRight: 4,
  },
  // Columna 4: Valores secundarios alineados al extremo derecho
  infoValueCol2: {
    color: '#111111',
    width: '22%',
    fontSize: 6.5,
    textAlign: 'right',
  },
  // Nuevo: bloque centrado para el segundo "par" (label + value) del encabezado.
  // Ocupa el mismo 55% que antes ocupaban infoLabel + infoValue juntos,
  // pero ahora centra su contenido dentro de ese espacio en vez de
  // pegarlo al borde izquierdo del headerCol2.
  infoBlockCentered: {
    width: '55%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabelCentered: {
    color: '#444444',
    fontSize: 6.5,
    textAlign: 'right',
  },
  infoValueCentered: {
    color: '#111111',
    fontSize: 6.5,
    textAlign: 'left',
    marginLeft: 4,
  },
  table: {
    width: '100%',
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f5b98',
    color: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#153d66',
    alignItems: 'center',
  },
  th: {
    padding: '4 2',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 7,
    lineHeight: 1.15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#7d7d7d',
    alignItems: 'center',
  },
  td: {
    padding: '4 2',
    textAlign: 'center',
  },
  tdDesc: {
    padding: '4 2',
    textAlign: 'center',
    backgroundColor: '#c9dbef',
    color: '#344b61',
  },
  tdRight: {
    padding: '4 2',
    textAlign: 'right',
  },
  footerTable: {
    flexDirection: 'row',
  },
  terminosCol: {
    width: '60%',
    paddingRight: 15,
  },
  totalesCol: {
    width: '40%',
    backgroundColor: '#f2c52e',
    padding: 5,
  },
  totalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalVal: {
    fontWeight: 'bold',
    color: '#4a3b00',
  },
  totalLabel: {
    color: '#4a3b00',
  }
});

const formatMoneda = (val) => {
  return val > 0 
    ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00';
};

const getDescripcionItem = (item) => (item?.codigo || item?.item || item?.sku || item?.descripcion || item?.desc || '').toString().toUpperCase();

export default function CotizacionPDF({ cotizacionData }) {
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
    factorM = 1.08
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

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerTable}>
          <View style={styles.headerCol1}>
            <Text style={styles.empresaTitle}>Centro Industrial Hermaco, S.A. DE C.V.</Text>
            <View style={styles.empresaText}>
              <Text>Carretera panamericana, km 67 1/2</Text>
              <Text>Bo. San Antonio, Santa Ana Centro</Text>
              <Text>Santa Ana, El Salvador</Text>
              <Text>Departamento de compras</Text>
            </View>
          </View>
          
          <View style={styles.headerCol2}>
            {/* Fila 1 */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabelCol1}>N° Cotización</Text>
              <Text style={styles.infoValueCol1}>{correlativo}</Text>
              <Text style={styles.infoLabelCol2}>Fecha</Text>
              <Text style={styles.infoValueCol2}>{fechaFormateada}</Text>
            </View>

            {/* Fila 2 */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabelCol1}>Vendedor</Text>
              <Text style={styles.infoValueCol1}>{vendedorNombre}</Text>
              <Text style={styles.infoLabelCol2}>Validez hasta</Text>
              <Text style={styles.infoValueCol2}>{validez}</Text>
            </View>

            {/* Fila 3 */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabelCol1}>Cliente</Text>
              <Text style={styles.infoValueFull}>{cliente}</Text>
            </View>

            {/* Fila 4 */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabelCol1}>Correo</Text>
              <Text style={styles.infoValueFull}>{vendedorEmail || ''}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: '11%' }]}>Item</Text>
            <Text style={[styles.th, { width: '7%' }]}>Cantidad</Text>
            <Text style={[styles.th, { width: '11%' }]}>{'Precio\nAéreo'}</Text>
            <Text style={[styles.th, { width: '11%' }]}>{'Precio\nMarítimo'}</Text>
            <Text style={[styles.th, { width: '9%' }]}>Marca</Text>
            <Text style={[styles.th, { width: '14%' }]}>{'Entrega Aéreo\n(días hábiles)'}</Text>
            <Text style={[styles.th, { width: '14%' }]}>{'Entrega Marítimo\n(días hábiles)'}</Text>
            <Text style={[styles.th, { width: '11%' }]}>Total Aéreo</Text>
            <Text style={[styles.th, { width: '12%' }]}>Total Marítimo</Text>
          </View>

          {filas.map((item, index) => {
            const esEnConsulta = item?.enConsulta || item?.estadoItem === 'En consulta';
            const fobVal = Number(item?.fob || 0);
            const precioA = fobVal * factorA * (item?.fva || 1.30);
            const precioM = fobVal * factorM * (item?.fvm || 1.25);
            const tAereo = Number(item?.cant || 0) * precioA;
            const tMaritimo = Number(item?.cant || 0) * precioM;

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tdDesc, { width: '11%', fontSize: 8 }]}>{getDescripcionItem(item)}</Text>
                <Text style={[styles.td, { width: '7%' }]}>{item?.cant ?? ''}</Text>
                <Text style={[styles.tdRight, { width: '11%', fontSize: esEnConsulta ? 7 : 8 }]}>
                  {esEnConsulta ? 'En consulta' : (precioA > 0 ? formatMoneda(precioA) : '')}
                </Text>
                <Text style={[styles.tdRight, { width: '11%', fontSize: esEnConsulta ? 7 : 8 }]}>
                  {esEnConsulta ? 'En consulta' : (precioM > 0 ? formatMoneda(precioM) : '')}
                </Text>
                <Text style={[styles.td, { width: '9%' }]}>{item?.marca || ''}</Text>
                <Text style={[styles.td, { width: '14%' }]}>{item?.entregaA || ''}</Text>
                <Text style={[styles.td, { width: '14%' }]}>{item?.entregaM || ''}</Text>
                <Text style={[styles.tdRight, { width: '11%', fontSize: esEnConsulta ? 7 : 8 }]}>
                  {esEnConsulta ? 'En consulta' : (tAereo > 0 ? formatMoneda(tAereo) : '')}
                </Text>
                <Text style={[styles.tdRight, { width: '12%', fontSize: esEnConsulta ? 7 : 8 }]}>
                  {esEnConsulta ? 'En consulta' : (tMaritimo > 0 ? formatMoneda(tMaritimo) : '')}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footerTable}>
          <View style={styles.terminosCol}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Términos y condiciones:</Text>
            <Text style={{ color: '#222222' }}>Precios aéreos sujetos a cantidad/ítems cotizados.</Text>
            <Text style={{ color: '#222222' }}>Si la OC difiere de cantidad aérea, se cotizará nuevamente.</Text>
            <Text style={{ color: '#222222' }}>La oferta está sujeta a cambios de disponibilidad del proveedor.</Text>
            <Text style={{ color: '#222222' }}>Notas adicionales pueden decirse en correo.</Text>
          </View>
          
          <View style={styles.totalesCol}>
            <View style={styles.totalesRow}>
              <Text style={styles.totalLabel}>Subtotal aéreo</Text>
              <Text style={styles.totalVal}>{formatMoneda(subtotalAereo)}</Text>
            </View>
            <View style={styles.totalesRow}>
              <Text style={styles.totalLabel}>Subtotal marítimo</Text>
              <Text style={styles.totalVal}>{formatMoneda(subtotalMaritimo)}</Text>
            </View>
            <View style={styles.totalesRow}>
              <Text style={styles.totalLabel}>IVA</Text>
              <Text style={styles.totalVal}>13%</Text>
            </View>
            <View style={styles.totalesRow}>
              <Text style={styles.totalLabel}>Total aéreo</Text>
              <Text style={styles.totalVal}>{formatMoneda(totalAereo)}</Text>
            </View>
            <View style={styles.totalesRow}>
              <Text style={styles.totalLabel}>Total marítimo</Text>
              <Text style={styles.totalVal}>{formatMoneda(totalMaritimo)}</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}