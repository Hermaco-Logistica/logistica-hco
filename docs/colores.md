# Sistema de colores

Referencia del sistema de color de `logistica-hco`. Los valores son los vigentes en `src/styles/tokens.css`. Lo que no esté aquí se
define en el archivo citado en cada sección.

## 1. Dónde viven los tokens

| Qué | Dónde | Notas |
| --- | --- | --- |
| Tokens de color fijos y valores sin rol | `src/styles/tokens.css`, bloque `@theme static` | Tailwind v4 los convierte en utilidades (`bg-primary`, `text-danger`, `bg-seguimiento-soft`, `border-seguimiento/30`…). `static` emite todas las variables aunque ninguna clase las use. |
| Derivados que deben seguir al rol | `tokens.css`, bloque `@theme inline static` | `inline` hace que la utilidad lleve la expresión completa y se evalúe en cada elemento. Hoy: `primary-soft`, `secondary-soft` y los cuatro `seguimiento*`. |
| Valores por rol | `tokens.css`, `@layer base`: `.role-<rol>, body[data-role="<rol>"]` | Cada rol sobrescribe `primary`, `primary-strong`, `secondary`, `background` y los `nav-*`. |
| Derivados por ámbito | `tokens.css`, `@layer base`: `:root, .role-*, body[data-role]` | Se redeclaran `sidebar`, `primary-soft`, `secondary-soft` y los cuatro `seguimiento*` (ver §7). |
| Alias antiguos | `tokens.css` (`--tf-color-*`, `--detalle-*`) y `src/index.css` (`--detalle-accent-*`, `--detalle-bg-*`) | Solo en `:root` y en el shell, nunca en `body[data-role]`. Apuntan a los tokens. |
| Remapeos de utilidades por rol | `src/index.css`, sección "remapeos" | Con `!important`, solo dentro de `.role-*` (el shell, no los portales): `bg-slate-900`, `bg-slate-800`, `border-slate-800`, `bg-emerald-500`, `text-emerald-500/400` y `hover:bg-emerald-600`. |
| Etiquetas (tonos) | `src/utils/etiquetas.js` (`TONOS`, `TEXTO_TONO`, `PALETA_CORREO`) | Los colores salen de los tokens `tag-*`, salvo `seguimiento` y `rol`, que usan los tokens del rol (§4, §7). |
| Modales (tonos) | `src/utils/modales.js` (`TONOS_MODAL`, `tonoModal`) | Tonos fijos (`neutral`, `peligro`, `aviso`, `exito`, `azul`…) y el tono `rol` (icono, botón principal y foco con los tokens `primary`). |
| Toasts y avisos | `src/components/ui/Toast.jsx`, `GlobalAlertModal.jsx` y `avisarExito.js` | Ver §3 y §4. |
| Botones de decisión | `src/components/pedidos/negociacion/variantesAccion.js` | `VARIANTES_ACCION`: aceptar, contraoferta, rechazar, venta perdida. |
| Colores de Análisis | `src/views/analisis/theme.js` | Clases de Tailwind y `hex:` por rol (ver §10). |

### Familias de tokens (valores actuales)

