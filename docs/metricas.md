# Métricas de Análisis (F8)

Estado: **F8a (definiciones) y F8b (Productos y fila "Respondido por Compras" del Dashboard) hechos.** Este documento fija qué significa cada cifra de Análisis y cómo se decide el estado final de un ítem. F8b ya conecta Productos (Directorio, tarjeta Top del Dashboard e Historial de producto) y la fila "Respondido por Compras" a estas reglas; el resto de las pantallas sigue calculándose como hoy y se migra en F8c a F8e (sección 8). Los commits 2 a 6 de F8b salen juntos (sección 9).

Las cifras de "hoy" que aparecen en este documento salen de la lectura del código y de una auditoría de solo lectura del proyecto de **desarrollo** (`logisticadev-fa69d`: 468 solicitudes y 1.051 ítems). **Son datos de desarrollo y no se pueden trasladar a producción.** Antes de F8d se repite la auditoría en producción (sección 10).

## 1. Principios
1. **Una función única de estado final del ítem** (`estadoFinalItem`, sección 4). Ninguna pantalla vuelve a decidir por su cuenta si un ítem está ganado, perdido, rechazado o anulado.
2. **Cada cifra declara su unidad**: *solicitud* (cuenta una vez cada solicitud, RFQ o pedido manual) o *ítem* (una línea de producto). El nombre de la columna dice la unidad cuando hay riesgo de confusión.
3. **El estado de un ítem es el del ítem.** La bandera `motivoVentaPerdida` de la raíz de la solicitud no convierte en venta perdida a un ítem que tiene su propio estado (caso PED-0030, sección 6).
4. **El mismo nombre, la misma cifra** en todas las pantallas (Dashboard, Directorios, Historiales y Excel).
5. Se mantienen las claves de sesión, las rutas y los datos de Firestore. F8 cambia **cálculos y nombres de pantalla**, no escribe datos. En particular, no corrige el origen de la bandera `motivoVentaPerdida` en la raíz (`pedidoManualNegociacionService.js`, línea 704, y `ventasPerdidasService.js`, líneas 129 y 192): el cálculo deja de depender de ella.

## 2. Decisiones tomadas
Sobre las nueve decisiones abiertas del borrador, el responsable del producto decidió:

1. **Ítems sin `estadoItem` y "Cotizado" dentro de un Pedido.** Los ítems sin estado se resuelven por el estado de la solicitud (tabla de la sección 4). Un ítem "Cotizado" dentro de un Pedido cuenta como Cotizado (abierto, no ganado) y va a un contador de datos a revisar. No se escriben datos.
2. **"Pedido parcial".** En métricas por ítem desaparece (cuentan los ítems ganados). En listas y Directorios se muestra "Ganadas N (+M parc.)", calculado desde una sola función, `resultadoSolicitud`.
3. **"En seguimiento"** se queda como columna aparte, con la unidad "solicitudes".
4. **"Clientes" pasa a "Clientes distintos"**, contados con el nombre normalizado.
5. **Incidencia comercial** = ventas perdidas ÷ cerrados (ítems). Queda **para la última fase (F8d)**: en F8a solo se documenta (sección 3), no se implementa.
6. **Auditoría en producción**: sí, antes de F8d, de solo lectura y con autorización explícita del responsable en esa sesión.
7. **"Conversión"** es el único nombre de la métrica que hoy también se llama "Efectividad" y "Conversión a pedido".
8. **Cotizadas**: se unifica el conjunto (con Comprado). El KPI del dashboard se llama ahora **"Respondido por Compras"** (decidido el 2026-11-13) y conserva su conjunto de solicitudes (Cotizado y Cotizado Parcial); su definición está en la sección 3. El resto de los usos del nombre "Cotizadas" (Directorios, tabla Vendedores, pestaña de la lista y Excel) siguen como estaban; la fase en que se unifican queda por confirmar (duda abierta, sección 10).
9. **"Veces solicitadas"** se implementa a la vez en el Historial de producto y en el Directorio de productos, tomando como punto de partida el parche de la rama local `f8-historial-producto-solicitudes` (commit `0d2a3fa`, que solo vive en esa rama).

Decisiones anteriores (ya tomadas antes de F8): "Mayor volumen" son todas las unidades solicitadas, con una barra apilada de porcentajes por desenlace; "Veces Cotizado" pasa a "Veces solicitadas" y cuenta solicitudes distintas (incluye pendientes y decisiones); Ganado = Pedido = Comprado (el estado propio del ítem decide; el parcial es un concepto de solicitud completa); Conversión = ganadas ÷ cerradas; "Por unidades" (dashboard) y "Mayor volumen" (detalle) se unifican; en el eje de productos cada fila es un ítem con su estado, y la etiqueta "Parcial" junto al correlativo es contexto de la solicitud.

## 3. Glosario
Notación: `E` = `estadoFinalItem(solicitud, ítem)`. Un ítem está **cerrado** si `E` es Ganado, Venta perdida, Rechazo o Anulado; está **abierto** si `E` es Cotizado o Pendiente.

