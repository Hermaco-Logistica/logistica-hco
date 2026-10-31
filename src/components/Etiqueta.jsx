import React from 'react';
import { clasesEtiqueta, resolverEtiqueta, tamanoIcono } from '../utils/etiquetas';

/**
 * Única forma de pintar una etiqueta (badge o chip) en el proyecto.
 * El estilo, los textos y los íconos salen de src/utils/etiquetas.js; aquí no hay colores.
 *
 *   <Etiqueta dominio="estadoSolicitud" valor={s.estado} rol={role} />
 *   <Etiqueta dominio="faseSeguimiento" valor="vencida" tamano="normal" />
 *   <Etiqueta tono="neutral" mono>{unidades} u.</Etiqueta>
 *
 * Con `dominio` + `valor` el texto, tono, título e ícono vienen del catálogo. `children` reemplaza el texto
 * y `tono`/`icono` reemplazan lo del catálogo. `sinIcono` oculta el ícono.
 * Tamaños: 'compacta' (tablas, por defecto), 'normal' (tarjetas) y 'grande' (cabeceras).
 */
export const Etiqueta = ({
  dominio,
  valor,
  rol,
  tono,
  tamano = 'compacta',
  mono = false,
  titulo,
  icono,
  sinIcono = false,
  className = '',
  children,
  ...resto
}) => {
  const resuelta = dominio ? resolverEtiqueta(dominio, valor, { rol }) : {};
  const contenido = children ?? resuelta.texto;
  if (contenido === undefined || contenido === null || contenido === '') return null;

  const Icono = sinIcono ? null : (icono ?? resuelta.icono);
  const clases = clasesEtiqueta({ tono: tono || resuelta.tono, tamano, mono });
  return (
    <span title={titulo ?? resuelta.titulo} className={`${clases} ${className}`.trim()} {...resto}>
      {Icono && <Icono size={tamanoIcono(tamano)} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />}
      {contenido}
    </span>
  );
};
