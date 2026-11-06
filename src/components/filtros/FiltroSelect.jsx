import React, { useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FilaAcordeon } from './FilaAcordeon';
import { ListaOpciones } from './ListaOpciones';
import { MenuAnclado } from './MenuAnclado';
import { claseCampo, claseIcono } from './estilosCampo';
import { useModoFiltro } from './contexto';
import { idOpcion, useNavegacionOpciones } from './useNavegacionOpciones';

const normalizar = (o) => (typeof o === 'string' ? { value: o, label: o } : o);

/**
 * Filtro de una lista de opciones. NO usa el <select> nativo (la lista desplegada la dibuja el navegador y no se puede estilizar):
 * es el patrón ARIA "select-only combobox" — botón role="combobox" (aria-haspopup="listbox", aria-expanded, aria-controls,
 * aria-activedescendant) y una ListaOpciones (role="listbox"). Teclado completo y typeahead: ver useNavegacionOpciones.
 * Firma igual a la anterior: `value` ('' = "Todos") y `onChange(valor)` (el valor, no el evento); `ariaLabel` da el nombre accesible.
 *   - escritorio: campo con `prefijo` interno ("Estado: Todos"; con valor elegido el prefijo pasa a una línea pequeña encima del
 *     valor) y desplegable anclado (MenuAnclado: portal, flip, un solo cuerpo con el campo).
 *   - hoja móvil: fila con `etiqueta` (por defecto el prefijo sin ":") que se despliega en línea (acordeón, FilaAcordeon).
 * Con valor distinto de "Todos" el campo usa el estado "seleccionado" (--color-filtro-activo, texto primary-strong, icono primary).
 */
export const FiltroSelect = ({ value, onChange, opciones = [], prefijo, etiqueta, etiquetaTodos = 'Todos', ariaLabel, className = '' }) => {
  const enHoja = useModoFiltro() === 'hoja';
  const todas = [{ value: '', label: etiquetaTodos, esTodos: true }, ...opciones.map(normalizar)];
  const valor = value === undefined || value === null ? '' : value;
  const indice = todas.findIndex((o) => o.value === valor);
  const elegida = indice >= 0 ? todas[indice] : todas[0];
  const seleccionado = valor !== '';
  const nombre = ariaLabel || prefijo || etiqueta || etiquetaTodos;

  if (enHoja) {
    const titulo = etiqueta || (prefijo ? prefijo.replace(/:$/, '') : ariaLabel);
    return <FilaAcordeon etiqueta={titulo} textoValor={elegida.label} opciones={todas} value={valor} onElegir={onChange} ariaLabel={nombre} seleccionado={seleccionado} className={className} />;
  }
  return <CampoDesplegable todas={todas} valor={valor} indice={indice} elegida={elegida} seleccionado={seleccionado} onChange={onChange} prefijo={prefijo} nombre={nombre} className={className} />;
};

const CampoDesplegable = ({ todas, valor, indice, elegida, seleccionado, onChange, prefijo, nombre, className }) => {
  const id = useId();
  const idLista = `${id}-lista`;
  const campoRef = useRef(null);
  const botonRef = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [dir, setDir] = useState('abajo');
  const nav = useNavegacionOpciones({
    opciones: todas,
    indiceElegido: indice,
    abierto,
    abrir: () => setAbierto(true),
    cerrar: () => setAbierto(false),
    onElegir: (o) => onChange(o.value)
  });
  const elegir = (o) => {
    onChange(o.value);
    setAbierto(false);
    if (botonRef.current) botonRef.current.focus();
  };
  const apilado = Boolean(prefijo) && seleccionado;

  return (
    <div ref={campoRef} data-filtro-select className={`${claseCampo({ abierto, seleccionado, dir })} md:w-full ${className}`}>
      <button
        ref={botonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-activedescendant={abierto ? idOpcion(idLista, nav.activo) : undefined}
        aria-label={nombre}
        onClick={() => { if (abierto) setAbierto(false); else nav.abrirMenu(); }}
        onKeyDown={nav.alTeclear}
        className={`flex h-full w-full min-w-0 cursor-pointer items-center rounded-[inherit] pr-8 text-left outline-none ${apilado ? 'pl-3 pt-3' : 'pl-3'}`}
      >
        {prefijo && !apilado && <span aria-hidden="true" className={`shrink-0 pr-1 ${seleccionado ? 'text-filtro-texto' : 'text-slate-500'}`}>{prefijo}</span>}
        {apilado && <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1 text-[9px] font-semibold leading-none text-filtro-texto/70">{prefijo.replace(/:$/, '')}</span>}
        <span aria-hidden="true" className={`min-w-0 flex-1 truncate ${seleccionado ? 'font-semibold text-filtro-texto' : ''}`}>{elegida.label}</span>
      </button>
      <ChevronDown size={14} aria-hidden="true" className={`pointer-events-none absolute right-2.5 transition-transform ${abierto ? 'rotate-180' : ''} ${claseIcono(seleccionado)}`} />
      <MenuAnclado ancla={campoRef} abierto={abierto} onCerrar={() => setAbierto(false)} onDireccion={setDir}>
        <ListaOpciones
          id={idLista}
          opciones={todas}
          value={valor}
          activo={nav.activo}
          onActivar={nav.setActivo}
          onElegir={elegir}
          ariaLabel={nombre}
          style={{ maxHeight: 'var(--menu-alto, 20rem)' }}
        />
      </MenuAnclado>
    </div>
  );
};