- **Marca (por rol):** `primary`, `primary-strong`, `primary-foreground` (`#ffffff`), `primary-soft`, `secondary`, `secondary-foreground`, `secondary-soft`, `sidebar` (= `secondary`), `background`.
- **Neutros (slate):** `surface` `#ffffff`, `surface-muted` `#f8fafc`, `border` `#e2e8f0`, `border-subtle` `#f1f5f9`, `border-strong` `#aeb7c2`, `foreground` `#1e293b`, `foreground-muted` `#64748b`, `foreground-subtle` `#94a3b8`, `foreground-inverse` `#ffffff`.
- **Estados (fijos):** `success` `#176b45` (`-strong` `#105b39`, `-soft` `#eef8f2`), `warning` `#8a5a00` (`-soft` `#fff7e8`), `danger` `#a42b32` (`-strong` `#8d252b`, `-soft` `#fff0f0`), `info` `#1d5e87` (`-soft` `#eff6fa`), `status-neutral` `#4b5566` (`-soft` `#f0f2f5`).
- **Etiquetas de usuario:** `tag-<tono>` (texto), `tag-<tono>-soft` (fondo) y, donde difiere, `tag-<tono>-text` (texto suelto). Apuntan a la paleta de Tailwind (por ejemplo `tag-azul` = `blue-700` sobre `blue-100`).
- **Navegación y Análisis (por rol):** `nav-accent`, `nav-accent-text`, `nav-accent-strong`, `nav-accent-hover`, `nav-glow`, `analysis-accent`, `analysis-accent-active`.
- **Dominio aéreo y marítimo (fijos):** `mode-air` = `emerald-600` (`-strong` 700, `-soft` 50, `-border` 200, `-100`, `-800`, `-900`, `-950`) y `mode-sea` = `blue-600` (`-strong` 700, `-soft` 50, `-border` 200, `-100`, `-500`, `-900`, `-950`).
- **Seguimiento (por rol):** `seguimiento`, `seguimiento-soft`, `seguimiento-borde`, `seguimiento-claro` (§7).
- **Gráficos:** `chart-1` a `chart-9` (hex).
- **Sombras:** `shadow-reposo`, `shadow-flotante`, `shadow-boton` (con `-hover` y `-activo`) y `shadow-menu` (ver docs/superficies.md). `--tf-shadow-card` es alias de `shadow-reposo`; `--tf-shadow-panel` y `--detalle-shadow-float` no se usan.
- **Filtros (por rol):** `color-filtro-abierto` (6 % de `primary` sobre `surface`: campo abierto y su menú), `color-filtro-activo` (16 % de `primary` sobre `surface`: campo con valor) y `color-filtro-texto` (`primary-strong` con 20 % de negro: texto del valor activo, ≥ 4,5:1 sobre `color-filtro-activo` en los cuatro roles y sin rol). Ver docs/filtros.md.

## 2. Paleta por rol

| Rol | `primary` | `primary-strong` | `secondary` (menú) | `background` | `nav-accent-text` | `nav-accent-hover` |
| --- | --- | --- | --- | --- | --- | --- |
| comprador | `#3b46f2` | `#2635d9` | `#1b2452` | `#f7f8fc` | `#aaaff3` | `#212fbf` |
| vendedor | `#7964a9` | `#614e8c` | `#310845` | `#f7eefb` | `#afa2cc` | `#534378` |
| gerente | `#547e52` | `#40613f` | `#243119` | `#f6faf5` | `#aceca1` | `#344e33` |
| administrador | `#a8606b` | `#83414d` | `#6b2732` | `#faf5f6` | `#f1adba` | `#6f3741` |
| sin rol (`:root`) | `#10b981` | `#059669` | `#0f172a` | `#f8fafc` | `blue-300` | `blue-700` |

Cada rol define además `nav-accent` = `primary`, `nav-accent-strong` = `primary-strong`, `nav-glow` (`rgb()` de `primary-strong` al 18 %) y `analysis-accent` y `analysis-accent-active` = `primary-strong`. Sin rol, `nav-accent` es `blue-500`, `nav-accent-strong` `blue-600`, `analysis-accent` `slate-800` y `analysis-accent-active` `slate-900`.

El rol llega así:
- Dentro del shell: clase `role-<rol>` en `.tf-app-shell` (`App.jsx`, `appThemeClass`).
- Fuera del shell (modales y otros portales, que cuelgan de `<body>`): `document.body.dataset.role = role || 'default'` (`App.jsx`). `body[data-role="default"]` no coincide con ninguna regla: ahí valen los valores sin rol.
- Se usa `body[data-role]` y no `<html>` a propósito: los alias antiguos se declaran en `:root` y un `data-role` en `<html>` los volvería dependientes del rol también en los portales.
- `DecisionPanel` pone `data-role` en su propia sección.