| Métrica (nombre nuevo) | Unidad | Fórmula exacta | Hoy (dónde y cómo se calcula) |
| --- | --- | --- | --- |
| **Total solicitudes** | solicitud | Número de solicitudes del ámbito (período y filtros), cada una una vez, incluidos los pedidos manuales y las pendientes. | `solicitudesFiltradas.length` (dashboard) y `totalRFQs++` por solicitud (Directorios). Coherente con el nombre. |
| **Veces solicitadas** (Productos) | solicitud | Número de **solicitudes distintas** en las que aparece el producto, en cualquier estado, con o sin decisión, incluidas las pendientes. | `vecesCotizado` cuenta líneas sin decisión (excluye venta perdida, rechazo y anulado, e incluye pendientes; un producto en dos líneas de una solicitud cuenta dos). `rfqIds.size` ya existe en `DetalleProductosAnalisis` pero no se muestra. |
| **Mayor volumen** (Productos) | unidades | Suma de `cant` de **todas** las líneas del producto, en cualquier estado. La barra apilada reparte esas unidades por `E` (ganado, venta perdida, rechazo, anulado y abierto) en porcentaje. | `unidadesCotizadas` suma las líneas sin decisión. Se llama "Mayor volumen" en el orden, "Unidades Cotizadas" en la columna y "Por unidades" en el dashboard. |
| **Ganados** (ítems) | ítem | Número de ítems con `E` = Ganado. | Directorios: `pedidos` cuenta **solicitudes** en estado Pedido o Comprado. Productos: `vecesPedido` cuenta líneas. Historiales: `pedidosCount` cuenta **solicitudes** con algún movimiento ganado *y sin ítems anulados* (`evaluarEstadoGanada`). Cuatro reglas distintas. |
| **Ganadas (+M parc.)** (solicitudes; "Ganadas" queda para las columnas por solicitud, F8d) | solicitud | `N` = solicitudes con resultado **Ganada** y `M` = solicitudes con resultado **Ganada parcial** (sección 5). Se muestra "N (+M parc.)". | `pedidos` (estado Pedido o Comprado) y `pedidosParciales` (estado Pedido Parcial), según el estado de la solicitud y no el de sus ítems. |
| **En seguimiento** | solicitud (con su desglose en ítems) | Solicitudes con fase de seguimiento de cliente (`obtenerFaseSolicitudCacheada`): revisión, prórroga pendiente, en prórroga, vencida o cierre requerido. Los ítems son los de `itemEnSeguimiento`. | No cambia de definición. Se documenta que **no es un estado final** (es un eje aparte) y se etiqueta con su unidad. |
| **Anulaciones** | ítem | Número de ítems con `E` = Anulado. | `contarDecisiones().anulaciones`: ítems con `estadoItem` = Anulado, salvo los que antes se cuentan como venta perdida o rechazo por la bandera de la solicitud. |
| **Ventas perdidas** | ítem | Número de ítems con `E` = Venta perdida (`estadoItem` o `motivoVentaPerdida` **del ítem**). | `esVentaPerdida(s, p)` mira el ítem **o** la solicitud (`estado` o `motivoVentaPerdida` de la raíz). Infla la cifra (secciones 4 y 9). |
| **Rechazos** | ítem | Número de ítems con `E` = Rechazo: `estadoItem` en {Rechazado, Cancelado, Denegado} o `motivoRechazo` del ítem. | `esRechazo(s, p)` mira el ítem o la solicitud, y tapa a Cancelado y Denegado cuando la solicitud lleva la bandera de venta perdida. |
| **Cotizadas** | solicitud | Solicitudes con estado Cotizado, Cotizado Parcial, Pedido, Pedido Parcial o **Comprado** (ya respondidas con precio). | Dos definiciones con el mismo nombre: Directorios (sin Comprado) y tabla Vendedores del dashboard (con Comprado). La tercera, el KPI del dashboard (solo Cotizado y Cotizado Parcial), se llama desde F8b "Respondido por Compras" (fila siguiente). Mismo nombre, dos cifras. |
| **Respondido por Compras** (Dashboard, fila del flujo de estados) | solicitud | Solicitudes (RFQ y pedido manual juntos) cuyo estado calculado por `clasificarSolicitud` es Cotizado o Cotizado Parcial: Compras ya respondió con precio y la solicitud no tiene pedido aún. Descripción en pantalla: "Con respuesta de Compras, sin pedido aún". El conjunto es el mismo que tenía la fila antes de F8b. Se reparte en **completas · parciales** por el estado final de cada ítem (`esRespondidaCompleta`, `src/views/analisis/utils/respondidoPorCompras.js`): **completa** = todos los ítems **no anulados** tienen `E` = Cotizado; **parcial** = al menos un ítem no anulado tiene otro `E` (Pendiente, Ganado, Venta perdida o Rechazo). Sin ítems, o con todos los ítems anulados, la solicitud es completa. Un ítem sin `estadoItem` lo resuelve `estadoFinalItem` (con precio es Cotizado y sin precio, Pendiente). Los ítems Anulados no cuentan, igual que en `clasificarSolicitud`. | Hasta F8b la fila se llamaba "Cotizadas / Parciales" y repartía por el estado guardado o recalculado de la solicitud (Cotizado = completa, Cotizado Parcial = parcial). |
| **Conversión** (ítems) | ítem | `Ganados ÷ Cerrados × 100`, con Cerrados = Ganado + Venta perdida + Rechazo + Anulado. Sin cerrados se muestra "—". | Ver las dos filas siguientes. |
| (**Efectividad**, nombre que desaparece) | = Conversión | Misma métrica, un solo nombre. | Tablas de Vendedores y Clientes y "% conv" móvil: `pedidos ÷ cotizadas` en solicitudes. Historiales: `pedidosCount ÷ rfqsUnicas` (Cliente y Producto, con pendientes en el denominador) o `÷ cotizadasSet` (Vendedor). Tres fórmulas. |
| (**Conversión a pedido**, nombre que desaparece) | = Conversión | KPI del dashboard, anillo móvil, tabla rotativa y Excel resumen pasan a la misma fórmula por ítems. | `pedidos ÷ (cotizadas + parciales + pedidos + pedidos parciales)`, por solicitud y por estado derivado (`clasificarSolicitud`). Los tooltips citan "RFQs cerradas como Pedido (100% ganadas)". |
| **Incidencia comercial** (**no implementada hasta F8d**) | ítem | `Ventas perdidas ÷ Cerrados × 100`, con el mismo denominador que Conversión. La fórmula va en el tooltip. | `tasaVentaPerdida` = solicitudes con al menos una venta perdida ÷ total de solicitudes (incluye pendientes), que cambia al llegar solicitudes nuevas sin haber decidido nada. |
| **Clientes distintos** | cliente | Número de clientes diferentes tras normalizar el nombre (minúsculas, sin tildes ni signos, como `normalizarBusqueda`). Dos clientes con el mismo nombre normalizado cuentan como uno. | Productos: `clientes.size` **sin normalizar** (`s.cliente.trim()`). Directorio de Clientes: una fila por nombre normalizado. |

