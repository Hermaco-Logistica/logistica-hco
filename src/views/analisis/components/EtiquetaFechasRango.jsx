import React from 'react';
import { Calendar } from 'lucide-react';
import { Etiqueta } from '../../../components/Etiqueta';
import { textoRangoCorto } from '../opcionesPeriodo';

/**
 * Fechas del período Rango como etiqueta tocable ("01/11 – 15/11", "Desde 01/11" o "Hasta 05/11"): tono apagado, tamaño compacta e icono de
 * calendario. Tocarla llama a `onEditar` (reabre el modal de Rango con sus fechas). El área de toque llega a 44 px con un pseudo-elemento
 * (24 de la etiqueta + 4 por arriba + 16 por abajo), sin agrandar nada a la vista. `className` coloca el botón (p. ej. `mt-1` bajo el carrusel
 * en móvil). Solo se pinta con período Rango (lo decide quien la usa).
 */
export const EtiquetaFechasRango = ({ desde, hasta, onEditar, className = '' }) => (
  <button
    type="button"
    data-linea-fechas
    aria-label="Editar fechas del rango"
    onClick={onEditar}
    className={`relative flex w-fit cursor-pointer rounded-lg text-left before:absolute before:-bottom-4 before:-top-1 before:inset-x-0 before:content-[''] focus-visible:outline-2 focus-visible:outline-primary ${className}`.trim()}
  >
    <Etiqueta tono="apagado" tamano="compacta" icono={Calendar}>{textoRangoCorto(desde, hasta)}</Etiqueta>
  </button>
);
