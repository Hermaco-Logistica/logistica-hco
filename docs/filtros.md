# Filtros

Componentes de `src/components/filtros/` (import: `from '../components/filtros'`). Son presentacionales: reciben `value` y `onChange` y **no** mueven el estado ni las claves de sesión o `localStorage` de la vista. La vista decide qué controles pinta según el rol.

## Componentes
| Componente | Props principales | `onChange` recibe |
| --- | --- | --- |
| `BarraFiltros` | `encabezado`, `busqueda`, `filtros`, `limpiar`, `extremo`, `filtrosActivos`, `resultados`, `busquedaEnBarraMovil`, `className` | — |
| `FiltroBusqueda` | `value`, `onChange`, `placeholder`, `ariaLabel` | texto |
| `FiltroSelect` | `value`, `onChange`, `opciones` (`string` o `{value,label}`), `prefijo`, `etiquetaTodos`, `ariaLabel` | valor (`''` = todos) |
| `FiltroSegmentado` | `opciones [{value,label}]`, `value`, `onChange`, `ariaLabel` | valor |
| `FiltroPestanas` | `opciones [{id,label,cantidad?,punto?}]`, `value`, `onChange`, `sticky`, `ariaLabel` | id |
| `FiltroConmutador` | `activo`, `onChange`, `etiqueta`, `titulo` | booleano nuevo |
| `BotonLimpiar` | `activos`, `onClick`, `etiqueta` | — (no se pinta si `activos` ≤ 0) |
| `ContadorResultados` | `total`, `filtrados`, `unidad` | — |
| `BotonExportar` | `onClick`, `etiqueta`, `disabled` | — |
| `FiltroFechaCampo` | `texto`, `activo`, `expandido`, `onClick`, `onLimpiar`, `etiqueta` | — |
| `FiltroFechasContenedor` | `abierto`, `onCerrar`, `titulo`, hijos = calendario existente | — |

`BotonSeguimiento` (Análisis) mantiene su API `{ activo, onChange }` y ahora usa `FiltroConmutador`.

## Slots de `BarraFiltros`
Es una `surface` (sin borde, sombra de reposo). Orden: `encabezado` (fila superior opcional: título y acciones) → `busqueda` → `filtros` → bloque final `limpiar` + `extremo`.
- Escritorio: una sola fila con `flex-wrap`; el bloque final (`limpiar` + `extremo`) lleva `ml-auto`, así "Limpiar" queda al final de la última fila y nunca solo en una de abajo.
- Móvil: cada control se pinta una sola vez, dentro de la hoja inferior (ver abajo); la barra solo lleva "Filtros (N)" y `extremo`.
- `filtrosActivos` solo alimenta el número de "Filtros (N)". El calendario u otros controles propios van como hijo en `filtros`.

## Ejemplo
```jsx
<BarraFiltros
  busqueda={<FiltroBusqueda value={q} onChange={(t) => { setQ(t); setPagina(1); }} ariaLabel="Buscar por referencia o cliente" />}
  filtros={<>
    <FiltroSelect value={estado} onChange={setEstado} opciones={ESTADOS} prefijo="Estado:" ariaLabel="Filtrar por estado" />
    {esGerente && <FiltroSelect value={vendedor} onChange={setVendedor} opciones={vendedores} prefijo="Vendedor:" />}
  </>}
  limpiar={<BotonLimpiar activos={n} onClick={limpiarTodo} />}
  extremo={<ContadorResultados total={total} filtrados={visibles} unidad="solicitudes" />}
  filtrosActivos={n}
/>
```

