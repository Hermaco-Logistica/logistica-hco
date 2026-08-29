export const generarPlantillaNuevaRFQ = (savedData) => {
  const cantidadTotal = savedData.productos.reduce((acc, p) => acc + (Number(p.cant) || 0), 0);

  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 20px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">NUEVA SOLICITUD DE COMPRA (RFQ)</h2>
      </div>
      <div style="padding: 20px;">
        <p style="margin: 5px 0;"><strong>Correlativo:</strong> <span style="color: #10b981; font-weight: bold;">${savedData.correlativo}</span></p>
        <p style="margin: 5px 0;"><strong>Cliente:</strong> ${savedData.cliente}</p>
        <p style="margin: 5px 0;"><strong>Iniciado por:</strong> ${savedData.vendedorEmail}</p>
        <p style="margin: 5px 0;"><strong>Nombre Vendedor:</strong> ${savedData.vendedorNombre}</p>
        <p style="margin: 5px 0;"><strong>Cantidad total:</strong> ${cantidadTotal}</p>
        <p style="margin: 5px 0;"><strong>Validez solicitada:</strong> ${savedData.validez}</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 25px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
              <th style="padding: 12px; font-size: 12px; text-transform: uppercase;">Producto</th>
              <th style="padding: 12px; font-size: 12px; text-transform: uppercase;">Marca</th>
              <th style="padding: 12px; font-size: 12px; text-transform: uppercase; text-align: center;">Cant.</th>
            </tr>
          </thead>
          <tbody>
            ${savedData.productos.map(p => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; font-size: 13px;">${String(p.descripcion || '').toUpperCase()}</td>
                <td style="padding: 12px; font-size: 13px;">${p.marca || '-'}</td>
                <td style="padding: 12px; font-size: 13px; text-align: center; font-weight: bold;">${p.cant}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};
