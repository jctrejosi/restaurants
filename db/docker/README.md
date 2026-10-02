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

# Reinicio limpio (borra todos los datos y re-ejecuta init.sql)
docker compose down -v && docker compose up -d
```

## Advertencias

- El proyecto compose se llama `restaurants` **a propósito** (no `db`): en `ecommerce` el
  proyecto `db` ya existe y su volumen `db_postgres_data` no debe compartirse.
- `init.sql` solo se ejecuta la primera vez que se crea el volumen (comportamiento estándar
  de la imagen). Si se agregan extensiones nuevas, hay que recrear el volumen o aplicarlas
  a mano.
- La cadena de conexión que usa el backend está en `backend/.env`.
