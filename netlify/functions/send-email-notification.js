import { Resend } from 'resend';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const { to, cc, subject, bodyHtml, from, replyTo, attachment } = JSON.parse(event.body || '{}');

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

    if (attachment?.url) {
      let attachmentUrl;
      try {
        attachmentUrl = new URL(attachment.url);
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'URL de archivo adjunto no válida' }),
        };
      }

      if (attachmentUrl.protocol !== 'https:' || attachmentUrl.hostname !== 'firebasestorage.googleapis.com') {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'El archivo adjunto debe provenir de Firebase Storage' }),
        };
      }

      const filename = String(attachment.nombre || 'archivo-adjunto')
        .replace(/[\\/:*?"<>|]/g, '_')
        .slice(0, 180);
      emailPayload.attachments = [{ path: attachmentUrl.toString(), filename }];
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Error de Resend al enviar correo', detail: error.message || error }),
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