## Móvil: hoja inferior de filtros
En < md, `BarraFiltros` no pinta los controles: muestra "Filtros (N)" (`aria-haspopup`, `aria-expanded`, `aria-controls`) y el slot `extremo`. Al tocarlo sube una hoja inferior hecha con `Modal` (`variante="hojaInferior"`, `soloMovil`, `atraparFoco`, `ancho="completo"`): portal a `<body>`, `z-[100]` (por encima del dock), fondo oscurecido que cierra al tocarlo, `surface-flotante`, alto máximo 85 dvh.
- Cabecera: tirador (solo visual; el gesto de deslizar no existe), X a la izquierda, título "Filtros" y `limpiar` a la derecha ("Limpiar (N)", solo con filtros activos).
- Cuerpo con scroll interno sobre `bg-background`, en bloques `surface-plana`: la búsqueda arriba y los `filtros` como filas de 44 px (etiqueta a la izquierda, valor a la derecha). Los controles saben dónde están por `ContextoFiltros` (`useModoFiltro`): `FiltroSelect` (el `<select>` nativo cubre la fila, transparente), `FiltroSegmentado`, `FiltroConmutador` (interruptor), `FiltroFechaCampo` y `BotonLimpiar` cambian de forma; en la hoja las etiquetas SÍ son visibles (`etiqueta`, por defecto el prefijo sin ":").
- Pie: `Button primary` "Ver N resultados" (prop `resultados`; sin ella "Ver resultados"). Los filtros se aplican al instante; el botón solo cierra. No hay estado provisional ni se mueve el estado de la vista.
- `busquedaEnBarraMovil` deja la búsqueda en la barra móvil en lugar de la hoja.
- Animación (index.css, solo transform y opacity): entra con translateY(100% → 0) en 280 ms, `cubic-bezier(.2,.8,.2,1)`, fondo 0 → 1 en 200 ms; sale en 200 ms con ease-in y la hoja sigue montada durante la salida (`DURACION_SALIDA_VARIANTE_MS.hojaInferior`). Con `prefers-reduced-motion` solo hay fundido de 120 ms.
- Accesibilidad: `role="dialog"`, `aria-modal`, `aria-labelledby`; el foco entra en la hoja, queda atrapado (Tab y Shift+Tab) y vuelve al botón al cerrar; Escape cierra; el scroll del fondo se bloquea.
- Para cerrar con la animación desde dentro de un `<Modal>`: `useCerrarModal()` (`components/modalCierre.js`).

Escritorio: el `FiltroSelect` mide 160 px (`md:w-40`); con valor elegido el prefijo pasa a una línea pequeña encima del valor ("Vendedor" / "Carlos Rivera Hern…"). `FiltroConmutador` activo: `bg-primary-strong` con `text-primary-soft` (color del rol).

## Calendario emergente (`FiltroFechaCampo` + `FiltroFechasContenedor`)
La vista conserva su estado `abierto`, su `relative`/`ref` de "clic fuera" y la lógica de rango; pasa como hijo solo la cabecera de mes y la cuadrícula de días (sin `surface-flotante`, `absolute` ni `w-72`). `FiltroFechaCampo` es el disparador (`texto`, `activo`, `expandido`, `onClick`, `onLimpiar`).
- Dentro de la hoja móvil: en línea bajo la fila "Fecha", con altura animada (`grid-template-rows` 0fr → 1fr); cerrado queda `inert` y `aria-hidden`.
- ≥ md: desplegable absoluto `right-0 mt-2 z-30`.
- < md fuera de la hoja: hoja inferior propia en un portal a `<body>` (`z-[80]`) apoyada sobre el dock (`bottom: var(--bottom-dock-h)`).
- Por qué el portal: `<main>` usa `@container` (contención de layout = contexto de apilamiento y ancla de `fixed`), así que un `z-40` dentro de `main` nunca supera al `BottomDock` (`fixed z-40`, hermano posterior).
- El portal detiene `mousedown` para que el "clic fuera" de la vista no cierre el calendario al tocar un día.

## Reglas
- Sin etiqueta visible encima: cada control lleva `aria-label` y, si hace falta, un prefijo interno ("Estado: Todos").
- Controles (búsqueda, select, conmutador): borde suave `border-border`, sin sombra. Segmentados y pestañas: planos. `BotonLimpiar` y `BotonExportar`: `Button secondary` (sombra de botón, sin borde).
- Alturas: 44 px en móvil y en las filas de la hoja, 36 px en la barra desde `md`.
- El select conserva el `<select>` nativo.
- Solo tokens y las clases de paleta ya usadas (`slate`); `check:colores` y `check:superficies` deben seguir en verde.

## Qué no se homologa
`FiltroFechas` (fase posterior), la selección de filas de `DashboardPedidos`, las claves de persistencia y la lógica de filtrado de cada vista, y las condiciones por rol (las decide la vista).