## 3. Reglas: qué sigue al rol y qué es fijo

**Siguen al rol:** la acción principal (`Button primary`, `bg-primary`), los enlaces (`link`, `text-analysis-accent`, `hover:text-nav-accent-hover`), el foco, el ítem activo del menú (`nav-accent`), los encabezados tintados (`primary-soft`), el seguimiento (§7) y los elementos de acción de modales y pantallas: el icono y el botón principal de un modal con `tono="rol"`, el botón OK del aviso de éxito, el botón flotante de opciones de DetalleRFQ, el panel y el modal de vinculación de `DashboardPedidos` y el botón "Listo" de Gastos adicionales de la Calculadora.

**Colores fijos:** los estados (`success`, `warning`, `danger`, `info`), las etiquetas (`Etiqueta` y sus tonos, salvo `rol` y `seguimiento`), el toast y el aviso de éxito (caja e icono), el dominio aéreo y marítimo (`mode-air-*`, `mode-sea-*` y los tonos `exito` y `azul` de las cajas de monto, §6), los botones de decisión (`variantesAccion.js`) y los neutros.

**Acción frente a estado:** una acción (guardar, enviar, aplicar, abrir opciones) sigue el rol; un estado (éxito, error, modalidad, decisión) conserva su color fijo. La razón se midió: un toast de éxito en el color del rol queda a ΔE 2,79 del toast de error en el administrador (rojizo, `#83414d`), y la caja del aviso de éxito en el color del rol queda a ΔE 6,7 de la de un aviso de error, frente a 27,3 con el verde fijo en los cuatro roles. Estos ΔE son CIE76 (los de ΔE2000 de §12 son de otra medición).

**Remapeos de `index.css`:** `text-emerald-400`, `text-emerald-500`, `bg-emerald-500` y `hover:bg-emerald-600` cambian al color del rol (con `!important`, solo dentro de `.role-*`). No se deben usar para un estado ni para la modalidad: así el icono del avión y la línea "Total:" aérea de DetalleRFQ salían en el color del rol, y hoy usan el verde fijo `TEXTO_TONO.exito`. Los tonos de modal con `tono="rol"` y las clases `bg-primary`/`bg-secondary` sí funcionan en los portales, porque leen los tokens de `body[data-role]`.

**Neutros:** siempre `slate-*` (más `white` y `black`). El tono "Cotizado" de las etiquetas depende del rol por excepción (`TONO_COTIZADO_POR_ROL` en `etiquetas.js`: comprador azul, vendedor morado, gerente turquesa, administrador peligro, sin rol neutral).

**Evitar:** clases de paleta cromática sueltas (`bg-emerald-600`, `text-rose-700`…) y literales hex o `rgb()` en vistas. Lo vigila `npm run check:colores` (§9).

## 4. Componentes y variantes

