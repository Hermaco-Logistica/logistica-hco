# Filtros

Componentes de `src/components/filtros/` (import: `from '../components/filtros'`). Son presentacionales: reciben `value` y `onChange` y **no** mueven el estado ni las claves de sesión o `localStorage` de la vista. La vista decide qué controles pinta según el rol.

## Componentes
| Componente | Props principales | `onChange` recibe |
| --- | --- | --- |
| `BarraFiltros` | `encabezado`, `busqueda`, `filtros`, `limpiar`, `extremo`, `filtrosActivos`, `resultados`, `busquedaEnBarraMovil`, `className` | — |
| `FiltroBusqueda` | `value`, `onChange`, `placeholder`, `ariaLabel` | texto |
| `FiltroSelect` | `value` (`''` = "Todos"), `onChange`, `opciones` (`string` o `{value,label}`), `prefijo`, `etiqueta`, `etiquetaTodos`, `ariaLabel` | valor |
| `FiltroSegmentado` | `opciones [{value,label}]`, `value`, `onChange`, `ariaLabel`, `etiqueta`, `valorNeutro` | valor |
| `FiltroPestanas` | `opciones [{id,label,cantidad?,punto?}]`, `value`, `onChange`, `sticky`, `ariaLabel` | id |
| `FiltroConmutador` | `activo`, `onChange`, `etiqueta`, `titulo` | booleano nuevo |
| `BotonLimpiar` | `activos`, `onClick`, `etiqueta` | — (no se pinta si `activos` ≤ 0) |
| `ContadorResultados` | `total`, `filtrados`, `unidad` | — |
| `BotonExportar` | `onClick`, `etiqueta`, `disabled` | — |
| `FiltroFechaCampo` | `texto`, `activo`, `expandido`, `onClick`, `onLimpiar`, `etiqueta` | — |
| `FiltroFechasContenedor` | `abierto`, `onCerrar`, `titulo`, hijos = calendario existente | — |
| `ListaOpciones` | `id`, `opciones`, `value`, `activo`, `onElegir`, `onActivar`, `alto` | opción |

Internos: `MenuAnclado` (desplegable de escritorio), `FilaAcordeon` (fila de la hoja móvil), `useNavegacionOpciones` (teclado), `estilosCampo` (estados), `centrarEnCuerpo`, `contexto` (modo barra/hoja y acordeón).

## BarraFiltros
Es una `surface` (sin borde, sombra de reposo). Slots: `encabezado` (fila superior opcional) → `busqueda` → `filtros` → `limpiar` + `extremo` (bloque final). Cada control se pinta **una sola vez**.

### Escritorio: rejilla que ocupa todo el ancho
- Cada hijo declara su peso con `data-peso` (búsqueda 2, `FiltroSelect peso={1.4}` para "Resultado", el resto 1). **Ancho mínimo de un control de peso 1: 160 px.** El bloque `limpiar` + `extremo` (`data-bloque`) tiene un **ancho reservado fijo de 288 px**, siempre (invisible sin filtros activos): al aparecer "Limpiar (N)" no se mueve nada.
- `repartir()` (BarraFiltros.jsx) planifica las filas (mínimo de filas, equilibradas por carga mínima, el bloque nunca solo), reparte el espacio libre de cada fila entre los controles en proporción a su peso y lo traduce a pistas de ~4 px (`grid-template-columns: repeat(T, minmax(0,1fr))`, sin hueco de columna: los 8 px entre controles son el margen de 4 px de cada hijo). Cada fila cierra a ras del ancho. Se recalcula en cada render y con un `ResizeObserver` (sidebar abierto o plegado). Escribe en el DOM, sin estado.
- Medido en Chrome (ventana × sidebar abierto/plegado × 3, 4, 5 y 6 controles × Limpiar visible/oculto = 64 casos): suma de anchos + huecos − ancho interior = **0 px en todas las filas**; filas equilibradas (p. ej. 6 controles: 3 + 4 elementos con el bloque). "Resultado" mide de 236 a 464 px y la opción más larga real ("Cotización con anulaciones") cabe en una línea en todos los casos.

