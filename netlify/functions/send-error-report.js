import { Resend } from 'resend';

/**
 * Netlify Function: send-error-report
 * Envía un correo de reporte de error crítico a rvides@hermaco.net.
 * Llamado automáticamente desde el frontend cuando ocurre un error
 * en el flujo de creación de RFQ o Pedido Manual.
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const {
      tipo,          // 'RFQ' | 'Pedido Manual'
      correlativo,   // RFQ-0001 o PED-0001 (puede ser null si el error fue antes de la transacción)
      vendedorEmail,
      vendedorNombre,
      cliente,
      errorMessage,  // error.message
      errorStack,    // error.stack
      etapa,         // 'firebase_transaction' | 'email_notification' | 'firestore_update' | 'desconocida'
      detailLog,     // Objeto libre con contexto adicional
      fechaHora,     // ISO string
    } = JSON.parse(event.body || '{}');

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'RESEND_API_KEY no configurado en Netlify' }),
      };
    }

    const resend = new Resend(apiKey);

    const tipoLabel = tipo || 'Solicitud';
    const fechaLabel = fechaHora
      ? new Date(fechaHora).toLocaleString('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'full', timeStyle: 'medium' })
      : 'No disponible';

    const detailLogHtml = detailLog
      ? `<pre style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:#374151;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(detailLog, null, 2)}</pre>`
      : '<span style="color:#9ca3af;font-size:12px;">Sin contexto adicional.</span>';

    const stackHtml = errorStack
      ? `<pre style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:#374151;white-space:pre-wrap;word-break:break-all;">${errorStack}</pre>`
      : '<span style="color:#9ca3af;font-size:12px;">Stack no disponible.</span>';

    const htmlBody = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Error del Sistema – Logística HCO</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d1d5db;">

        <!-- Banda superior de severidad -->
        <tr>
          <td style="background:#991b1b;height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Encabezado -->
        <tr>
          <td style="padding:28px 36px 20px;border-bottom:1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">LOGÍSTICA HCO — REPORTE DE INCIDENTE</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Error crítico en creación de ${tipoLabel}</p>
                </td>
                <td align="right" style="vertical-align:top;">
                  <span style="display:inline-block;padding:4px 10px;background:#fef2f2;border:1px solid #fca5a5;font-size:11px;font-weight:700;color:#991b1b;letter-spacing:1px;text-transform:uppercase;">CRÍTICO</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Datos del incidente -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">DATOS DEL INCIDENTE</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;">
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 14px;background:#f9fafb;width:160px;font-size:12px;font-weight:600;color:#6b7280;border-right:1px solid #e5e7eb;">Tipo de solicitud</td>
                <td style="padding:8px 14px;font-size:12px;color:#111827;font-weight:600;">${tipoLabel}</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 14px;background:#f9fafb;font-size:12px;font-weight:600;color:#6b7280;border-right:1px solid #e5e7eb;">Correlativo</td>
                <td style="padding:8px 14px;font-size:12px;font-family:'Courier New',monospace;color:${correlativo ? '#111827' : '#9ca3af'};">${correlativo || 'No generado — error previo a la transacción'}</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 14px;background:#f9fafb;font-size:12px;font-weight:600;color:#6b7280;border-right:1px solid #e5e7eb;">Cliente</td>
                <td style="padding:8px 14px;font-size:12px;color:#111827;">${cliente || '—'}</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 14px;background:#f9fafb;font-size:12px;font-weight:600;color:#6b7280;border-right:1px solid #e5e7eb;">Vendedor</td>
                <td style="padding:8px 14px;font-size:12px;color:#111827;">${vendedorNombre || '—'} &lt;${vendedorEmail || '—'}&gt;</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 14px;background:#f9fafb;font-size:12px;font-weight:600;color:#6b7280;border-right:1px solid #e5e7eb;">Fecha y hora</td>
                <td style="padding:8px 14px;font-size:12px;font-weight:700;color:#991b1b;">${fechaLabel}</td>
              </tr>
              <tr>
                <td style="padding:8px 14px;background:#f9fafb;font-size:12px;font-weight:600;color:#6b7280;border-right:1px solid #e5e7eb;">Etapa del fallo</td>
                <td style="padding:8px 14px;font-size:12px;font-family:'Courier New',monospace;color:#374151;">${etapa || 'desconocida'}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Mensaje de error -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">MENSAJE DE ERROR</p>
            <div style="padding:12px 16px;background:#f9fafb;border-left:3px solid #991b1b;border:1px solid #e5e7eb;border-left:3px solid #991b1b;">
              <code style="font-family:'Courier New',monospace;font-size:12px;color:#111827;word-break:break-all;">${errorMessage || 'Sin mensaje de error'}</code>
            </div>
          </td>
        </tr>

        <!-- Stack trace -->
        <tr>
          <td style="padding:20px 36px 0;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">STACK TRACE</p>
            <div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;overflow:auto;">
              ${stackHtml}
            </div>
          </td>
        </tr>

        <!-- Contexto técnico -->
        <tr>
          <td style="padding:20px 36px 0;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">CONTEXTO TÉCNICO (Firebase / Resend)</p>
            <div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;overflow:auto;">
              ${detailLogHtml}
            </div>
          </td>
        </tr>

        <!-- Acciones recomendadas -->
        <tr>
          <td style="padding:20px 36px 0;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">ACCIONES RECOMENDADAS — SOPORTE / TI</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;">
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 14px;background:#f9fafb;width:24px;font-size:12px;color:#6b7280;border-right:1px solid #e5e7eb;text-align:center;font-weight:700;">1</td>
                <td style="padding:8px 14px;font-size:12px;color:#374151;">Verificar en Firebase Console si la solicitud fue creada (buscar por correlativo o cliente).</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 14px;background:#f9fafb;font-size:12px;color:#6b7280;border-right:1px solid #e5e7eb;text-align:center;font-weight:700;">2</td>
                <td style="padding:8px 14px;font-size:12px;color:#374151;">Si la solicitud existe pero el correo no llegó, usar el botón de reenvío en el Dashboard del vendedor.</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 14px;background:#f9fafb;font-size:12px;color:#6b7280;border-right:1px solid #e5e7eb;text-align:center;font-weight:700;">3</td>
                <td style="padding:8px 14px;font-size:12px;color:#374151;">Si la solicitud no existe, el vendedor puede intentar crearla nuevamente.</td>
              </tr>
              <tr>
                <td style="padding:8px 14px;background:#f9fafb;font-size:12px;color:#6b7280;border-right:1px solid #e5e7eb;text-align:center;font-weight:700;">4</td>
                <td style="padding:8px 14px;font-size:12px;color:#374151;">Revisar Netlify Functions logs para contexto adicional del error de Firebase o Resend.</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 36px;margin-top:8px;border-top:1px solid #e5e7eb;margin-top:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:11px;color:#9ca3af;">Este mensaje fue generado automáticamente por el sistema de Logística HCO.</p>
                  <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">No responder a este correo.</p>
                </td>
                <td align="right">
                  <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#d1d5db;">LOGÍSTICA HCO</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Banda inferior -->
        <tr>
          <td style="background:#1f2937;height:3px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: 'Sistema Logística HCO <rvides@hermaco.net>',
      to: ['rvides@hermaco.net'],
      subject: `🚨 Error Crítico – ${tipoLabel}${correlativo ? ` ${correlativo}` : ''} (${vendedorNombre || vendedorEmail || 'vendedor desconocido'})`,
      html: htmlBody,
    });

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error al enviar reporte de error (Resend)', detail: error }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Reporte de error enviado', data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error interno en send-error-report', detail: err?.message }),
    };
  }
};
