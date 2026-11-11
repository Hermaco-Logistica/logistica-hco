import React, { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Modal, ModalBoton, ModalCuerpo, ModalEncabezado, ModalPie, ModalSeccion } from '../Modal';
import { useCerrarModal } from '../modalCierre';
import { AYUDA } from '../../utils/modales';
import { validarRangoFechas } from '../../utils/dateValidation';
import { CalendarioRango } from './CalendarioRango';
import { elegirDiaRango } from './elegirDiaRango';
import { useCapaAtras } from './capasAtras';
import { aISO, aVista } from './rangosFecha';

/** Dentro del <Modal>: pasa la salida animada al formulario (que está fuera del contexto de cierre) y registra la capa del botón atrás. */
const PuenteCierre = ({ cerrarRef }) => {
  const cerrar = useCerrarModal();
  useCapaAtras(true, cerrar);
  useEffect(() => {
    cerrarRef.current = cerrar;
    return () => { cerrarRef.current = null; };
  }, [cerrar, cerrarRef]);
  return null;
};

/** "AAAA-MM-DD" → Date local a las 00:00 (null si viene vacío o mal formado). */
const aFecha = (iso) => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : null;
};

/**
 * Modal para elegir un día o un rango de fechas con el calendario (en móvil, desde el selector de período de Análisis). Se monta solo mientras
 * está abierto: arranca con `desde` y `hasta` (ISO AAAA-MM-DD, pueden venir vacíos) y no cambia nada fuera hasta Aplicar.
 * - Resumen de solo lectura sobre el calendario: "dd/mm/aaaa — dd/mm/aaaa" con un rango y "dd/mm/aaaa (un día)" con un solo día (un toque,
 *   o el mismo día como inicio y fin), con una ayuda debajo que dice que se aplicará ese único día y cómo elegir un rango.
 * - `onAplicar({ desde, hasta })` (ISO): con solo el inicio aplica desde = hasta; deshabilitado sin inicio (o si `validarRangoFechas` no da
 *   por buena la selección, que con los días posteriores a `max` bloqueados no debería ocurrir). Después cierra con la animación de salida.
 * - `onCerrar()`: Cancelar, la X, el fondo, Escape y el botón atrás cierran sin aplicar (lo llama el modal al terminar su salida).
 * - `max` (ISO): último día elegible (los posteriores quedan deshabilitados y el calendario no avanza más allá de su mes).
 * Es un <Modal variante="hoja"> (hoja inferior en móvil, tarjeta centrada desde `sm`) con el tono `rol`: el botón principal sigue el color del
 * rol; Cancelar es el botón secundario; los días elegidos tienen el color del calendario de la hoja de filtros (slate-900). Sin estilos propios:
 * todo sale de utils/modales.js y de CalendarioRango.
 */
export const ModalRango = ({ desde = '', hasta = '', max, onAplicar, onCerrar }) => {
  const cerrarRef = useRef(null);
  const maxFecha = aFecha(max);
  const [inicio, setInicio] = useState(() => aFecha(desde));
  const [fin, setFin] = useState(() => (aFecha(desde) ? aFecha(hasta) : null));
  const [mes, setMes] = useState(() => {
    const base = aFecha(desde) || maxFecha || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const unDia = Boolean(inicio) && (!fin || fin.getTime() === inicio.getTime());
  const desdeIso = inicio ? aISO(inicio) : '';
  const hastaIso = inicio ? aISO(fin || inicio) : '';
  const validacion = validarRangoFechas(desdeIso, hastaIso);
  const puedeAplicar = Boolean(inicio) && validacion.esValido;
  const cerrar = () => cerrarRef.current?.();
  const elegirDia = (dia) => {
    const r = elegirDiaRango(inicio, fin, dia);
    setInicio(r.inicio);
    setFin(r.fin);
  };
  const aplicar = (evento) => {
    evento.preventDefault();
    if (!puedeAplicar) return;
    onAplicar({ desde: desdeIso, hasta: hastaIso });
    cerrar();
  };
  return (
    <Modal como="form" onSubmit={aplicar} noValidate variante="hoja" ancho="sm" etiqueta="Rango de fechas" onCerrar={onCerrar}>
      <PuenteCierre cerrarRef={cerrarRef} />
      <ModalEncabezado titulo="Rango de fechas" icono={Calendar} tono="rol" compactoMovil onCerrar={cerrar} />
      <ModalCuerpo>
        <ModalSeccion etiqueta="Desde — Hasta">
          <p data-resumen-rango aria-live="polite" className="text-[15px] font-semibold leading-[1.45] text-neutral-900">
            {!inicio && <span className="font-normal text-neutral-500">Elige un día o un rango</span>}
            {inicio && unDia && `${aVista(desdeIso)} (un día)`}
            {inicio && !unDia && `${aVista(desdeIso)} — ${aVista(hastaIso)}`}
          </p>
          {inicio && !fin && <p className={AYUDA}>Se aplicará solo este día. Toca otro día para elegir un rango.</p>}
        </ModalSeccion>
        <CalendarioRango
          className="mx-auto w-full max-w-xs"
          autoFoco
          inicio={inicio}
          fin={fin}
          mes={mes}
          onCambiarMes={(offset) => setMes((actual) => new Date(actual.getFullYear(), actual.getMonth() + offset, 1))}
          onElegirDia={elegirDia}
          max={maxFecha || undefined}
        />
      </ModalCuerpo>
      <ModalPie>
        <ModalBoton onClick={cerrar}>Cancelar</ModalBoton>
        <ModalBoton variante="primario" tono="rol" type="submit" disabled={!puedeAplicar}>Aplicar</ModalBoton>
      </ModalPie>
    </Modal>
  );
};
