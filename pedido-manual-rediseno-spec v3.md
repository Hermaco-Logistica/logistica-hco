# Rediseño del flujo "Pedido Manual" (Compras ↔ Vendedor) — v3

> **Para el agente que implementa esto.** Lee el documento completo antes de tocar código. Entrega **archivos completos y listos para pegar**, no fragmentos ni diffs. Si algo de este documento contradice lo que ves en el repo, el repo manda en los detalles y este documento manda en la intención: avisa de la discrepancia en tu resumen de fase.
>
> **v3 reemplaza a la v2.** Integra los hallazgos y correcciones de las Fases 2b, 2c, 3 y 3b, y **reestructura el plan de fases** (sección 14): ya no hay una fase móvil separada; cada pantalla se entrega junto con su tarjeta móvil, para no dejar nunca una plataforma rota en producción. Si existe una copia previa en `docs/`, sobrescríbela.

---

## 0. Resumen ejecutivo

Hoy el flujo se siente desordenado porque conviven **tres modelos de "confirmar"** que no se hablan entre sí:

1. **El hilo de mensajes** escribe a Firestore al instante (aceptar / contraofertar) y luego lanza un `alert()` bloqueante.
2. **La revisión de Compras** trabaja sobre un borrador local y persiste todo con "Guardar cambios" (reescribiendo `productos` completo).
3. **El detalle del vendedor** tiene un tercer camino: checkbox "Pedir" + "Confirmar ítems devueltos".

El cambio se apoya en cuatro ideas:

- **Negociar es por ítem y se guarda al instante (transacción). Notificar es global y es un botón aparte.** Ninguna acción sobre un ítem puede invalidar el botón global.
- **Modelo por turnos.** Cada ítem sabe a quién le toca. La UI dice "Tu turno" / "Esperando a X" / "Acordado" / "Denegado".
- **Aceptar / contraofertar viven en la fila del ítem, no en el hilo ni en `alert()`s.** Los inputs de la fila *son* la contraoferta.
- **El hilo pasa a ser conversación + bitácora.** No tiene botones de decisión ni crea propuestas.

**Regla de entrega crítica:** cada pantalla (Compras, vendedor) se reescribe completa — versión escritorio y tarjeta móvil — en una sola fase. La tarjeta móvil de hoy escribe con un patrón (`guardarCambios`, reescritura completa de `productos`) incompatible con las transacciones versionadas del modelo nuevo; mantenerla "temporalmente" arriesga pisar negociaciones en curso. No existe una fase "solo móvil" separada.

---

## 1. Contexto técnico

- Stack: React, `react-router-dom`, Firebase Firestore, `lucide-react`, Tailwind, función Netlify `/.netlify/functions/send-email-notification`, Vite.
- **Vitest** ya está instalado como test runner (agregado en la Fase 2b), con Firebase mockeado para las pruebas del servicio.
- Convención de servicios: `src/services/<camelCase>Service.js` (ej. `clientesService.js`, `proveedoresService.js`, `pedidoManualNegociacionService.js`).
- `firestore.rules`: confirmado en la Fase 2c. Usa el comodín recursivo `{document=**}` y solo exige `isHermacoUser()` (usuario `@hermaco.net`). **Cualquier usuario autenticado de Hermaco tiene lectura/escritura completa** sobre `solicitudes` (y su subcolección `mensajes`) y `pedidos`. La separación de roles (Compras vs vendedor) vive **enteramente** en `pedidoManualNegociacionService.js` y en la UI, no en las reglas.

### 1.1 Archivos relevantes

| Archivo | Rol | Estado |
|---|---|---|
| `src/services/pedidoManualNegociacionService.js` | Servicio de negociación | ✅ Creado (Fases 2, 2b, 2c) |
| `src/utils/emailNegociacion.js` | Correo unificado | ✅ Creado (Fase 2) |
| `src/components/ui/Toast.jsx` | Sistema de toasts (no existía) | ✅ Creado (Fase 3), montado en `src/App.jsx` envolviendo `<Router>` |
| `src/components/pedidos/negociacion/{EstadoItemChip,OfertaDiff,FormularioOferta,ResumenTurnos,BarraNotificar}.jsx` | Componentes compartidos | ✅ Creados (Fase 3) |
| `src/hooks/useNegociacionItems.js` | Hook de suscripción + acciones | ✅ Creado (Fase 3) |
| `src/dev/NegociacionPreview.jsx` (ruta `/dev/negociacion`, solo `import.meta.env.DEV`) | Vista previa de componentes | Fase 3b |
| `src/views/comprador/RevisionPedidoManual.jsx` | Vista de **Compras** (escritorio) | Por reescribir — **Fase 4** |
| `src/components/pedidos/RevisionPedidoMobileCard.jsx` | Tarjeta móvil de Compras | Por reescribir — **Fase 4** (junto con la de escritorio) |
| `src/views/vendedor/DetallePedidoManual.jsx` | Vista del **Vendedor** (escritorio) | Por reescribir — **Fase 5** |
| `src/components/pedidos/DetallePedidoMobileCard.jsx` | Tarjeta móvil del vendedor | Por reescribir — **Fase 5** (junto con la de escritorio) |
| `src/components/hilos/HiloComentariosItem.jsx` | Hilo de mensajes por ítem | Prop `accionesHabilitadas` añadida (Fase 3); limpieza final en **Fase 6** |
| `src/hooks/useHiloItem.js` | Lógica del hilo | Limpieza final en **Fase 6** |
| `src/components/mobile` → `StickyActionBar` | Barra de acción inferior | Reutilizar en Fases 4 y 5 |
| `src/views/vendedor/DetalleRFQVendedor.jsx` | Pantalla hermana (RFQ regular) | ✅ Blindada (Fase 2c): redirige a `/vendedor/pedido-manual/:id` si `tipo === 'Pedido Manual'`, dentro del `onSnapshot`. Código legado (líneas ~765, 801, 817) confirmado muerto; fuera de alcance |

