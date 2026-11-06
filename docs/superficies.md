# Superficies y sombras

Referencia de cómo se pinta una superficie (tarjeta, panel, tabla en tarjeta, aviso, modal, menú) en `logistica-hco`. Rama `superficies-y-filtros`.
Estado: fases S1 y S2 hechas (tokens, utilidades, `Card`, piloto `DashboardVendedor`); el resto de vistas se migra en S3. La guarda
`check:superficies` llega en S4.

## 1. Principio
Una superficie se separa del fondo **solo con una sombra difuminada**, sin contorno decorativo. El anillo de 1 px que tenía `--tf-shadow-card`
se eliminó.

## 2. Tokens (`src/styles/tokens.css`)
Las sombras llevan el color de marca del rol (`--color-primary`; con el tono oscuro del menú el tinte no se distinguía de una sombra negra) escalado por `--sombra-alfa` (por rol, iguala el peso visual). Se declaran en el
bloque `@theme inline` y se redeclaran en "Derivados por ámbito" (`:root, .role-*, body[data-role]`): en `:root` solas no seguirían al rol.

| Token | Uso | Forma |
| --- | --- | --- |
| `--shadow-reposo` | tarjetas, paneles, tablas en tarjeta, avisos | `0 2px 5px 0 (7 %)`, `0 10px 30px -4px (12 %)` |
| `--shadow-flotante` | modales, menús, popovers, tooltips | `0 24px 64px (14 %)`, `0 2px 8px (8 %)` (capa de contacto) |
| `--shadow-boton`, `-hover`, `-activo` | botones | `0 1px 2px (8 %)` + `0 4px 10px -2px (10 %)`; hover 10 % y 14 % con `0 6px 14px -2px`; activo `0 1px 1px (8 %)` |
| `--sombra-alfa` | multiplicador por rol | sin rol 1.08, comprador 0.72, vendedor 1.45, gerente 1.56, administrador 1.55 |

`--tf-shadow-card` es alias de `--shadow-reposo` (se declara también por ámbito). `--tf-shadow-panel` y `--detalle-shadow-float` no se usan y no son equivalentes: se dejaron como estaban.

Medido en Chrome (tarjeta blanca de 160×80 sobre el fondo de cada rol): ΔE al lado izquierdo 5.5 a 6.2 y debajo 10.2 a 10.5; el tono de la sombra se distingue de una negra equivalente en ΔE 4.3 a 10.

## 3. Utilidades y componente
- `@utility surface` (`index.css`): fondo `--color-surface`, `--radius-card` (24 px) y `--shadow-reposo`, sin borde.
- `@utility surface-flotante`: fondo y `--shadow-flotante`; el radio lo pone cada pieza.
- `<Card>` (`components/ui/Card.jsx`): usa `surface`; acepta `as`, `className` y `padding` (`none`, `sm`, `md`).
- `.tf-surface-panel` y `.tf-tabla-card` están escritas sobre `surface`; `.tf-tabla-card--plana` quita la sombra (dentro de modales).

## 4. Reglas
- Al usar `surface` o `<Card>` no añadas `bg-*`, `shadow-*` ni borde decorativo: en el CSS compilado `.bg-white` y `.shadow-*` van después de `.surface` y la sobrescriben.
- Radio propio solo si la pieza lo necesita distinto (`rounded-2xl` = 14 px en tarjetas pequeñas; `rounded-[10px]` en avisos).
- **Dentro de modales, menús y popovers las superficies son planas** (sin sombra de reposo ni borde): la elevación la pone el contenedor.
- **Los botones llevan `--shadow-boton` y no borde** (`Button`, `AccionItemButton`, `ModalBoton`). `Etiqueta`, `StatusChip`, inputs, selects, buscadores, segmentos y pestañas de filtro no llevan sombra de botón.

## 5. Qué borde se elimina y cuál se queda
- **Se elimina (decorativo):** el contorno de tarjetas, avisos, banners, paneles y popovers.
- **Se queda (estado):** selección, error, foco, `dashed` de zonas de carga, `border-primary`, `border-rose-*` y `border-emerald-*` de validación.
- **Se queda (separadores):** `border-t/b/l/r` y `divide-*` (filas de tabla, encabezados de panel, pestañas).
- **Controles:** inputs, selects y campos de búsqueda conservan un borde suave (`.tf-campo`: `1px solid var(--color-border)`) sin sombra.

## 6. Lo flotante
Modales (`BASE_PANEL` en `utils/modales.js`), menús, calendarios, desplegables de autocompletar, el menú de acciones de Prórrogas, el tooltip propio de la Calculadora y `.hilo-panel` usarán `surface-flotante` (S3, grupo 5). Los `title=` nativos no se tocan.

## 7. Recortes por `overflow`
La sombra de reposo se extiende ~24 px a los lados y ~36 px abajo. Un ancestro con `overflow` (`hidden`, `auto`, `scroll`) la recorta si su padding es menor: hacen falta unos 10 px a los lados y unos 24 px abajo para que el corte no se vea (ΔE ≤ 1). El `main` tiene 16 px de padding inferior (el `style` en línea anula `md:pb-8`): `DashboardVendedor` añade `pb-2` a su contenedor. Casos conocidos: `ModalBloqueoCotizaciones` (cuerpo con `p-2.5` en móvil), los estados vacíos de los Historiales y las tarjetas de `GestionOC` dentro de un contenedor `overflow-hidden`.

## 8. Cómo añadir una superficie nueva
1. Úsala con `<Card>` o con la clase `surface` (sin `bg-*`, `shadow-*` ni borde decorativo).
2. Si flota (menú, popover), `surface-flotante` más el radio de la pieza; si está dentro de un modal, plana.
3. Verifica que ningún ancestro con `overflow` la recorte (§7).
4. Botones: `<Button>`; no añadas sombras de color (`shadow-primary/20`, `shadow-emerald-*`).

## 9. Guarda
`check:superficies` (S4): tope por archivo, solo puede bajar, para borde completo en superficies, sombras `shadow-(xs|sm|md|lg|xl|2xl|inner)` y arbitrarias, reglas CSS con borde + fondo + radio, y superficies sin `Card` ni `surface`.