- **`Button`** (`src/components/ui/Button.jsx`). Variantes: `primary` (`bg-primary`, sigue al rol), `secondary` (neutro con borde), `secondaryBrand` (`bg-primary-soft text-primary-strong`), `danger` y `dangerSoft` (estado), `link` (`text-analysis-accent`). Tamaños: `sm`, `md`, `lg`, `cta`, `block`, `pill`, `xl`, `icon`, `iconSm`. `disabled` se pinta en gris (`slate`).
- **`AccionItemButton`** (`src/components/pedidos/negociacion/`). Toma su color de `variant` desde `variantesAccion.js`: `approve` (`bg-success`), `counter` (ámbar con texto `warning`), `reject` (`slate`), `lost` (`bg-danger`). No siguen al rol; llevan anillo de foco visible.
- **`Etiqueta`** (`src/components/Etiqueta.jsx`). Es la única forma de pintar una etiqueta. Tonos de `TONOS`: `neutral`, `suave`, `apagado`, `oscuro` (conserva `bg-slate-800`, que `index.css` remapea por rol), `exito`, `info`, `azul`, `indigo`, `aviso`, `peligro`, `naranja`, `violeta`, `morado`, `turquesa`, `amarillo`, `seguimiento` (`bg-seguimiento text-seguimiento-soft`) y `rol` (`bg-primary-soft text-primary-strong`, sigue al rol; no está en `PALETA_CORREO`, así que un correo con ese tono caería en neutral). `TEXTO_TONO` da solo el color de texto de cada tono. Con `dominio` + `valor` el texto, el tono, el título y el ícono salen del catálogo (`estadoSolicitud`, `estadoItem`, `faseSeguimiento`, `vigenciaItem`, `resultado`, `decision`, `modalidad`…). Tamaños: `compacta`, `normal`, `grande`. ESLint prohíbe `bg-tag-*` y las clases con forma de etiqueta fuera de `etiquetas.js`.
- **`StatusChip`** (`src/components/detalle/StatusChip.jsx`, estilos en `detalle.css`). Punto + texto. Estados: warning (`pendiente`, `en_revision`, `seguimiento_requerido`, `parcial`), danger (`vencida`, `rechazada`, `plazo_vencido`, `cierre_requerido`, `error`), success (`aprobada`, `resuelta`, `completa`, `success`), info (`info`, `prorroga_disponible`, `solo_lectura`), neutral (`reprogramada`, `neutral`) y `seguimiento` (color del seguimiento).
- **`TablePagination`** (`src/components/ui/TablePagination.jsx`). Botones neutros (`bg-neutral-200/70`) y texto `slate`; no depende del rol.
- **`PageHeader`** y **`PageContainer`** (`src/components/ui/`). Cabecera estándar (título `text-slate-800`, botón de volver blanco, `statusChip`, `actions`) y contenedor de ancho máximo (`--content-max` 1440 px; `size="form"` 896 px; `size="wide"` 1700 px).
- **`Modal`** (`src/components/Modal.jsx`, estilo en `utils/modales.js`). El `tono` de `ModalEncabezado`, `ModalBoton` y los campos sale de `TONOS_MODAL`: tonos fijos (`neutral`, `peligro`, `aviso`, `naranja`, `azul`, `info`, `exito`, `violeta`) y `rol` (`icono: bg-primary/15 text-primary-strong`, `boton: bg-primary hover:bg-primary-strong`, foco con `primary`). Con `tono="rol"`: Confirmar notificación (`BarraNotificar`), Nuevo producto local, vista previa, rango de fechas, Gastos adicionales y Cotizador de flete de la Calculadora, vinculación de `DashboardPedidos` y rastreo de envíos (`TrackingModal`). Los modales de decisión (anular, denegar, rechazar, venta perdida) conservan su tono fijo. Con el rol, el texto blanco del botón da 6,28 (comprador), 4,99 (vendedor), 4,61 (administrador) y 4,68 (gerente).
- **`Toast`** (`src/components/ui/Toast.jsx`). El éxito usa `TONOS.exito` sin borde y un check verde fijo (`TEXTO_TONO.exito`, `text-tag-exito-text`, que el remapeo por rol no toca); el error, la advertencia y la información conservan sus colores fijos con borde. El éxito es fijo y no sigue al rol por la confusión del administrador con el error (§3).
- **Aviso global** (`GlobalAlertModal.jsx` y `avisarExito.js`). Sustituye `window.alert` (se monta en `App.jsx`, no está montado mientras `App` muestra "Cargando…"). El aviso de éxito (`avisarExito(mensaje, alCerrar)`, que llama a `window.alert` con un tercer argumento `'exito'`) lleva la caja y el icono en `tono="exito"` con un check (`CheckCircle2`) y solo el botón OK en `tono="rol"`. Cualquier otro aviso (54 llamadas), o un tercer argumento vacío o desconocido, conserva el aspecto de siempre: caja verde, icono de información y botón verde fijo. `avisarExito` lo usan 14 llamadas en `App.jsx`, `NuevoPedido.jsx`, `NuevaRFQ.jsx`, `DetalleRFQVendedor.jsx` (3), `RevisionPedidoManual.jsx`, `DashboardCompras.jsx`, `DetallePedidoManual.jsx`, `DashboardVendedor.jsx` (2), `GestionOC.jsx`, `ConsolidarCompras.jsx` y `DashboardPedidos.jsx`; las anulaciones y "Solicitud Creada" (con o sin la advertencia del correo) cuentan como éxito; los informativos, no.
- **Botón flotante de DetalleRFQ** (móvil, `DetalleRFQVista.jsx`). Cerrado `bg-primary`, abierto `bg-primary-strong` con la X y el giro de 90°. Solo se muestra si hay alguna opción que desplegar (`contarOpcionesMoviles` en `detalle-rfq/opcionesMoviles.js`: exportar si no está Pendiente, consultar motivos y consultar ventas perdidas en una cotización parcial). **Cambio de comportamiento:** con la solicitud en estado Pendiente el conteo es 0 y el vendedor ya no ve el círculo (antes veía uno con un menú vacío).
- **Vinculación de `DashboardPedidos`** (solo comprador). Panel `bg-secondary` con `border-primary/20`, títulos en `text-nav-accent-text` (contraste de 5,83 a 9,99 en los cuatro roles; antes 2,3 a 3,4), campos y filas `bg-white/14`, divisor `border-white/10`, botón `bg-primary hover:bg-primary-strong` y filas con `hover:bg-primary` (el `hover:bg-blue-600` anterior nunca se veía, porque el remapeo `!important` de `bg-slate-800` lo anulaba). El modal móvil usa `tono="rol"`.