## 4. Regla de estado del ítem: `estadoFinalItem(solicitud, ítem)`
Archivo: `src/utils/estadoFinalItem.js`, con su prueba por tabla (`estadoFinalItem.test.js`; F8a). Desde F8b lo usan `resumirProductos` y `esRespondidaCompleta`. Devuelve uno de seis valores: `Ganado`, `Venta perdida`, `Rechazo`, `Anulado`, `Cotizado` o `Pendiente`. No existe un valor "sin clasificar": toda combinación se resuelve y lo dudoso se señala aparte con `datoARevisarItem`.

**Nota sobre los motivos sueltos.** Si el ítem tiene `estadoItem` explícito "Pedido" o "Comprado" y además un `motivoVentaPerdida`, un `motivoRechazo` o un `motivoAnulacion` suelto, **gana el estado propio explícito (Ganado)** y el conflicto se anota en `datoARevisarItem`. Un residuo no debe rebajar una conversión en silencio. Esta protección se confirmará con la auditoría de producción (sección 10). **Límite conocido:** un `estadoItem` "Pedido Parcial" a nivel de ítem **no** tiene esta protección: sigue siendo Ganado por la regla 5, sin aviso, y un motivo suelto en él se resuelve como en la regla que corresponda (venta perdida, rechazo o anulado).

Orden de evaluación (la primera regla que coincide gana). Los valores se comparan sin espacios sobrantes y con las mayúsculas con que se guardan hoy.

1. `estadoItem` = "Pedido" o "Comprado" → **Ganado**. Si además el ítem tiene `motivoVentaPerdida`, `datoARevisarItem` devuelve `estado_ganado_con_motivo_de_venta_perdida`; si tiene `motivoRechazo`, `estado_ganado_con_motivo_de_rechazo`; si tiene `motivoAnulacion`, `estado_ganado_con_motivo_de_anulacion`. Si tuviera varios, se informa uno solo, en este orden: venta perdida, rechazo, anulación.
2. `estadoItem` = "Venta Perdida", o el ítem tiene `motivoVentaPerdida` propio → **Venta perdida**.
3. `estadoItem` en {Rechazado, Cancelado, Denegado}, o el ítem tiene `motivoRechazo` → **Rechazo**.
4. `estadoItem` = "Anulado", o el ítem tiene `motivoAnulacion` → **Anulado**.
5. `estadoItem` = "Pedido Parcial" → **Ganado** (sin la protección de motivos sueltos ni aviso: límite conocido de la nota anterior).
6. `estadoItem` = "Cotizado" → **Cotizado**; `estadoItem` = "Pendiente" → **Pendiente**.
7. Sin `estadoItem`, o con un valor que ninguna regla reconoce (este último caso se señala como `estado_item_desconocido`): se decide por el estado de la solicitud.

| `solicitud.estado` | Resultado de un ítem sin `estadoItem` |
| --- | --- |
| Pedido, Comprado | Ganado (regla actual de `normalizarEstadoItemMovimiento`) |
| Venta Perdida | Venta perdida (la bandera de la raíz sirve solo aquí) |
| Anulado | Anulado |
| Denegado, Rechazado, Cancelado | Rechazo |
| Cotizado, Cotizado Parcial, Pedido Parcial | Cotizado si tiene precio (`fob` o `precioUnitario` mayor que 0); si no, Pendiente (regla actual de `evaluarEstadoGanada`) |
| Pendiente u otro | Pendiente |

Un ítem o una solicitud nulos se tratan como objetos vacíos y dan Pendiente.

**Lo que ya no pasa:** un `motivoVentaPerdida` en la raíz o un `estado` = "Venta Perdida" de la solicitud **no** cambia el estado de un ítem que tiene `estadoItem` propio.

### `datoARevisarItem(solicitud, ítem)`
Devuelve `null` o un motivo, para el contador de "datos a revisar". No cambia el estado del ítem. Los motivos son:
- `cotizado_en_pedido`: `estadoItem` = "Cotizado" dentro de una solicitud en estado Pedido o Comprado (cuenta como abierto).
- `estado_ganado_con_motivo_de_venta_perdida`, `estado_ganado_con_motivo_de_rechazo` y `estado_ganado_con_motivo_de_anulacion`: el conflicto de la nota anterior (un ítem Pedido o Comprado con un motivo suelto).
- `estado_item_desconocido`: `estadoItem` no vacío que ninguna regla reconoce.

