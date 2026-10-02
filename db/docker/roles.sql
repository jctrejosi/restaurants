-- ======================================================
-- USUARIOS DE BASE DE DATOS (E0/E10)
-- migrator: DDL y migraciones · app: DML operativo · readonly: BI (solo analytics)
--
-- Idempotente: puede aplicarse sobre una base ya existente o como script de
-- inicialización del contenedor (docker-entrypoint-initdb.d).
--
-- Estas contraseñas son las de DESARROLLO. En producción se rotan por entorno
-- (el script se re-ejecuta ajustando los ALTER ROLE con secretos externos).
-- ======================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migrator') THEN
        CREATE ROLE migrator LOGIN PASSWORD 'migrator';
    ELSE
        ALTER ROLE migrator LOGIN PASSWORD 'migrator';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
        CREATE ROLE app LOGIN PASSWORD 'app';
    ELSE
        ALTER ROLE app LOGIN PASSWORD 'app';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly') THEN
        CREATE ROLE readonly LOGIN PASSWORD 'readonly';
    ELSE
        ALTER ROLE readonly LOGIN PASSWORD 'readonly';
    END IF;
END $$;

-- ------------------------------------------------------------- migrator
GRANT CONNECT ON DATABASE restaurants TO migrator;
GRANT CREATE, USAGE ON SCHEMA public TO migrator;
GRANT CREATE, USAGE ON SCHEMA analytics TO migrator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO migrator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO migrator;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO migrator;
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO migrator;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA analytics TO migrator;
-- Objetos futuros creados por postgres (las migraciones corren como postgres)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON TABLES TO migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON SEQUENCES TO migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA analytics
    GRANT ALL ON TABLES TO migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA analytics
    GRANT ALL ON FUNCTIONS TO migrator;

-- ------------------------------------------------------------------ app
GRANT CONNECT ON DATABASE restaurants TO app;
GRANT USAGE ON SCHEMA public TO app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app;

-- Auditoría: la aplicación no puede editar ni borrar (el trigger inmutable es
-- la segunda capa). Se revoca en la tabla padre y en las particiones actuales;
-- las particiones van por herencia de la consulta al padre.
REVOKE UPDATE, DELETE ON evento_auditoria FROM app;
DO $$
DECLARE
    particion record;
BEGIN
    FOR particion IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname LIKE 'evento_auditoria_%'
    LOOP
        EXECUTE format('REVOKE UPDATE, DELETE ON public.%I FROM app', particion.relname);
    END LOOP;
END $$;

-- Analytics: la app puede leer y disparar el refresco programado. La función
-- es SECURITY DEFINER (propiedad de postgres) para poder refrescar vistas
-- materializadas que no le pertenecen; su cuerpo usa nombres calificados.
GRANT USAGE ON SCHEMA analytics TO app;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO app;
ALTER FUNCTION analytics.fn_refrescar_analytics() SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION analytics.fn_refrescar_analytics() TO app;

-- ------------------------------------------------------------- readonly
-- BI: solo el esquema analytics (RNF-R5-03). Sin acceso a la base operativa.
GRANT CONNECT ON DATABASE restaurants TO readonly;
REVOKE CREATE ON SCHEMA public FROM readonly;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM readonly;
GRANT USAGE ON SCHEMA analytics TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA analytics
    GRANT SELECT ON TABLES TO readonly;
