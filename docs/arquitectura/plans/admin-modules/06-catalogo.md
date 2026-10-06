# 06 — Catálogo, disponibilidad e importación

**Módulo:** Catálogo (+ disponibilidad + importación) · **Bloque:** Negocio ·
**Rutas:** `/catalogo`, `/catalogo/:id`, `/catalogo/disponibilidad`, `/catalogo/importar`.
**Prioridad:** MVP (RF-R5-10, RF-R5-11), V1 (RF-R5-12…14), V2 (RF-R5-15).

Fuentes: [plan 05 §6.9](../front/05-plan-panel-administracion.md),
[R5 §4.2, §7 y §13](../../requerimientos/05-panel-administracion.md) y
[esquema 02](../../esquema/02-catalogo-salon-reservas.md); convenciones en [00-indice.md](./00-indice.md).
Ante conflicto, manda R5.

## 1. Contexto y alcance

Resuelve la carta completa: categorías y productos con precios por sede e impuestos, fotos,
alérgenos y modificadores (RF-R5-10); disponibilidad por sede y franja con agotados (RF-R5-11);
importación/exportación CSV (RF-R5-12); historial de precios (RF-R5-13); destacados y menú del
día (RF-R5-14); y programación de vigencia (RF-R5-15, V2).

**MVP:** CRUD de categorías/productos, precios append-only, fotos, alérgenos, modificadores,
disponibilidad y agotados con propagación a **web, APK y KDS** (origen y vigencia visibles).
**V1:** importador/exportador CSV con validación por fila, historial de precios y
destacados/recomendados/menú del día. **V2:** vigencia programada, sin intervención manual.

**Fuera de alcance:** horarios, cierres y festivos (módulo 19), SLA (07), cupones y campañas (08),
ejecución de comandas/impresión (04) y edición de pedidos ya creados (02; RN-R5-04 los congela).

**Supuestos (a confirmar en §11):**
- Catálogo por tenant; precio y disponibilidad por sede (lo que modela el esquema). Fotos en
  almacenamiento S3-compatible con URL pública en `producto_foto.url`.
- «Recomendado» y «menú del día» se modelan con `producto.etiquetas`; «destacado» con
  `producto.destacado` y `promocion.tipo='destacado'`.
