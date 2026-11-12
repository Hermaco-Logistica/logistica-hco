import { useEffect, useRef } from 'react';

/**
 * Botón "atrás" por capas para la hoja de filtros móvil y sus filas desplegadas.
 * Cada capa abierta (hoja, fila de opciones, calendario) corresponde a UNA entrada del historial, marcada con
 * history.pushState conservando el history.state del enrutador ({ ...history.state, filtros: nivel }); la URL no cambia. Un único listener
 * de popstate cierra la capa de arriba (sin tocar el valor del filtro).
 * El historial se RECONCILIA en vez de editarse en cada efecto: abrir una capa solo empuja una entrada si la profundidad actual
 * (history.state.filtros) es menor que el número de capas, y cerrarla solo la quita de la pila; un único setTimeout(0) por commit compara
 * la profundidad con la pila y hace UN history.go(-diferencia) si sobran entradas (o completa con pushState si faltan). Así un cierre
 * y una apertura en el mismo commit (doble montaje de StrictMode, cambio de una fila a otra) reutilizan la entrada y no se pierde
 * ningún pushState: history.go es asíncrono y resuelve su destino al llamarlo, de modo que un go seguido de un pushState dejaba el
 * navegador un nivel por debajo de la pila y el siguiente cierre retrocedía una entrada de más (salía de la pantalla).
 * Cada retroceso propio espera su popstate (se ignora) antes de la siguiente operación; el marcador caduca a los 500 ms como tope.
 * Una entrada con `filtros` que sobrevive a una recarga se retira al montar (ver `limpiarEntradaColgada`).
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
let temporizador = null;

/** Profundidad del historial: nivel `filtros` de la entrada actual (0 si no es una entrada de capas). */
const profundidad = () => (window.history.state && Number(window.history.state.filtros)) || 0;
const empujar = () => window.history.pushState({ ...window.history.state, filtros: profundidad() + 1 }, '');

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

/** Iguala el historial con la pila: un go(-n) si sobran entradas, pushState si faltan. Espera el popstate de un retroceso propio en vuelo. */
const reconciliar = () => {
  temporizador = null;
  if (pendientes.length > 0) { programar(50); return; }
  const dif = profundidad() - pila.length;
  if (dif > 0) { ignorarProximo(); window.history.go(-dif); }
  for (let i = dif; i < 0; i += 1) empujar();
};
function programar(ms = 0) {
  if (temporizador === null) temporizador = setTimeout(reconciliar, ms);
}

export const abrirCapa = (cerrar) => {
  const capa = { cerrar };
  pila.push(capa);
  if (!escuchando) { window.addEventListener('popstate', alPopstate); escuchando = true; }
  if (pendientes.length === 0) while (profundidad() < pila.length) empujar();
  programar();
  return capa;
};

export const cerrarCapaDesdeUI = (capa) => {
  const i = pila.indexOf(capa);
  if (i < 0) return;
  pila.length = i; // la capa y las que estén encima
  programar();
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
  if (temporizador !== null) { clearTimeout(temporizador); temporizador = null; }
  if (escuchando) { window.removeEventListener('popstate', alPopstate); escuchando = false; }
};
