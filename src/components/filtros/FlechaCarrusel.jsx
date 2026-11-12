import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Flecha de apoyo de un carrusel horizontal (solo ayuda visual: las opciones ya se manejan con teclado, por eso aria-hidden y tabIndex -1).
 * Círculo de 24 px (`size-6`) con `bg-surface` y `shadow-boton`, centrado en vertical dentro de un contenedor posicionado. `posicion` son las
 * clases de su posición horizontal (p. ej. `left-1.5` / `right-1.5`); las escribe quien la usa, completas, para que Tailwind las detecte.
 * `visible` la muestra o la oculta (oculta no capta el toque).
 */
export const FlechaCarrusel = ({ lado, visible, onClick, posicion }) => {
  const Icono = lado === 'izq' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      data-flecha={lado}
      data-visible={visible}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-surface text-slate-600 shadow-boton transition-opacity duration-[var(--anim-abrir)] ${posicion} ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <Icono size={14} strokeWidth={2.25} />
    </button>
  );
};
