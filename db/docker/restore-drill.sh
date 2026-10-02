#!/usr/bin/env bash
# ======================================================
# Simulacro de restauración (E10)
#
# Respalda la base operativa con pg_dump -Fc, la restaura en una base
# desechable del mismo contenedor, verifica integridad básica (migraciones,
# tablas, particiones, vistas materializadas y datos del seed) y limpia.
#
# Uso: ./restore-drill.sh
# Variables: CONTENEDOR, BD_ORIGEN, BD_DESTINO
# ======================================================
set -euo pipefail

CONTENEDOR="${CONTENEDOR:-restaurants_postgres}"
BD_ORIGEN="${BD_ORIGEN:-restaurants}"
BD_DESTINO="${BD_DESTINO:-restaurants_restore_check}"
MARCA="$(date +%Y%m%d_%H%M%S)"
RESPALDO_HOST="$(pwd)/respaldo_drill_${MARCA}.dump"

echo "1/6 Respaldo lógico (pg_dump -Fc) de ${BD_ORIGEN}…"
docker exec "$CONTENEDOR" pg_dump -U postgres -Fc -d "$BD_ORIGEN" -f /tmp/drill.dump
docker cp "${CONTENEDOR}:/tmp/drill.dump" "$RESPALDO_HOST"
echo "    respaldo: ${RESPALDO_HOST} ($(du -h "$RESPALDO_HOST" | cut -f1))"

echo "2/6 Creando base de restauración ${BD_DESTINO}…"
docker exec "$CONTENEDOR" dropdb -U postgres --if-exists "$BD_DESTINO"
docker exec "$CONTENEDOR" createdb -U postgres "$BD_DESTINO"

echo "3/6 Restaurando…"
docker exec "$CONTENEDOR" pg_restore -U postgres -d "$BD_DESTINO" --no-owner /tmp/drill.dump

echo "4/6 Verificando integridad…"
consulta() {
    docker exec "$CONTENEDOR" psql -U postgres -d "$BD_DESTINO" -t -A -c "$1"
}

MIGRACIONES=$(consulta "SELECT count(*) FROM drizzle.__drizzle_migrations;")
TABLAS=$(consulta "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'evento_auditoria_%' AND tablename NOT IN ('spatial_ref_sys','layer');")
PARTICIONES=$(consulta "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'evento_auditoria_%';")
MATVIEWS=$(consulta "SELECT count(*) FROM pg_matviews WHERE schemaname='analytics';")
MESAS=$(consulta "SELECT count(*) FROM mesa;")
PRODUCTOS=$(consulta "SELECT count(*) FROM producto;")

echo "    migraciones=${MIGRACIONES} tablas=${TABLAS} particiones=${PARTICIONES} matviews=${MATVIEWS} mesas=${MESAS} productos=${PRODUCTOS}"

FALLOS=0
[ "$MIGRACIONES" = "9" ] || { echo "    ERROR: se esperaban 9 migraciones"; FALLOS=1; }
[ "$TABLAS" = "72" ] || { echo "    ERROR: se esperaban 72 tablas base"; FALLOS=1; }
[ "$PARTICIONES" = "5" ] || { echo "    ERROR: se esperaban 5 particiones de auditoría"; FALLOS=1; }
[ "$MATVIEWS" = "8" ] || { echo "    ERROR: se esperaban 8 vistas materializadas"; FALLOS=1; }
[ "$MESAS" = "20" ] || { echo "    ERROR: se esperaban 20 mesas del seed"; FALLOS=1; }
[ "$PRODUCTOS" = "12" ] || { echo "    ERROR: se esperaban 12 productos del seed"; FALLOS=1; }

echo "5/6 Limpieza…"
docker exec "$CONTENEDOR" dropdb -U postgres "$BD_DESTINO"
docker exec "$CONTENEDOR" rm -f /tmp/drill.dump

if [ "$FALLOS" -ne 0 ]; then
    echo "6/6 FALLÓ: la restauración no pasó las verificaciones."
    exit 1
fi

echo "6/6 OK: la restauración es íntegra. Respaldo conservado en ${RESPALDO_HOST}."