**Estado en F8b:** `resumirProductos` (`src/views/analisis/utils/resumenProductos.js`) calcula por producto los datos a revisar (`datosARevisar`: total y por motivo) y están probados, pero **ninguna pantalla los muestra**. Mostrarlos (por ejemplo como un contador en Productos) queda para cuando el responsable lo decida.

### Tabla de casos (entradas y salida)
| `estadoItem` | `solicitud.estado` | `motivoVentaPerdida` raíz | → `E` | Hoy (`decisionMetrics`) |
| --- | --- | --- | --- | --- |
| Pedido | Pedido Parcial | sí | **Ganado** | Venta perdida (por la raíz) |
| Venta Perdida | Pedido Parcial | sí | **Venta perdida** | Venta perdida |
| Cancelado | Cotizado Parcial | sí | **Rechazo** | Venta perdida (por la raíz) |
| Denegado | Denegado | no | **Rechazo** | Rechazo |
| Anulado | Pedido | sí | **Anulado** | Venta perdida (por la raíz) |
| Cotizado | Pedido | no | **Cotizado** (`cotizado_en_pedido`) | `esItemPedido` lo cuenta como pedido si el ítem no dice "Cotizado" |
| Pedido, con `motivoRechazo` del ítem | Pedido | no | **Ganado** (`estado_ganado_con_motivo_de_rechazo`) | Rechazo |
| Comprado, con `motivoAnulacion` del ítem | Pedido | no | **Ganado** (`estado_ganado_con_motivo_de_anulacion`) | se cuenta como pedido |
| Pedido, con `motivoVentaPerdida` del ítem | Pedido | no | **Ganado** (`estado_ganado_con_motivo_de_venta_perdida`) | Venta perdida |
| Pedido Parcial, con `motivoRechazo` del ítem | Pedido Parcial | no | **Rechazo** (sin protección ni aviso: límite conocido) | Rechazo |
| Venta Perdida, con `motivoVentaPerdida` del ítem | Pedido | no | **Venta perdida** (el motivo propio de un ítem que ya es Venta Perdida no es residuo) | Venta perdida |
| *(vacío)* | Pedido | no | **Ganado** | Ganado |
| *(vacío)* | Cotizado | no | **Cotizado** o **Pendiente** según precio | según pantalla |
| *(vacío)* | Venta Perdida | sí | **Venta perdida** | Venta perdida |
| *(vacío)* | Pendiente | sí | **Pendiente** (la bandera de la raíz no decide) | Venta perdida (por la raíz) |

## 5. Resultado de una solicitud: `resultadoSolicitud(solicitud)`
Archivo: `src/utils/resultadoSolicitud.js`, con `resultadoSolicitud.test.js` (F8a). No se conecta a ninguna pantalla ni en F8a ni en F8b. Calcula **una vez por solicitud**, a partir de los `E` de **todos** sus ítems:

| Resultado | Condición |
| --- | --- |
| **Ganada** | Todos los ítems están en Ganado (y hay al menos uno). |
| **Ganada parcial** | Hay al menos un ítem Ganado y al menos otro que no lo está. |
| **Perdida** | Ningún ítem Ganado, ningún ítem abierto y al menos un ítem en Venta perdida o Rechazo (los Anulados que haya no cambian el resultado). |
| **Anulada** | Ningún ítem Ganado, ningún ítem abierto y todos los ítems cerrados son Anulado. |
| **En curso** | Ningún ítem Ganado y al menos un ítem abierto. |
| **Sin ítems** | La solicitud no tiene productos. |

Un ítem Anulado cuenta como "no ganado": dos ítems Ganado y uno Anulado dan "Ganada parcial" (coherente con Conversión, donde el Anulado es un ítem cerrado que no se ganó). Devuelve además los conteos por ítem (`total`, `ganados`, `abiertos`, `cerrados`, `ventasPerdidas`, `rechazos` y `anulados`). `resumirGanadas(solicitudes)` cuenta cuántas solicitudes son Ganada (`ganadas`) y cuántas Ganada parcial (`parciales`), y `formatoGanadas` produce el texto "N (+M parc.)" (solo "N" si no hay parciales).

Este resultado **no** sustituye a `RESULTADOS_SOLICITUD` de `clasificarSolicitud.js`, que sigue sirviendo al filtro de resultado del dashboard hasta que F8c y F8d decidan su destino.

Estas dos reglas (Anulado cuenta como no ganado; "Perdida" frente a "Anulada") las decidió el responsable del producto.

## 6. Casos de prueba (anonimizados)
- **PED-0030 (caso real, anonimizado):** pedido manual del "Cliente A", con `solicitud.estado` = "Pedido", `tipo` "Pedido Manual", `motivoVentaPerdida` en la raíz, `resumenNegociacion` con 1 acordado y 2 denegados, vendedor `vendedor@ejemplo.test` y usuario `uid-1`. Tres ítems de 3 unidades cada uno:
  - Ítem 0: `estadoItem` "Cancelado", con `fechaRechazo`, `rechazadoPor` y `ultimoCambio.accion` "rechazar". Esperado: **Rechazo**.
  - Ítem 1: `estadoItem` "Venta Perdida", con su propio `motivoVentaPerdida`. Esperado: **Venta perdida**.
  - Ítem 2: `estadoItem` "Pedido", negociación acordada y `pedidoGenerado` verdadero, sin motivo propio. Esperado: **Ganado**.

  Hoy los tres cuentan como venta perdida por la bandera de la raíz. Con la regla: 1 ganado, 1 venta perdida y 1 rechazo; la solicitud es "Ganada parcial".