### Móvil (< md): hoja inferior
La barra muestra "Filtros (N)" (`aria-haspopup`, `aria-expanded`, `aria-controls`) y `extremo`. Al tocarlo sube una hoja hecha con `Modal` (`variante="hojaInferior"`, `soloMovil`, `atraparFoco`, `ancho="completo"`): portal a `<body>`, `z-[100]`, fondo oscurecido que cierra al tocarlo, `surface-flotante`, alto máximo 85 dvh.
- Cabecera: tirador (solo visual), X, título y `limpiar` ("Limpiar (N)").
- Cuerpo con scroll interno (`data-hoja-cuerpo`) sobre `bg-background`, en bloques `surface-plana`: búsqueda arriba y `filtros` como filas de 44 px (etiqueta a la izquierda, valor a la derecha). Los controles saben dónde están por `ContextoFiltros`; en la hoja las etiquetas SÍ son visibles (`etiqueta`, por defecto el prefijo sin ":").
- Pie: `Button primary` "Ver N resultados" (prop `resultados`). Los filtros se aplican al instante; el botón solo cierra. No hay estado provisional.
- Cierre con X, pie, Escape o fondo; foco atrapado y devuelto al botón; scroll del fondo bloqueado. `useCerrarModal()` cierra con la animación de salida desde dentro.
- **Scroll táctil**: el cuerpo lleva `overflow-y: auto`, `overscroll-behavior: contain` y `touch-action: pan-y`; la cabecera y el pie son fijos (`shrink-0`). Un gesto vertical desplaza el cuerpo y no arrastra la página de detrás.
- **Altura**: al desplegar una fila (opciones o calendario) la hoja crece con transición de `height` (`--anim-abrir`, 220 ms) hasta `calc(100dvh - max(env(safe-area-inset-top), 1rem))` y vuelve a su altura al cerrarla (`--anim-cerrar`, 140 ms); se anima la hoja, no el contenido (`alturaHoja.js`). Con `prefers-reduced-motion` no hay transición. La fila abierta se centra usando la altura final del cuerpo.
- **Botón atrás por capas** (`capasAtras.js`): cada capa abierta (hoja, fila, calendario) añade una entrada con `history.pushState({ ...history.state, filtros: nivel })` (react-router-dom 7, `BrowserRouter`: la URL no cambia). Un listener de `popstate` cierra la capa de arriba sin tocar el valor del filtro; al cerrar con la interfaz se retira la entrada con `history.go(-n)` y el `popstate` resultante se ignora. Una entrada marcada tras recargar se retira al montar la barra.

## Select: combobox de solo selección (sin `<select>` nativo)
La lista desplegada del `<select>` la dibuja el navegador y no se puede estilizar, así que `FiltroSelect` sigue el patrón ARIA **select-only combobox** (W3C APG): botón `role="combobox"` (`aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-label`) y `ListaOpciones` (`role="listbox"`, opciones `role="option"` con `aria-selected`). El foco se queda en el botón. La firma no cambió: `value` y `onChange(valor)`.
- Teclado (`useNavegacionOpciones`): cerrado, ↓ ↑ Enter Espacio abren y una letra abre y salta; abierto, ↓ ↑ Inicio Fin AvPág RePág mueven, Enter y Espacio eligen, Escape cierra (sin llegar a la hoja ni al modal) y Tab cierra. Typeahead: el texto se reinicia a los 500 ms; repetir la misma letra recorre las opciones que empiezan igual. Al cerrar el foco vuelve al botón.
- Opción "Todos" (`esTodos`): aunque sea la actual no se pinta como selección (sin check ni color). Las opciones largas se recortan con puntos suspensivos y llevan `title`.
- **Escritorio**: `MenuAnclado` — portal a `<body>`, ancho mínimo igual al del campo (máx. 22 rem), alto máximo 320 px con scroll, *flip* hacia arriba si no cabe debajo y hay más sitio arriba, se reposiciona con scroll (en cualquier contenedor) y resize, el clic fuera lo cierra. Sin contorno: el campo abierto pierde el radio del lado que toca el menú y se lee como una pieza con él (mismo fondo, `bg-surface`); el menú lleva `--shadow-menu` y un `clip-path` que no pinta nada del lado del campo.
- **Móvil (hoja)**: `FilaAcordeon` — la fila se despliega en línea con la misma `ListaOpciones`, altura animada con `grid-template-rows` (0fr → 1fr). **Solo una fila abierta a la vez** (`ContextoAcordeon`), calendario incluido (`FiltroFechasContenedor` se registra en el mismo acordeón). Al abrir, el cuerpo de la hoja centra la fila con un desplazamiento suave de ~220 ms (`centrarEnCuerpo`: solo `scrollTop`, sin `scroll-behavior` global). Elegir una opción cierra el acordeón y devuelve el foco a la fila.
- **Segmentado en la hoja**: criterio — con **3 opciones o menos** sigue siendo una fila con botones (un toque, nada que desplegar); con más, se despliega como acordeón con la misma lista.

