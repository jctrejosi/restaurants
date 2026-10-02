# Planes de front (briefs para Figma Make)

Planes de las interfaces de cliente. Cada plan es un **brief de diseño + prompts listos para pegar
en Figma Make**, derivado de los requerimientos de [`../../requerimientos/`](../../requerimientos/).

| # | Plan | Interfaz | Fuente | Estado |
|---|---|---|---|---|
| 01 | [Web de reservas](./01-plan-web-reservas.md) | Cliente final: reservar mesa, carta, marketing | [R1](../../requerimientos/01-web-reservas-cliente.md) | Propuesta v0.1 |
| 02 | [Web de pedidos](./02-plan-web-pedidos.md) | Cliente final: mesa por QR, recoger, domicilio | [R2](../../requerimientos/02-web-pedidos-cliente.md) | Propuesta v0.1 |

## Reglas de la serie

- **Fundaciones compartidas:** el plan `01` define los tokens, tipografía e inventario base
  (§3 y §5). El plan `02` **no los repite**: solo añade lo propio del pedido. En Figma Make se
  trabaja sobre el **mismo archivo** («Web Cliente — Punto C») para que ambos flujos compartan
  estilo y componentes; si se usan archivos separados, el prompt maestro de cada plan incluye la
  variante autocontenida.
- **Un prompt por pantalla**, en el orden que indica cada plan; los prompts de corrección deben
  recordar «mantén los tokens y componentes ya definidos».
- **Nada de requisitos inventados:** cada pantalla cita los RF/RN/RNF que cubre y los pendientes
  quedan marcados como supuestos (preguntas abiertas de cada requerimiento).

## Próximos planes de la serie (previstos)

- APK del mesero ([R3](../../requerimientos/03-apk-mesero.md)) — brief aparte (Figma), no web.
- KDS de cocina ([R4](../../requerimientos/04-kds-cocina.md)).
- Panel de administración ([R5](../../requerimientos/05-panel-administracion.md)).
