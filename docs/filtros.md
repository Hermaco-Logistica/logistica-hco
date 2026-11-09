# Filtros

Componentes de `src/components/filtros/` (import: `from '../components/filtros'`). Son presentacionales: reciben `value` y `onChange` y **no** mueven el estado ni las claves de sesión o `localStorage` de la vista. La vista decide qué controles pinta según el rol.

## Componentes
| Componente | Props principales | `onChange` recibe |
| --- | --- | --- |
| `BarraFiltros` | `encabezado`, `busqueda`, `filtros`, `limpiar`, `extremo`, `filtrosActivos`, `resultados`, `busquedaEnBarraMovil`, `className` | — |
| `FiltroBusqueda` | `value`, `onChange`, `placeholder`, `ariaLabel` | texto |
| `FiltroSelect` | `value` (`''` = "Todos"), `onChange`, `opciones` (`string` o `{value,label}`), `prefijo`, `etiqueta`, `etiquetaTodos`, `ariaLabel` | valor |
| `FiltroSegmentado` | `opciones [{value,label}]`, `value`, `onChange`, `ariaLabel`, `etiqueta`, `valorNeutro` | valor |
| `FiltroPestanas` | `opciones [{id,label,cantidad?,punto?}]`, `value`, `onChange`, `sticky`, `prefijoId`, `ariaLabel` (ver «Pestañas pegadas») | id |
| `FiltroConmutador` | `activo`, `onChange`, `etiqueta`, `titulo` | booleano nuevo |
| `BotonLimpiar` | `activos`, `onClick`, `etiqueta` | — (no se pinta si `activos` ≤ 0) |
| `ContadorResultados` | `total`, `filtrados`, `unidad` | — |
| `BotonExportar` | `onClick`, `etiqueta`, `disabled` | — |
| `FiltroFechaCampo` | `texto`, `activo`, `expandido`, `onClick`, `onLimpiar`, `etiqueta` | — |
| `FiltroFechas` | `value {desde,hasta}` (ISO), `onChange(rango)`, `porDefecto`, `etiqueta`, `ariaLabel` | rango `{desde,hasta}` |
| `FiltroFechasContenedor` | `abierto`, `onCerrar`, `titulo`, hijos = calendario existente | — |
| `ListaOpciones` | `id`, `opciones`, `value`, `activo`, `onElegir`, `onActivar`, `alto` | opción |

Internos: `MenuAnclado` (desplegable de escritorio), `FilaAcordeon` (fila de la hoja móvil), `useNavegacionOpciones` (teclado), `estilosCampo` (estados), `centrarEnCuerpo`, `contexto` (modo barra/hoja y acordeón).

## BarraFiltros
Es una `surface` (sin borde, sombra de reposo). Slots: `encabezado` (fila superior opcional) → `busqueda` → `filtros` → `limpiar` + `extremo` (bloque final). Cada control se pinta **una sola vez**.

### Escritorio: rejilla que ocupa todo el ancho
- Cada hijo declara su peso con `data-peso` (búsqueda 2, `FiltroSelect peso={1.4}` para "Resultado", el resto 1). **Ancho mínimo de un control de peso 1: 160 px.** El bloque `limpiar` + `extremo` (`data-bloque`) tiene un **ancho reservado fijo de 288 px**, siempre (invisible sin filtros activos): al aparecer "Limpiar (N)" no se mueve nada.
- `repartir()` (BarraFiltros.jsx) planifica las filas (mínimo de filas, equilibradas por carga mínima, el bloque nunca solo), reparte el espacio libre de cada fila entre los controles en proporción a su peso y lo traduce a pistas de ~4 px (`grid-template-columns: repeat(T, minmax(0,1fr))`, sin hueco de columna: los 8 px entre controles son el margen de 4 px de cada hijo). Cada fila cierra a ras del ancho. Se recalcula en cada render y con un `ResizeObserver` (sidebar abierto o plegado). Escribe en el DOM, sin estado.
- Medido en Chrome (ventana × sidebar abierto/plegado × 3, 4, 5 y 6 controles × Limpiar visible/oculto = 64 casos): suma de anchos + huecos − ancho interior = **0 px en todas las filas**; filas equilibradas (p. ej. 6 controles: 3 + 4 elementos con el bloque). "Resultado" mide de 236 a 464 px y la opción más larga real ("Cotización con anulaciones") cabe en una línea en todos los casos.

