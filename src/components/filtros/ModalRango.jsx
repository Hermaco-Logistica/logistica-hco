import React, { useEffect, useId, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Modal, ModalBoton, ModalCampo, ModalCuerpo, ModalEncabezado, ModalPie, ModalSeccion } from '../Modal';
import { useCerrarModal } from '../modalCierre';
import { validarRangoFechas } from '../../utils/dateValidation';
import { useCapaAtras } from './capasAtras';

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

/**
 * Modal para elegir un rango de fechas (en móvil, desde el selector de período de Análisis). Se monta solo mientras está abierto: sus campos
 * arrancan con `desde` y `hasta` (ISO AAAA-MM-DD, pueden venir vacíos) y no cambian nada fuera hasta Aplicar.
 * - `onAplicar({ desde, hasta })`: solo con las dos fechas y válidas (`validarRangoFechas`: formato, día real, no futuras y desde ≤ hasta);
 *   con cualquier otra cosa Aplicar queda deshabilitado y cada campo muestra su error. Después cierra con la animación de salida.
 * - `onCerrar()`: Cancelar, la X, el fondo, Escape y el botón atrás cierran sin aplicar (lo llama el modal al terminar su salida).
 * - `max` (ISO): fecha tope de ambos campos (por defecto no hay); en "Hasta" el mínimo es `desde`.
 * Es un <Modal variante="hoja"> (hoja inferior en móvil, tarjeta centrada desde `sm`) con el tono `rol`: el botón principal y el foco siguen el
 * color del rol; Cancelar es el botón secundario. Sin estilos propios: todo sale de utils/modales.js.
 */
export const ModalRango = ({ desde: desdeInicial = '', hasta: hastaInicial = '', max, onAplicar, onCerrar }) => {
  const idDesde = useId();
  const idHasta = useId();
  const cerrarRef = useRef(null);
  const [desde, setDesde] = useState(desdeInicial || '');
  const [hasta, setHasta] = useState(hastaInicial || '');
  const validacion = validarRangoFechas(desde, hasta);
  const incoherente = Boolean(desde && hasta && !validacion.errorInicio && !validacion.errorFin && desde > hasta);
  const errorDesde = validacion.errorInicio || '';
  const errorHasta = validacion.errorFin || (incoherente ? validacion.errorGeneral : '');
  const puedeAplicar = Boolean(desde && hasta && validacion.esValido);
  const cerrar = () => cerrarRef.current?.();
  const aplicar = (evento) => {
    evento.preventDefault();
    if (!puedeAplicar) return;
    onAplicar({ desde, hasta });
    cerrar();
  };
  return (
    <Modal como="form" onSubmit={aplicar} noValidate variante="hoja" ancho="sm" etiqueta="Rango de fechas" onCerrar={onCerrar}>
      <PuenteCierre cerrarRef={cerrarRef} />
      <ModalEncabezado titulo="Rango de fechas" icono={Calendar} tono="rol" compactoMovil onCerrar={cerrar} />
      <ModalCuerpo>
        <ModalSeccion etiqueta="Desde" htmlFor={idDesde}>
          <ModalCampo
            id={idDesde}
            type="date"
            tono="rol"
            value={desde}
            max={hasta && (!max || hasta <= max) ? hasta : max}
            error={Boolean(errorDesde)}
            mensajeError={errorDesde}
            aria-invalid={errorDesde ? true : undefined}
            onChange={(e) => setDesde(e.target.value)}
          />
        </ModalSeccion>
        <ModalSeccion etiqueta="Hasta" htmlFor={idHasta}>
          <ModalCampo
            id={idHasta}
            type="date"
            tono="rol"
            value={hasta}
            min={desde || undefined}
            max={max}
            error={Boolean(errorHasta)}
            mensajeError={errorHasta}
            aria-invalid={errorHasta ? true : undefined}
            onChange={(e) => setHasta(e.target.value)}
          />
        </ModalSeccion>
      </ModalCuerpo>
      <ModalPie>
        <ModalBoton onClick={cerrar}>Cancelar</ModalBoton>
        <ModalBoton variante="primario" tono="rol" type="submit" disabled={!puedeAplicar}>Aplicar</ModalBoton>
      </ModalPie>
    </Modal>
  );
};
