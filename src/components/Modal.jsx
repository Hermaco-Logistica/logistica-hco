import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import {
  AYUDA,
  AYUDA_ERROR,
  BOTONES,
  BOTON_BASE,
  BOTON_CERRAR,
  BOTON_PASO,
  CAJA_ICONO,
  CALLOUT,
  CAMPO,
  CAMPO_ALTURA,
  CAMPO_ERROR,
  CUERPO,
  DURACION_SALIDA_MS,
  ENCABEZADO,
  ETIQUETA_SECCION,
  PESTANAS,
  PIE,
  SUBTITULO,
  TARJETA_ITEM,
  TITULO,
  clasesFondo,
  clasesPanel,
  tonoModal
} from '../utils/modales';

/**
 * Único componente de modal del proyecto. El estilo, las capas y la animación salen de utils/modales.js.
 *
 *   <Modal etiqueta="Rechazar prórroga" onCerrar={cerrar} ancho="md">
 *     <ModalEncabezado titulo="Rechazar prórroga" subtitulo="RFQ-0001" icono={XCircle} tono="peligro" onCerrar={cerrar} />
 *     <ModalCuerpo>…</ModalCuerpo>
 *     <ModalPie><ModalBoton onClick={cerrar}>Cancelar</ModalBoton></ModalPie>
 *   </Modal>
 *
 * Incluye: portal a document.body, cierre con Escape (solo el modal de arriba) y clic fuera, bloqueo del scroll
 * de la página, foco inicial en el panel y animación de entrada y de salida.
 * `abierto` permite que el padre mantenga el modal montado; si el padre lo desmonta, solo se anima la entrada.
 * `como="form"` convierte el panel en <form> (pasa `onSubmit`).
 * El color del modal (`tono`) se elige en ModalEncabezado y se repite en pestañas, campos y botón principal.
 */

const pila = [];
let bloqueos = 0;

const bloquearScroll = () => {
  bloqueos += 1;
  if (bloqueos === 1) document.body.style.overflow = 'hidden';
};
const liberarScroll = () => {
  bloqueos = Math.max(0, bloqueos - 1);
  if (bloqueos === 0) document.body.style.overflow = '';
};

