import React from 'react';
import { Check } from 'lucide-react';
import { idOpcion } from './useNavegacionOpciones';

/**
 * Lista de opciones compartida (role="listbox") del desplegable de escritorio y del acordeón móvil. Solo pinta: el foco vive en
 * el botón combobox, que apunta a la opción activa con aria-activedescendant (id `${id}-op-${índice}`; ver `idOpcion`).
 * `opciones`: [{ value, label, esTodos? }]. `esTodos` marca la opción neutra ("Todos"): aunque sea la actual no se pinta como una
 * selección (sin check ni color). Las opciones largas parten en dos líneas (line-clamp 2) y llevan `title` con el texto completo.
 * `alto`: 'escritorio' (36 px) o 'hoja' (44 px).
 */
export const ListaOpciones = ({ id, opciones, value, activo, onElegir, onActivar, ariaLabel, alto = 'escritorio', className = '', style }) => (
  <ul
    role="listbox"
    id={id}
    aria-label={ariaLabel}
    style={style}
    className={`scroll-filtros max-h-80 overflow-y-auto overscroll-contain py-1 ${className}`}
  >
    {opciones.map((o, i) => {
      const elegida = o.value === value;
      const marcada = elegida && !o.esTodos;
      const enfocada = i === activo;
      const fondo = marcada ? (enfocada ? 'bg-filtro-activo' : 'bg-primary-soft') : enfocada ? 'bg-slate-100' : '';
      const texto = marcada ? 'font-semibold text-filtro-texto' : o.esTodos ? 'text-slate-500' : 'text-slate-700';
      return (
        <li
          key={`${o.value}`}
          id={idOpcion(id, i)}
          role="option"
          aria-selected={elegida}
          title={o.label}
          data-activo={enfocada}
          onMouseMove={() => { if (!enfocada) onActivar(i); }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onElegir(o)}
          className={`flex cursor-pointer items-center gap-2 text-xs font-medium ${alto === 'hoja' ? 'min-h-11 px-4 py-2 text-sm' : 'min-h-9 px-3 py-1.5'} ${fondo} ${texto}`}
        >
          <span className="line-clamp-2 min-w-0 flex-1 break-words">{o.label}</span>
          {marcada && <Check size={14} aria-hidden="true" className="shrink-0 text-primary" />}
        </li>
      );
    })}
  </ul>
);