### Escritorio con filas y búsqueda aparte (`filas`, `busquedaAparte`)
Para pantallas que piden un orden fijo (Prórrogas): `filas` es un arreglo de filas (cada una, un arreglo de nodos) apiladas con su ancho natural, sin la rejilla que estira. El bloque `limpiar` va al final de la última fila con su hueco SIEMPRE reservado (`w-44` con búsqueda aparte, `w-72` con el contador dentro). Con `busquedaAparte` la búsqueda es una segunda tarjeta (misma separación entre tarjetas) debajo de la de filtros, con el `extremo` (contador) a la derecha. El orden del DOM y del teclado es el visual (filas, luego búsqueda). En móvil las filas se aplanan dentro de la hoja.
- **Contadores sin duplicar:** "Filtros (N)" (`filtrosActivos`) cuenta solo lo que hay dentro de la hoja; "Limpiar (N)" cuenta todo, la búsqueda incluida. Con `busquedaEnBarraMovil` la tarjeta móvil lleva búsqueda, "Filtros (N)" y Limpiar, y la hoja contiene solo los filtros (repite "Limpiar (N)" en su cabecera con el mismo número). **Indicador visible en móvil:** con "Filtros (N)", N > 0 el botón se tiñe con los tokens de filtro activo del rol (`bg-filtro-activo`, texto `text-filtro-texto`, borde `border-primary`); sin filtros activos conserva su aspecto neutro (`border-border text-slate-600`). El alto y el borde son los mismos en ambos estados; solo cambia el ancho por el texto "(N)". Cada pantalla debe pasar `filtrosActivos` con lo que hay en la hoja (el orden también, si es distinto del inicial) y hacer que Limpiar cuente todo lo que limpia.
- **Tarjeta móvil con búsqueda en la barra (patrón):** UNA fila con el buscador (ancho mínimo 8,5 rem), "Filtros (N)" y "Limpiar" como botón de icono de 44 px (`BotonLimpiar` en modo `icono`, aria-label "Limpiar filtros (N)", el número como distintivo); su hueco de 44 px está SIEMPRE reservado. El contador va debajo, en una línea de altura fija (`h-4`, alineado a la derecha). La tarjeta no cambia de altura al aparecer Limpiar (medido a 393 × 852: 92 px con y sin filtros, en los 4 roles).
- **Segmentados:** la pista (`FiltroSegmentado`) es compacta (`w-max`), cubre todas las opciones y los botones comparten ancho; `completo` la lleva al ancho del contenedor.
- **Contador:** `ContadorResultados` recibe `singular` y `plural` ("1 registro", "0 registros"); helper `utils/pluralizar.js`.