## 5. Estados y urgencia

La urgencia de cada fase de seguimiento no usa el color de seguimiento: `cierre_requerido` y `vencida` son `peligro`, `prorroga_pendiente` y `en_prorroga` son `info`, `en_revision` es `aviso` (`ETIQUETAS_FASE_SEGUIMIENTO` en `etiquetas.js`). Los StatusChip de urgencia (`cierre_requerido`, `vencida`, `seguimiento_requerido`…) usan `danger`/`warning`/`info` y no deben cambiarse al color de seguimiento: llevan significado de urgencia.

## 6. Dominio aéreo y marítimo

Aéreo verde (`mode-air*`, `emerald`) y marítimo azul (`mode-sea*`, `blue`) en toda la app, y siempre fijos: no cambian con el rol. Los totales con IVA de la barra de guardado de la Calculadora usan `text-mode-air-strong` y `text-mode-sea-strong`. Picard usa ámbar y no entra en esta regla.

**Cajas de monto de DetalleRFQ (diseño "V3").** El desglose del resumen, el bloque móvil "Total Aéreo/Marítimo" y las tarjetas de precio de cada ítem en móvil usan una caja con `TONOS.exito` (aéreo) o `TONOS.azul` (marítimo), `rounded-xl`, sin borde, con título y monto en `TEXTO_TONO` del mismo tono (título de 9 px y monto de 14 px o 12 px en peso 900). No usan los tokens `mode-*`. Contrastes medidos del texto: **aéreo 4,72** (`emerald-700` sobre `emerald-100`) y **marítimo 5,60** (`blue-700` sobre `blue-100`); son distintos porque cada uno usa el `TEXTO_TONO` de su tono. Antes, el monto estaba en ~9,5 (desglose) y ~14,5 (tarjetas de ítem). Ajuste posible: `emerald-800` para el monto aéreo (6,78) y su equivalente para el marítimo. El cuadro del icono del bloque móvil usa `bg-white/50` (ver §11). Las celdas de la tabla de escritorio (tintes de columna con `mode-*-soft/30`), los encabezados "Venta Aéreo/Marítimo", los rótulos de "Tiempos y Entrega" y la Calculadora conservan los tokens `mode-*`. La modalidad de un ítem (la etiqueta "Aéreo" o "Marítimo") se pinta con `Etiqueta dominio="modalidad"`.

## 7. Seguimiento ("En seguimiento")