export const Modal = ({
  abierto = true,
  onCerrar,
  etiqueta,
  variante = 'centrado',
  ancho = 'md',
  capa = 'modal',
  cerrarConEscape = true,
  cerrarAlClicFuera = true,
  bloqueado = false,
  soloMovil = false,
  como = 'div',
  className = '',
  children,
  ...resto
}) => {
  const Panel = como;
  const [saliendo, setSaliendo] = useState(false);
  const panelRef = useRef(null);
  const temporizador = useRef(null);
  const inicioEnFondo = useRef(false);
  const onCerrarRef = useRef(onCerrar);
  const bloqueadoRef = useRef(bloqueado);
  const saliendoRef = useRef(false);

  useEffect(() => {
    onCerrarRef.current = onCerrar;
    bloqueadoRef.current = bloqueado;
  });

  /** Anima la salida y avisa al padre al terminar. */
  const solicitarCierre = useCallback(() => {
    if (bloqueadoRef.current || saliendoRef.current) return;
    saliendoRef.current = true;
    setSaliendo(true);
    temporizador.current = setTimeout(() => {
      saliendoRef.current = false;
      setSaliendo(false);
      onCerrarRef.current?.();
    }, DURACION_SALIDA_MS);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  useEffect(() => {
    if (!abierto) return undefined;
    const identificador = Symbol('modal');
    const anterior = document.activeElement;
    pila.push(identificador);
    bloquearScroll();
    panelRef.current?.focus({ preventScroll: true });

    const alPulsar = (evento) => {
      if (evento.key === 'Escape' && cerrarConEscape && pila[pila.length - 1] === identificador) {
        evento.stopPropagation();
        solicitarCierre();
      }
    };
    document.addEventListener('keydown', alPulsar);

    return () => {
      document.removeEventListener('keydown', alPulsar);
      const posicion = pila.indexOf(identificador);
      if (posicion >= 0) pila.splice(posicion, 1);
      liberarScroll();
      if (anterior instanceof HTMLElement && document.contains(anterior)) anterior.focus({ preventScroll: true });
    };
  }, [abierto, cerrarConEscape, solicitarCierre]);

  if (!abierto || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`${clasesFondo({ variante, capa })} ${soloMovil ? 'md:hidden' : ''}`.trim()}
      data-saliendo={saliendo}
      onMouseDown={(evento) => { inicioEnFondo.current = evento.target === evento.currentTarget; }}
      onClick={(evento) => {
        if (cerrarAlClicFuera && inicioEnFondo.current && evento.target === evento.currentTarget) solicitarCierre();
        inicioEnFondo.current = false;
      }}
    >
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
        data-saliendo={saliendo}
        data-variante={variante}
        className={`${clasesPanel({ variante, ancho })} ${className}`.trim()}
        {...resto}
      >
        {children}
      </Panel>
    </div>,
    document.body
  );
};

/** Encabezado: ícono con el color del `tono`, título, subtítulo, referencia (chip gris) y botón de cerrar. */
export const ModalEncabezado = ({ titulo, subtitulo, referencia, icono, tono, onCerrar, cerrarDeshabilitado = false, oscuro = false, children }) => {
  const Icono = icono;
  return (
    <div className={oscuro ? ENCABEZADO.oscuro : ENCABEZADO.claro}>
      <div className="flex min-w-0 items-start gap-3.5">
        {Icono && <div className={`${CAJA_ICONO} ${tonoModal(tono).icono}`}><Icono size={22} strokeWidth={1.75} /></div>}
        <div className="min-w-0">
          <h2 className={oscuro ? TITULO.replace('text-neutral-900', 'text-white') : TITULO}>{titulo}</h2>
          {subtitulo && <p className={SUBTITULO}>{subtitulo}</p>}
          {referencia && <span className="mt-2 inline-block rounded-lg bg-neutral-200/70 px-2 py-0.5 text-xs font-medium text-neutral-500">{referencia}</span>}
          {children}
        </div>
      </div>
      {onCerrar && (
        <button type="button" onClick={onCerrar} disabled={cerrarDeshabilitado} className={BOTON_CERRAR} aria-label="Cerrar">
          <X size={18} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
};

export const ModalCuerpo = ({ className = '', children }) => (
  <div className={`${CUERPO} ${className}`.trim()}>{children}</div>
);

/** Pie con las acciones a la derecha. Una acción a la izquierda (p. ej. "Atrás") va con className="justify-between". */
export const ModalPie = ({ className = '', children }) => (
  <div className={`${PIE} ${className}`.trim()}>{children}</div>
);

/** Botón del pie. variante: secundario | primario (color del `tono`) | peligro (siempre rojo). */
export const ModalBoton = ({ variante = 'secundario', tono, type = 'button', icono, className = '', children, ...resto }) => {
  const Icono = icono;
  const colorPrimario = variante === 'primario' ? tonoModal(tono).boton : '';
  return (
    <button type={type} className={`${BOTON_BASE} ${BOTONES[variante] || BOTONES.secundario} ${colorPrimario} ${className}`.trim()} {...resto}>
      {Icono && <Icono size={16} strokeWidth={1.75} />}
      {children}
    </button>
  );
};

/**
 * Control segmentado. `opciones`: [{ clave, texto, cantidad, completada }]; la pastilla blanca se desliza hasta la activa.
 * Una opción solo se puede pulsar si `puedeElegir(clave)` devuelve true (por defecto, todas).
 */
export const ModalPestanas = ({ opciones, activa, tono, onElegir, puedeElegir = () => true, etiqueta }) => {
  const indice = Math.max(0, opciones.findIndex(({ clave }) => clave === activa));
  const acento = tonoModal(tono);
  return (
    <div className={PESTANAS.pista} style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }} role="tablist" aria-label={etiqueta}>
      <span
        className={PESTANAS.pastilla}
        style={{ width: `calc((100% - 8px) / ${opciones.length})`, transform: `translateX(${indice * 100}%)` }}
        aria-hidden="true"
      />
      {opciones.map(({ clave, texto, cantidad, completada }) => {
        const esActiva = clave === activa;
        return (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={esActiva}
            disabled={esActiva || !puedeElegir(clave)}
            onClick={() => onElegir(clave)}
            className={`${PESTANAS.boton} ${esActiva ? acento.texto : PESTANAS.inactiva}`}
          >
            {completada && <Check size={14} strokeWidth={2} className="text-emerald-600" />}
            {texto}
            {cantidad !== undefined && (
              <span className={`rounded-full px-1.5 text-xs font-medium ${esActiva ? acento.icono : 'bg-neutral-200 text-neutral-500'}`}>{cantidad}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/** Bloque con etiqueta de sección (sentence case) y su contenido separados 8 px. */
export const ModalSeccion = ({ etiqueta, htmlFor, children }) => (
  <div>
    {etiqueta && <label htmlFor={htmlFor} className={ETIQUETA_SECCION}>{etiqueta}</label>}
    {children}
  </div>
);

/** Aviso con ícono: azul para información, rosa para el motivo de un rechazo, etc. (según `tono`). */
export const ModalCallout = ({ tono = 'info', icono, className = '', children, ...resto }) => {
  const Icono = icono;
  return (
    <div className={`${CALLOUT} ${tonoModal(tono).icono} ${className}`.trim()} {...resto}>
      {Icono && <Icono size={20} strokeWidth={1.75} className="mt-px shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

/** Tarjeta de un ítem: título y subtítulo a la izquierda, estados (chips) a la derecha. */
export const ModalTarjetaItem = ({ titulo, subtitulo, children }) => (
  <div className={TARJETA_ITEM}>
    <div className="min-w-0">
      <p className="truncate text-[14.5px] font-semibold text-neutral-900">{titulo}</p>
      {subtitulo && <p className="mt-0.5 text-[12.5px] text-neutral-500">{subtitulo}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-1.5">{children}</div>}
  </div>
);

/** Lista de tarjetas de ítem separadas 8 px. */
export const ModalLista = ({ className = '', children }) => (
  <div className={`max-h-56 space-y-2 overflow-y-auto ${className}`.trim()}>{children}</div>
);

/** Pares etiqueta/valor en dos columnas, sin cajas. `datos`: [{ etiqueta, valor }]. */
export const ModalDetalle = ({ datos }) => (
  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
    {datos.filter(({ valor }) => valor !== undefined && valor !== null && valor !== '').map(({ etiqueta, valor }) => (
      <div key={etiqueta} className="min-w-0">
        <dt className="text-[12.5px] text-neutral-500">{etiqueta}</dt>
        <dd className="mt-0.5 text-[14.5px] text-neutral-900">{valor}</dd>
      </div>
    ))}
  </dl>
);

const Ayuda = ({ error, ayuda, mensajeError }) => {
  if (error && mensajeError) return <p className={AYUDA_ERROR}>{mensajeError}</p>;
  return ayuda ? <p className={AYUDA}>{ayuda}</p> : null;
};

/** Campo de una línea. `tono` define el color del borde y el anillo al enfocar; `error` los pinta en rojo. */
export const ModalCampo = ({ tono, error = false, ayuda, mensajeError, className = '', ...resto }) => (
  <>
    <input className={`${CAMPO} ${CAMPO_ALTURA.texto} ${tonoModal(tono).foco} ${error ? CAMPO_ERROR : ''} ${className}`.trim()} {...resto} />
    <Ayuda error={error} ayuda={ayuda} mensajeError={mensajeError} />
  </>
);

/** Área de comentario. Misma API que ModalCampo. */
export const ModalAreaTexto = ({ tono, error = false, ayuda, mensajeError, className = '', ...resto }) => (
  <>
    <textarea className={`${CAMPO} ${CAMPO_ALTURA.area} ${tonoModal(tono).foco} ${error ? CAMPO_ERROR : ''} ${className}`.trim()} {...resto} />
    <Ayuda error={error} ayuda={ayuda} mensajeError={mensajeError} />
  </>
);

/** Campo numérico con botones de menos y más. `valor` y `onCambiar` trabajan con texto, como un input normal. */
export const ModalNumero = ({ id, valor, onCambiar, min = 1, max = 90, tono, disabled = false, sufijo }) => {
  const mover = (delta) => {
    const siguiente = Math.min(max, Math.max(min, (Number(valor) || 0) + delta));
    onCambiar(String(siguiente));
  };
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={BOTON_PASO} onClick={() => mover(-1)} disabled={disabled || Number(valor) <= min} aria-label="Restar">−</button>
      <div className="relative flex-1">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step="1"
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          disabled={disabled}
          className={`${CAMPO} ${CAMPO_ALTURA.texto} ${tonoModal(tono).foco} text-center text-base font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
        {sufijo && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13.5px] text-neutral-500">{sufijo}</span>}
      </div>
      <button type="button" className={BOTON_PASO} onClick={() => mover(1)} disabled={disabled || Number(valor) >= max} aria-label="Sumar">+</button>
    </div>
  );
};

/** Diálogo de confirmación listo para usar. `variante`: primario (color del tono) | peligro. */
export const ModalConfirmar = ({
  abierto = true,
  titulo,
  subtitulo,
  mensaje,
  icono,
  tono,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'primario',
  cargando = false,
  onConfirmar,
  onCancelar
}) => (
  <Modal abierto={abierto} etiqueta={titulo} ancho="sm" onCerrar={onCancelar} bloqueado={cargando}>
    <ModalEncabezado titulo={titulo} subtitulo={subtitulo} icono={icono} tono={tono || (variante === 'peligro' ? 'peligro' : undefined)} onCerrar={onCancelar} cerrarDeshabilitado={cargando} />
    {mensaje && <ModalCuerpo><p className="text-[15px] leading-[1.45] text-neutral-600">{mensaje}</p></ModalCuerpo>}
    <ModalPie>
      <ModalBoton onClick={onCancelar} disabled={cargando}>{textoCancelar}</ModalBoton>
      <ModalBoton variante={variante} tono={tono} onClick={onConfirmar} disabled={cargando}>{cargando ? 'Procesando...' : textoConfirmar}</ModalBoton>
    </ModalPie>
  </Modal>
);

/**
 * Diálogo para pedir un motivo obligatorio (anular, denegar, rechazar…): título, campo de texto y confirmar.
 * `variante` del botón: peligro (rojo) o primario (color del tono).
 */
export const ModalMotivo = ({
  abierto = true,
  titulo,
  subtitulo,
  icono,
  tono = 'peligro',
  etiquetaCampo = 'Motivo',
  placeholder = 'Motivo (obligatorio)',
  valor,
  onCambiar,
  textoConfirmar = 'Confirmar',
  textoEnviando = 'Guardando...',
  variante = 'peligro',
  enviando = false,
  onConfirmar,
  onCancelar
}) => (
  <Modal abierto={abierto} etiqueta={titulo} onCerrar={onCancelar} bloqueado={enviando}>
    <ModalEncabezado titulo={titulo} subtitulo={subtitulo} icono={icono} tono={tono} onCerrar={onCancelar} cerrarDeshabilitado={enviando} />
    <ModalCuerpo>
      <ModalSeccion etiqueta={etiquetaCampo} htmlFor="modal-motivo-campo">
        <ModalAreaTexto id="modal-motivo-campo" tono={tono} autoFocus placeholder={placeholder} value={valor} onChange={(evento) => onCambiar(evento.target.value)} disabled={enviando} />
      </ModalSeccion>
    </ModalCuerpo>
    <ModalPie>
      <ModalBoton onClick={onCancelar} disabled={enviando}>Cancelar</ModalBoton>
      <ModalBoton variante={variante} tono={tono} onClick={onConfirmar} disabled={enviando || !valor.trim()}>
        {enviando ? textoEnviando : textoConfirmar}
      </ModalBoton>
    </ModalPie>
  </Modal>
);

/** Consulta de un texto guardado (p. ej. el motivo de una anulación), solo lectura. */
export const ModalConsultaTexto = ({ titulo, subtitulo, referencia, icono, tono = 'neutral', tonoTexto = 'peligro', texto, textoVacio = 'Sin motivo registrado.', onCerrar }) => (
  <Modal etiqueta={titulo} ancho="sm" onCerrar={onCerrar}>
    <ModalEncabezado titulo={titulo} subtitulo={subtitulo} referencia={referencia} icono={icono} tono={tono} onCerrar={onCerrar} />
    <ModalCuerpo>
      <ModalCallout tono={tonoTexto} icono={icono}>
        <span className="whitespace-pre-wrap break-words">{texto || textoVacio}</span>
      </ModalCallout>
    </ModalCuerpo>
    <ModalPie>
      <ModalBoton variante="primario" tono="neutral" onClick={onCerrar}>Cerrar</ModalBoton>
    </ModalPie>
  </Modal>
);

/** Aviso con un solo botón. No se cierra con Escape ni con clic fuera: el usuario debe aceptarlo. */
export const ModalAviso = ({ titulo, mensaje, icono, tono = 'aviso', textoBoton = 'Entendido', onAceptar }) => (
  <Modal etiqueta={titulo} ancho="sm" cerrarConEscape={false} cerrarAlClicFuera={false}>
    <ModalEncabezado titulo={titulo} icono={icono} tono={tono} />
    <ModalCuerpo><p className="text-[15px] leading-[1.45] text-neutral-600">{mensaje}</p></ModalCuerpo>
    <ModalPie>
      <ModalBoton variante="primario" tono={tono} autoFocus onClick={onAceptar}>{textoBoton}</ModalBoton>
    </ModalPie>
  </Modal>
);