- Cambiar precios exige `catalogo.precios` (R5 §14 #5: el gerente no cambia precios directamente).

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio de aceptación (R5) |
|---|---|---|---|
| RF-R5-10 | CRUD de categorías y productos: precios, impuestos, fotos, alérgenos y modificadores | MVP | Un cambio se refleja en las interfaces según vigencia |
| RF-R5-11 | Disponibilidad por sede y horario; agotados y reactivación | MVP | El agotado se propaga a web, APK y KDS |
| RF-R5-12 | Importación y exportación masiva del catálogo (CSV) | V1 | Un archivo inválido se rechaza con detalle |
| RF-R5-13 | Historial de cambios de precio y de catálogo | V1 | Queda quién, cuándo y el valor anterior |
| RF-R5-14 | Destacados, recomendados y menú del día | V1 | Se controla desde el panel |
| RF-R5-15 | Programación de vigencia de cambios (precio y disponibilidad) | V2 | El cambio entra en vigor sin intervención manual |

Reglas y no funcionales aplicables: **RN-R5-04** (snapshot: no altera pedidos/reservas creados),
**RN-R5-06** (precios: permiso + motivo + autorización), **RN-R5-10** (exportaciones con registro),
**RNF-R5-01** (alcance por sucursal), **RNF-R5-04** (exportación grande en segundo plano con aviso)
y **RNF-R5-08** (zona y formatos de la sede).

## 3. Rutas y pantallas

| Ruta | Pantalla | Acciones principales |
|---|---|---|
| `/catalogo` | Carta (árbol + tabla) | Buscar/filtrar, crear categoría/producto, reordenar con drag, duplicar, activar/desactivar, exportar |
| `/catalogo/:id` | Ficha de producto | Asistente por pasos, publicar cambios, historial de precios, fotos |
| `/catalogo/disponibilidad` | Grid de disponibilidad | Agotar/reactivar por producto-sede-franja, ver origen y vigencia, acciones masivas |
| `/catalogo/importar` | Importador/exportador | Subir CSV, mapear, validar fila a fila, confirmar y descargar resultado; exportar |

**Árbol de menú (sidebar):**

```text
Negocio
└─ Catálogo                    /catalogo
   ├─ Disponibilidad           /catalogo/disponibilidad
   └─ Importar / exportar      /catalogo/importar
```

**Árbol interno de `/catalogo` (`MenuTree`, plan 05 §6.9):** categorías en orden (`categoria.orden`)
con drag & drop y productos con `StatusBadge` (activo/inactivo, agotado) y acciones «Nuevo»,
«Duplicar», «Agotar»; la tabla de la derecha respeta el nodo y sus filtros viven en la URL.

**Ficha del producto (`ProductForm` por pasos, RF-R5-10):**

1. **Datos** — nombre, descripción, categoría, SKU/código de barras, etiquetas y activo.
2. **Precios e impuestos** — precio por sede (`vigente_desde`), impuesto (`tasa_bps`, `tipo`) y `tiempo_objetivo_seg`.
3. **Modificadores** — grupos (`minimo`, `maximo`, `obligatorio`) por producto o categoría y opciones con sobreprecio.
4. **Alérgenos y dietas** — multiselección de `alergeno`; se refleja en la carta y los canales.
5. **Fotos** — subida con guía de encuadre, orden, texto alternativo y previsualización.
6. **Estación** — `producto.estacion_id`; sin estación se avisa «no genera comanda» (RF-R5-30) y se guarda solo con confirmación.

**Grid de disponibilidad (`AvailabilityGrid`):** filas = producto, columnas = sede × franja
(desayuno/comida/cena/todo el día); cada celda muestra estado, `agotado_origen` («Cocina ·
parrilla», «Salón», «Panel») y `actualizado_en`. Acciones: agotar, reactivar, programar (V2) y
operaciones masivas por selección o por filtro.

**Importador CSV (`CsvImporter`, RF-R5-12):** pasos subir → mapear columnas → vista previa con
validación por fila → confirmar → resultado. Un archivo inválido se **rechaza con detalle**
(fila, columna, motivo) y sin aplicar cambios; el resultado descargable incluye filas aceptadas,
rechazadas y resumen. La exportación deja registro en `exportacion` (RN-R5-10).

## 4. Datos

Tablas del [esquema 02](../../esquema/02-catalogo-salon-reservas.md) y referencias del
[01](../../esquema/01-nucleo.md):

| Tabla | Uso | Notas |
|---|---|---|
| `categoria` | Árbol de la carta | `orden` para drag; `activa`; por tenant |
| `producto` | Producto base | `impuesto_id`, `estacion_id` (NULL = sin comanda), `etiquetas`, `destacado` |
| `producto_precio` | Precio por sede | Append-only: nueva fila con `vigente_desde`; unique `(producto_id, sucursal_id, vigente_desde)` |
| `producto_foto` | Fotos | `orden` y `texto_alt`; la primera es la principal |
| `alergeno` / `producto_alergeno` | Alérgenos | N:M; catálogo de alérgenos es dato maestro |
| `grupo_modificador` / `modificador` | Modificadores | El grupo cuelga de producto **o** de categoría (check XOR) |
| `disponibilidad_producto` | Disponibilidad y agotados | `franja` (NULL = todo el día); `agotado_origen ∈ cocina/salon/backoffice`; `actualizado_en` es la vigencia |
| `impuesto` | Impuestos | `tasa_bps`, `tipo ∈ incluido/adicionado/inc` |
| `estacion` / `regla_sla` | Destino de comanda y SLA por producto | Solo se referencian; se administran en el módulo 07 |
| `promocion` | Destacados/banners | `tipo='destacado'` con vigencia `desde`/`hasta` |
| `exportacion` | Registro de exportaciones | `usuario_id`, `tipo`, `filtros`, `formato`, `estado` |
| `evento_auditoria` | Trazabilidad | Antes/después de precios y catálogo (§7) |

**Snapshot (RN-R5-04):** pedidos y reservas guardan su propia copia de nombre/precio; este módulo
nunca reescribe filas históricas. Cambiar `producto_precio` o `disponibilidad_producto` solo
afecta a partir de su vigencia, y los carritos abiertos se recalculan antes de confirmar.

## 5. API propuesta

REST bajo `/admin/catalogo` (convenciones de [00-indice.md](./00-indice.md) §4.1):

| Método y ruta | Propósito |
|---|---|
| `GET/POST /admin/catalogo/categorias` · `PATCH/DELETE /:id` · `PATCH /categorias/orden` | CRUD de categorías (DELETE desactiva si tiene productos) y reorden del árbol |
| `GET/POST /admin/catalogo/productos` | Lista paginada con filtros (sede, categoría, activo, agotado, etiqueta, texto) y alta |
| `GET/PATCH /admin/catalogo/productos/:id` | Detalle completo y edición (409 ante conflicto, §8) |
| `POST /admin/catalogo/productos/:id/duplicar` | Duplicar producto sin arrastrar historial de precios |
| `GET/POST /admin/catalogo/productos/:id/precios` | Precio por sede e historial; alta con `vigente_desde` (sensible: exige `motivo`) |
| `GET /admin/catalogo/alergenos` · `PUT /admin/catalogo/productos/:id/alergenos` | Catálogo y asignación de alérgenos |
| `GET/POST/PATCH/DELETE /admin/catalogo/productos/:id/modificadores…` | Grupos y opciones (también por categoría) |
| `POST /admin/catalogo/productos/:id/fotos` · `PATCH/DELETE /fotos/:fotoId` | Subida/orden/borrado de fotos (URL firmada) |
| `GET /admin/catalogo/disponibilidad` | Grid por sede/franja con estado, origen y vigencia |
| `PATCH /admin/catalogo/disponibilidad` | Actualización masiva `{productoIds[], sucursalId, franja, agotado}` |
| `POST /admin/catalogo/disponibilidad/agotar` · `/reactivar` | Acciones individuales con `motivo` y origen `backoffice` |
| `POST /admin/catalogo/importaciones` (multipart) · `GET /:id` | Subir CSV y consultar estado y detalle por fila |
| `POST /admin/catalogo/exportaciones` · `GET /admin/catalogo/exportaciones/:id` | Crear (registro en `exportacion`; segundo plano si es grande) y consultar |
| `PATCH /admin/catalogo/productos/:id/destacado` | Destacados/recomendados/menú del día (V1) |
| `POST /admin/catalogo/productos/:id/programaciones` | Programar precio/disponibilidad (V2) |

**Eventos Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}` y tenant): `catalogo.actualizado`
(alta/edición/baja), `catalogo.precio` (valor anterior y vigencia), `catalogo.agotado` y
`catalogo.reactivado` (origen y vigencia) y `catalogo.importacion` (pendiente/listo/fallido).

## 6. Frontend

- **Compartidos:** `DataTable`, `FilterBar`, `SavedViewChip`, `DetailDrawer`, `StatusBadge`,
  `MoneyCell`, `ConfirmDialog`, `ReasonSelect`, `EmptyState`, `Skeleton`, `ErrorState`,
  `BeforeAfterDiff`, `Timeline`.
- **Propios:** `MenuTree` (drag & drop; Supuesto: `@dnd-kit`), `ProductForm` (pasos con
  `react-hook-form` y guardia de cambios), `PriceHistoryTable`, `AvailabilityGrid` y `CsvImporter`.
- **Interacciones clave:** borrador conservado al cambiar de paso; conflicto 409 → `BeforeAfterDiff`
  y «Recargar y reintentar» (**gana lo confirmado por el servidor**); reorden optimista con rollback;
  disponibilidad masiva por selección; importación por pasos con detalle descargable; exportación
  asíncrona con aviso (RNF-R5-04).

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `catalogo.ver` | Rutas, listas y detalle en modo lectura |
| `catalogo.editar` | Categorías, productos, fotos, alérgenos y modificadores |
| `catalogo.precios` | Ver y cambiar precios (sensible: motivo + autorización, RN-R5-06) |
| `catalogo.disponibilidad` | Agotar/reactivar y programar disponibilidad |
| `catalogo.importar` / `catalogo.exportar` | CSV de entrada y salida (RN-R5-10) |
| `catalogo.destacados` | Destacados, recomendados y menú del día (V1) |

**Se audita en `evento_auditoria`** (RN-R5-01): alta/edición/baja de producto y categoría; cambio
de precio (antes/después, `motivo`, `vigente_desde`); cambios de modificadores y alérgenos;
agotado/reactivación manual (origen `backoffice`); importaciones (archivo, resumen y errores) y
exportaciones (quién y con qué filtros). El historial de precios del detalle se alimenta de
`producto_precio` + `evento_auditoria`. La auditoría es inmutable (RN-R5-02).

## 8. Estados y casos borde

- **Vacío/cargando/error/sin permisos:** cada vista lo explica y ofrece acción primaria; sin
  `catalogo.ver` el sidebar va deshabilitado y cada acción lleva tooltip «Requiere permiso de {permiso}» (plan 05 §6.23).
- **Dos administradores editan el mismo producto (R5 §13):** el servidor responde **409** con la
  versión vigente; se avisa el conflicto y gana lo confirmado por el servidor, sin fusión silenciosa.
- **Cambio de precio con carritos abiertos:** la web/APK recalculan el carrito antes de confirmar;
  los pedidos ya creados **no cambian** (snapshot RN-R5-04).
- **Producto sin estación:** se permite guardar con confirmación y aviso «no genera comanda».
- **CSV inválido:** rechazo con detalle por fila/columna/motivo; las filas válidas solo se aplican si se acepta el resumen.
- **Exportación muy grande:** se limita, pasa a segundo plano (`exportacion.estado`) con aviso al
  solicitante; nunca bloquea la operación.
- **Zona horaria distinta:** vigencias y `actualizado_en` se muestran en la zona de la sede.
- **Tiempo objetivo/SLA mal configurado:** el asistente avisa si `tiempo_objetivo_seg` queda fuera
  de rango (referencia módulo 07).

## 9. Criterios de aceptación

| # | Criterio verificable |
|---|---|
| 1 | Editar un producto completo y verlo reflejado en web/APK/KDS según vigencia (RF-R5-10) |
| 2 | Agotar en el grid: web, APK y KDS lo reflejan con **origen** y **vigencia**; reactivar lo restablece (RF-R5-11) |
| 3 | CSV con filas inválidas: **rechazo con detalle** (fila, columna, motivo) y cero cambios aplicados (RF-R5-12) |
| 4 | Exportar deja registro en `exportacion` (quién, filtros, formato, estado); volumen alto → segundo plano con aviso (RN-R5-10, RNF-R5-04) |
| 5 | El historial de precios muestra **quién, cuándo y valor anterior**, y un pedido previo conserva su precio (RN-R5-04) |
| 6 | Destacar/recomendar un producto se refleja en la carta pública (RF-R5-14) |
| 7 | Dos sesiones editando el mismo producto: aviso de conflicto y prevalece lo confirmado por el servidor (R5 §13) |
| 8 | Sin `catalogo.precios` no se cambian precios y se explica el motivo (RN-R5-06) |

## 10. Plan de trabajo

- [ ] **F1 — API/datos:** DTOs y validaciones; CRUD de categorías/productos/precios/fotos/
      modificadores/alérgenos; reglas (XOR, unique de disponibilidad, precios append-only);
      auditoría con `motivo`; filtros, paginación y 409; contrato de snapshot.
- [ ] **F2 — Lectura/lista:** `modules/catalogo` (api/pages/components/types); ruta lazy y guard
      de permiso; `MenuTree` + tabla con filtros en URL y `SavedView`; estados explicados.
- [ ] **F3 — Detalle/acciones:** `ProductForm` por pasos con validaciones y aviso de estación;
      `PriceHistoryTable`; fotos; modificadores; conflicto de edición.
- [ ] **F4 — Masivo/en vivo:** `AvailabilityGrid` con eventos `catalogo.*`; CSV de entrada/salida;
      destacados (V1); programación de vigencia (V2).
- [ ] **F5 — Pruebas:** e2e RF-R5-10…14; snapshot RN-R5-04; propagación a web/APK/KDS;
      exportación en segundo plano; accesibilidad AA y teclado.

## 11. Dependencias y pendientes

- **Fase 0** (router, shell, `lib/api`, socket, kit y auditoría base) y **Usuarios y roles** para
  permisos; **Sucursal y ajustes** (19) para sedes e impuestos.
- **Estaciones e impresoras** (07) define `estacion` y SLA; **Pedidos** (02) consume el snapshot.
- R5 §14: #5 (¿gerente cambia precios? Supuesto: no), #2 (2FA en V1) y #7 (consolidado en V1).
- Pendientes: taxonomía de «recomendados/menú del día»; formato y columnas del CSV; almacenamiento
  y límites de fotos; ¿precio por franja o solo por sede?; redondeo con modificadores.