**Consumidores fuera de estas pantallas (riesgo de compatibilidad):**

| Archivo | Dependencia | Estado |
|---|---|---|
| `src/views/comprador/DashboardCompras.jsx` | `tieneItemsPendientesPorCotizar(s)` sobre `estadoItem` | Revisar en Fase 8 contra `resumenNegociacion` |
| `src/views/pedidos/DashboardPedidos.jsx` | Filtra por `estadoItem === 'Pedido' \|\| 'Comprado'` | **Blindar en Fase 3b** con `itemPedidoConfirmado` (ver 6.2) |
| `src/views/comprador/ConsolidarCompras.jsx` | Toma ítems `Pedido` y los pasa a `Comprado` (asigna `idOC`, `numOC`) | **Blindar en Fase 3b** con `itemPedidoConfirmado` (ver 6.2) |
| `src/views/comprador/Calculadora.jsx` | Deduce "pendientes" iterando `fob <= 0` | En principio no requiere cambios; revisar en Fase 8 si se demuestra ruptura |

### 1.2 Colecciones

- `solicitudes/{id}` con `productos[]`, `estado`, `comentariosComprador`, `comentariosVendedor`, `correlativo`, `cliente`, `vendedorId`, `vendedorNombre`, `vendedorEmail`, `linkOC`, `notasPedido`, `tipo` (discriminador; `'Pedido Manual'` para estas pantallas).
- `solicitudes/{id}/mensajes` con `itemId`, `tipo` (`texto` | `propuesta` | `aceptacion` [legado] | `evento` [nuevo]), `precioPropuesto`, `precioAnterior`, `modalidad`, `modalidadAnterior`, `tiempoEntrega`, `tiempoEntregaAnterior`, `estadoPropuesta`, `autor{nombre,rol}`, `createdAt`.
- `pedidos` (un documento por confirmación, con `productos[]`).

### 1.3 Campos de un ítem hoy

`descripcion|desc`, `marca`, `cant`, `fob` (se muestra como "Precio (Venta OC)"), `modalidad`, `fechaCompromiso` (texto tipo "10" o "5 días"), `estadoItem` (`Pendiente`, `Cotizado`, `Pedido`, `Comprado`, `Denegado`, `Cancelado`, `Rechazado`), `fobAnterior`, `modalidadAnterior`, `tiempoEntregaAnterior`, `comentarioCompras`.

> `Pedido` y `Comprado` se tratan como equivalentes ("aprobado / final"). **El servicio nunca muta un ítem `Comprado`.** Ver también 6.2 sobre cuándo un `Pedido` cuenta como "confirmado" para otros consumidores.

### 1.4 Hallazgo de Fase 3: botón "Devolver ítem a Compras" en el hilo

Existe en `HiloComentariosItem` (o su hijo `PropuestaPrecioCard`) un botón adicional, "Devolver ítem a Compras", que se ocultó al pasar `accionesHabilitadas={false}` pero **aún no está documentado en el modelo**. Antes de la Fase 4 hay que entender qué hace (ver Fase 3b, punto 0b) y decidir si necesita una acción propia en el servicio o si contraofertar ya lo cubre.

---

## 2. Diagnóstico (causas raíz) — histórico, ya resuelto por el servicio

**RevisionPedidoManual.jsx (legado)**
- `handleFieldChange` mutaba el estado con una copia superficial.
- El `onSnapshot` solo aplicaba cambios remotos en la primera carga.
- `onPrecioAceptado` (desde el hilo) escribía en el borrador, ponía `estadoItem = 'Cotizado'` y lanzaba un `alert()` bloqueante. Para aprobar había que Deshacer y luego ✓.
- `guardarCambios` reescribía `productos` completo, pudiendo pisar cambios del vendedor o del hilo.
- El botón ⇄ ("Devolver") y "Contraofertar" del hilo eran el mismo concepto en dos lugares.

**DetallePedidoManual.jsx (legado)**
- Tercer camino de confirmación: checkbox "Pedir" + `handleCrearPedido`.
- `pendientes[idx]` no se usaba de forma útil: solo un punto ámbar sin contexto.
- El precio anterior no se mostraba.

**Hilo (legado)**
- Al aceptar, escribía `estadoPropuesta: 'aceptada'` en el mensaje y agregaba `{ tipo: 'aceptacion' }`, fuera del estado del ítem: dos fuentes de verdad.
- No había modales automáticos; lo que se percibía como "popup" era el hilo expandido con sus botones más el `alert()`.

**Ambos**
- Dos `calcularEstadoGlobal` distintos.
- Construcción de correo duplicada (~150 líneas cada uno).
- `alert` / `window.confirm` para todo.

*(Todo esto ya está resuelto por `pedidoManualNegociacionService.js`. Esta sección queda como referencia histórica para quien retome el proyecto.)*

---

## 3. Principios de diseño (no negociables)

