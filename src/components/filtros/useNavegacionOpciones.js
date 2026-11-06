import { useRef, useState } from 'react';

/** Id de la opción `indice` de una lista con id `id` (lo usan ListaOpciones y aria-activedescendant). */
export const idOpcion = (id, indice) => `${id}-op-${indice}`;

const quitarAcentos = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const REINICIO_TYPEAHEAD_MS = 500;

/**
 * Teclado del patrón ARIA "select-only combobox" (W3C APG), compartido por el desplegable de escritorio y el acordeón móvil.
 * El foco se queda en el botón (role="combobox"); la opción activa se anuncia con aria-activedescendant.
 *   cerrado: ↓ ↑ Enter Espacio abren; una letra abre y salta a la opción que empieza así.
 *   abierto: ↓ ↑ Inicio Fin AvPág RePág mueven; Enter y Espacio eligen; Escape cierra (sin llegar a la hoja); Tab cierra;
 *            escribir letras busca (typeahead, el texto se reinicia a los ~500 ms).
 * `opciones`: [{ value, label }]; `onElegir(opcion)`; `abrir()` / `cerrar()` los pone el contenedor.
 */
export const useNavegacionOpciones = ({ opciones, indiceElegido, abierto, abrir, cerrar, onElegir }) => {
  const [activo, setActivo] = useState(Math.max(indiceElegido, 0));
  const buffer = useRef({ texto: '', temporizador: null });
  const total = opciones.length;
  const limitar = (i) => Math.min(Math.max(i, 0), total - 1);

  const buscar = (letra, desde) => {
    const b = buffer.current;
    clearTimeout(b.temporizador);
    b.texto += quitarAcentos(letra);
    b.temporizador = setTimeout(() => { b.texto = ''; }, REINICIO_TYPEAHEAD_MS);
    const repetida = b.texto.length > 1 && b.texto.split('').every((c) => c === b.texto[0]);
    const prefijo = repetida ? b.texto[0] : b.texto;
    const inicio = b.texto.length === 1 || repetida ? desde + 1 : desde;
    for (let k = 0; k < total; k += 1) {
      const i = (inicio + k) % total;
      if (quitarAcentos(opciones[i].label).startsWith(prefijo)) return i;
    }
    return -1;
  };

  const abrirMenu = (indice = indiceElegido) => { setActivo(limitar(indice)); abrir(); };

  const alTeclear = (e) => {
    const k = e.key;
    const imprimible = k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (!abierto) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || (k === ' ' && !buffer.current.texto)) {
        e.preventDefault();
        abrirMenu(indiceElegido);
      } else if (k === 'Home' || k === 'End') {
        e.preventDefault();
        abrirMenu(k === 'Home' ? 0 : total - 1);
      } else if (imprimible) {
        e.preventDefault();
        const i = buscar(k, Math.max(indiceElegido, 0));
        abrirMenu(i >= 0 ? i : indiceElegido);
      }
      return;
    }
    if (k === 'ArrowDown') { e.preventDefault(); setActivo(limitar(activo + 1)); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActivo(limitar(activo - 1)); }
    else if (k === 'Home') { e.preventDefault(); setActivo(0); }
    else if (k === 'End') { e.preventDefault(); setActivo(total - 1); }
    else if (k === 'PageDown') { e.preventDefault(); setActivo(limitar(activo + 10)); }
    else if (k === 'PageUp') { e.preventDefault(); setActivo(limitar(activo - 10)); }
    else if (k === 'Enter' || (k === ' ' && !buffer.current.texto)) { e.preventDefault(); onElegir(opciones[limitar(activo)]); cerrar(); }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); }
    else if (k === 'Tab') { cerrar(); }
    else if (imprimible) {
      e.preventDefault();
      const i = buscar(k, activo);
      if (i >= 0) setActivo(i);
    }
  };

  return { activo, setActivo, alTeclear, abrirMenu };
};
