/**
 * Pestañas en carrusel (FiltroPestanas con sticky): cuánto hay que acortar el ancho visible del scroller para que la última pestaña
 * que asoma quede cortada más o menos a la mitad y se lea que hay más, nunca justo en el borde ni con una astilla.
 * `ancho`: ancho natural del scroller; `tabs`: [{ inicio, fin }] de cada pestaña medido desde el inicio del contenido del scroller;
 * `scrollWidth`: ancho total del contenido. Devuelve los píxeles a restar al ancho (0 si todo cabe o ya hay un corte a medias).
 */
export const recortePestanas = (ancho, tabs, scrollWidth) => {
  if (!(ancho > 0) || !tabs.length || scrollWidth <= ancho + 1) return 0;
  const i = tabs.findIndex((t) => t.fin > ancho + 1);
  if (i === -1) return 0;
  const t = tabs[i];
  const previa = tabs[i - 1];
  const medio = (x) => x.inicio + (x.fin - x.inicio) / 2;
  let corte = ancho;
  if (t.inicio >= ancho - 1) {
    corte = previa ? medio(previa) : ancho; // el borde cae justo entre dos pestañas
  } else {
    const parte = (ancho - t.inicio) / (t.fin - t.inicio); // fracción visible de la pestaña cortada
    if (parte < 0.25) corte = previa ? medio(previa) : ancho; // astilla: se corta la anterior a la mitad
    else if (parte > 0.75) corte = medio(t); // casi entera: se corta a la mitad
  }
  return Math.max(0, Math.round(ancho - corte));
};