1. **Una sola fuente de verdad: el ítem** (`negociacion`), no el último mensaje del hilo.
2. **Guardado por ítem, inmediato y atómico** (transacción, vía el servicio). Nunca reescribir `productos` completo desde estado local de la UI — **en ninguna plataforma, incluida la tarjeta móvil.**
3. **Persistir ≠ notificar.** Las acciones se guardan al instante; el correo y la creación del documento en `pedidos` ocurren al pulsar el botón global.
4. **Cada ítem dice a quién le toca.** Nada de estados ambiguos como "En revisión".
5. **Un solo verbo por acción, en un solo lugar** (la fila/tarjeta del ítem). El hilo no decide.
6. **Sin `alert`, sin `window.confirm` para acciones de ítem** en estas pantallas. Toasts con "Deshacer" / "Reintentar". Para el botón global, una hoja de resumen ligera.
7. **Sin modales para aceptar o contraofertar.** Todo es inline en la fila / tarjeta.
8. **Compatibilidad hacia atrás.** Los documentos existentes deben seguir funcionando sin migración masiva.
9. **`fob` siempre > 0 y sincronizado con la oferta vigente.**
10. **Ninguna pantalla se entrega a medias entre plataformas.** Escritorio y tarjeta móvil de una misma vista se reescriben juntos, en la misma fase.

---

## 4. Modelo de datos

### 4.1 Ítem (`solicitudes/{id}.productos[i]`)

Se **mantienen** todos los campos actuales. Los campos planos `fob`, `fechaCompromiso`, `modalidad` siempre reflejan `negociacion.ofertaVigente`; `fobAnterior`, `tiempoEntregaAnterior`, `modalidadAnterior` reflejan `negociacion.ofertaAnterior`. Se agrega:

```js
negociacion: {
  version: 3,                       // entero; +1 en cada mutación (concurrencia optimista)
  turno: 'compras' | 'vendedor' | null,   // null = resuelto
  resultado: null | 'acordado' | 'denegado' | 'cancelado',
  ronda: 1,                         // +1 cada vez que la oferta cambia de manos
  ofertaVigente: {
    precio: 3.01, tiempoEntrega: '10', modalidad: 'Aéreo',
    autorRol: 'compras' | 'vendedor', autorNombre, autorUid,
    creadaEn: Timestamp.now(),      // ¡NO serverTimestamp() dentro de arreglos!
    mensajeId: 'abc123' | null      // id del doc en mensajes/ que representa esta oferta (null si es legado)
  },
  ofertaAnterior: { /* misma forma */ } | null,
  sinNotificar: true,               // hay un cambio de `ultimoCambio.rol` aún sin notificar
  ultimoCambio: {
    rol, uid, nombre, accion, en: Timestamp.now(),
    estadoPrevio: {
      // snapshot de negociacion previa PARA DESHACER, SIN anidar su propio
      // ultimoCambio (evita crecimiento recursivo del documento).
      // Se elimina por completo (`delete`) al notificar: después de notificar
      // ya no se puede deshacer.
    }
  }
},
pedidoGenerado: false               // true cuando ya se incluyó en un documento de `pedidos`
```

### 4.2 Solicitud (`solicitudes/{id}`)

- `estado` conserva **los mismos strings de hoy** (ver sección 9).
- `resumenNegociacion`, recalculado en cada mutación:

```js
resumenNegociacion: {
  turnoCompras: 2, turnoVendedor: 1, acordados: 3, denegados: 0,
  sinNotificarCompras: 1, sinNotificarVendedor: 0
}
```

- `ultimaNotificacion: { rol, idxs: [...], comentarioGeneral, en }` — snapshot de qué se notificó, para poder reintentar el correo sin recrear pedidos ni recalcular estados.
- `notificacionPendienteEmail: boolean` — true si el correo de la última notificación falló.

### 4.3 Advertencias de Firestore

- **`serverTimestamp()` no funciona dentro de arreglos.** Dentro de `productos[]` usa `Timestamp.now()`. A nivel documento sí puedes usar `serverTimestamp()`.
- Actualizar un elemento de un arreglo obliga a reescribir el arreglo. Se mitiga con `runTransaction`: leer el documento, modificar **solo el índice afectado** y escribir, verificando `negociacion.version`.
- **Todas las lecturas de una transacción ocurren antes que cualquier escritura** (ya verificado en el servicio).

### 4.4 Mensajes (`solicitudes/{id}/mensajes`)

Reutiliza los campos existentes, no se inventaron campos nuevos para el estado de la propuesta:

- `propuesta`: usa **`estadoPropuesta`**. Valores: `'vigente'`, `'aceptada'`, `'contraofertada'`, `'retirada'`.
- `tipo: 'aceptacion'`: **legado**, el render debe seguir soportándolo. El servicio ya no lo crea.
- `tipo: 'evento'`: **nuevo**, para la bitácora (aprobado, denegado, rechazado, deshecho).
- **Transiciones de `estadoPropuesta`** (confirmadas e implementadas en el servicio, Fase 2c):
  - `ajustarItem` / `contraofertarItem`: la propuesta vigente anterior pasa a `'contraofertada'`; se crea una nueva `'vigente'` (con `doc(collection(...))` generado antes de escribir, guardando su id en `ofertaVigente.mensajeId`).
  - `aceptarOferta` / `aprobarItem` (sobre una oferta que vino de una propuesta): esa propuesta pasa a `'aceptada'`.
  - `deshacerUltimoCambio`:
    - si el cambio deshecho fue un ajuste/contraoferta → la propuesta que había nacido pasa a `'retirada'`, y la anterior (que estaba `'contraofertada'`) vuelve a `'vigente'`.
    - si el cambio deshecho fue una aceptación/aprobación → la misma propuesta vuelve de `'aceptada'` a `'vigente'` (**no** se crea una propuesta `'retirada'`; es el mismo mensaje).
    - sobre ofertas sin `mensajeId` (legado, o sin propuesta asociada) → no falla, simplemente no hay mensaje que actualizar.
  - Dentro de una misma transacción, **nunca** hay dos escrituras al mismo documento de mensaje con estados distintos.
