# Despliegue de producción — Restaurantes (Punto C)

Este directorio contiene **todo lo necesario para correr el proyecto en un
contenedor** (backend + las 4 interfaces + Caddy interno) y publicarlo por el
edge compartido del VPS.

## Arquitectura

```mermaid
flowchart LR
  U[Internet] -->|80/443 TLS| E[edge_caddy]
  E -->|shared_edge<br/>restaurants_app:8080| A[restaurants_app]
  A -->|Host: restaurant/reservas| R[/srv/reservas]
  A -->|Host: cocina| K[/srv/cocina]
  A -->|Host: admin| AD[/srv/admin]
  A -->|Host: mesero| M[/srv/mesero]
  A -->|/api/* y /socket.io/*| B[backend NestJS :3001]
  B -->|restaurants_internal<br/>sin puertos publicados| P[(PostgreSQL+PostGIS)]
```

- **`edge_caddy`** (repo ecommerce) es el **único** contenedor que publica
  `80/443` y termina TLS para todos los proyectos.
- **`restaurants_app`** corre como usuario sin privilegios, con filesystem de
  solo lectura, `cap_drop: ALL`, `no-new-privileges` y healthcheck.
- **`restaurants_prod_postgres`** vive en una red interna (`internal: true`),
  **sin puertos publicados**.
- El contenedor de la app solo publica `127.0.0.1:30390` para diagnóstico.
  Nada de backend ni BD sale a internet.

## Puertos (para no chocar con los demás proyectos)

| Proyecto | Contenedor(es) | Puertos host |
|---|---|---|
| Ecommerce | `mercaldas_app` | 30180/30181 |
| CRM | `mercaldas_crm_app` | 30280/30281 |
| **Restaurantes** | `restaurants_app` | **30390** (solo loopback) |
| Astaroth | `astaroth` | 8010–8015 |
| Paimon | `paimon-*` | 8100–8102, 8188, 9101 |
| WhatsApp Bot | `whatsapp_bot_*` | 8300, 8301, 5441 |

El compose de producción usa nombres propios (`restaurants_prod`,
`restaurants_prod_postgres`, `restaurants_prod_postgres_data`) para **no
colisionar con el `dev.js` local** ni con el compose de `db/docker`.

## DNS (GoDaddy, zona `jcti.xyz`)

Registros **tipo A**, TTL 600, todos apuntando a `170.254.229.68`:

| Nombre | Tipo | Valor | Interfaz |
|---|---|---|---|
| `restaurant` | A | 170.254.229.68 | web de reservas/pedidos |
| `reservas` | A | 170.254.229.68 | web de reservas (alias) |
| `cocina` | A | 170.254.229.68 | KDS de cocina |
| `admin` | A | 170.254.229.68 | backoffice |
| `mesero` | A | 170.254.229.68 | APK mesero (web) |

No crees comodines ni `www`. El edge conserva el `Host` y el Caddy interno
decide qué SPA sirve. `node prod.js` imprime esta misma tabla.

## Primer despliegue

1. **DNS**: crea los 5 registros A de la tabla anterior.
2. **Edge**: el bloque de Restaurantes ya está en
   `ecommerce/docker/edge/Caddyfile` (rama `dev`). En el servidor, actualiza
   ecommerce y reinicia el edge:
   ```bash
   docker restart edge_caddy
   docker exec edge_caddy caddy validate --config /etc/caddy/Caddyfile
   ```
3. **App**:
   ```bash
   cd /mnt/c/Users/Desarrolo4/Documents/restaurants
   node prod.js
   ```
   `prod.js`:
   - crea `docker/.env` desde `.env.example` y genera
     `POSTGRES_PASSWORD` si falta;
   - sincroniza `HOST_*`, `CORS_ORIGIN` y `PUBLIC_HTTP_PORT` desde
     `prod.config.json`;
   - comprueba que el puerto no esté ocupado e indica **qué proceso o
     contenedor** lo usa;
   - construye la imagen, levanta app + BD, espera el healthcheck y prueba
     el front local y `https://restaurant.jcti.xyz/api/health`.

Let's Encrypt tarda unos segundos en emitir el certificado tras crear el DNS.

## Actualizar

```bash
node prod.js            # reconstruye y recrea
node prod.js --no-build # solo recrea (sin cambios de código)
node prod.js --logs     # logs en vivo
node prod.js --status
node prod.js --down     # detiene (conserva la BD)
```

Automático: `.github/workflows/ci-cd.yml` corre CI en cada push/PR y despliega
en `dev` con el runner self-hosted `[self-hosted, linux, mercaldas]`.

## Seguridad implementada

- Solo `edge_caddy` publica `80/443`. Backend, BD y puertos internos no se
  publican.
- App sin privilegios (uid 10001), `read_only`, `tmpfs` en `/tmp`,
  `cap_drop: ALL`, `no-new-privileges`, healthcheck y logs rotados.
- PostgreSQL en red `internal` (sin salida) y **sin `ports`**.
- Secretos solo en `docker/.env` (modo `0600`, ignorado por git). La imagen no
  contiene `.env` (`.dockerignore`).
- `NODE_ENV=production` desactiva Swagger.
- CORS fail-closed: sin `CORS_ORIGIN` el backend no arranca; nunca `*`.
- Cabeceras: HSTS, CSP, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, `-Server`.
- CSP restrictiva: scripts solo del propio dominio; estilos/fuentes de Google
  Fonts e imágenes https (Unsplash/OSM) permitidos; `worker-src` para MapLibre.
- `/api/health/db` **no se publica** (404 en el Caddy interno); `/api/health`
  sigue disponible para el healthcheck.
- Host desconocido → `404` (no se sirve ninguna SPA por IP).
- Límite de cuerpo de 10 MB (edge y Caddy interno).
- Migraciones y seed idempotentes al arrancar (se pueden omitir con
  `RUN_DB_MIGRATIONS=0`).

### Pendientes recomendados (no bloquean el despliegue)

- **Rate limiting / WAF**: Caddy estándar no trae `rate_limit`; si el tráfico
  crece, añadir un plugin (xcaddy) o un WAF delante del edge.
- **Usuario de BD con privilegios mínimos**: hoy la app usa el usuario dueño
  de la BD (`POSTGRES_USER`). Se puede separar en `migrator`/`app`/`readonly`
  con contraseñas rotadas por entorno (el repo ya trae `db/docker/roles.sql`).
- **Backups programados** de `restaurants_prod_postgres_data` (por ahora no se
  programaron, según lo acordado).
- **ComfyUI/modelos** no aplican a este proyecto.

## Solución de problemas

| Síntoma | Revisión |
|---|---|
| `502` en el dominio | `docker ps` (¿`restaurants_app` arriba?), `docker logs --tail 100 restaurants_app`, y que el edge tenga el bloque y esté en `shared_edge`. |
| Sin certificado | DNS A correcto y propagado; `docker logs edge_caddy`. |
| `node prod.js` aborta por puerto | Muestra el proceso/contenedor dueño; cambia `PUBLIC_HTTP_PORT` o detén el otro servicio. |
| BD no arranca | `docker logs restaurants_prod_postgres`; el volumen solo se inicializa la primera vez. |
| Cambié dominios | Edita `prod.config.json`, ejecuta `node prod.js --dns`, actualiza el Caddyfile del edge y ejecuta `node prod.js`. |
