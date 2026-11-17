import { useSyncExternalStore } from 'react';

/**
 * Registro de "un solo popover abierto a la vez" para los que se anclan a un elemento (por ahora el de BarraApilada). Guarda el id del popover
 * abierto: abrir otro sustituye al anterior, que se entera por su suscripción y se cierra. Cada componente se suscribe a un booleano
 * (`useEsPopoverActivo(id)`), así que al abrir uno solo se vuelven a pintar el que se abre y el que se cierra, no los demás.
 */
let activo = null;
const oyentes = new Set();
const avisar = () => oyentes.forEach((oyente) => oyente());
const suscribir = (oyente) => { oyentes.add(oyente); return () => oyentes.delete(oyente); };

export const abrirPopoverUnico = (id) => { if (activo === id) return; activo = id; avisar(); };
export const cerrarPopoverUnico = (id) => { if (activo !== id) return; activo = null; avisar(); };
export const alternarPopoverUnico = (id) => (activo === id ? cerrarPopoverUnico(id) : abrirPopoverUnico(id));

/** Verdadero mientras el popover `id` es el abierto. */
export const useEsPopoverActivo = (id) => useSyncExternalStore(suscribir, () => activo === id, () => false);

/** Solo para pruebas: cierra el que haya abierto. */
export const reiniciarPopoverUnico = () => { activo = null; avisar(); };
