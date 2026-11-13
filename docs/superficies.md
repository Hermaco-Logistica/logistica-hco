# Superficies y sombras

Referencia de cómo se pinta una superficie (tarjeta, panel, tabla en tarjeta, aviso, modal, menú) y un botón en `logistica-hco`.

## 1. Principio
Una superficie se separa del fondo **solo con una sombra difuminada**, sin contorno decorativo. Lo que está dentro de otra superficie, de un modal, de un
menú o de un popover es **plano**: la elevación la pone el contenedor.

## 2. Tokens (`src/styles/tokens.css`)
| Token | Uso | Forma |
| --- | --- | --- |
| `--shadow-reposo` | tarjetas, paneles, tablas en tarjeta, avisos | `0 2px 5px 0 (7 %)`, `0 10px 30px -4px (12 %)` |
| `--shadow-flotante` | modales, menús, popovers, tooltips | `0 24px 64px (14 %)`, `0 2px 8px (8 %)` (capa de contacto) |
| `--shadow-boton` | botones en reposo | `0 1px 2px (8 %)`, `0 4px 10px -2px (10 %)` |
| `--shadow-boton-hover` | hover (con levante de 1 px) | `0 1px 2px (10 %)`, `0 6px 14px -2px (14 %)` |
| `--shadow-boton-activo` | active | `0 1px 1px (8 %)` |
| `--shadow-menu` | desplegables anclados a un campo (`MenuAnclado`) | `0 20px 32px -16px (24 %)`, `0 8px 16px -8px (12 %)`: solo hacia el lado en que se abre, sin spread lateral |
| `--color-filtro-activo` / `--color-filtro-texto` | campo de filtro con valor (no es una superficie: es un estado) | 16 % de `primary` sobre `surface`; `primary-strong` con 20 % de negro |
| `--sombra-alfa` | multiplicador de opacidad por rol | sin rol 1.08, comprador 0.72, vendedor 1.45, gerente 1.56, administrador 1.55 |

- **Tinte:** el color de la sombra es `color-mix(in srgb, var(--color-primary) calc(N% * var(--sombra-alfa)), transparent)`. Se usa el color de marca del rol (`primary`)
  y no el tono oscuro del menú (`secondary`): con `secondary` el tinte apenas se distinguía de una sombra negra (ΔE 1.6 a 3.9 contra 4.3 a 10 con `primary`).
  `--sombra-alfa` iguala el peso visual de los cuatro roles (tarjeta blanca de 160×80: ΔE a la izquierda 5.5 a 6.4 y debajo 10.2 a 10.5).
- **Por qué se declaran en "Derivados por ámbito":** un token derivado declarado solo en `:root` no sigue al rol (el `var()` se resuelve donde se declara). Las sombras
  están en el bloque `@theme inline` (la utilidad lleva la expresión completa) **y** se redeclaran en `:root, .role-*, body[data-role]`, que es donde las leen las
  utilidades `surface*` y los portales. `--tf-shadow-card` es alias de `--shadow-reposo` y también está en ese bloque.
- `--tf-shadow-panel` y `--detalle-shadow-float` no se usan y no son equivalentes; se dejaron como estaban.

## 3. Utilidades y componente (`src/index.css`)
- `surface`: fondo `--color-surface`, `--radius-card` (24 px) y `--shadow-reposo`, sin borde.
- `surface-flotante`: fondo y `--shadow-flotante`; el radio lo pone cada pieza (`rounded-3xl`, `rounded-xl`…).
- `surface-plana`: fondo y radio de tarjeta, sin sombra ni borde. Para superficies dentro de otra superficie, de un modal, menú o popover.
- Menús anclados a un campo (`MenuAnclado`, filtros de escritorio): `bg-surface` + `shadow-menu`, sin contorno y sin `surface-flotante` (su sombra lateral de 64 px se recortaría con un `clip-path`). El campo abierto y el menú se leen como una pieza: mismo fondo y sin el radio del lado de unión. Ver docs/filtros.md.
- `.tf-tabla-card`: `surface` con padding de 0.75 rem; `.tf-tabla-card--plana`: la variante sin sombra (dentro de modales). `.tf-surface-panel`: `surface`.
- `<Card>` (`components/ui/Card.jsx`): usa `surface`; acepta `as`, `className` y `padding` (`none`, `sm`, `md`).
- Botones: `<Button>`, `AccionItemButton` y `ModalBoton` llevan `shadow-boton hover:shadow-boton-hover active:shadow-boton-activo` (y `disabled:shadow-none`).

## 4. Reglas
1. **Al usar `surface` o `<Card>` no añadas `bg-*`, `shadow-*` ni borde decorativo.** Orden del CSS compilado: `.surface` va antes que `.rounded-*`, así que un radio propio
   (`rounded-2xl` = 14 px, `rounded-[10px]`) lo sobrescribe, pero `.bg-white` y `.shadow-sm` van **después** y sobrescriben el fondo y la sombra de `surface`.