- Las propuestas **no se crean desde el hilo**; las crea el servicio, dentro de la misma transacción que la mutación del ítem. El comentario opcional del formulario se guarda como mensaje `texto` asociado.
- Mantener compatibilidad con `sintetizarMensajesLegados` (documentos viejos sin mensajes).

---

## 5. Máquina de estados

```
[Vendedor envía el pedido]
          │
          ▼
  (turno: COMPRAS) ──Aprobar────────────────────► ACORDADO
     │      │  └───Denegar────────────────────► DENEGADO
     │      └──────Ajustar (editar y enviar)──► (turno: VENDEDOR)
     ▲                                              │  ├─Aceptar──► ACORDADO
     └──────────────── Contraofertar ───────────────┘  └─Rechazar─► CANCELADO
```

| Estado en UI | `estadoItem` (legado) | `turno` | `resultado` |
|---|---|---|---|
| Esperando a Compras (inicial) | `Pendiente` | compras | null |
| Esperando al vendedor (Compras ajustó) | `Cotizado` | vendedor | null |
| Esperando a Compras (vendedor contraofertó) | `Pendiente` (ronda > 1) | compras | null |
| Acordado | `Pedido` (`Comprado` = final, equivalente) | null | acordado |
| Denegado | `Denegado` | null | denegado |
| Cancelado (vendedor rechaza el ajuste) | `Cancelado` | null | cancelado |

| Acción | Quién | Condición | Resultado |
|---|---|---|---|
| `aprobarItem` | compras | turno = compras | acordado |
| `ajustarItem(oferta, comentario?)` | compras | turno = compras y oferta ≠ vigente; precio > 0 | turno = vendedor, ronda+1 |
| `denegarItem(motivo?)` | compras | turno = compras | denegado |
| `aceptarOferta` | vendedor | turno = vendedor | acordado |
| `contraofertarItem(oferta, comentario?)` | vendedor | turno = vendedor y oferta ≠ vigente; precio > 0 | turno = compras, ronda+1 |
| `rechazarOferta(motivo)` | vendedor | turno = vendedor | cancelado (motivo obligatorio) |
| `deshacerUltimoCambio` | quien lo hizo | `sinNotificar` y `version` coincide | estado previo (ver 4.4) |

**Guard transversal:** toda mutación, `deshacerUltimoCambio` y `notificarCambios` fallan si `solicitud.tipo !== 'Pedido Manual'` (implementado en Fase 2b). Ninguna acción muta un ítem `Comprado`.

> "Devolver ítem a Compras" (hallazgo de la Fase 3, sección 1.4): pendiente de decidir si necesita una transición propia o si `contraofertarItem` ya lo cubre. Ver Fase 3b, punto 0b.

---

## 6. Capa de servicio

`src/services/pedidoManualNegociacionService.js` — **ya implementado y probado (25 pruebas, Vitest).**

```js
// actor = { uid, nombre, email, rol: 'compras' | 'vendedor' }
aprobarItem({ solicitudId, idx, versionEsperada, actor })
ajustarItem({ solicitudId, idx, versionEsperada, actor, oferta, comentario })
denegarItem({ solicitudId, idx, versionEsperada, actor, motivo })
aceptarOferta({ solicitudId, idx, versionEsperada, actor })
contraofertarItem({ solicitudId, idx, versionEsperada, actor, oferta, comentario })
rechazarOferta({ solicitudId, idx, versionEsperada, actor, motivo })
deshacerUltimoCambio({ solicitudId, idx, versionEsperada, actor })
notificarCambios({ solicitudId, actor, comentarioGeneral })
reenviarCorreoPendiente({ solicitudId, actor })   // solo reenvía el correo, no crea pedidos ni cambia estados

// Puras y testeables
calcularEstadoGlobal(productos)
calcularResumenNegociacion(productos)
derivarNegociacion(item)          // legado → modelo nuevo
```

**Validaciones de oferta:** precio numérico > 0; `tiempoEntrega` no vacío; modalidad ∈ {`Aéreo`, `Marítimo`}.

**Permisos:** mapea los roles de la app (`comprador` → `compras`; vendedor); no ampliar los permisos actuales. En el vendedor conserva `puedeResponder = canGenerarPedido && (!soloPropiasParaPedido || esPropietario)`.

### 6.1 `notificarCambios` y reintento de correo

