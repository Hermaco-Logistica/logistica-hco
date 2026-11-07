import { OBJETIVO_CSS, alturaAmpliadaPx } from './alturaHoja';

/**
 * Hoja de filtros arrastrable en móvil. Estados: cerrada, compacta (altura natural, máx. 85 dvh) y completa (100 dvh menos el margen
 * superior seguro). Controlador imperativo (sin estado de React): escribe directamente en el DOM del panel.
 *   - Arrastre (Pointer Events): la hoja sigue al dedo sin animación. Por encima de la altura compacta cambia `height` (con
 *     resistencia elástica pasada la completa); por debajo se desliza con `transform: translateY` (cerrar). Se escribe UNA vez por
 *     fotograma con requestAnimationFrame y sin leer el layout dentro del bucle (las medidas se toman al empezar el arrastre).
 *   - Al soltar: si |velocidad| > 0,5 px/ms manda la dirección (arriba → completa; abajo → compacta desde completa, cerrar desde
 *     compacta); si no, la posición más cercana entre cerrada, compacta y completa. Después anima al destino con --anim-abrir /
 *     --anim-cerrar (sin animación con prefers-reduced-motion).
 *   - Abrir una fila de filtros lleva a completa; al cerrarla vuelve al estado previo.
 *   - Cerrar arrastrando llama a `alCerrar` (el mismo camino que la X: useCerrarModal, que retira la entrada del historial).
 */
export const VELOCIDAD_MINIMA = 0.5;
/** El estirón máximo cabe en el margen superior (1 rem): la hoja nunca sale por arriba de la pantalla. */
const ELASTICO_MAX = 14;

const reducirMovimiento = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const elastico = (exceso) => ELASTICO_MAX * (1 - Math.exp(-exceso / 60));

/** Estado destino al soltar. `v` en px/ms (positivo = hacia abajo); `alto` es la altura "virtual" actual (0 = cerrada). */
export const decidirDestino = ({ v, alto, compacta, completa, inicial }) => {
  if (Math.abs(v) > VELOCIDAD_MINIMA) {
    if (v < 0) return 'completa';
    return inicial === 'completa' ? 'compacta' : 'cerrada';
  }
  if (alto < compacta / 2) return 'cerrada';
  if (alto < (compacta + completa) / 2) return 'compacta';
  return 'completa';
};

