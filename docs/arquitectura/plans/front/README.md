# Planes de front (briefs para Figma Make)

Planes de las interfaces del producto. Cada plan es un **brief de diseño + prompts listos para
pegar en Figma Make**, derivado de los requerimientos de [`../../requerimientos/`](../../requerimientos/).

| # | Plan | Interfaz | Fuente | Estado |
|---|---|---|---|---|
| 01 | [Web de reservas](./01-plan-web-reservas.md) | Cliente final: reservar mesa, carta, marketing | [R1](../../requerimientos/01-web-reservas-cliente.md) | Propuesta v0.1 |
| 02 | [Web de pedidos](./02-plan-web-pedidos.md) | Cliente final: mesa por QR, recoger, domicilio | [R2](../../requerimientos/02-web-pedidos-cliente.md) | Propuesta v0.1 |
| 03 | [APK del mesero](./03-plan-apk-mesero.md) | Salón: mapa de mesas, toma de pedido, comandas | [R3](../../requerimientos/03-apk-mesero.md) | Propuesta v0.1 |
| 04 | [KDS de cocina](./04-plan-kds-cocina.md) | Cocina: tablero por estación, SLA, despacho | [R4](../../requerimientos/04-kds-cocina.md) | Propuesta v0.1 |
| 05 | [Panel de administración](./05-plan-panel-administracion.md) | Negocio: operación en vivo, trazabilidad, tiempos, configuración | [R5](../../requerimientos/05-panel-administracion.md) | Propuesta v0.1 |

## Reglas de la serie

- **Fundaciones compartidas:** el plan `01` define los tokens, tipografía e inventario base
  (§3 y §5). El plan `02` **no los repite**: solo añade lo propio del pedido. En Figma Make se
  trabaja sobre el **mismo archivo** («Web Cliente — Punto C») para que ambos flujos compartan
  estilo y componentes. Los planes `03` (APK), `04` (KDS) y `05` (backoffice) son **archivos aparte**
  («APK Mesero — Punto C», «KDS Cocina — Punto C» y «Backoffice — Punto C») porque cambian de
  contexto de uso, pero **heredan la marca** del plan `01`; cada uno define en su prompt maestro sus
  propios ajustes.
- **Un prompt por pantalla**, en el orden que indica cada plan; los prompts de corrección deben
  recordar «mantén los tokens y componentes ya definidos».
- **Nada de requisitos inventados:** cada pantalla cita los RF/RN/RNF que cubre y los pendientes
  quedan marcados como supuestos (preguntas abiertas de cada requerimiento).

## Serie completa

Los cinco planes están escritos: `01` reservas · `02` pedidos · `03` APK del mesero · `04` KDS de
cocina · `05` panel de administración. Los pendientes de **implementación** (no de brief) son el
backend/API y la puesta en marcha de cada proyecto de front.