### Móvil (< md): hoja inferior
La barra muestra "Filtros (N)" (`aria-haspopup`, `aria-expanded`, `aria-controls`) y `extremo`. Al tocarlo sube una hoja hecha con `Modal` (`variante="hojaInferior"`, `soloMovil`, `atraparFoco`, `ancho="completo"`): portal a `<body>`, `z-[100]`, fondo oscurecido que cierra al tocarlo, `surface-flotante`, alto máximo 85 dvh.
- Cabecera: tirador (solo visual), X, título y `limpiar` ("Limpiar (N)").
- Cuerpo con scroll interno (`data-hoja-cuerpo`) sobre `bg-background`, en bloques `surface-plana`: búsqueda arriba y `filtros` como filas de 44 px (etiqueta a la izquierda, valor a la derecha). Los controles saben dónde están por `ContextoFiltros`; en la hoja las etiquetas SÍ son visibles (`etiqueta`, por defecto el prefijo sin ":").
- Pie: `Button primary` "Ver N resultados" (prop `resultados`). Los filtros se aplican al instante; el botón solo cierra. No hay estado provisional.
- Cierre con X, pie, Escape o fondo; foco atrapado y devuelto al botón; scroll del fondo bloqueado. `useCerrarModal()` cierra con la animación de salida desde dentro.
- **Scroll táctil**: el cuerpo lleva `overflow-y: auto`, `overscroll-behavior: contain` y `touch-action: pan-y`; la cabecera y el pie son fijos (`shrink-0`). Un gesto vertical desplaza el cuerpo y no arrastra la página de detrás.
- **Hoja arrastrable** (`hojaArrastrable.js`, controlador imperativo): estados cerrada, compacta (altura natural, máx. 85 dvh) y completa (`calc(100dvh - max(env(safe-area-inset-top), 1rem))`). El tirador (`role="separator"`, enfocable, `aria-orientation`, `aria-valuenow` = % de la altura completa, `aria-valuetext`, `aria-label="Ajustar la altura de los filtros"`) y la cabecera se arrastran con Pointer Events y `setPointerCapture`; solo ellos llevan `touch-action: none` (los botones de la cabecera no inician arrastre; el cuerpo conserva su scroll).
  - Durante el arrastre la hoja sigue al dedo sin animación: por encima de la altura compacta cambia `height`, por debajo se desliza con `transform: translateY`; pasada la completa hay resistencia elástica (máx. 14 px, cabe en el margen superior). Una sola escritura por fotograma con `requestAnimationFrame` y sin leer el layout dentro del bucle (las medidas se toman al empezar). La velocidad usa `event.timeStamp` de los últimos 100 ms.
  - Al soltar: |v| > 0,5 px/ms manda la dirección (arriba → completa; abajo → compacta desde completa y cerrar desde compacta); si no, la posición más cercana entre cerrada, compacta y completa. Anima con `--anim-abrir` / `--anim-cerrar` (sin animación con `prefers-reduced-motion`, pero el arrastre funciona).
  - Teclado en el tirador: ↑ lleva a completa, ↓ a compacta y, desde compacta, cierra; X y Escape siguen cerrando.
  - Abrir una fila (opciones o calendario) lleva a completa y al cerrarla vuelve al estado previo. Cerrar arrastrando usa el mismo camino que la X (`useCerrarModal`, que retira la entrada del historial). El pie "Ver N resultados" sigue visible en ambos estados.
- **Botón atrás por capas** (`capasAtras.js`): cada capa abierta (hoja, fila, calendario) añade una entrada con `history.pushState({ ...history.state, filtros: nivel })` (react-router-dom 7, `BrowserRouter`: la URL no cambia). Un listener de `popstate` cierra la capa de arriba sin tocar el valor del filtro; el historial se **reconcilia** en vez de editarse en cada efecto: abrir una capa solo empuja una entrada si `history.state.filtros` es menor que el número de capas, cerrarla solo la quita de la pila, y un único `setTimeout(0)` por commit compara la profundidad con la pila y hace UN `history.go(-diferencia)` si sobran entradas (o completa con `pushState` si faltan); el `popstate` de un retroceso propio se ignora y la siguiente operación lo espera (el marcador caduca a los 500 ms). Motivo: `history.go` es asíncrono y resuelve su destino al llamarlo, así que un `go` seguido de un `pushState` en el mismo commit (doble montaje de StrictMode en desarrollo, cambio de una fila a otra del acordeón) dejaba el historial un nivel por debajo de la pila y el siguiente cierre retrocedía una entrada de más (salía de la pantalla). Pruebas en `capasAtras.test.jsx` (historial que imita a Chrome). Una entrada marcada tras recargar se retira al montar la barra.