export const crearControlHoja = ({ obtenerPanel, alCerrar, alCambiar }) => {
  let estado = 'compacta';
  let alturaCompacta = 0;
  let filaAbierta = false;
  let previo = 'compacta';
  let temporizador = null;
  let arrastre = null;

  const avisar = () => {
    if (!alCambiar) return;
    const completa = alturaAmpliadaPx();
    alCambiar({ estado, porcentaje: estado === 'completa' || !alturaCompacta ? 100 : Math.round((100 * alturaCompacta) / completa) });
  };

  const transicion = (tipo) => {
    const dur = tipo === 'cerrar' ? 'var(--anim-cerrar)' : 'var(--anim-abrir)';
    const ease = tipo === 'cerrar' ? 'var(--ease-cerrar)' : 'var(--ease-abrir)';
    return `height ${dur} ${ease}, transform ${dur} ${ease}`;
  };
  const duracion = (tipo) => (tipo === 'cerrar' ? 140 : 220) + 60;

  const limpiarTemporizador = () => { clearTimeout(temporizador); temporizador = null; };

  const fijar = (panel, destino) => {
    panel.style.transition = '';
    panel.style.transform = '';
    if (destino === 'compacta') { panel.style.height = ''; panel.style.maxHeight = ''; } else { panel.style.height = OBJETIVO_CSS; panel.style.maxHeight = OBJETIVO_CSS; }
  };

  const irA = (destino, { desde } = {}) => {
    const panel = obtenerPanel();
    if (!panel) return;
    limpiarTemporizador();
    if (destino === 'cerrada') {
      panel.style.animation = 'none';
      panel.style.transition = reducirMovimiento() ? 'none' : transicion('cerrar');
      panel.style.transform = 'translateY(100%)';
      alCerrar();
      return;
    }
    const tipo = destino === 'completa' ? 'abrir' : 'cerrar';
    if (destino === 'compacta' && !alturaCompacta) alturaCompacta = panel.offsetHeight;
    const origen = desde === undefined ? panel.offsetHeight : desde;
    panel.style.maxHeight = OBJETIVO_CSS;
    estado = destino;
    avisar();
    if (reducirMovimiento()) { panel.style.transition = 'none'; fijar(panel, destino); return; }
    panel.style.transition = 'none';
    if (!panel.style.height) panel.style.height = `${origen}px`;
    void panel.offsetHeight;
    panel.style.transition = transicion(tipo);
    panel.style.transform = 'translateY(0)';
    panel.style.height = destino === 'completa' ? OBJETIVO_CSS : `${alturaCompacta}px`;
    temporizador = setTimeout(() => fijar(panel, destino), duracion(tipo));
  };

  return {
    get estado() { return estado; },
    /** Mide la altura compacta natural (hoja recién abierta o de vuelta a compacta). */
    medir() {
      const panel = obtenerPanel();
      if (panel && estado === 'compacta' && !panel.style.height) { alturaCompacta = panel.offsetHeight; avisar(); }
    },
    irA,
    teclado(tecla) {
      if (tecla === 'ArrowUp') { if (estado !== 'completa') irA('completa'); return true; }
      if (tecla === 'ArrowDown') { if (estado === 'completa') irA('compacta'); else irA('cerrada'); return true; }
      return false;
    },
    abrirFila() {
      if (!filaAbierta) { filaAbierta = true; previo = estado; }
      if (estado !== 'completa') irA('completa');
    },
    cerrarFila() {
      if (!filaAbierta) return;
      filaAbierta = false;
      if (previo === 'compacta' && estado === 'completa') irA('compacta');
    },
    iniciarArrastre(y, t) {
      const panel = obtenerPanel();
      if (!panel) return;
      limpiarTemporizador();
      const alto0 = panel.offsetHeight;
      if (estado === 'compacta' && !alturaCompacta) alturaCompacta = alto0;
      arrastre = { y0: y, alto0, compacta: alturaCompacta || alto0, completa: alturaAmpliadaPx(), inicial: estado, muestras: [{ y, t }], yUlt: y, raf: 0, panel };
      panel.style.transition = 'none';
      panel.style.animation = 'none';
      panel.style.maxHeight = '100dvh';
      panel.style.height = `${alto0}px`;
    },
    moverArrastre(y, t) {
      if (!arrastre) return;
      arrastre.yUlt = y;
      arrastre.muestras.push({ y, t });
      if (arrastre.muestras.length > 6) arrastre.muestras.shift();
      if (arrastre.raf) return;
      arrastre.raf = requestAnimationFrame(() => {
        if (!arrastre) return;
        const a = arrastre;
        a.raf = 0;
        let alto = a.alto0 - (a.yUlt - a.y0);
        if (alto > a.completa) alto = a.completa + elastico(alto - a.completa);
        if (alto >= a.compacta) { a.panel.style.height = `${alto}px`; a.panel.style.transform = 'translateY(0)'; } else { a.panel.style.height = `${a.compacta}px`; a.panel.style.transform = `translateY(${a.compacta - Math.max(alto, 0)}px)`; }
      });
    },
    terminarArrastre() {
      if (!arrastre) return;
      const a = arrastre;
      arrastre = null;
      if (a.raf) cancelAnimationFrame(a.raf);
      const ult = a.muestras[a.muestras.length - 1];
      const ref = a.muestras.find((m) => ult.t - m.t <= 100) || a.muestras[0];
      const dt = Math.max(1, ult.t - ref.t);
      const v = (ult.y - ref.y) / dt;
      const alto = Math.min(Math.max(a.alto0 - (a.yUlt - a.y0), 0), a.completa);
      const destino = decidirDestino({ v, alto, compacta: a.compacta, completa: a.completa, inicial: a.inicial });
      if (destino === 'compacta') alturaCompacta = a.compacta;
      // posición actual (la última escrita) como origen de la animación
      const actual = Math.min(Math.max(a.alto0 - (a.yUlt - a.y0), a.compacta), a.completa);
      if (!a.panel.style.height || a.panel.style.height.startsWith('calc')) a.panel.style.height = `${actual}px`;
      irA(destino, { desde: actual });
    },
    cancelar() { limpiarTemporizador(); if (arrastre && arrastre.raf) cancelAnimationFrame(arrastre.raf); arrastre = null; }
  };
};
