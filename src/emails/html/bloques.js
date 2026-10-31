import { PALETA_CORREO, resolverEtiqueta } from '../../utils/etiquetas';
import { esc } from './texto';

/**
 * Bloques de HTML reutilizables por todas las plantillas. Los colores salen de PALETA_CORREO
 * (utils/etiquetas.js), la misma paleta de las etiquetas de la aplicación.
 */

const FUENTE = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const COLOR_TEXTO = '#1e293b';
const COLOR_SUAVE = '#64748b';
const COLOR_BORDE = '#e2e8f0';

const paleta = (tono) => PALETA_CORREO[tono] || PALETA_CORREO.neutral;

/** Etiqueta de estado: fondo pastel, texto oscuro de la misma familia, sin borde. */
export const etiquetaCorreo = (texto, tono = 'neutral') => {
  if (texto === undefined || texto === null || texto === '') return '';
  const { fondo, texto: color } = paleta(tono);
  return `<span style="display:inline-block;padding:4px 10px;border-radius:8px;background-color:${fondo};color:${color};font-family:${FUENTE};font-size:12px;font-weight:600;line-height:16px;white-space:nowrap;">${esc(texto)}</span>`;
};

/** Etiqueta tomada de los catálogos de la aplicación (estadoSolicitud, estadoItem, faseSeguimiento...). */
export const etiquetaDeDominio = (dominio, valor, opciones = {}) => {
  const resuelta = resolverEtiqueta(dominio, valor, opciones);
  return etiquetaCorreo(resuelta.texto, resuelta.tono);
};

export const fila = (...etiquetas) => `<div style="margin:0 0 4px;">${etiquetas.filter(Boolean).join('&nbsp;&nbsp;')}</div>`;

/** Tarjeta de un dato: rótulo pequeño arriba y valor debajo. `ancho` en % para cuadrículas de varias columnas. */
const tarjetaDato = ({ rotulo, valor, detalle = '', ancho = 50 }) => `
  <td style="width:${ancho}%;background-color:#f8fafc;border-radius:12px;padding:12px 14px;vertical-align:top;">
    <span style="display:block;font-size:11px;font-weight:600;color:${COLOR_SUAVE};margin-bottom:3px;">${esc(rotulo)}</span>
    <span style="display:block;font-size:14px;font-weight:700;color:${COLOR_TEXTO};">${valor}</span>
    ${detalle ? `<span style="display:block;font-size:11px;color:${COLOR_SUAVE};margin-top:2px;">${detalle}</span>` : ''}
  </td>`;

/** Cuadrícula de datos de dos columnas. Cada dato: { rotulo, valor (HTML ya escapado), detalle? }. */
export const cuadriculaDatos = (datos) => {
  const filas = [];
  for (let i = 0; i < datos.length; i += 2) {
    const par = datos.slice(i, i + 2);
    filas.push(`<tr>${par.map((dato) => tarjetaDato({ ...dato, ancho: par.length === 1 ? 100 : 50 })).join('')}</tr>`);
  }
  return `<table role="presentation" style="width:100%;border-collapse:separate;border-spacing:8px;margin:0 -8px 8px;">${filas.join('')}</table>`;
};

/** Comentario citado (del vendedor, de Compras...). El texto se escapa aquí. */
export const cita = ({ titulo, texto, tono = 'neutral' }) => {
  if (!texto) return '';
  const { fondo, texto: color } = paleta(tono);
  return `
  <div style="margin:16px 0;padding:12px 16px;background-color:${fondo};border-radius:10px;">
    <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:4px;">${esc(titulo)}</div>
    <div style="font-size:13px;line-height:1.5;color:${COLOR_TEXTO};white-space:pre-wrap;">${esc(texto)}</div>
  </div>`;
};

/** Aviso destacado con el color del tono. `html` es contenido ya escapado. */
export const aviso = ({ tono = 'aviso', titulo, html }) => {
  const { fondo, texto: color } = paleta(tono);
  return `
  <div style="margin:16px 0;padding:12px 16px;background-color:${fondo};border-radius:10px;color:${color};font-size:13px;line-height:1.5;">
    ${titulo ? `<strong style="display:block;margin-bottom:2px;">${esc(titulo)}</strong>` : ''}${html}
  </div>`;
};

export const subtitulo = (texto) => `<h3 style="font-size:12px;font-weight:700;color:${COLOR_SUAVE};margin:24px 0 10px;letter-spacing:0.3px;">${esc(texto)}</h3>`;

/** Botón de enlace a la aplicación. */
export const boton = ({ texto, url }) => (url
  ? `<div style="margin:22px 0 4px;text-align:center;"><a href="${esc(url)}" style="display:inline-block;padding:10px 20px;border-radius:10px;background-color:#0f172a;color:#ffffff;font-family:${FUENTE};font-size:13px;font-weight:600;text-decoration:none;">${esc(texto)}</a></div>`
  : '');