## Select: combobox de solo selección (sin `<select>` nativo)
La lista desplegada del `<select>` la dibuja el navegador y no se puede estilizar, así que `FiltroSelect` sigue el patrón ARIA **select-only combobox** (W3C APG): botón `role="combobox"` (`aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-label`) y `ListaOpciones` (`role="listbox"`, opciones `role="option"` con `aria-selected`). El foco se queda en el botón. La firma no cambió: `value` y `onChange(valor)`.
- Teclado (`useNavegacionOpciones`): cerrado, ↓ ↑ Enter Espacio abren y una letra abre y salta; abierto, ↓ ↑ Inicio Fin AvPág RePág mueven, Enter y Espacio eligen, Escape cierra (sin llegar a la hoja ni al modal) y Tab cierra. Typeahead: el texto se reinicia a los 500 ms; repetir la misma letra recorre las opciones que empiezan igual. Al cerrar el foco vuelve al botón.
- Opción "Todos" (`esTodos`): aunque sea la actual no se pinta como selección (sin check ni color). Las opciones largas se recortan con puntos suspensivos y llevan `title`.
- **Escritorio**: `MenuAnclado` — portal a `<body>`, ancho mínimo igual al del campo (máx. 22 rem), alto máximo 320 px con scroll, *flip* hacia arriba si no cabe debajo y hay más sitio arriba, se reposiciona con scroll (en cualquier contenedor) y resize, el clic fuera lo cierra. Sin contorno: el campo abierto pierde el radio del lado que toca el menú y se lee como una pieza con él (mismo fondo, `bg-filtro-abierto`); el menú lleva `--shadow-menu` y un `clip-path` que no pinta nada del lado del campo.
- **Móvil (hoja)**: `FilaAcordeon` — la fila se despliega en línea con la misma `ListaOpciones`, altura animada con `grid-template-rows` (0fr → 1fr). **Solo una fila abierta a la vez** (`ContextoAcordeon`), calendario incluido (`FiltroFechasContenedor` se registra en el mismo acordeón). Al abrir, el cuerpo de la hoja centra la fila con un desplazamiento suave de ~220 ms (`centrarEnCuerpo`: solo `scrollTop`, sin `scroll-behavior` global). Elegir una opción cierra el acordeón y devuelve el foco a la fila.
- **Segmentado en la hoja**: criterio — con **3 opciones o menos** sigue siendo una fila con botones (un toque, nada que desplegar); con más, se despliega como acordeón con la misma lista.

## Pestañas pegadas y carrusel (`FiltroPestanas` con `sticky`)

- **Alto y ancho:** ancho completo (`-mx-[var(--tf-pad-x)]` + `px-[var(--tf-pad-x)]`; por eso solo vale dentro de `main`) y 40 px de alto en reposo y pegada (pestañas `h-8` + `py-1`): sin salto de layout. Sin `sticky` la tira conserva su pastilla `bg-slate-100`, su degradado de 24 px y no lleva flechas (p. ej. Prórrogas).
- **Reposo:** las pestañas van dentro de una tarjeta (`data-tarjeta`): `surface` (token `--color-surface` + `--shadow-reposo` del rol, sin borde) con esquinas `rounded-xl` (12 px), alineada con el ancho del contenido.
- **Pegada:** la tarjeta se desvanece y entra una franja (`data-franja`) de ancho completo, `bg-surface` opaca (blanca), esquinas rectas, sin sombra ni borde, a ras del borde inferior de la barra superior móvil (0 px medidos en la app).
- **Transición entre reposo y pegada:** dos capas detrás de las pestañas, tarjeta y franja, que se cruzan. Cada una anima solo `opacity` y `transform` (`translateY(-6px)` ↔ 0): hacia «pegada» con `--anim-abrir` / `--ease-abrir`, de vuelta con `--anim-cerrar` / `--ease-cerrar`; con `prefers-reduced-motion` no hay desplazamiento (solo opacidad). El contenedor sticky y la tira no pintan nada: el alto no cambia y no hay salto.
- **Pestañas:** inactivas en texto plano con su punto de color; activa con la píldora oscura del rol; ambas `h-8` con esquinas de 12 px y `text-xs`. La tira lleva `px-1`, así que las pestañas quedan 4 px dentro del borde del contenido.
- **Carrusel (solo con desbordamiento):**
  - difuminado de 36 px por máscara hacia el color de las capas (blanco): a la derecha al inicio, a la izquierda solo tras desplazar, y desaparece en cada extremo; sin desbordamiento no hay difuminado.
  - la última pestaña asoma cortada a medias: `recortePestanas.js` calcula, al inicio del recorrido y al redimensionar, cuánto acortar el ancho visible (`style.width: calc(100% - Npx)`) cuando el corte cae casi en un borde de pestaña (borde exacto, astilla < 25 % o pestaña > 75 % visible). Si el corte ya cae a mitad de una pestaña no se toca.
  - una flecha circular (`size-6`, `bg-surface`, `shadow-boton`, chevron) por lado, solo cuando hay más contenido en ese lado; `aria-hidden` y `tabIndex -1` (las pestañas ya son accesibles con teclado). Desplaza ~70 % del ancho visible, suave (`behavior: 'smooth'`) o instantáneo con `prefers-reduced-motion`.