2. **Superficies anidadas, modales, menús y popovers son planas** (`surface-plana`): sin sombra de reposo ni borde. La elevación la pone el contenedor (`surface-flotante`).
3. **Controles** (inputs, selects, buscadores): borde suave y sin sombra, con los estados de `src/components/filtros/estilosCampo.js` (docs/filtros.md; la clase `.tf-campo` se eliminó por no usarse). Segmentos y pestañas de filtro, planos.
4. **Los botones llevan sombra y no borde.** Etiqueta y StatusChip (estados) no llevan sombra. Los enlaces de texto tampoco.
5. **Se quedan:** separadores (`border-t/b/l/r`, `divide-*`) y bordes de estado (selección, error, foco, `dashed`, `border-primary`, `rose` y `emerald` de validación).
6. **Hover de elevación** en tarjetas clicables: `hover:shadow-flotante` (por ejemplo las tarjetas del Gateway y la tarjeta móvil de `DashboardVendedor`).
7. **Sombras sueltas de color** (`shadow-primary/20`, `shadow-emerald-*`) no se usan: el botón usa el token. Excepciones conocidas, sin migrar: el botón "Listo" del modal Gastos adicionales de la Calculadora (`shadow-md`, negra) y el botón flotante de opciones de DetalleRFQ en móvil (`shadow-xl shadow-slate-900/25`) conservan su sombra antigua en lugar de `shadow-boton`.

## 5. Relleno inferior del `main`
La sombra de reposo se extiende unos 24 px a los lados y unos 36 px abajo; un ancestro con `overflow` la recorta si su padding es menor. El `main` (`App.jsx`) tiene `pb-[calc(var(--bottom-dock-h,0px)+16px)]` en móvil y **`md:pb-10` (40 px)** desde `md`: con 40 px la sombra de la última tarjeta no se corta (ΔE 0.0; con 16 px era 2.4). Antes un `style` en línea anulaba `md:pb-8`. El único coste es un scroll nuevo para páginas cuyo contenido queda a menos de 24 px de la altura de la ventana.

## 6. Cómo añadir una superficie nueva
1. `<Card>` o la clase `surface` (sin `bg-*`, `shadow-*` ni borde decorativo; radio propio solo si hace falta).
2. Flota (menú, popover, tooltip, modal) → `surface-flotante` más el radio de la pieza.
3. Dentro de otra superficie o de un modal → `surface-plana`.
4. Comprueba que ningún ancestro con `overflow` la recorte y que no queda otra clase de fondo o sombra encima.
5. Si es clicable, `hover:shadow-flotante` y foco visible.

## 7. Guarda (`npm run check:superficies`)
`scripts/check-superficies.mjs` cuenta por archivo, con tope en `scripts/superficies-baseline.json` que solo puede bajar (`-- --update` fija una mejora):
- **bordes:** `border` completo que no sea de estado ni separador en una superficie (fondo blanco o `surface` + radio xl o mayor).
- **sombras:** `shadow-(xs|sm|md|lg|xl|2xl|inner)` y sombras arbitrarias en esa superficie.
- **sinSurface:** superficie hecha a mano (fondo blanco + radio xl o mayor + sombra) sin `Card`, `surface` ni sus variantes.
- **css:** reglas con `border`, `background` y `border-radius` a la vez (selectores de botones, campos, chips y pestañas excluidos).
- **anidadas:** `surface` dentro de otra superficie o de un modal o popover en el mismo archivo.

**Exclusiones:** `src/emails/`, `CotizacionDocumento.jsx`, `CotizacionPDF.jsx`, pruebas y `tokens.css`. Solo se miran `div`, `section`, `article`, `aside`, `header`, `footer`, `form`, `main` y `li`: botones, inputs, selects, chips (`span`), avatares y etiquetas quedan fuera. No cuentan los bordes `dashed`, `transparent`, de estado, los separadores, los de variante (`hover:`, `focus:`, `focus-within:`, `group-hover:`, `aria-`, `disabled:`) ni `rounded-full`. Usa `espree` (viene con eslint). `scripts/` está en `.gitignore`: los archivos de la guarda se añadieron con `git add -f`.

## 8. Pendientes conocidos
- **Tope inicial** (no es el objetivo): 15 archivos con hallazgos tolerados; los más cargados son `Calculadora.jsx`, `AnalisisEstadisticas.jsx` y `DetalleRFQProductos.jsx`. Muchos son prefijos `sm:` o `md:` de contenedores de tabla, o tarjetas con borde de estado.
- Bordes de estado dejados: `DetalleRFQProductos:71`, `Calculadora:564` y `:641`, `MetricasRotativas:72`.
- Sin verificación en pantalla: el detalle de RFQ y el cuerpo completo de la Calculadora (no se pudieron renderizar con datos de ejemplo).
- `--tf-shadow-panel` y `--detalle-shadow-float`: sin uso; pueden eliminarse.
- `Card` y `CardHeader`: casi no se usan en vistas; las superficies se hacen con la clase `surface`.
- Los filtros (`src/components/filtros/`) ya están migrados y documentados en docs/filtros.md; las superficies de los filtros que no son campos están en la sección siguiente.

## 9. Superficies de los filtros
- **`BarraFiltros`:** `surface` (sombra de reposo, sin borde). En la hoja móvil, los bloques son `surface-plana` sobre `bg-background` y la hoja es `surface-flotante`.
- **`FiltroPestanas` con `sticky`:** en reposo una tarjeta `surface` (`rounded-xl`); pegada, una franja `bg-surface` opaca de ancho completo, sin sombra ni borde. Las dos capas se cruzan animando solo `opacity` y `transform`.
- **`ChipsFiltroContexto`:** chip `surface` de 28 px; con `plana`, `surface-plana` (cuando va dentro de otra superficie).
- **Menús de los selects de escritorio (`MenuAnclado`):** `bg-surface` + `shadow-menu`, sin contorno (ver §3).
- **`ModalRango`:** `Modal variante="hoja"`: hoja inferior en móvil y tarjeta centrada de 384 px desde `sm`, con `surface-flotante`.
