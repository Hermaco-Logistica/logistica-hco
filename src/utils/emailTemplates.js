export const generarPlantillaNuevaRFQ = (savedData) => {
  const cantidadTotal = savedData.productos.reduce((acc, p) => acc + (Number(p.cant) || 0), 0);
  const comentariosVendedor = String(savedData.comentariosVendedor || '').trim();
  const comentariosCitados = comentariosVendedor
    ? `<div style="margin-top: 20px; padding: 14px 16px; background-color: #f8fafc; border-left: 4px solid #0f172a; border-radius: 6px;">
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569;">Comentarios del Vendedor</p>
        <blockquote style="margin: 0; font-size: 13px; font-style: italic; line-height: 1.5; color: #334155; white-space: pre-wrap;">“${comentariosVendedor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')}”</blockquote>
      </div>`
    : '';

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
        ${comentariosCitados}

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

const formatFechaHoraEmail = (value) => {
  if (!value) return '---';
  let dateValue = null;
  if (typeof value.toDate === 'function') {
    dateValue = value.toDate();
  } else if (typeof value.seconds === 'number') {
    dateValue = new Date(value.seconds * 1000);
  } else if (value instanceof Date) {
    dateValue = value;
  } else {
    const ms = Date.parse(value);
    if (!isNaN(ms)) dateValue = new Date(ms);
  }

  if (!dateValue) return '---';
  return new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'short',
    timeStyle: 'medium',
    hour12: false,
    timeZone: 'America/El_Salvador'
  }).format(dateValue);
};