/** Tabla de ítems. columnas: [{ titulo, alinear? }], filas: arreglo de arreglos de HTML ya escapado. */
export const tabla = ({ columnas, filas, fondoFila = () => '#ffffff' }) => `
  <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid ${COLOR_BORDE};border-radius:10px;overflow:hidden;">
    <thead>
      <tr style="background-color:#0f172a;">
        ${columnas.map((c) => `<th style="padding:10px 12px;font-size:11px;font-weight:700;color:#ffffff;text-align:${c.alinear || 'left'};">${esc(c.titulo)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${filas.map((celdas, indice) => `
      <tr style="background-color:${fondoFila(indice)};border-top:1px solid ${COLOR_BORDE};">
        ${celdas.map((celda, i) => `<td style="padding:10px 12px;font-size:13px;color:${COLOR_TEXTO};text-align:${columnas[i]?.alinear || 'left'};vertical-align:top;">${celda}</td>`).join('')}
      </tr>`).join('')}
    </tbody>
  </table>`;

/**
 * Estructura común de todos los correos: banda superior con la categoría y el título, fila de etiquetas
 * de estado, cuerpo y pie. `acento` es un tono de PALETA_CORREO.
 */
export const layout = ({ categoria = 'Sistema de Logística Hermaco', titulo, etiquetas = [], cuerpo, acento = 'neutral' }) => {
  const { texto: colorAcento } = paleta(acento);
  return `
  <div style="font-family:${FUENTE};color:${COLOR_TEXTO};max-width:640px;margin:0 auto;background-color:#ffffff;border:1px solid ${COLOR_BORDE};border-radius:16px;overflow:hidden;">
    <div style="background-color:#0f172a;padding:24px;text-align:center;border-bottom:4px solid ${colorAcento === '#475569' ? '#94a3b8' : colorAcento};">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px;">${esc(categoria)}</div>
      <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:800;">${esc(titulo)}</h1>
      ${etiquetas.length ? `<div style="margin-top:12px;">${etiquetas.filter(Boolean).join('&nbsp;&nbsp;')}</div>` : ''}
    </div>
    <div style="padding:24px;">
      ${cuerpo}
    </div>
    <div style="padding:14px 24px;border-top:1px solid ${COLOR_BORDE};text-align:center;">
      <p style="font-size:11px;color:#94a3b8;margin:0;">Sistema de Gestión Logística — Centro Industrial Hermaco, S.A. de C.V.</p>
      <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;">Este es un correo automático.</p>
    </div>
  </div>`;
};

/**
 * Versión sobria del correo: tarjeta blanca, texto pequeño de categoría, título, filas de datos en dos
 * columnas y un único botón. Sin banda de color ni tarjetas. Se usa en los avisos de seguimiento al cliente.
 */
export const layoutSimple = ({ categoria = 'Seguimiento', titulo, etiqueta = '', cuerpo }) => `
  <div style="font-family:${FUENTE};color:${COLOR_TEXTO};max-width:560px;margin:0 auto;background-color:#ffffff;border:1px solid ${COLOR_BORDE};border-radius:12px;">
    <div style="padding:28px 32px 4px;">
      <div style="font-size:12px;font-weight:600;color:${COLOR_SUAVE};letter-spacing:0.04em;text-transform:uppercase;">Hermaco · ${esc(categoria)}</div>
      <h1 style="margin:8px 0 0;font-size:22px;line-height:28px;font-weight:700;color:#0f172a;">${esc(titulo)}</h1>
      ${etiqueta ? `<div style="margin-top:10px;">${etiqueta}</div>` : ''}
    </div>
    <div style="padding:8px 32px 28px;">
      ${cuerpo}
    </div>
    <div style="padding:14px 32px;border-top:1px solid ${COLOR_BORDE};">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Centro Industrial Hermaco, S.A. de C.V. · Correo automático del Sistema de Gestión Logística.</p>
    </div>
  </div>`;

/** Datos como lista de filas "rótulo / valor" separadas por una línea fina. valor: HTML ya escapado. */
export const filasDatos = (datos) => `
  <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0 8px;">
    ${datos.filter(Boolean).map(({ rotulo, valor }) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:${COLOR_SUAVE};width:38%;vertical-align:top;">${esc(rotulo)}</td>
      <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:${COLOR_TEXTO};vertical-align:top;">${valor}</td>
    </tr>`).join('')}
  </table>`;

/** Texto citado con una barra lateral gris. El texto se escapa aquí. */
export const citaSimple = ({ titulo, texto }) => (texto
  ? `<div style="margin:18px 0 8px;padding:2px 0 2px 14px;border-left:3px solid #cbd5e1;">
      <div style="font-size:12px;font-weight:600;color:${COLOR_SUAVE};margin-bottom:4px;">${esc(titulo)}</div>
      <div style="font-size:14px;line-height:1.55;color:${COLOR_TEXTO};white-space:pre-wrap;">${esc(texto)}</div>
    </div>`
  : '');

/** Lista simple de ítems: cada elemento { principal, secundario } con HTML ya escapado. */
export const listaSimple = ({ titulo, elementos }) => (elementos.length
  ? `<div style="margin:18px 0 4px;font-size:12px;font-weight:600;color:${COLOR_SUAVE};">${esc(titulo)}</div>
    <table role="presentation" style="width:100%;border-collapse:collapse;">
      ${elementos.map(({ principal, secundario }) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:${COLOR_TEXTO};">${principal}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:${COLOR_SUAVE};text-align:right;white-space:nowrap;">${secundario || ''}</td>
      </tr>`).join('')}
    </table>`
  : '');
