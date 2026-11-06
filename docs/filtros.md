# Filtros

Componentes de `src/components/filtros/` (import: `from '../components/filtros'`). Son presentacionales: reciben `value` y `onChange` y **no** mueven el estado ni las claves de sesión o `localStorage` de la vista. La vista decide qué controles pinta según el rol.

## Componentes
| Componente | Props principales | `onChange` recibe |
| --- | --- | --- |
| `BarraFiltros` | `encabezado`, `busqueda`, `filtros`, `limpiar`, `extremo`, `filtrosActivos`, `className` | — |
| `FiltroBusqueda` | `value`, `onChange`, `placeholder`, `ariaLabel` | texto |
| `FiltroSelect` | `value`, `onChange`, `opciones` (`string` o `{value,label}`), `prefijo`, `etiquetaTodos`, `ariaLabel` | valor (`''` = todos) |
| `FiltroSegmentado` | `opciones [{value,label}]`, `value`, `onChange`, `ariaLabel` | valor |
| `FiltroPestanas` | `opciones [{id,label,cantidad?,punto?}]`, `value`, `onChange`, `sticky`, `ariaLabel` | id |
| `FiltroConmutador` | `activo`, `onChange`, `etiqueta`, `titulo` | booleano nuevo |
| `BotonLimpiar` | `activos`, `onClick`, `etiqueta` | — (no se pinta si `activos` ≤ 0) |
| `ContadorResultados` | `total`, `filtrados`, `unidad` | — |
| `BotonExportar` | `onClick`, `etiqueta`, `disabled` | — |
| `FiltroFechasContenedor` | `abierto`, `onCerrar`, `titulo`, hijos = calendario existente | — |

`BotonSeguimiento` (Análisis) mantiene su API `{ activo, onChange }` y ahora usa `FiltroConmutador`.

## Slots de `BarraFiltros`
Es una `surface` (sin borde, sombra de reposo). Orden: `encabezado` (fila superior opcional: título y acciones) → `busqueda` → `filtros` → bloque final `limpiar` + `extremo`.
- Escritorio: una sola fila con `flex-wrap`; el bloque final lleva `ml-auto`, así "Limpiar" queda al final de la última fila y nunca solo en una de abajo. El panel `filtros` usa `md:contents` para que sus hijos fluyan en la misma fila.
- Móvil: primera fila con búsqueda, "Filtros (N)" (`aria-expanded`, `aria-controls`) y limpiar; los filtros se pliegan; `extremo` al final. Mismo marcado, solo clases `max-md:order-*`.
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

## Móvil
- Filtros abiertos: cuadrícula de 2 columnas (controles de 44 px); el segmentado ocupa las 2; un hijo propio ancho lleva `col-span-2`. El panel tiene scroll interno hasta 60 vh. En escritorio el panel es `md:contents` (los hijos fluyen en la fila).
- `FiltroSelect` mide 160 px (`md:w-40`). Con valor elegido, el prefijo pasa a una línea pequeña encima del valor ("Vendedor" / "Carlos Rivera Hern…"); con "Todos" va en línea. El `<select>` nativo y su `aria-label` no cambian.
- `FiltroConmutador` activo: `bg-primary-strong` con `text-primary-soft` (color del rol).

## Calendario emergente (`FiltroFechasContenedor`)
La vista conserva su disparador, su estado `abierto`, su `relative` y la lógica de rango; pasa como hijo solo la cabecera de mes y la cuadrícula de días (sin `surface-flotante`, `absolute` ni `w-72`).
- ≥ md: desplegable absoluto `right-0 mt-2 z-30` (igual que antes).
- < md: hoja inferior en un portal a `<body>` (`z-[80]`), fondo oscurecido, botón de cerrar y Escape, `surface-flotante`, apoyada en `bottom: var(--bottom-dock-h)` y alto máximo `100dvh - dock - 1rem`.
- Por qué: `<main>` usa `@container` (contención de layout = contexto de apilamiento), así que un `z-40` dentro de `main` nunca supera al `BottomDock` (`fixed z-40`, hermano posterior). Un `fixed` dentro de `main` tampoco sirve: la contención lo ancla a `main`. De ahí el portal.
- El portal detiene `mousedown` para que el "clic fuera" de la vista (listener en `document`) no cierre el calendario al tocar un día.

## Reglas
- Sin etiqueta visible encima: cada control lleva `aria-label` y, si hace falta, un prefijo interno ("Estado: Todos").
- Controles (búsqueda, select, conmutador): borde suave `border-border`, sin sombra. Segmentados y pestañas: planos. `BotonLimpiar` y `BotonExportar`: `Button secondary` (sombra de botón, sin borde).
- Alturas: 44 px en móvil, 36 px desde `md`.
- El select conserva el `<select>` nativo.
- Solo tokens y las clases de paleta ya usadas (`slate`); `check:colores` y `check:superficies` deben seguir en verde.

## Qué no se homologa
`FiltroFechas` (fase posterior), la selección de filas de `DashboardPedidos`, las claves de persistencia y la lógica de filtrado de cada vista, y las condiciones por rol (las decide la vista).
