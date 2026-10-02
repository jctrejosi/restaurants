-- ======================================================
-- EXTENSIONES DEL PROYECTO restaurants (PostgreSQL 16 + PostGIS)
-- Idempotente: se ejecuta una sola vez, al crear el volumen.
-- ======================================================

-- 1. PostGIS: columnas GEOGRAPHY (zonas de cobertura, domicilio)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. citext: emails case-insensitive (usuarios, clientes, repartidores)
CREATE EXTENSION IF NOT EXISTS citext;

-- 3. uuid-ossp: generación de UUID (compatibilidad con el stack del ecommerce)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 4. unaccent: búsqueda insensible a tildes/ñ (buscador de la carta)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 5. pg_trgm: búsqueda difusa por similitud de trigramas (tolera tipeos)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 6. btree_gist: obligatoria para el constraint de exclusión de reservas
--    (mesa + rango de tiempo) definido en el esquema (D-BD-10).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 7. immutable_unaccent: wrapper IMMUTABLE de unaccent() para poder usarlo
--    en índices (unaccent() es STABLE y PostgreSQL no permite STABLE en índices).
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT public.unaccent($1) $$;

-- ======================================================
-- VERIFICACIÓN
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE 'Extensiones instaladas:';
    RAISE NOTICE '  postgis: %', (SELECT extversion FROM pg_extension WHERE extname = 'postgis');
    RAISE NOTICE '  citext: %', (SELECT extversion FROM pg_extension WHERE extname = 'citext');
    RAISE NOTICE '  uuid-ossp: %', (SELECT extversion FROM pg_extension WHERE extname = 'uuid-ossp');
    RAISE NOTICE '  unaccent: %', (SELECT extversion FROM pg_extension WHERE extname = 'unaccent');
    RAISE NOTICE '  pg_trgm: %', (SELECT extversion FROM pg_extension WHERE extname = 'pg_trgm');
    RAISE NOTICE '  btree_gist: %', (SELECT extversion FROM pg_extension WHERE extname = 'btree_gist');
END $$;