Estado general de seguimiento de cliente (el que cuenta la columna "En seguimiento" de las listas de Análisis). Hoy sigue la paleta del rol:

```css
--color-seguimiento: var(--color-primary-strong);   /* relleno oscuro del rol */
--color-seguimiento-soft: var(--color-primary-soft); /* letra clara / fondo tenue del rol */
--color-seguimiento-borde: color-mix(in srgb, var(--color-primary-strong) 30%, white);
--color-seguimiento-claro: color-mix(in srgb, var(--color-primary-strong) 55%, white);
```

Estos cuatro están en el bloque `@theme inline static` y se redeclaran en "Derivados por ámbito". Usos: la píldora (`Etiqueta tono="seguimiento"`: `bg-seguimiento text-seguimiento-soft`), el punto de la pestaña (`bg-seguimiento`), la tarjeta KPI de Análisis (`bg-seguimiento-soft text-seguimiento border-seguimiento/30`, barra de `from-seguimiento-claro` a `to-seguimiento`), el monto "$ en seguimiento" (`text-seguimiento`), el aviso de los Historiales y el chip "Seguimiento" del banner (`StatusChip status="seguimiento"`).

**Cómo volver al ciruela fijo** (`#72467c` y `#e2d8e4`): `git revert` del commit "Seguimiento con los colores del rol", o a mano quitar las cuatro líneas de los dos bloques y declarar en `@theme static`:

```css
--color-seguimiento: #72467c;
--color-seguimiento-soft: #e2d8e4;
--color-seguimiento-borde: color-mix(in oklab, var(--color-seguimiento) 30%, white);
--color-seguimiento-claro: color-mix(in oklab, var(--color-seguimiento) 55%, white);
```

Contrastes medidos con los colores del rol (letra soft sobre relleno / texto sobre blanco): comprador 6.97 / 8.10, vendedor 6.24 / 7.05, gerente 6.19 / 7.00, administrador 6.55 / 7.42. Sin rol (verde de marca) queda en 3.43 / 3.77, por debajo de 4.5.

## 8. Advertencia: `@theme inline` y el bloque "Derivados por ámbito"

Un token derivado declarado en `:root` **no sigue al rol**: el `var()` se resuelve donde se declara. Para que siga al rol hay que hacer dos cosas:

1. Declararlo en un bloque `@theme inline static` (así la utilidad, por ejemplo `bg-seguimiento`, lleva `var(--color-primary-strong)` y se evalúa en cada elemento).
2. Redeclararlo en el bloque "Derivados por ámbito" (`:root, .role-*, body[data-role]`), porque hay consumidores de la variable CSS que no pasan por una utilidad (por ejemplo `detalle.css` usa `var(--color-seguimiento)`).

Verificar siempre en el CSS compilado (`dist/assets/index-*.css`) que la utilidad lleva la expresión del rol, y en Chrome con `.role-<rol>` (shell) y `body[data-role]` (portal).

## 9. Guarda de colores

`npm run check:colores` (`scripts/check-colores.mjs`) cuenta por archivo las clases de paleta cromática con tono (red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose) y los literales hex, `rgb()`, `rgba()`, `hsl()` y `hsla()` (sin el blanco y el negro puros). Los conteos de `scripts/colores-baseline.json` son el **tope** y solo pueden bajar; falla si un archivo lo supera o si aparece uno nuevo con colores sueltos. Tras bajar colores: `npm run check:colores -- --update`. Excluidos: `src/emails/`, `CotizacionDocumento.jsx`, `CotizacionPDF.jsx`, pruebas y `styles/tokens.css`. `theme.js` y `etiquetas.js` tienen su propio tope. La carpeta `scripts/` está en `.gitignore`: los dos archivos de la guarda se añadieron con `git add -f`; una vez rastreados se editan con normalidad.