1. Toma los ítems con `negociacion.sinNotificar && ultimoCambio.rol === actor.rol`. Si no hay ninguno, no hace nada.
2. Si hay ítems con `estadoItem === 'Pedido' && !pedidoGenerado`, crea **un** documento en `pedidos` con el esquema de siempre, marca `pedidoGenerado: true` en la transacción (idempotencia garantizada).
3. Actualiza `solicitudes/{id}`: `estado`, `resumenNegociacion`, `sinNotificar = false` en esos ítems, elimina `estadoPrevio` de esos ítems (ya no se puede deshacer tras notificar), y guarda `ultimaNotificacion` (para poder reintentar el correo).
4. **Después** del commit, envía el correo. Se comprueba `response.ok` (un `fetch` con 4xx/5xx no lanza excepción por sí solo). Si falla (red o `!ok`), se hace `await` de un `updateDoc` que marca `notificacionPendienteEmail: true`, y se propaga el error a la UI para el toast "Reintentar".
5. `reenviarCorreoPendiente({ solicitudId, actor })`: solo actúa si `notificacionPendienteEmail === true`; reconstruye el correo desde `ultimaNotificacion`, lo envía (comprobando `res.ok`) y, si sale bien, pone `notificacionPendienteEmail: false`. **No** crea pedidos ni cambia estados.
6. Constructor de correo único: `construirCorreoActualizacion({ pedido, items, mensajes, rol, comentarioGeneral })` en `src/utils/emailNegociacion.js`. Destinatarios:
   - Compras → `vendedorEmail`, cc `compras@hermaco.net`
   - Vendedor → `emailConfig.pedidoGenerado?.to || ['compras@hermaco.net']`
   - En `localhost` se redirige a `rvides@hermaco.net`, incluidos los reintentos.

### 6.2 Guard para consumidores externos (Fase 3b)

Crear `itemPedidoConfirmado(item)` en `src/utils/` (función pura, con pruebas):

```js
function itemPedidoConfirmado(item) {
  const esFinal = item.estadoItem === 'Pedido' || item.estadoItem === 'Comprado';
  const esLegado = !item.negociacion;               // documento sin el modelo nuevo
  return esFinal && (esLegado || item.pedidoGenerado === true);
}
```

**Motivo:** en el modelo nuevo, un ítem queda `estadoItem: 'Pedido'` en cuanto se acuerda, pero sigue siendo deshacible hasta que `notificarCambios` lo incluya en un documento de `pedidos` (`pedidoGenerado: true`). `ConsolidarCompras.jsx` y `DashboardPedidos.jsx` tratan hoy cualquier `Pedido`/`Comprado` como confirmado y lo procesan (asignan `idOC`, `numOC`, lo pasan a `Comprado`). Si lo hacen en esa ventana intermedia, rompen el Deshacer y `notificarCambios` nunca generará su pedido (porque ya no lo encontrará con `pedidoGenerado !== true`, pero tampoco existirá el documento en `pedidos`).

Aplicar `itemPedidoConfirmado` en ambos archivos donde hoy se filtra por `estadoItem`. Documentos legados (sin `negociacion`) se comportan igual que hoy.

### 6.3 Pruebas (Vitest)

25 pruebas al cierre de la Fase 3, cubriendo: derivación desde legado, `calcularEstadoGlobal`, `calcularResumenNegociacion`, guard de `tipo`, inmutabilidad de `Comprado`, validación de precio, `ConflictoVersionError`, transiciones de `estadoPropuesta` (ajustar, aceptar), los tres casos de `deshacerUltimoCambio`, no anidamiento de `estadoPrevio`, no duplicación en `notificarCambios`, y los tres casos de `reenviarCorreoPendiente`. **Pendiente (Fase 3b):** transiciones de `estadoPropuesta` para `contraofertarItem`, `aprobarItem` sobre una propuesta, `rechazarOferta`, `denegarItem`; y pruebas de `itemPedidoConfirmado`.

---

## 7. Especificación de UI

### 7.1 Componentes compartidos — **ya implementados (Fase 3)**

`src/components/pedidos/negociacion/{EstadoItemChip,OfertaDiff,FormularioOferta,ResumenTurnos,BarraNotificar}.jsx` y `src/hooks/useNegociacionItems.js`.

**Pendiente de validar (Fase 3b) antes de usarlos en las vistas reales:**
- Vista previa en desarrollo (`/dev/negociacion`, solo `import.meta.env.DEV`) con todos los estados de cada componente, sin tocar Firestore.
- Autorrevisión del hook: no muta el snapshot; `versionEsperada` sale siempre del servidor; el `onSnapshot` se cancela al desmontar; el contador de "sin notificar" cuenta solo cambios del rol del actor; toda escritura pasa por el servicio; manejo de `ConflictoVersionError` y de borrador sucio ante cambio remoto; accesibilidad del Toast (incluida pausa al hover/foco y limpieza de timers).

### 7.1.1 Toast — **ya implementado (Fase 3)**

`src/components/ui/Toast.jsx`, montado en `src/App.jsx` envolviendo `<Router>`. Variantes éxito/error/info, apilable, `aria-live="polite"`, botón de acción ("Deshacer", "Reintentar"), pausa al hover/foco.

### 7.1.2 Reglas transversales

- Reutiliza los tokens visuales existentes (Tailwind: `rounded-3xl`, `font-black uppercase tracking-*`, cabecera oscura de tabla, esmeralda = acordado, ámbar = atención, rosa = denegado). **No inventes una paleta nueva.**
- El `onSnapshot` **siempre** actualiza los ítems del servidor. Los inputs en edición viven en un `borradores[idx]` **separado** y nunca mutan el estado del snapshot.
- Si llega un cambio remoto sobre un ítem con borrador sucio, muestra "Este ítem cambió mientras editabas" y deshabilita "Enviar ajuste" hasta que el usuario descarte o reaplique.

### 7.2 Vista de Compras — **Fase 4 (escritorio + móvil juntos)**

**`RevisionPedidoManual.jsx` (escritorio):**

Encabezado: mismo título y correlativo/cliente + `ResumenTurnos`. Se mantienen "Detalles del vendedor" y "Tus comentarios" (ahora "Comentario general para el vendedor", se incluye en el correo), más compactos.

Columnas: **Descripción + marca** (unidas) · Cant · Precio (Venta OC) · Entrega · Modalidad · Estado · Acción · Mensajes.

