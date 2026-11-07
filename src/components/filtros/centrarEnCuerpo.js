/**
 * Desplaza suavemente el cuerpo de la hoja para dejar centrada una fila de acordeón ya desplegada (~220 ms, solo scrollTop, sin
 * `scroll-behavior` global). Usa el alto FINAL de la fila (cabecera + contenido), porque el panel aún está creciendo. Con
 * prefers-reduced-motion salta directamente. `alturaVisibleFinal` es el alto que tendrá el cuerpo cuando la hoja termine de ampliarse
 * (la hoja crece a la vez que el panel se despliega). Si no hay cuerpo con scroll (`[data-hoja-cuerpo]`) no hace nada.
 */
export const centrarEnCuerpo = (fila, alturaVisibleFinal) => {
  if (!fila || typeof window === 'undefined') return;
  const cuerpo = fila.closest('[data-hoja-cuerpo]');
  const panel = fila.querySelector('[data-acordeon-panel]');
  const interior = panel && panel.firstElementChild;
  if (!cuerpo || !panel || !interior) return;
  const reducir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cabecera = fila.offsetHeight - panel.offsetHeight;
  const altoFinal = cabecera + interior.scrollHeight;
  const arriba = fila.getBoundingClientRect().top - cuerpo.getBoundingClientRect().top + cuerpo.scrollTop;
  const visible = alturaVisibleFinal || cuerpo.clientHeight;
  const maximo = Math.max(0, cuerpo.scrollHeight + (interior.scrollHeight - panel.offsetHeight) - visible);
  const destino = Math.min(maximo, Math.max(0, arriba + altoFinal / 2 - visible / 2));
  const inicio = cuerpo.scrollTop;
  if (reducir || Math.abs(destino - inicio) < 2) { cuerpo.scrollTop = destino; return; }
  const duracion = 220;
  const t0 = performance.now();
  const paso = (ahora) => {
    const p = Math.min(1, (ahora - t0) / duracion);
    const suave = 1 - (1 - p) ** 3;
    cuerpo.scrollTop = inicio + (destino - inicio) * suave;
    if (p < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
};
