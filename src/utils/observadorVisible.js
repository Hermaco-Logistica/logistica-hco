/**
 * Un único IntersectionObserver para toda la aplicación. Cada elemento se registra con `observarVisible(el, alVer)`: cuando entra en el
 * viewport se llama a `alVer` una sola vez y el elemento deja de observarse (así una tabla de 40 filas no mantiene 40 observadores ni anima
 * lo que no se ve). Devuelve una función que cancela el registro (por ejemplo al desmontar).
 *
 * Sin IntersectionObserver (entornos de prueba, navegadores antiguos) no registra nada y devuelve `null`: quien lo use debe mostrar su
 * contenido sin animación.
 */
let observador = null;
const pendientes = new Map();

const crear = () => new IntersectionObserver((entradas) => {
  entradas.forEach((entrada) => {
    if (!entrada.isIntersecting) return;
    const alVer = pendientes.get(entrada.target);
    pendientes.delete(entrada.target);
    observador.unobserve(entrada.target);
    if (alVer) alVer();
  });
});

export function observarVisible(elemento, alVer) {
  if (typeof IntersectionObserver === 'undefined' || !elemento) return null;
  if (!observador) observador = crear();
  pendientes.set(elemento, alVer);
  observador.observe(elemento);
  return () => {
    if (pendientes.delete(elemento)) observador.unobserve(elemento);
  };
}

/** Solo para pruebas: olvida el observador y los registros (cada prueba monta su propio IntersectionObserver simulado). */
export function reiniciarObservadorVisible() {
  observador = null;
  pendientes.clear();
}