- **Caso tipo (no es PED-0030):** pedido manual con `motivoVentaPerdida` en la raíz y tres ítems `[Pedido, Pedido, Venta Perdida]`. Esperado: Ganado, Ganado y Venta perdida; la solicitud es "Ganada parcial". En desarrollo hay **35 solicitudes** con la bandera en la raíz (15 pedidos manuales y 20 RFQs).
- **Cliente K (cifras de desarrollo):** 39 solicitudes (20 pedidos manuales y 19 RFQs), 69 ítems, 2 variantes de nombre normalizado. Directorio hoy: 24 ventas perdidas, 1 rechazo, 16 anulaciones y conversión de 88,9 % (pedidos ÷ cotizadas, por solicitud). Con las reglas: 15 ventas perdidas, 2 rechazos, 20 anuladas y 29 ganadas de 66 cerrados, es decir **43,9 %**, y ganadas por solicitud "16 (+2 parc.)".
- **Producto repetido:** un producto en dos líneas de la misma solicitud da "Veces solicitadas" = 1 y "Mayor volumen" suma las dos líneas.
- **Ítem sin estado en un Pedido:** sin `estadoItem` en una solicitud Pedido es Ganado (en desarrollo no ocurre: los 7 ítems sin estado están en otras solicitudes).
- **Estado ganado con motivo suelto:** `estadoItem` "Pedido" o "Comprado" con `motivoVentaPerdida`, `motivoRechazo` o `motivoAnulacion` es Ganado y se anota en `datoARevisarItem`; una prueba por cada combinación. El límite conocido de "Pedido Parcial" también tiene su prueba.

## 7. Matriz pantalla × métrica
Unidad: S = solicitud, I = ítem, L = línea o movimiento. "Qué cambia" resume el efecto sobre lo que ve el usuario. Nada de esto cambia en F8a. Las filas marcadas **Hecho en F8b** ya están en pantalla con el nombre indicado en "Nombre nuevo"; las demás siguen como hoy hasta su fase (sección 8).

| Pantalla | Nombre actual | Nombre nuevo | Unidad hoy → nueva | Qué cambia |
| --- | --- | --- | --- | --- |
| Dashboard, KPI | Cotizadas / Parciales | Respondido por Compras | S → S | **Hecho en F8b.** Mismo conjunto de solicitudes; el reparto completas · parciales sale del estado final de cada ítem (sección 3). |
| Dashboard, KPI | Conversión a pedido | Conversión | S → I | Cifra distinta (sección 9); el tooltip pasa a la fórmula por ítems. |
| Dashboard, KPI | Incidencia comercial | Incidencia comercial (definición explícita) | S → I | Solo en F8d. |
| Dashboard, tabla Vendedores | Total Solicitudes / Cotizadas / Pedidos / Efectividad | Total Solicitudes / Cotizadas / Ganadas / Conversión | S → S e I | "Efectividad" pasa a "Conversión". |
| Dashboard, Top clientes | N solicitud(es) / % conv | igual | S → S e I | El % conv pasa a ítems. |
| Dashboard, Top productos | Más cotizados, Nx, Ganado, Unidades | Más solicitados, Veces solicitadas, Ganados (con la conversión entre paréntesis), Volumen con la barra "Volumen por estado" | L → S | **Hecho en F8b.** "Nx" pasa a solicitudes distintas; el desempate es el volumen total; el chip "Ganado" sale solo con ganadas y ningún ítem abierto. |
| Dashboard, móvil | "Por unidades" | Mayor volumen | no aplica | **Hecho en F8b.** Un solo nombre. |
| Directorio de Clientes | Total Solicitudes, Cotizadas, En seguimiento, Anulaciones, Ventas perdidas, Rechazos, Ganadas (Pedidos), Conversión, Volumen Estimado | igual, con Ganadas (+M parc.) y Conversión por ítems | mezcla de S e I → unidad declarada | Anulaciones, ventas perdidas y rechazos pasan a la regla única. |
| Directorio de Vendedores | Total Solicitudes, Cotizadas, En seguimiento, Ganadas (Pedidos), Anulaciones, Ventas perdidas, Rechazos, Efectividad, Monto Cotizado, Monto en Pedidos | igual, con Ganadas (+M parc.) y Conversión por ítems | ídem | ídem. |
| Directorio de Productos | Veces Cotizado, En seguimiento, Anulaciones, Ventas perdidas, Rechazos, Unidades Cotizadas, Cotizaciones Ganadas, Unidades Pedidas, Clientes | Veces solicitadas ("N solic." en la celda de escritorio), En seguimiento, Anulaciones, Ventas perdidas, Rechazos, Volumen, Ganados (con la conversión entre paréntesis), Unidades ganadas, Clientes distintos; órdenes "Más solicitados", "Mayor volumen" y "Más ganados"; barra "Volumen por estado" | L → S (Veces) | **Hecho en F8b.** "Veces solicitadas" cuenta solicitudes distintas; Volumen son todas las unidades en cualquier estado, repartidas por estado final en la barra; Ganados y su conversión, Ventas perdidas, Rechazos y Anulaciones salen del estado final de cada ítem. La tarjeta móvil dice "Solicitados", "Ganados", "Volumen" y "Und. ganadas". |
| Historial de Cliente | Efectividad (N gan. (+M pc.) / K solicitudes) | Conversión (ítems), con "gan. (+pc.)" de solicitudes aparte | S → I | `evaluarEstadoGanada` se sustituye por la regla única; columnas Estado y Resultado. |
| Historial de Vendedor | ídem y "En N solicitudes registradas" | "En N solicitudes" (sigue los filtros) | S → S e I | Aclarar que el número sigue los filtros. |
| Historial de Producto | Veces Cotizado / En diferentes RFQs | Veces solicitadas / En diferentes solicitudes | L → S | **Hecho en F8b** (solo la tarjeta "Veces solicitadas" y su subtítulo): el número pasa a solicitudes distintas (`rfqsUnicas`). La tarjeta "Efectividad" sigue con su fórmula vieja hasta F8c (sección 8). |
| Excel, Resumen general | Total Solicitudes, Cotizadas, Pedidos Ganados, Tasa Éxito (%), Cotizado (veces) | Total Solicitudes, Cotizadas, Ganadas, Conversión (%), Veces solicitadas | S → S e I | Mismas fórmulas que las pantallas. |
| Excel, Movimientos y Solicitudes | Correlativo, Estado, Resultado | igual | L y S | Estado = estado del ítem (`E`); "Pedido parcial" con una sola función. |
| Listas de solicitudes | Estado, Resultado | Estado (de la solicitud), Resultado (Ganada, Ganada parcial, Perdida, Anulada, En curso) | S | Una sola función de resultado de solicitud. |