export const generarPlantillaNuevoPedido = (orderData) => {
  const esParcial = orderData.esPedidoParcial;
  const tipoTexto = esParcial ? 'PEDIDO PARCIAL CONFIRMADO' : 'PEDIDO COMPLETO CONFIRMADO';
  const badgeBg = esParcial ? '#3b82f6' : '#10b981';
  const badgeBorder = esParcial ? '#1d4ed8' : '#047857';
  
  const itemsPedidos = orderData.productos.filter(p => p.estadoItem === 'Pedido');
  const cantidadTotal = itemsPedidos.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0);
  const totalMonto = itemsPedidos.reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);

  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      
      <!-- Header Principal -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 4px solid ${badgeBg};">
        <div style="font-size: 10px; font-weight: 900; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px;">Notificación de Orden de Compra</div>
        <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">
          RFQ: ${orderData.correlativoRFQ}
        </h1>
        <span style="display: inline-block; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; color: #ffffff; padding: 5px 16px; border-radius: 20px; font-weight: 900; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;">
          ${tipoTexto}
        </span>
      </div>

      <!-- Tarjetas de Información Rápida -->
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 15px;">
          <tr>
            <td style="width: 50%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; vertical-align: top;">
              <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Cliente</span>
              <span style="font-size: 14px; font-weight: 900; color: #0f172a; display: block;">${orderData.cliente}</span>
            </td>
            <td style="width: 50%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; vertical-align: top;">
              <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Vendedor Asignado</span>
              <span style="font-size: 13px; font-weight: 900; color: #0f172a; display: block;">${orderData.vendedorNombre}</span>
              <span style="font-size: 10px; font-weight: 600; color: #64748b;">${orderData.vendedorEmail}</span>
            </td>
          </tr>
          <tr>
            <td style="width: 50%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; vertical-align: top;">
              <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Cobertura del Pedido</span>
              <span style="font-size: 13px; font-weight: 900; color: ${badgeBg}; display: block;">
                ${itemsPedidos.length} de ${orderData.productos.length} Ítems (${cantidadTotal} pzs)
              </span>
            </td>
            <td style="width: 50%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; vertical-align: top;">
              <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Monto Total Confirmado</span>
              <span style="font-size: 16px; font-weight: 800; color: #0f172a; display: block;">$${totalMonto.toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </td>
          </tr>
        </table>

        <!-- Bloque de Notas y OC si existen -->
        ${(orderData.linkOC || orderData.notasPedido) ? `
          <div style="background-color: #f1f5f9; border-left: 4px solid #0f172a; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
            ${(() => {
              if (!orderData.linkOC) return '';
              const rawOC = String(orderData.linkOC).trim();
              const lower = rawOC.toLowerCase();
              const esUrl = lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('www.');
              if (esUrl) {
                const targetUrl = lower.startsWith('www.') ? `https://${rawOC}` : rawOC;
                return `<div style="font-size: 11px; margin-bottom: 6px;"><strong>Orden de Compra:</strong> <a href="${targetUrl}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: underline;">Abrir Documento OC</a></div>`;
              }
              return `<div style="font-size: 11px; margin-bottom: 6px;"><strong>Orden de Compra:</strong> <span style="font-weight: bold; color: #0f172a;">${rawOC}</span></div>`;
            })()}
            ${orderData.notasPedido ? `<div style="font-size: 11px; color: #334155;"><strong>Comentarios del Vendedor:</strong> <em>"${orderData.notasPedido}"</em></div>` : ''}
          </div>
        ` : ''}

        <!-- Tabla de Productos Confirmados y Estado Global -->
        <h3 style="font-size: 11px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">Detalle Completo de la Solicitud y Fechas de Confirmación</h3>
        <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; text-align: left;">
              <th style="padding: 10px 12px; font-size: 10px; font-weight: 900; text-transform: uppercase;">Ítem / Estado</th>
              <th style="padding: 10px 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: center;">Cant.</th>
              <th style="padding: 10px 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: center;">Modalidad</th>
              <th style="padding: 10px 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: right;">Unitario</th>
              <th style="padding: 10px 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.productos.map((p, idx) => {
              const fuePedido = p.estadoItem === 'Pedido';
              const fechaConfirmStr = fuePedido ? formatFechaHoraEmail(p.fechaConfirmacion) : '';

              return `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 12px; font-size: 11px;">
                  <strong style="color: #0f172a; display: block; font-weight: 800;">${String(p.descripcion || p.desc || '').toUpperCase()}</strong>
                  <span style="font-size: 10px; color: #64748b;">Marca: ${p.marca || 'N/A'}</span>
                  ${p.diasPrometidos ? `<span style="font-size: 9px; color: #475569; display: block; margin-top: 2px;">T. Entrega: ${p.diasPrometidos} d.h.</span>` : ''}
                  ${fuePedido ? `
                    <div style="margin-top: 4px; font-size: 9px; font-weight: 700; color: #475569; padding: 2px 0; display: inline-block;">
                      ✓ Confirmado: ${fechaConfirmStr}
                    </div>
                  ` : (p.enConsulta || p.estadoItem === 'En consulta' ? `
                    <div style="margin-top: 4px; font-size: 9px; font-weight: 700; color: #64748b; padding: 2px 0; display: inline-block;">
                      💬 En consulta con proveedor
                    </div>
                  ` : `
                    <div style="margin-top: 4px; font-size: 9px; font-weight: 700; color: #64748b; padding: 2px 0; display: inline-block;">
                      ⏳ Pendiente de confirmación
                    </div>
                  `)}
                </td>
                <td style="padding: 10px 8px; font-size: 11px; text-align: center; font-weight: 700; color: #334155;">${p.cantidad || p.cant}</td>
                <td style="padding: 12px 8px; text-align: center;">
                  ${fuePedido ? `
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; background-color: ${p.modalidad === 'Aéreo' ? '#eff6ff' : '#f0fdf4'}; color: ${p.modalidad === 'Aéreo' ? '#1d4ed8' : '#047857'}; border: 1px solid ${p.modalidad === 'Aéreo' ? '#bfdbfe' : '#a7f3d0'};">
                      ${p.modalidad}
                    </span>
                  ` : '<span style="font-size: 10px; color: #94a3b8; font-style: italic;">—</span>'}
                </td>
                <td style="padding: 10px 12px; font-size: 11px; text-align: right; color: #334155; font-weight: 600;">
                  ${fuePedido ? `$${Number(p.precioUnitario || p.precio || 0).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '<span style="color: #94a3b8;">—</span>'}
                </td>
                <td style="padding: 10px 12px; font-size: 11px; text-align: right; font-weight: 700; color: ${fuePedido ? '#0f172a' : '#94a3b8'};">
                  ${fuePedido ? `$${Number(p.subtotal || ((p.precioUnitario || p.precio || 0) * (p.cantidad || p.cant)) || 0).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Footer del correo -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
            Sistema de Gestión Logística — Centro Industrial Hermaco, S.A. DE C.V.
          </p>
        </div>
      </div>
    </div>
  `;
};
