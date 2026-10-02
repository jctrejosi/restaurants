# 05 — Reglas de negocio

Cada regla tiene identificador, descripción, origen (legado o nueva) y criterio de aceptación
verificable. Las reglas con origen `legado` provienen del código de `punto_c` y **no deben
perderse** en el nuevo producto.

## 5.1 Toma y enrutamiento

| ID | Regla | Origen | Criterio de aceptación |
|---|---|---|---|
| RN-01 | Todo producto tiene una **estación** destino; si está vacía o es `99`, el ítem no se envía a preparación (va directo a cuenta) | Legado (`IFCOCINA`) | Al enviar un pedido, cada línea genera o no una comanda según su estación |
| RN-02 | Una **comanda** agrupa las líneas de un mismo pedido para una misma estación | Legado (`IMPCOMAN`) | Un pedido con 3 ítems en 2 estaciones genera 2 comandas |
| RN-03 | Solo se envían líneas en estado `pendiente`; al enviarse pasan a `enviada` y se sella `enviada_en` | Legado (`IFCOMANDA='X'`) | Reenviar un pedido no duplica comandas ya enviadas |
| RN-04 | Agregar líneas a un pedido con comandas ya enviadas genera **solo** la comanda nueva | Legado | Segunda ronda de pedido imprime únicamente los ítems nuevos |
| RN-05 | Las líneas admiten **notas libres** por ítem (hasta 105 caracteres, 3 bloques de 35) y **modificadores** con precio [SUPUESTO: modificadores no verificados en `01`] | Legado (`IFOBSER`) | La nota se imprime completa en la comanda, partida en bloques de 35 caracteres |
| RN-06 | Las notas se envían a la estación junto con la línea | Legado | La comanda impresa y el KDS muestran las notas |

## 5.2 Numeración, impresión y avisos

| ID | Regla | Origen | Criterio de aceptación |
|---|---|---|---|
| RN-07 | Cada comanda recibe un **número consecutivo** por sucursal y un **turno** | Legado (`CTCOMANDA`, `CTTURNO`) | No hay huecos ni duplicados en un turno |
| RN-08 | La impresión usa **copias configurables** por tipo de documento | Legado (`CTIMPCO`, `CTIMPFA`) | Cambiar el parámetro cambia el número de copias |
| RN-09 | La impresión es **asíncrona y reintentable**; un fallo no bloquea la toma del pedido | Nueva (reemplaza el acoplamiento a `PRINTO.EXE`) | Con la impresora apagada, el pedido se crea y la impresión se reintenta |
| RN-10 | El borrado automático de comandas impresas es **opcional** | Legado (`CTBORRACO`) | El parámetro controla el comportamiento |
| RN-11 | El KDS emite **alerta sonora** al recibir una comanda nueva y al superar el SLA | Legado (sonido en `CTRCOMAN`), con SLA nuevo | Suena en ambos eventos y puede silenciarse por estación |
| RN-12 | Cada producto tiene **tiempo objetivo** de preparación; su incumplimiento marca la comanda | Nueva | El KDS colorea verde/amarillo/rojo según el tiempo objetivo |

## 5.3 Estados y modificaciones

| ID | Regla | Origen | Criterio de aceptación |
|---|---|---|---|
| RN-13 | Las transiciones de estado solo se permiten según la máquina de estados documentada (`04`, §4.11) | Nueva (explícita) | Una transición inválida responde error y no altera datos |
| RN-14 | Un pedido solo se puede **anular** antes de tener pagos aprobados | Nueva | Con pago aprobado, la vía es nota crédito/reembolso |
| RN-15 | Toda **anulación** requiere motivo y queda auditada con usuario y hora | Nueva | El registro de auditoría existe y no es editable |
| RN-16 | Los **descuentos** requieren el permiso `descuento.aplicar` (y las cortesías `cortesia.aplicar`) y quedan auditados [SUPUESTO: no verificado en `01`] | Legado (permisos `POSRUTA`) | Un usuario sin permiso no puede aplicar descuento |
| RN-17 | Se permite **trasladar** una mesa y **unir** mesas; el pedido conserva su historial | Legado (`FADMECLI`, cambio de mesa) | El pedido mantiene número y movimientos |
| RN-18 | La **división de cuenta** puede ser por líneas (asignación `pago_linea`, 04.6) o por partes iguales, con varios medios de pago [SUPUESTO: no verificado en `01`] | Legado (pagos múltiples) | El total de pagos cuadra con el total del pedido |

## 5.4 Dinero

| ID | Regla | Origen | Criterio de aceptación |
|---|---|---|---|
| RN-19 | Los precios se almacenan en **enteros de peso** (sin decimales) y se calculan sin punto flotante | Nueva (corrige errores de redondeo) | Pruebas con 1.000 líneas cuadran al peso |
| RN-20 | El **impuesto** se define por producto y puede estar incluido o adicionado al precio | Legado (IVA; INC [SUPUESTO]) | El ticket discrimina base e impuesto correctamente |
| RN-21 | La **propina** es voluntaria y sugerida por porcentaje configurable | Legado (`CTPORPRO`) | El cliente puede aceptar, modificar o rechazar la propina |
| RN-22 | El **cierre de caja** calcula diferencia entre lo contado y lo esperado, y no se puede cerrar dos veces | Legado (`FACIERRE`) | Un turno cerrado no admite nuevos pagos |

## 5.5 Canales, reservas y entrega

| ID | Regla | Origen | Criterio de aceptación |
|---|---|---|---|
| RN-23 | Todo pedido, sin importar el canal, usa el **mismo modelo y la misma máquina de estados** | Nueva | Un pedido web y uno de mesero se consultan con la misma API |
| RN-24 | Un pedido web en modalidad `mesa` requiere mesa válida (QR) y queda asociado a ella | Nueva | Sin mesa válida, la API rechaza el pedido |
| RN-25 | Una **reserva** confirmada bloquea la mesa en su franja (validación de solape por rango, 04.10); el `no_show` libera la mesa pasado el margen | Nueva | No se puede confirmar una reserva sobre una mesa ya bloqueada |
| RN-26 | Un pedido a **domicilio** solo se acepta si la dirección está dentro de una zona de cobertura y cumple el pedido mínimo | Nueva | Fuera de cobertura, la API responde error de negocio |
| RN-27 | El pedido queda **trazado** con el repartidor asignado y sus marcas de tiempo | Nueva | El cliente ve el estado `en_camino` |

## 5.6 Datos y operación

| ID | Regla | Origen | Criterio de aceptación |
|---|---|---|---|
| RN-28 | Todo pedido enviado desde el APK lleva `client_order_id`; **reenviarlo no duplica** | Nueva | Repetir la petición devuelve el mismo pedido |
| RN-29 | Todo cambio sensible (anulación, descuento, cierre, reimpresión, cambio de precio) queda **auditado** | Legado (parcial) [SUPUESTO: estado actual no verificado en `01`] | El registro incluye antes/después, usuario y dispositivo |
| RN-30 | Todo dato operativo está aislado por **sucursal** | Nueva | Un usuario sin acceso no ve datos de otra sucursal |
| RN-31 | El **catálogo** se edita en servidor; APK y KDS lo reciben por sincronización | Nueva | Un cambio de precio se refleja sin reinstalar la app |
| RN-32 | Un ítem **agotado** no se puede pedir por ningún canal y no aparece en la carta web | Nueva | El producto agotado desaparece de la web y bloquea el pedido |
| RN-33 | Una línea que cocina marca como **agotada** o no disponible pasa a `anulada` con motivo y notifica al mesero | Nueva | La línea queda `anulada` con motivo y el mesero recibe la alerta |