| Situación del ítem | Qué muestra la fila | Acciones |
|---|---|---|
| Turno de Compras | Inputs editables, precargados con la oferta vigente. Si el vendedor contraofertó, una línea comparativa | Sin cambios: **[Aprobar]** (primaria) y **[Denegar]**. Con cambios: **[Enviar ajuste]** y **[Descartar]** |
| Turno del vendedor | Solo lectura con `OfertaDiff`; chip "Esperando al vendedor" | "Deshacer" si `sinNotificar` y es mío |
| Acordado / Denegado / Cancelado | Solo lectura, fila tintada, chip de resultado | "Deshacer" si `sinNotificar` y es mío |

- **Editar = ajustar.** Sin botón ⇄. Botones con **texto**, no solo ícono.
- Si el usuario edita los inputs, "Aprobar" desaparece.
- Barra inferior (`BarraNotificar`): **"Notificar al vendedor (N)"**. N = cambios propios sin notificar. N = 0 → deshabilitado, "Sin cambios por notificar". Al pulsarlo, hoja de resumen (reemplaza `window.confirm`). Toast de fallo de correo conectado a `reenviarCorreoPendiente`.
- Se elimina `todosAprobadosOriginal`. Si **todos** los ítems están finales y notificados, mostrar "Pedido finalizado".
- Aviso no bloqueante si hay cambios sin notificar al salir de la pantalla.
- Se elimina `onPrecioAceptado` y su `alert()`.

**`RevisionPedidoMobileCard.jsx` (móvil, misma fase):**
- Usa `useNegociacionItems`, los componentes de `negociacion/` y el Toast — **no** `handleFieldChange` ni `guardarCambios`.
- Mismas acciones que la versión de escritorio, en formato tarjeta: primaria a ancho completo, secundarias debajo, objetivos táctiles ≥ 44 px.
- El formulario de ajuste se expande dentro de la tarjeta (no modal).
- `StickyActionBar` para "Notificar al vendedor (N)", respetando el safe-area inferior.

### 7.3 Vista del vendedor — **Fase 5 (escritorio + móvil juntos)**

**`DetallePedidoManual.jsx` (escritorio):**
- Se elimina la columna "Pedir", "Confirmar ítems devueltos" y `handleCrearPedido`.
- Columnas: **Descripción + marca** · Cant · Entrega · Precio (OC) · Subtotal · Modalidad · Estado · Acción · Mensajes.
- `OfertaDiff` para precio, entrega y modalidad. Se elimina el punto ámbar pulsante.
- Banner superior si hay ítems en turno del vendedor: "N ítems esperan tu respuesta · [Ver]".

| Situación | Acciones (solo si `puedeResponder`) |
|---|---|
| Turno del vendedor | **[Aceptar $3.01]** (primaria, un clic, toast "Ajuste aceptado · Deshacer") · **[Contraofertar]** · **[Rechazar]** (pide motivo) |
| Turno de Compras | Chip "Esperando a Compras". Sin acciones. "Deshacer" si es mío y sin notificar |
| Acordado / Denegado / Cancelado | Solo lectura |

- **Contraofertar** expande una fila con `FormularioOferta` precargado. **[Enviar contraoferta]** / **[Cancelar]**. Foco al primer campo; `Esc` cancela, `Enter` envía.
- Barra inferior: **"Confirmar y notificar a Compras (N)"**, visible solo si N > 0.
- Usuarios sin `puedeResponder` ven solo lectura.

**`DetallePedidoMobileCard.jsx` (móvil, misma fase):**
- Mismas reglas que 7.2 para la tarjeta de Compras, adaptadas a las acciones del vendedor.
- El formulario de contraoferta se expande dentro de la tarjeta.

### 7.4 Accesibilidad transversal

Ver sección 13.

---

## 8. El hilo de mensajes (`HiloComentariosItem` / `useHiloItem`)

### 8.1 Modo solo lectura — **ya implementado (Fase 3)**

`accionesHabilitadas` (default `true`). En `false`: sin botones Aceptar / Contraofertar / "Devolver ítem a Compras", sin crear propuestas. Se mantiene el compositor de texto y el contador de no leídos. Las Fases 4 y 5 lo usan en `false` desde el inicio.

### 8.2 Limpieza final — **Fase 6**

- Quitar el código muerto: botones y lógica de aceptar / contraofertar / devolver, creación de propuestas, `onPrecioAceptado`. `useHiloItem` queda solo para leer y enviar texto.
- Render: `texto` (burbujas), `propuesta` (tarjeta de solo lectura con insignia derivada de `estadoPropuesta`), `aceptacion` (legado) y `evento` (nuevo): línea compacta.
- Encabezado con turno y ronda ("Turno: Vendedor · Ronda 2").
- Si es mi turno, pista no accionable: "Responde desde la fila del ítem".
- El hilo **nunca se abre solo**; solo con el botón "Mensajes".

---

## 9. Estado global (`calcularEstadoGlobal`)

Ya implementado. Conserva los strings actuales de `estado`. `Comprado` cuenta igual que `Pedido`.

| Condición | `estado` |
|---|---|
| Todos resueltos y todos denegados/cancelados | `Denegado` |
| Todos resueltos y al menos uno acordado | `Pedido` |
| No todos resueltos y al menos uno acordado | `Pedido Parcial` |
| Ninguno acordado y algún ítem en turno del vendedor | `Cotizado Parcial` |
| Resto | `Enviado a Compras` |