- **A ras del header:** `sticky` se pega al borde del *relleno* de `main` (14 px en móvil, 32 px en escritorio), no al del contenedor. El componente mide `padding-top` de `main` (y lo vuelve a medir al redimensionar) y lo resta de `top`.
- **Detección:** `IntersectionObserver` sobre un centinela de altura 0 y sin margen (`m-0`, no altera el `space-y` del padre) justo antes de la barra; raíz `main`, `rootMargin` = relleno superior. Sin `IntersectionObserver` no hay estado «pegada». `data-pegada` solo cambia las capas, nunca el layout.
- Los ids (`prefijoId`), el `scrollIntoView` de la pestaña activa y el desplazamiento horizontal no cambian.

## Estados de un campo (`estilosCampo.js`)
| Estado | Fondo | Borde | Texto / icono |
| --- | --- | --- | --- |
| Reposo | `surface-muted` | `border` | `slate-700` / `slate-400` |
| Hover | `surface` (blanco) | `border` | igual |
| Foco visible (teclado) | el del estado | anillo `primary/50` de 2 px | igual |
| Abierto | `--color-filtro-abierto` (6 % de `primary`, igual que su menú), sin el radio del lado del menú | transparente, sin anillo | igual |
| Seleccionado (valor ≠ "Todos") | `--color-filtro-activo` | transparente | valor `--color-filtro-texto`, icono `primary` |

Se aplica a select, fecha con rango, búsqueda con texto, conmutador activo y segmentado con `valorNeutro` distinto; en la hoja tiñe la fila entera. Tokens (tokens.css, siguen al rol): `--color-filtro-abierto` = 6 % de `primary` sobre `surface` (campo abierto y menú, una sola pieza; evita el blanco sobre blanco); `--color-filtro-activo` = 16 % de `primary` sobre `surface`; `--color-filtro-texto` = `primary-strong` mezclado con negro al 20 % (≥ 4,5:1 sobre `--color-filtro-activo` en los 4 roles y sin rol; con `primary-strong` a secas, sin rol daba 3,2:1).

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

