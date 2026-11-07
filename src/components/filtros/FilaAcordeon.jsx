import React, { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { ListaOpciones } from './ListaOpciones';
import { claseFila, claseIcono } from './estilosCampo';
import { centrarEnCuerpo } from './centrarEnCuerpo';
import { useCapaAtras } from './capasAtras';
import { useFilaAcordeon } from './contexto';
import { idOpcion, useNavegacionOpciones } from './useNavegacionOpciones';

/**
 * Fila de la hoja móvil que se despliega en línea con la misma ListaOpciones del escritorio (acordeón). Patrón select-only combobox:
 * el botón de la fila lleva role="combobox", aria-expanded, aria-controls y aria-activedescendant. Solo una fila abierta a la vez
 * (ContextoAcordeon); al abrir, el cuerpo de la hoja la centra con un desplazamiento suave. Elegir una opción cierra el acordeón,
 * devuelve el foco a la fila y llama a `onElegir(valor)`.
 * `opciones`: [{ value, label, esTodos? }]; `textoValor`: lo que se muestra a la derecha; `seleccionado`: tiene valor distinto de "Todos".
 */
export const FilaAcordeon = ({ etiqueta, textoValor, opciones, value, onElegir, ariaLabel, seleccionado = false, className = '' }) => {
  const { id, abierto, abrir, alturaCuerpoFinal } = useFilaAcordeon();
  useCapaAtras(abierto, () => abrir(false));
  const filaRef = useRef(null);
  const botonRef = useRef(null);
  const idLista = `${id}-lista`;
  const indiceElegido = opciones.findIndex((o) => o.value === value);

  const abrirYCentrar = () => {
    abrir(true);
    requestAnimationFrame(() => requestAnimationFrame(() => centrarEnCuerpo(filaRef.current, alturaCuerpoFinal ? alturaCuerpoFinal() : undefined)));
  };
  const nav = useNavegacionOpciones({
    opciones,
    indiceElegido,
    abierto,
    abrir: abrirYCentrar,
    cerrar: () => abrir(false),
    onElegir: (o) => onElegir(o.value)
  });
  const elegir = (o) => {
    onElegir(o.value);
    abrir(false);
    if (botonRef.current) botonRef.current.focus();
  };

  return (
    <div ref={filaRef} data-fila-acordeon className={`${claseFila(seleccionado)} ${className}`}>
      <button
        ref={botonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-activedescendant={abierto ? idOpcion(idLista, nav.activo) : undefined}
        aria-label={ariaLabel || etiqueta}
        onClick={() => { if (abierto) abrir(false); else nav.abrirMenu(); }}
        onKeyDown={nav.alTeclear}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 text-left text-sm outline-none focus-visible:bg-surface-muted"
      >
        <span aria-hidden="true" className={`shrink-0 font-medium ${seleccionado ? 'text-filtro-texto' : 'text-slate-700'}`}>{etiqueta}</span>
        <span aria-hidden="true" className="flex min-w-0 items-center gap-1.5">
          <span className={`truncate ${seleccionado ? 'font-semibold text-filtro-texto' : 'text-slate-500'}`}>{textoValor}</span>
          <ChevronDown size={16} className={`shrink-0 transition-transform ${abierto ? 'rotate-180' : ''} ${claseIcono(seleccionado)}`} />
        </span>
      </button>
      <div className="filtro-acordeon" data-acordeon-panel data-abierto={abierto} inert={!abierto} aria-hidden={!abierto}>
        <div className="min-h-0 overflow-hidden">
          <ListaOpciones
            id={idLista}
            opciones={opciones}
            value={value}
            activo={nav.activo}
            onActivar={nav.setActivo}
            onElegir={elegir}
            ariaLabel={ariaLabel || etiqueta}
            alto="hoja"
            className="max-h-64 bg-surface"
          />
        </div>
      </div>
    </div>
  );
};
