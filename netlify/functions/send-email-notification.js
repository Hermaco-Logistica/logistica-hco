import { Resend } from 'resend';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const { to, cc, subject, bodyHtml, from, replyTo, attachments } = JSON.parse(event.body || '{}');

    if (!to || !to.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Falta el destinatario (to)' }),
      };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'RESEND_API_KEY no configurado en Netlify' }),
      };
    }

    const resend = new Resend(apiKey);

    const emailPayload = {
      from: from || 'Sistema Logistica Hermaco <compras@hermaco.net>',
      to: Array.isArray(to) ? to : [to],
      subject: subject || 'Notificación del Sistema',
      html: bodyHtml || '<p>Notificación automática de Logística Hermaco.</p>',
    };

    if (replyTo) {
      emailPayload.reply_to = replyTo;
    }

    if (cc && cc.length) {
      emailPayload.cc = Array.isArray(cc) ? cc : [cc];
    }

    // Adjuntos base64: [{ content: string, nombre: string, tipo?: string }]
    if (Array.isArray(attachments) && attachments.length > 0) {
      emailPayload.attachments = attachments
        .filter(a => a?.content && typeof a.content === 'string')
        .map(a => ({
          content: a.content,
          filename: String(a.nombre || 'adjunto').replace(/[\\/:*?"<>|]/g, '_').slice(0, 180),
        }));
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error de Resend', detail: error }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Correo enviado con éxito', data }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error al enviar el correo',
        detail: error?.message || 'unknown_error',
      }),
    };
  }
};
