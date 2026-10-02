# Base de datos local (docker)

PostgreSQL 16 + PostGIS para desarrollo del proyecto `restaurants`.

- Contenedor: `restaurants_postgres`
- Puerto host: **5435** (5432–5438 están ocupados por otros proyectos)
- BD / usuario / contraseña: `restaurants` / `postgres` / `postgres`
- Volumen: `restaurants_postgres_data`
- Extensiones: `postgis`, `citext`, `uuid-ossp`, `unaccent`, `pg_trgm`, `btree_gist` +
  `public.immutable_unaccent(text)`

## Uso

```bash
docker compose up -d          # levantar
docker compose logs -f        # ver logs (incluye la salida de init.sql)
docker compose down           # detener (conserva el volumen)

docker exec -it restaurants_postgres psql -U postgres -d restaurants

# Reinicio limpio (borra todos los datos y re-ejecuta init.sql + roles.sql)
docker compose down -v && docker compose up -d
```

## Usuarios de base de datos

`roles.sql` crea `migrator` (DDL), `app` (DML operativo, sin editar auditoría) y `readonly`
(solo el esquema `analytics`); se monta como `02_roles.sql` en `docker-entrypoint-initdb.d`, así
que se aplica solo al crear el volumen. Para bases ya existentes:

```bash
docker exec -i restaurants_postgres psql -U postgres -d restaurants -v ON_ERROR_STOP=1 \
  < db/docker/roles.sql
```

Contraseñas de desarrollo: `migrator`/`app`/`readonly` (rotar en producción).

## Simulacro de restauración

```bash
cd db/docker && ./restore-drill.sh
```

Respalda con `pg_dump -Fc`, restaura en `restaurants_restore_check`, verifica migraciones, tablas,
particiones, vistas materializadas y datos del seed, y elimina la base desechable. El respaldo se
conserva junto al script (`respaldo_drill_*.dump`, ignorado en git).

## Advertencias

- El proyecto compose se llama `restaurants` **a propósito** (no `db`): en `ecommerce` el
  proyecto `db` ya existe y su volumen `db_postgres_data` no debe compartirse.
- `init.sql` y `roles.sql` solo se ejecutan la primera vez que se crea el volumen (comportamiento
  estándar de la imagen). Si se agregan extensiones o roles nuevos, hay que recrear el volumen o
  aplicarlos a mano.
- La cadena de conexión que usa el backend está en `backend/.env`.