**Pendiente (Fase 8):** confirmar contra `DashboardCompras.jsx` (`tieneItemsPendientesPorCotizar`) que una solicitud con `resumenNegociacion.turnoCompras > 0` siga apareciendo en la cola de Compras, y una con `turnoVendedor > 0` en la del vendedor.

---

## 10. Compatibilidad con datos y pantallas existentes

### 10.1 Coexistencia con `DetalleRFQVendedor.jsx` — **resuelto (Fase 2c)**

- Discriminador confirmado: `solicitud.tipo === 'Pedido Manual'`.
- Enrutamiento: los dashboards montan `DetallePedidoManual` vía la ruta `/vendedor/pedido-manual/:id` (confirmada existente en `App.jsx`).
- `DetalleRFQVendedor.jsx` solo podía recibir un Pedido Manual por URL directa a la ruta antigua (`/vendedor/detalle/:id`). Ya blindado: dentro de su `onSnapshot`, si `data.tipo === 'Pedido Manual'`, hace `navigate('/vendedor/pedido-manual/' + id, { replace: true })` y corta.
- Las comprobaciones legadas `rfq?.tipo === 'Pedido Manual'` en ese archivo (~líneas 765, 801, 817) son código muerto; confirmado, fuera de alcance.

### 10.2 Datos legados

Sin migración masiva. `derivarNegociacion(item)`:

| `estadoItem` legado | `turno` | `resultado` |
|---|---|---|
| `Pendiente` | compras | null |
| `Cotizado` | vendedor | null |
| `Pedido`, `Comprado` | null | acordado |
| `Denegado` | null | denegado |
| `Cancelado`, `Rechazado` | null | cancelado |

- Oferta inicial derivada de `fob`, `fechaCompromiso`, `modalidad`, con `autorRol: 'vendedor'`; oferta anterior derivada de `fobAnterior`, `tiempoEntregaAnterior`, `modalidadAnterior` si existen. `mensajeId: null`.
- `version` arranca en 0.
- Ítems `Pedido`/`Comprado` sin `pedidoGenerado` en documentos viejos: tratados como ya generados vía `itemPedidoConfirmado` (sección 6.2), para no duplicar pedidos.

### 10.3 Otros consumidores de `productos`

Además de `DetalleRFQVendedor` (resuelto), se identificaron en la Fase 3b: `ConsolidarCompras.jsx` y `DashboardPedidos.jsx` (ver 6.2, guard `itemPedidoConfirmado`). El diseño conserva la semántica de `estadoItem`, así que en principio no requieren más cambios; ajustar en Fase 8 solo si se demuestra ruptura.

---

## 11. Casos borde

- **Acción simultánea** de ambos roles → `ConflictoVersionError` → toast "Este ítem cambió, revisa" y refresco desde el snapshot.
- **Borrador sucio + cambio remoto** → ver 7.1.2.
- **Ajuste sin cambios reales** → no permitido.
- **Validaciones** → sección 6.
- **Correo falla** → no se pierde el cambio; `notificacionPendienteEmail: true`; reintentable con `reenviarCorreoPendiente` sin duplicar nada.
- **Doble clic en Notificar** → `pedidoGenerado` y la transacción garantizan idempotencia.
- **Sin ítems en turno propio** → "Tu turno (0)", filtro cae a "Todos".
- **Ítem denegado** con motivo opcional → aparece como evento.
- **Ítem `Comprado`** → solo lectura, nunca mutado.
- **Consumidor externo mira un ítem `Pedido` no notificado** → no lo trata como confirmado (`itemPedidoConfirmado`).

---

## 12. Microcopy (español)

| Contexto | Texto |
|---|---|
| Chips de turno | `Tu turno` · `Esperando a Compras` · `Esperando al vendedor` · `Acordado` · `Denegado` · `Cancelado` |
| Acciones Compras | `Aprobar` · `Enviar ajuste` · `Descartar` · `Denegar` · `Deshacer` |
| Acciones vendedor | `Aceptar $X.XX` · `Contraofertar` · `Enviar contraoferta` · `Rechazar` · `Cancelar` |
| Botón global Compras | `Notificar al vendedor (N)` / `Sin cambios por notificar` |
| Botón global vendedor | `Confirmar y notificar a Compras (N)` |
| Banner | `N ítems esperan tu respuesta` |
| Toasts | `Ajuste aceptado · Deshacer` · `Ítem aprobado · Deshacer` · `Este ítem cambió, revisa` · `No se pudo enviar el correo · Reintentar` |
| Pedido cerrado | `Pedido finalizado` |

---

## 13. Accesibilidad

- Botones con texto visible; estados nunca solo por color (ícono + texto).
- Toasts en `aria-live="polite"`, con pausa al hover/foco, timers limpiados al desmontar.
- Foco al expandir el formulario de contraoferta/ajuste; devolución de foco al cerrarlo.
- Botones de fila con `aria-label` que incluya el ítem.
- `aria-expanded` en el botón "Mensajes".
- Objetivos táctiles ≥ 44 px en móvil.

---

## 14. Plan de trabajo por fases

Cada fase termina con un resumen (sección 17) y **espera aprobación explícita antes de continuar.** Cada fase debe compilar y no romper las demás pantallas.