## Estados de un campo (`estilosCampo.js`)
| Estado | Fondo | Borde | Texto / icono |
| --- | --- | --- | --- |
| Reposo | `surface-muted` | `border` | `slate-700` / `slate-400` |
| Hover | `surface` (blanco) | `border` | igual |
| Foco visible (teclado) | el del estado | anillo `primary/50` de 2 px | igual |
| Abierto | `surface`, sin el radio del lado del menú | `border` salvo el lado del menú | igual |
| Seleccionado (valor ≠ "Todos") | `--color-filtro-activo` | transparente | valor `--color-filtro-texto`, icono `primary` |

Se aplica a select, fecha con rango, búsqueda con texto, conmutador activo y segmentado con `valorNeutro` distinto; en la hoja tiñe la fila entera. Tokens (tokens.css, siguen al rol): `--color-filtro-activo` = 16 % de `primary` sobre `surface`; `--color-filtro-texto` = `primary-strong` mezclado con negro al 20 % (≥ 4,5:1 sobre `--color-filtro-activo` en los 4 roles y sin rol; con `primary-strong` a secas, sin rol daba 3,2:1).

## Animación (una sola fuente: tokens.css)
| Token | Valor | Se usa en |
| --- | --- | --- |
| `--anim-abrir` / `--ease-abrir` | 220 ms, `cubic-bezier(.2,.8,.2,1)` | desplegable y acordeón al abrir |
| `--anim-cerrar` / `--ease-cerrar` | 140 ms, `cubic-bezier(.4,0,1,1)` | desplegable y acordeón al cerrar |
| `--anim-hoja-abrir` | 280 ms (con `--ease-abrir`) | hoja inferior al abrir |
| `--anim-hoja-cerrar` | 200 ms (con `--ease-cerrar`) | hoja inferior al cerrar |

Solo `clip-path`, `transform` y `opacity` (el acordeón anima además `grid-template-rows`). Desplegable: `clip-path` de `inset(0 -24px 100% -24px)` a `inset(0 -24px -48px -24px)` + 5 px de desplazamiento + opacidad. Con `prefers-reduced-motion` todo se reduce a un fundido de ~120 ms (el acordeón sin transición). El desplegable sigue montado durante la salida.

## Calendario emergente (`FiltroFechaCampo` + `FiltroFechasContenedor`)
La vista conserva su estado `abierto`, su `relative`/`ref` de "clic fuera" y la lógica de rango; pasa como hijo solo la cabecera de mes y la cuadrícula de días. `FiltroFechaCampo` es el disparador.
- Dentro de la hoja móvil: acordeón en línea (clase `.filtro-acordeon`), una fila más del acordeón; cerrado queda `inert`.
- ≥ md: desplegable absoluto `right-0 mt-2 z-30`.
- < md fuera de la hoja: hoja inferior propia en un portal a `<body>` (`z-[80]`) sobre el dock (`bottom: var(--bottom-dock-h)`). Motivo: `<main>` usa `@container` (contexto de apilamiento) y un `z-40` dentro de `main` nunca supera al `BottomDock`.

## Ejemplo
```jsx
<BarraFiltros
  busqueda={<FiltroBusqueda value={q} onChange={(t) => { setQ(t); setPagina(1); }} ariaLabel="Buscar por referencia o cliente" />}
  filtros={<>
    <FiltroSelect value={estado} onChange={setEstado} opciones={ESTADOS} prefijo="Estado:" ariaLabel="Filtrar por estado" />
    {esGerente && <FiltroSelect value={vendedor} onChange={setVendedor} opciones={vendedores} prefijo="Vendedor:" />}
  </>}
  limpiar={<BotonLimpiar activos={n} onClick={limpiarTodo} />}
  extremo={<ContadorResultados total={total} unidad="solicitudes" />}
  filtrosActivos={n}
  resultados={total}
/>
```

## Reglas
- Sin etiqueta visible encima en escritorio: cada control lleva `aria-label` y, si hace falta, un prefijo interno ("Estado: Todos", apilado si el valor es largo). En la hoja móvil las etiquetas son visibles.
- Controles de la barra: borde suave y sin sombra; `BotonLimpiar` y `BotonExportar` son `Button secondary` (sombra de botón, sin borde).
- Alturas: 44 px en móvil y en las filas de la hoja, 36 px en la barra desde `md`.
- Solo tokens y clases de paleta ya usadas (`slate`); `check:colores` y `check:superficies` deben seguir en verde.

## Qué no se homologa
`FiltroFechas` (fase posterior), la selección de filas de `DashboardPedidos`, las claves de persistencia y la lógica de filtrado de cada vista, y las condiciones por rol (las decide la vista).