**Tope tras la serie de colores por rol:** baja de **975 a 964 clases** de paleta (los literales siguen en 77): 971 con el toast, 970 con las cajas de ítem de DetalleRFQ, 969 con la línea "Total:" aérea y 964 con la vinculación de `DashboardPedidos`. `white` y `black` no cuentan, así que `bg-white/14`, `border-white/10` y `bg-white/50` no suben el tope.

## 10. Cómo añadir un color o un rol

**Color nuevo fijo:** añadir `--color-<nombre>` (y `-soft` si hace falta) en `@theme static` de `tokens.css` y usar `bg-<nombre>`, `text-<nombre>`. Si es un estado, usar `success`/`warning`/`danger`/`info` y `StatusChip`; si es una etiqueta, un tono en `etiquetas.js` (`TONOS`, `TEXTO_TONO`) con sus `tag-*` en `tokens.css`; si es dominio, `mode-air-*`/`mode-sea-*` para texto y tintes de columna, y `TONOS.exito`/`TONOS.azul` para una caja de monto (§6).

**Color nuevo que siga al rol:** definirlo en `@theme inline static` con `var(--color-primary…)` y redeclararlo en "Derivados por ámbito" (§8).

**Rol nuevo:**
1. Un bloque `.role-<rol>, body[data-role="<rol>"]` en `tokens.css` con `primary`, `primary-strong`, `secondary`, `background`, `nav-accent` (= `primary`), `nav-accent-text`, `nav-accent-strong`, `nav-accent-hover`, `nav-glow`, `analysis-accent` y `analysis-accent-active`.
2. Añadir el rol a los selectores de "Derivados por ámbito" y del bloque de alias `--tf-color-*`.
3. Añadirlo a los remapeos de `index.css` (`.role-<rol> .bg-slate-900`, etc.).
4. `TONO_POR_ROL` y `TONO_COTIZADO_POR_ROL` en `etiquetas.js`, `getRoleTheme` en `views/analisis/theme.js`, y la resolución del rol en `App.jsx` (rutas por rol).
5. Medir contrastes (`primary-strong` sobre blanco, letra clara sobre `primary-strong`, `nav-accent-text` sobre `secondary`) y el ΔE2000 contra los colores de estado.

## 11. Excepciones (usan hex o clases de paleta por diseño)

- **Correos:** `src/emails/` y `PALETA_CORREO` en `etiquetas.js` (el correo no admite clases de Tailwind). El tono `violeta` sigue ahí; no hay tono `seguimiento` de correo.
- **Documentos PDF:** `CotizacionDocumento.jsx` y `CotizacionPDF.jsx`.
- **Gráficos y `theme.js`:** `views/analisis/theme.js` define `flujoEstados` por rol (Pendiente, Cotizadas, Pedidos) con clases de Tailwind y un campo `hex:` que hoy nadie lee fuera de ese archivo; las barras de Análisis son degradados CSS, sin librería de gráficos. En el rol vendedor "Cotizadas" usa `purple-600` y `hover:text-purple-700`.
- **Etiquetas de usuario:** tono `violeta` (`ReleaseNotesModal.jsx` lo asigna al vendedor) y `TONOS_MODAL.violeta` en `utils/modales.js`.
- **Alias antiguos y `nav-glow`:** `--tf-color-*`, `--detalle-*` y el `rgb()` de `nav-glow` siguen como valores aparte.
- **Transparencias de blanco:** `bg-white/14` y `border-white/10` (panel oscuro de vinculación de `DashboardPedidos.jsx`, equivalen al 14 % de blanco que daban los remapeos de `slate-800`) y `bg-white/50` (cuadro del icono del bloque móvil "Total Aéreo/Marítimo" de `DetalleRFQVista.jsx`, porque ya no hay un token `mode-*` y `bg-tag-*` no puede escribirse en `.jsx`). No tienen token propio.

## 12. Pendientes conocidos

