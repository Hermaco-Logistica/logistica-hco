import { useEffect, useRef } from 'react';

/**
 * Botón "atrás" por capas para la hoja de filtros móvil y sus filas desplegadas.
 * Cada capa abierta (hoja, fila de opciones, calendario) añade UNA entrada al historial con history.pushState conservando el
 * history.state del enrutador ({ ...history.state, filtros: nivel }); la URL no cambia. Un único listener de popstate cierra la capa
 * de arriba (sin tocar el valor del filtro). Cuando una capa se cierra desde la interfaz (X, fondo, elegir una opción, Escape, pie)
 * su entrada se retira con history.go(-n) (n = esa capa y las que estén encima) y el popstate resultante se ignora, así la pila queda
 * coherente y no hay doble cierre. Una entrada con `filtros` que sobrevive a una recarga se retira al montar (ver `limpiarEntradaColgada`).
 */
const pila = [];
/** Retiradas propias de entradas pendientes de su popstate (se descartan solas si el navegador no llega a emitirlo). */
const pendientes = [];
const ignorarProximo = () => {
  const marca = {};
  pendientes.push(marca);
  setTimeout(() => { const i = pendientes.indexOf(marca); if (i >= 0) pendientes.splice(i, 1); }, 500);
};
let escuchando = false;

const alPopstate = () => {
  if (pendientes.length > 0) {
    pendientes.shift();
    if (!pendientes.length && !pila.length) { window.removeEventListener('popstate', alPopstate); escuchando = false; }
    return;
  }
  const capa = pila.pop();
  if (capa) capa.cerrar();
  if (!pila.length) { window.removeEventListener('popstate', alPopstate); escuchando = false; }
};

export const abrirCapa = (cerrar) => {
  const capa = { cerrar };
  pila.push(capa);
  window.history.pushState({ ...window.history.state, filtros: pila.length }, '');
  if (!escuchando) { window.addEventListener('popstate', alPopstate); escuchando = true; }
  return capa;
};

export const cerrarCapaDesdeUI = (capa) => {
  const i = pila.indexOf(capa);
  if (i < 0) return;
  const n = pila.length - i;
  pila.length = i;
  ignorarProximo();
  window.history.go(-n);
};

/** Tras una recarga con la hoja abierta la entrada del historial sigue marcada: se retira para no dejar una entrada fantasma. */
export const limpiarEntradaColgada = () => {
  if (pila.length === 0 && window.history.state && window.history.state.filtros) {
    const niveles = Number(window.history.state.filtros) || 1;
    ignorarProximo();
    if (!escuchando) { window.addEventListener('popstate', alPopstate); escuchando = true; }
    window.history.go(-niveles);
  }
};

/** Registra una capa mientras `activa` sea true. `cerrar` se llama solo cuando el cierre viene del botón atrás. */
export const useCapaAtras = (activa, cerrar) => {
  const ultimo = useRef(cerrar);
  useEffect(() => { ultimo.current = cerrar; });
  useEffect(() => {
    if (!activa || typeof window === 'undefined') return undefined;
    const capa = abrirCapa(() => ultimo.current());
    return () => cerrarCapaDesdeUI(capa);
  }, [activa]);
};

/** Solo para pruebas: vacía la pila y las retiradas pendientes. */
export const reiniciarCapasParaPruebas = () => {
  pila.length = 0;
  pendientes.length = 0;
  if (escuchando) { window.removeEventListener('popstate', alPopstate); escuchando = false; }
};
