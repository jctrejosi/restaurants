# Requerimientos funcionales por interfaz

Requerimientos que definen **qué ve y qué puede hacer cada usuario** en las cuatro interfaces del
producto. Son la entrada directa para la planeación de la base de datos y para las vistas de
arquitectura (`../`).

| # | Documento | Interfaz / usuario | Estado |
|---|---|---|---|
| 01 | [Web de reservas del cliente](./01-web-reservas-cliente.md) | Cliente final: reservar mesa, ver la carta, marketing | **Borrador v0.1** |
| 02 | [Web de pedidos del cliente](./02-web-pedidos-cliente.md) | Cliente final: pedir para mesa (QR), recoger o domicilio | **Borrador v0.1** |
| 03 | [APK del mesero](./03-apk-mesero.md) | Mesero: salón, tomar y enviar pedidos, cuenta, cobro | **Borrador v0.1** |
| 04 | [KDS de cocina](./04-kds-cocina.md) | Cocina: ver, preparar y despachar comandas por estación | **Borrador v0.1** |

## Cómo se usan

- Cada documento enumera **requisitos funcionales (RF)**, **reglas de negocio (RN)**, **requisitos
  no funcionales (RNF)**, casos borde y una sección de **datos implicados**: las entidades y campos
  que ese requisito obliga a modelar.
- La unión de las cuatro secciones "Datos implicados" es el insumo para el diseño del modelo de
  datos (`../04-datos-y-persistencia.md`).
- La nomenclatura de entidades es la del proyecto (español, singular): `Reserva`, `Mesa`, `Zona`,
  `Pedido`, `Comanda`, `Estación`, `Producto`, `Cliente`, etc.

## Prioridad

`MVP` = necesario para el piloto · `V1` = producto completo · `V2` = evolución posterior.