- **Gerente:** el ítem activo del menú (`primary` sobre `secondary`) queda en 2.93:1 y `slate-500` sobre `primary-soft` en 4.21:1; se revisan en pantalla, sin cambiar tokens.
- **Seguimiento sin rol:** 3.43:1 (solo si una vista se pintara antes de resolver el rol).
- **Parecidos con estados:** en el comprador la píldora de seguimiento (`#2635d9`) queda a ΔE2000 5.0 del azul de "Cotizada"; en el gerente a 8.5 del verde de éxito y 13.9 del turquesa de su "Cotizado"; en el vendedor (`#614e8c`) a 15 o más de cualquier estado. La variante suave (fondo del rol claro y letra oscura) cambia una línea de `etiquetas.js` (`TONOS.seguimiento`: `'bg-seguimiento-soft text-seguimiento'`) y las dos aserciones de `Etiqueta.test.jsx`; su fondo es tenue (ΔE2000 contra blanco de 4.3 a 8.4).
- **Calculadora:** el bloque marítimo y la tarjeta de factor marítimo (`Calculadora.jsx`, `:641-654` y `:1291-1314`) usan `sky-*` en vez de `mode-sea`; la etiqueta "Nuevos" del factor aéreo conserva `tono="azul"`.
- **Análisis de Productos:** la tabla desborda a 1280 y 1440 px (ya lo hacía antes de la columna de seguimiento).
- **Excepciones del tope:** los conteos de `colores-baseline.json` son el punto de partida, no el objetivo; hay que bajarlos migrando cada archivo a tokens.
- **`scripts/` ignorado por git:** solo los dos archivos de la guarda están rastreados.
- **Avisos que no son de éxito:** los 54 avisos de `GlobalAlertModal` que no usan `avisarExito` siguen con caja verde, icono de información y botón verde, así que los errores salen como éxitos. Segundo paso: un tono neutro para los informativos y `peligro` para los errores. El `alert("Acceso denegado…")` del login (`App.jsx:178`) sale como `alert` nativo porque se dispara antes de montar `GlobalAlertModal` (`App` muestra "Cargando…" mientras `loading` es verdadero); ya era así y es un error visible.
- **Sin alcance todavía:** etiqueta "Editar" de la tarjeta Aduana de la Calculadora (`Etiqueta tono="exito"`, una acción en verde fijo; medir en los cuatro roles antes de decidir si sigue el rol), la Calculadora con el patrón antiguo (cajas, factores y totales con `mode-*`), los rótulos "Aéreo/Marítimo" de "Tiempos y Entrega" de DetalleRFQ (mejora opcional: pasarlos a `Etiqueta`), y `FindexSettingsModal`, `ReleaseNotesModal` y los modales de seguimiento (aviso e información), que siguen con tono fijo.
- **Contraste (accesibilidad), sin tocar:** iconos del toast (aviso 2,06; información 3,46; error 3,42; el de aviso queda muy por debajo del 3,0 mínimo de un icono), botón de login (2,54 con texto blanco sobre `#10b981`), placeholder de los campos del panel de vinculación (3,07 a 4,07; 3,75 en el comprador), botón "Crear y Vincular" contra el panel (2,32 a 2,93; 2,35 en el comprador), línea "Total:" marítima de `DetalleRFQProductos` (`text-mode-sea-500`, 3,64), líneas secundarias de las cajas de ítem de DetalleRFQ (3,3 a 3,5) y el botón principal con el rol del administrador y del gerente (4,61 y 4,68, apenas sobre 4,5). Sin rol (verde de marca) el tono `rol` da 2,54 con texto blanco y 3,27 en el icono de modal; ese caso no se ve (cualquier usuario recibe un rol).
- **Pendiente de verificación en un móvil real:** el menú del botón flotante de DetalleRFQ con 2 o 3 opciones (cotización parcial con decisiones o ventas perdidas), el arrastre contra el toque y el giro del icono; el `shadow-md` negro del botón "Listo" de la Calculadora (no se comparó a ojo); las 14 llamadas de `avisarExito` en su pantalla real (se probaron con `window.alert` desde el arnés, no una por una); Safari/iOS; y los roles vendedor y administrador en estas pantallas.
