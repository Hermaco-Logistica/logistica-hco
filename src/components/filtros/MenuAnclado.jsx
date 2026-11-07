import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Debe coincidir con --anim-cerrar (tokens.css). */
const DURACION_CERRAR_MS = 140;
const ALTO_MAXIMO = 320;
const MARGEN = 8;

/**
 * Desplegable de escritorio anclado a un campo, en un portal a <body> (no lo recorta ningún overflow de la barra).
 *   - ancho: SIEMPRE el del campo (`ancla`); las opciones largas parten en dos líneas (line-clamp 2, `title` con el texto completo);
 *   - se abre hacia abajo y, si no cabe y arriba hay más sitio, hacia arriba (flip); `onDireccion('abajo' | 'arriba')` avisa al
 *     campo para que quite el radio del lado que toca el menú;
 *   - se reposiciona con scroll (en cualquier contenedor) y resize; el clic fuera llama a `onCerrar`;
 *   - sin contorno: superficie con --shadow-menu (sombra solo hacia el lado en que se abre, sin spread lateral) y clip-path en index.css para no pintar nada del lado del campo;
 *   - sigue montado durante la animación de salida (--anim-cerrar).
 * Las animaciones están en index.css (.menu-anclado). La posición se escribe directamente en el DOM (sin estado) para no re-renderizar.
 */
export const MenuAnclado = ({ ancla, abierto, onCerrar, onDireccion, id, children }) => {
  const [previo, setPrevio] = useState(abierto);
  const [visible, setVisible] = useState(abierto);
  const [cerrando, setCerrando] = useState(false);
  const menuRef = useRef(null);
  const direccion = useRef('abajo');
  const ultimo = useRef({ onCerrar, onDireccion });

  if (abierto !== previo) {
    setPrevio(abierto);
    if (abierto) { setVisible(true); setCerrando(false); } else { setCerrando(true); }
  }

  useEffect(() => { ultimo.current = { onCerrar, onDireccion }; });

  useEffect(() => {
    if (!cerrando) return undefined;
    const t = setTimeout(() => { setVisible(false); setCerrando(false); }, DURACION_CERRAR_MS);
    return () => clearTimeout(t);
  }, [cerrando]);

  const posicionar = () => {
    const menu = menuRef.current;
    const campo = ancla && ancla.current;
    if (!menu || !campo) return;
    const r = campo.getBoundingClientRect();
    const abajo = window.innerHeight - r.bottom - MARGEN;
    const arriba = r.top - MARGEN;
    const alto = Math.min(menu.scrollHeight, ALTO_MAXIMO + 8);
    const dir = alto > abajo && arriba > abajo ? 'arriba' : 'abajo';
    const disponible = Math.max(120, dir === 'abajo' ? abajo : arriba);
    menu.style.width = `${r.width}px`;
    menu.style.left = `${r.left}px`;
    menu.style.setProperty('--menu-alto', `${Math.min(ALTO_MAXIMO, disponible - 8)}px`);
    if (dir === 'abajo') { menu.style.top = `${r.bottom}px`; menu.style.bottom = 'auto'; }
    else { menu.style.bottom = `${window.innerHeight - r.top}px`; menu.style.top = 'auto'; }
    menu.dataset.dir = dir;
    if (dir !== direccion.current) { direccion.current = dir; if (ultimo.current.onDireccion) ultimo.current.onDireccion(dir); }
  };

  useLayoutEffect(() => { if (visible) posicionar(); });

  useEffect(() => {
    if (!visible || cerrando) return undefined;
    const alMover = () => posicionar();
    const alPulsar = (e) => {
      const menu = menuRef.current;
      const campo = ancla && ancla.current;
      if (menu && menu.contains(e.target)) return;
      if (campo && campo.contains(e.target)) return;
      if (ultimo.current.onCerrar) ultimo.current.onCerrar();
    };
    window.addEventListener('scroll', alMover, true);
    window.addEventListener('resize', alMover);
    document.addEventListener('mousedown', alPulsar);
    return () => {
      window.removeEventListener('scroll', alMover, true);
      window.removeEventListener('resize', alMover);
      document.removeEventListener('mousedown', alPulsar);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- posicionar solo lee refs y el DOM
  }, [visible, cerrando, ancla]);

  if (!visible || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={menuRef}
      id={id}
      data-menu-anclado
      data-estado={cerrando ? 'cerrando' : 'abierto'}
      className="menu-anclado fixed z-[90] overflow-hidden bg-filtro-abierto shadow-menu"
    >
      {children}
    </div>,
    document.body
  );
};