## 8. Plan por fases
Cada fase es un conjunto de commits independiente, con pruebas de cifras **antes y después** (la cifra anterior se guarda como constante en la prueba para documentar el cambio). Orden: F8a, F8b, F8c, F8d, F8e.

| Fase | Contenido | Archivos | Riesgos | Pruebas |
| --- | --- | --- | --- | --- |
| **F8a** | Este documento, `estadoFinalItem`, `datoARevisarItem` y `resultadoSolicitud`. **Ninguna pantalla cambia.** | nuevos: `docs/metricas.md`, `src/utils/estadoFinalItem.js`, `src/utils/resultadoSolicitud.js` y sus `.test.js` | Ninguno de cara al usuario. | Por tabla; PED-0030 y caso tipo; Cliente K; ítems sin estado; motivos sueltos; mutaciones. |
| **F8b** (hecho) | Productos y Dashboard con "Veces solicitadas", "Mayor volumen" y la barra apilada por estado. **A la vez en el Historial de producto y el Directorio de productos** (decisión 9). El parche de `f8-historial-producto-solicitudes` (`0d2a3fa`) no se aplicó: el mismo cambio en el Historial (`totalMovimientos` pasa a `rfqsUnicas`) se rehízo en `dcdb8b7`, junto con el nombre y el subtítulo. | `DetalleProductosAnalisis.jsx`, `DetalleProductoHistorial.jsx`, `AnalisisEstadisticas.jsx` (`topProductos`), `AnalisisEstadisticasMobile.jsx`, `components/BarraApilada.jsx` y `components/PopoverBarra.jsx` (colores de `tag-*`) | Cifras de Productos cambian; `check:colores` si la barra introduce colores; "Por unidades" y "Mayor volumen" se unifican. | Tablas de Productos con el producto repetido; la barra suma 100 %. |
| **F8c** | Historiales y columna Estado y Resultado. | `DetalleClienteHistorial.jsx`, `DetalleVendedorHistorial.jsx`, `DetalleSolicitudesAnalisis.jsx` y `theme.js` (`evaluarEstadoGanada`) | "Ganada" deja de excluir solicitudes con ítems anulados; la tarjeta de Efectividad cambia. | Historiales con ítems mezclados; búsqueda y Excel exportado con los mismos filtros. |
| **F8d** | Directorios de Clientes y Vendedores, y Conversión e **Incidencia comercial** del dashboard. | `DetalleClientesAnalisis.jsx`, `DetalleVendedoresAnalisis.jsx`, `AnalisisEstadisticas.jsx` (`metricasBase`, `statsVendedores`, `topClientes`), `components/MetricasRotativas.jsx` y tooltips | Las cifras de mayor visibilidad (conversión) bajan mucho (sección 9). Requiere la auditoría en producción antes. | Cifras por cliente y vendedor antes y después; orden por "Más ganadas". |
| **F8e** | Excel y "Pedido parcial" con una sola función. | `utils/excel/reporteResumenGeneral.js`, `reporteMovimientos.js`, `reporteSolicitudes.js`, `decisionExportable.js`, `extraerMovimientos.js`, `utils/estadoItem.js`, `utils/clasificarSolicitud.js` y `views/analisis/utils/normalizarMovimiento.js` | Quien tenga hojas o macros sobre los Excel verá cambios de valores. | Libro generado: encabezados y cifras iguales a las de pantalla. |

Los Directorios de Clientes y Vendedores ya aplican los filtros de contexto de vendedor y cliente (F6b). Cuando F8d cambie sus columnas, las cifras deberán seguir coincidiendo con las de los Historiales a los que se entra desde cada fila.