## Fechas en modo nativo (`FiltroFechas`)
Dos `<input type="date">` con el estilo de campo para pantallas sin calendario propio (Prórrogas, Análisis). `value` y `onChange` usan `{ desde, hasta }` en ISO (AAAA-MM-DD), el mismo formato que guardan las vistas; el componente no guarda estado.
- Escritorio: accesos rápidos + un solo campo compuesto ("01/11/2026 → 30/11/2026"), `data-peso="3"` en la rejilla.
- Hoja móvil: fila "Fecha" (acordeón, una fila abierta a la vez, atrás por capas) con los accesos y los dos campos en línea.
- Accesos "Mes actual", "Todas las fechas" y "Personalizado": `FiltroSegmentado` cuyo valor se DERIVA del rango (`derivarAcceso`: igual al mes actual, vacío u otro); "Personalizado" solo enfoca el campo desde.
- Estado seleccionado cuando el rango se aparta de `porDefecto` (por defecto el mes actual). El modo calendario (`FiltroFechaCampo` + `FiltroFechasContenedor`) no cambia.

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
- **Cantidades con singular y plural:** cada pantalla migrada pasa `singular` y `plural` a `ContadorResultados`, y cualquier texto con una cantidad usa `pluralizar(n, singular, plural)` (`utils/pluralizar.js`): "1 solicitud", "0 solicitudes". Nunca "1 solicitudes".
- Sin etiqueta visible encima en escritorio: cada control lleva `aria-label` y, si hace falta, un prefijo interno ("Estado: Todos", apilado si el valor es largo). En la hoja móvil las etiquetas son visibles.
- Controles de la barra: borde suave y sin sombra; `BotonLimpiar` y `BotonExportar` son `Button secondary` (sombra de botón, sin borde).
- Alturas: 44 px en móvil y en las filas de la hoja, 36 px en la barra desde `md`.
- Solo tokens y clases de paleta ya usadas (`slate`); `check:colores` y `check:superficies` deben seguir en verde.

## Pantallas migradas (F1–F3)
| Pantalla | Claves | Controles |
| --- | --- | --- |
| `DashboardVendedor` (vendedor, gerente y administrador; comprador no la ve) | `dv_*` | búsqueda, Resultado, Estado, Vendedor (no vendedor), Prórroga (solo gerente), fecha |
| `DashboardCompras` (Bandeja RFQ; `readOnly` para gerente y administrador) | `dc_*` | búsqueda, Resultado, Estado, Vendedor (siempre), fecha |
| `DashboardPedidos` | `dp_*` | búsqueda ítem/ref/cliente, Proveedor (comprador y administrador), Estado logístico, búsqueda N° OC, fecha confirmado; la selección de filas y "Vincular selección" quedan fuera |
| `GestionOC` (lista) | `goc_*` | búsqueda, Proveedor, Estado logístico, fecha de creación; el detalle de la OC no tiene filtros (solo entradas de datos: tracking, retaceo) |
| `ProrrogasPage` | — (sin persistencia) | búsqueda, `FiltroFechas` (mes actual por defecto), Vendedor (Todos/Propias/Otros, solo gerencia) y contador; las pestañas (`FiltroPestanas`, ids `tab-prorroga-*`) siguen dentro del panel de la tabla. "Limpiar" restablece mes actual, todos los vendedores y sin búsqueda; el contador cuenta lo que se aparta de ese estado (las pestañas no cuentan) |
| `RetaceosView` | — (sin persistencia) | Mes y Proveedor; la fecha de la fila en edición es entrada de datos |

## Qué no se homologa
`FiltroFechas` (fase posterior), la selección de filas de `DashboardPedidos`, las claves de persistencia y la lógica de filtrado de cada vista, y las condiciones por rol (las decide la vista).

## Análisis y Estadísticas (F5)

- Período (7D … Histórico): `FiltroSegmentado` en las acciones de la cabecera (`OPCIONES_PERIODO`); sin cambio de estado ni de claves `analisis_*`.
- Barra única (`busquedaEnBarraMovil`): búsqueda de cliente, año del histórico (solo con "Histórico"), rango (solo con "Rango"), vendedor (no para el rol vendedor), resultado, seguimiento, `acciones` = Exportar y contador "N solicitud(es)".
- Año del histórico: `FiltroSelect sinTodos` (siempre hay un valor: un año o "Todo el historial"; sin estado "seleccionado").
- Rango: `FiltroFechas sinAccesos max={hoy} errorDesde errorHasta` (los accesos rápidos sobran porque el período ya los da); el mensaje general de validación y el aviso de histórico lento van en `encabezado`.
- Vendedor: el número de vendedores se conserva en la opción neutra: "Todos (N)".
- `acciones` de `BarraFiltros`: en escritorio entran en el bloque final (ancho reservado 440 px); en móvil son la última fila de la hoja (`BotonExportar` modo hoja).