| Fase | Contenido | Estado |
|---|---|---|
| **1. Inventario** | Lectura de archivos, grep de consumidores | ✅ Completada |
| **2. Servicio + modelo** | `pedidoManualNegociacionService.js`, correo unificado, pruebas iniciales | ✅ Completada |
| **2b. Verificación del servicio** | Vitest instalado, guard de `tipo`, autorrevisión de invariantes, blindaje inicial de `DetalleRFQVendedor` | ✅ Completada |
| **2c. Correcciones del servicio** | `estadoPropuesta` con `mensajeId`, `estadoPrevio` sin anidar, manejo de `response.ok` en correo, guard final de `DetalleRFQVendedor` (redirect) | ✅ Completada |
| **3. Componentes compartidos** | Toast + provider, componentes de negociación, hook, modo solo lectura del hilo | ✅ Completada |
| **3b. Blindaje y verificación previa** | `itemPedidoConfirmado` en `ConsolidarCompras`/`DashboardPedidos`; investigar "Devolver ítem a Compras"; vista previa `/dev/negociacion`; pruebas de transiciones faltantes; autorrevisión del hook y del Toast | **Siguiente** |
| **4. Vista de Compras (escritorio + móvil)** | Sección 7.2 completa: `RevisionPedidoManual.jsx` **y** `RevisionPedidoMobileCard.jsx` | Pendiente |
| **5. Vista del vendedor (escritorio + móvil)** | Sección 7.3 completa: `DetallePedidoManual.jsx` **y** `DetallePedidoMobileCard.jsx` | Pendiente |
| **6. Hilo (limpieza)** | Sección 8.2 | Pendiente |
| **7. Listas y consumidores** | Badges "Requiere tu acción"; ajustes en `DashboardCompras`/`DashboardPedidos` solo si se demuestra ruptura | Pendiente |
| **8. QA** | Sección 15 | Pendiente |

*(La fase que en la v2 era "7. Móvil" ya no existe como fase separada: cada tarjeta móvil se entrega junto con su pantalla de escritorio, en las Fases 4 y 5. Las fases "Listas y consumidores" y "QA" se renumeraron.)*

---

## 15. Criterios de aceptación

**Flujo**
- [ ] Compras aprueba sin editar: *Acordado* al instante; vendedor lo ve en tiempo real; botón global pasa a `Notificar al vendedor (1)`.
- [ ] Compras ajusta y envía: *Esperando al vendedor*; vendedor ve `anterior → nuevo` y las tres acciones.
- [ ] El vendedor acepta: *Acordado* sin pasos extra, sin `alert`, sin invalidar el botón global de nadie.
- [ ] El vendedor contraoferta: vuelve a *Tu turno* de Compras con la línea comparativa.
- [ ] *Deshacer* funciona solo mientras no se haya notificado y la contraparte no haya actuado; funciona igual tras aceptar que tras ajustar/contraofertar.
- [ ] `Notificar` crea **un** documento en `pedidos`, envía **un** correo, y no duplica al pulsarse dos veces.
- [ ] Un fallo de correo se puede reintentar sin duplicar el pedido ni recrear estados.
- [ ] Un mensaje de texto en el hilo nunca cambia el estado del ítem.
- [ ] Notificar nunca pisa cambios de otros ítems (prueba con dos navegadores).
- [ ] Los ítems `Comprado` nunca se modifican.
- [ ] Un ítem `Pedido` no notificado no es tratado como confirmado por `ConsolidarCompras` ni `DashboardPedidos`.
- [ ] Escritorio y móvil de una misma pantalla usan el mismo camino de escritura (el servicio); ninguno reescribe `productos` completo.

**UI/UX**
- [ ] El hilo no tiene botones de decisión ni crea propuestas; ningún `alert`/`window.confirm` en acciones de ítem de estas pantallas.
- [ ] Cada fila/tarjeta muestra un chip de turno y las acciones correctas para el rol.
- [ ] El vendedor ve siempre el valor anterior tachado cuando hubo ajuste.
- [ ] Banner y filtro "Tu turno" funcionan; el hilo no se abre solo.
- [ ] Móvil: objetivos táctiles ≥ 44 px, formulario inline dentro de la tarjeta, sin handlers legados.
- [ ] Mismos tokens de diseño que el resto del sistema.
- [ ] Toast accesible.

**Compatibilidad**
- [ ] Documentos antiguos se abren y comportan correctamente; mensajes `aceptacion` se siguen mostrando.
- [ ] Los strings de `estado` no cambian; las listas siguen mostrando cada solicitud en la cola correcta.
- [ ] `DetalleRFQVendedor` no procesa documentos con `negociacion` ni duplica pedidos.
- [ ] `fob` nunca queda en 0/vacío.
- [ ] Correos con el mismo aspecto y destinatarios que hoy.

---

## 16. Fuera de alcance

- Migrar `productos[]` a subcolección.
- Reemplazar `alert`/`confirm` en el resto del proyecto.
- Rediseño de otras pantallas o cambio de paleta.
- Cambios de autenticación o de reglas de Firestore (ya diagnosticadas en 1: son permisivas y no bloquean nada; endurecerlas queda fuera de alcance salvo pedido explícito).
- Auto-notificación por inactividad.
- Borrar el código legado muerto de `DetalleRFQVendedor` (líneas ~765, 801, 817): confirmado inofensivo, no se toca.

---

## 17. Formato de entrega esperado

- Archivos **completos** (no diffs ni fragmentos), con la ruta de cada uno.
- Al final de cada fase: qué se creó / modificó / eliminó, discrepancias con este documento, decisiones tomadas donde el documento no era explícito, consumidores externos tocados o a revisar, salida real de las pruebas, y **qué debo verificar yo antes de la siguiente fase.**
- Si algo es ambiguo y el código no lo aclara, preguntar antes de decidir.