### F8b hecho: qué cambió en Productos y en el Dashboard
F8b está en la rama `f8b-productos-dashboard` (commits `b1c807c`, `dcdb8b7`, `62eefdf`, `35ddd4d`, `1c8fa31`, `5d6318c`, `958afcf` —"Ganadas" pasa a "Ganados" en Productos— y este commit, la documentación). Todas las cifras de Productos salen de una sola función por producto, `resumirProductos` (`src/views/analisis/utils/resumenProductos.js`), que usa `estadoFinalItem`; el Directorio y la tarjeta Top comparten ese cálculo. Con los nombres que ve el usuario:
- **"Veces solicitadas"** (Directorio, tarjeta Top e Historial de producto) cuenta solicitudes distintas en cualquier estado, pendientes y decisiones incluidas; un producto repetido en una solicitud cuenta una vez. En la tabla de escritorio la celda dice "N solic." con el texto completo en el `title`.
- **"Volumen"** (columna del Directorio, tarjeta Top) son todas las unidades solicitadas en cualquier estado, con la barra **"Volumen por estado"** (Ganado, Pendiente, Cotizado, Anulado, Venta perdida, Rechazo) y un popover con el desglose. El orden **"Mayor volumen"** ordena por ese volumen total (antes "Unidades Cotizadas" y "Por unidades").
- **"Ganados"** (columna y tarjeta móvil del Directorio, y tarjeta Top) cuenta ítems con estado final Ganado, con la **conversión** entre paréntesis: ganados ÷ cerrados, por ítems, con cerrados = Ganado + Venta perdida + Rechazo + Anulado; sin cerrados se muestra un guion. El porcentaje de la celda va con 0 decimales y el `title` da el decimal. **"Unidades ganadas"** también sale del estado final. El orden se llama **"Más ganados"**.
- **"Ventas perdidas"**, **"Rechazos"** y **"Anulaciones"** por producto salen del estado final: la bandera `motivoVentaPerdida` de la raíz deja de convertir en venta perdida a un ítem con estado propio.
- **"Clientes distintos"** cuenta con el nombre normalizado.
- **"Más solicitados"** (antes "Más cotizados") ordena por "Veces solicitadas" y desempata por el volumen total. En la tarjeta Top, el chip "Ganado" sale solo con ganadas y ningún ítem abierto.
- **Dashboard, fila "Respondido por Compras"** (antes "Cotizadas / Parciales"): sección 3.
- Se mantienen las claves de sesión y de orden (`?orden=`, `analisis_top_prod_orden`); "ganadas" es un alias de "pedidos".

### Diferencias temporales y riesgos conocidos de F8b
Cada una con la fase que la cierra:
1. **La fila "Respondido por Compras" abre la pestaña "Cotizadas"** de la lista de solicitudes (`DetalleSolicitudesAnalisis.jsx`), que filtra por el **estado guardado**, mientras la fila usa el estado recalculado con `clasificarSolicitud`. Diferencia medida en la auditoría de desarrollo: en pedido manual la pestaña tiene **3 solicitudes más que la fila en el histórico y 1 más en los últimos 30 días**; en RFQ, ninguna. Se cierra en **F8c** (confirmado), que revisa la lista de solicitudes.
2. **El Excel conserva el reparto anterior** hasta **F8e**: `reporteResumenGeneral.js` sigue leyendo `cotizadasCompletas` y `cotizadasParciales`, que no cambiaron; para la fila se añadieron `respondidasCompletas` y `respondidasParciales`. Los números del Excel y los de la fila pueden diferir hasta entonces.
3. **`DetalleVendedoresAnalisis.jsx:457`** (encabezado "En seguimiento" del Directorio de Vendedores) sigue diciendo "ya incluidas en Cotizadas". Se corrige en **F8d**.
4. **Tarjeta "Efectividad" del Historial de producto**: sigue con su fórmula vieja (ganadas ÷ solicitudes, con las pendientes en el denominador) y discrepa del Directorio. Ejemplo del arnés sintético (no son datos reales): ABB da 9,6 % en el Historial (10 ganadas de 104 solicitudes) frente a 23,8 % en el Directorio. Se cierra en **F8c**, cuando la tarjeta pase a "Conversión".
5. **Historial y Directorio con filtros distintos.** Con la misma clave de producto, el Historial de producto aplica sus propios filtros (búsqueda, estado y modalidad, además de vendedor y cliente) y **no aplica `analisis_resultado_filter`**, mientras que el Directorio de productos sí lo aplica. Con esos filtros activos, el mismo producto puede dar dos cifras aunque compartan cálculo. No se resuelve en F8b: está asignado a **F8c**, junto con los Historiales.

## 9. Plan de despliegue
**Todas las cifras de esta sección son de desarrollo (468 solicitudes) y no son extrapolables a producción.** Histórico completo y últimos 30 días:

| Métrica | Hoy | Con la regla | Cambio |
| --- | --- | --- | --- |
| Ventas perdidas (ítems) | 145 | 101 | −44 (−30 %) |
| Rechazos (ítems) | 20 | 28 | +8 (+40 %; Cancelado y Denegado dejan de quedar tapados por la venta perdida de la solicitud) |
| Anulaciones (ítems) | 43 | 50 | +7 |
| Conversión (histórico) | 20,4 % (pedidos ÷ cotizadas, por solicitud) | 51,1 % (ítems ganados ÷ cerrados) | cifra de otra naturaleza |
| Conversión (30 días) | 2,2 % | 42,5 % | porque los 23 Pedido Parcial hoy no cuentan como pedidos |
| Cliente K: conversión | 88,9 % | 43,9 % | −45 puntos |

### Cambios visibles de F8b
Para las notas de versión y el correo a los gerentes. **Nombres y cifras que cambian en Productos y en el Dashboard** (los commits 2 a 6 de F8b salen juntos):
- "Veces Cotizado" pasa a **"Veces solicitadas"**: solicitudes distintas en cualquier estado (pendientes y decisiones incluidas); un producto repetido en una solicitud cuenta una vez. "N RFQs" pasa a **"N solic."**.
- "Unidades Cotizadas" y "Por unidades" pasan a **"Volumen"** (columna) y **"Mayor volumen"** (orden): todas las unidades en cualquier estado, con una barra "Volumen por estado" y un popover con el desglose.
- "Cotizaciones Ganadas" pasa a **"Ganados"** (ítems ganados por estado final) en el Directorio de productos y en la tarjeta Top, con su **conversión** (ganados ÷ cerrados). "Unidades Pedidas" pasa a **"Unidades ganadas"**.
- **Ventas perdidas, rechazos y anulaciones** por producto pasan a la regla única: la bandera de venta perdida de la raíz de la solicitud deja de convertir en venta perdida a un ítem con estado propio; un Cancelado pasa de venta perdida a rechazo; un Pedido con un motivo de rechazo suelto pasa de rechazo a ganado.
- "Clientes" pasa a **"Clientes distintos"** (nombre normalizado).
- "Más cotizados" pasa a **"Más solicitados"**: cambia el orden del top y, con él, el desempate (ahora por volumen total); el chip "Ganado" de la tarjeta Top sale solo sin ítems abiertos.
- Historial de producto: la tarjeta "Veces Cotizado" pasa a **"Veces solicitadas"** y cuenta solicitudes distintas (su subtítulo dice "En diferentes solicitudes"); la tarjeta "Efectividad" no cambia hasta F8c.
- Dashboard: la fila "Cotizadas / Parciales" pasa a **"Respondido por Compras"**, con la descripción "Con respuesta de Compras, sin pedido aún", el mismo conjunto de solicitudes y el reparto completas · parciales por el estado final de cada ítem. La pestaña de la lista a la que lleva sigue llamándose "Cotizadas" y el Excel conserva el reparto anterior (sección 8).

**Orden de magnitud (auditoría de desarrollo, 468 solicitudes; no es producción ni se puede extrapolar):** con la regla única, las ventas perdidas pasan de 145 a 101 (**−44, −30 %**), los rechazos suben **+8** y las anulaciones **+7**. Son totales sobre todas las solicitudes de desarrollo, no por producto: F8b solo aplica estas reglas a las pantallas de Productos, de modo que los totales del Dashboard, los Directorios de Clientes y Vendedores y los Historiales siguen con la cifra anterior hasta F8c y F8d. **No hay cifras de producción.**

**Orden de despliegue:** los commits 2 a 6 de F8b salen **juntos** y **no con F8d** (ni con F8c el mismo día).

Qué avisar y a quién:
- **Gerencia, administración, compras y ventas** (todos ven estos números): las cifras de ventas perdidas, rechazos, anulaciones y conversión cambian de forma visible; la causa es una definición única, no un error. Usar las notas de versión de la aplicación (ya existen) y un aviso aparte por correo a los gerentes.
- **Quien use los Excel**: los valores del resumen cambian con las fórmulas nuevas (los encabezados "Correlativo" ya cambiaron antes).
- **No desplegar F8d con F8b ni F8c el mismo día**: separar para poder atribuir cualquier consulta a una fase.
- **Repetir la auditoría en producción antes de F8d.** Será de solo lectura, con cifras agregadas, y solo con la autorización explícita del responsable en esa sesión para usar la credencial de producción. Las proporciones de desarrollo pueden no ser las reales.

## 10. Dudas abiertas
1. **Residuos de motivos en producción.** La auditoría de producción dirá cuántos ítems en Pedido o Comprado conservan un `motivoVentaPerdida`, un `motivoRechazo` o un `motivoAnulacion` suelto (hoy la regla los protege y los lista en `datoARevisarItem`), y si hay ítems con estado "Pedido Parcial" a nivel de ítem, que no tienen esa protección.
2. **Auditoría en producción antes de F8d**, con autorización explícita (sección 9).
3. **Fase de la unificación de "Cotizadas".** El KPI del dashboard ya se llama "Respondido por Compras" y conserva su conjunto (Cotizado y Cotizado Parcial). El resto de los usos del nombre "Cotizadas" (Directorios, tabla Vendedores, pestaña de la lista y Excel) siguen como estaban, con definiciones distintas (sección 3). Falta confirmar en qué fase se unifican (decisión 8, sección 2).

Decididas: el KPI del dashboard se llama "Respondido por Compras" (2026-11-13), con el mismo conjunto de solicitudes, sin separar por tipo (RFQ y pedido manual juntos) y sin estados nuevos; en las pantallas de Productos la métrica por ítems se llama "Ganados" y "Ganadas" queda para las columnas que cuentan solicitudes (Directorios de Clientes y Vendedores, F8d); los ítems Anulados cuentan como "no ganado" en `resultadoSolicitud` (2 Ganado y 1 Anulado dan "Ganada parcial"); una solicitud sin ganados ni abiertos es "Perdida" si tiene al menos un ítem en Venta perdida o Rechazo, y "Anulada" si todos sus ítems cerrados son Anulado; la protección de motivos sueltos cubre `motivoVentaPerdida`, `motivoRechazo` y `motivoAnulacion`.
