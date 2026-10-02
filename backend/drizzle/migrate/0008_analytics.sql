-- E9 — Agregados y reportes (`analytics`).
--
-- SQL manual (no hay cambios en `drizzle/schema.ts`): vistas materializadas por
-- período y sucursal, según `docs/arquitectura/esquema/README.md`, el plan de BD
-- (E9) y los requisitos RF-R5-120…124/§5.3 del panel de administración.
--
-- Frescura: RNF-R5-02 pide retardo máximo de 1 minuto; el job de refresco llama
-- a `analytics.fn_refrescar_analytics()` (el orden respeta las dependencias).
-- Los reportes consultan solo este esquema (RNF-R5-03); el rol de BI tendrá
-- `SELECT` únicamente aquí cuando se creen los usuarios de BD (E0).
CREATE SCHEMA IF NOT EXISTS analytics;--> statement-breakpoint

-- Ventas por período, sede, canal y modalidad (RF-R5-120; también sirve a
-- RF-R5-124: impuestos, propinas y descuentos del período).
CREATE MATERIALIZED VIEW analytics.mv_ventas_diarias AS
SELECT
	(p.pagado_en AT TIME ZONE s.zona_horaria)::date AS fecha,
	p.sucursal_id,
	p.canal,
	p.modalidad,
	count(*)                          AS pedidos,
	sum(p.subtotal_centavos)          AS subtotal_centavos,
	sum(p.descuentos_centavos)        AS descuentos_centavos,
	sum(p.impuestos_centavos)         AS impuestos_centavos,
	sum(p.propina_centavos)           AS propina_centavos,
	sum(p.recargos_centavos)          AS recargos_centavos,
	sum(p.total_centavos)             AS total_centavos
FROM pedido p
JOIN sucursal s ON s.id = p.sucursal_id
WHERE p.estado = 'pagado' AND p.pagado_en IS NOT NULL
GROUP BY 1, 2, 3, 4;--> statement-breakpoint
CREATE UNIQUE INDEX uq_mv_ventas_diarias
	ON analytics.mv_ventas_diarias (fecha, sucursal_id, canal, modalidad);--> statement-breakpoint
CREATE INDEX ix_mv_ventas_diarias_sucursal
	ON analytics.mv_ventas_diarias (sucursal_id, fecha);--> statement-breakpoint

-- Ventas por producto y categoría (RF-R5-120).
CREATE MATERIALIZED VIEW analytics.mv_ventas_producto AS
SELECT
	(p.pagado_en AT TIME ZONE s.zona_horaria)::date AS fecha,
	p.sucursal_id,
	c.id      AS categoria_id,
	pl.producto_id,
	sum(pl.cantidad)                                   AS cantidad,
	sum(pl.precio_snapshot_centavos * pl.cantidad)::bigint AS importe_centavos
FROM pedido_linea pl
JOIN pedido p ON p.id = pl.pedido_id
JOIN sucursal s ON s.id = p.sucursal_id
JOIN producto pr ON pr.id = pl.producto_id
JOIN categoria c ON c.id = pr.categoria_id
WHERE p.estado = 'pagado' AND p.pagado_en IS NOT NULL AND pl.estado <> 'anulada'
GROUP BY 1, 2, 3, 4;--> statement-breakpoint
CREATE UNIQUE INDEX uq_mv_ventas_producto
	ON analytics.mv_ventas_producto (fecha, sucursal_id, producto_id);--> statement-breakpoint

-- Reservas: volumen, ocupación, no-show y espera media (RF-R5-121, §5.1).
CREATE MATERIALIZED VIEW analytics.mv_reservas_diarias AS
SELECT
	(r.fecha_hora AT TIME ZONE s.zona_horaria)::date AS fecha,
	r.sucursal_id,
	count(*)                                                        AS reservas,
	count(*) FILTER (WHERE r.estado = 'confirmada')                 AS confirmadas,
	count(*) FILTER (WHERE r.estado = 'sentada')                    AS sentadas,
	count(*) FILTER (WHERE r.estado = 'no_show')                    AS no_show,
	count(*) FILTER (WHERE r.estado = 'cancelada')                  AS canceladas,
	sum(r.personas) FILTER (WHERE r.estado IN ('confirmada','sentada')) AS personas_confirmadas,
	round(avg(EXTRACT(EPOCH FROM (r.sentada_en - r.fecha_hora)) / 60)
		FILTER (WHERE r.sentada_en IS NOT NULL), 1)                 AS espera_media_min
FROM reserva r
JOIN sucursal s ON s.id = r.sucursal_id
GROUP BY 1, 2;--> statement-breakpoint
CREATE UNIQUE INDEX uq_mv_reservas_diarias
	ON analytics.mv_reservas_diarias (fecha, sucursal_id);--> statement-breakpoint

-- Tiempos por pedido (§5.3; soporta el desglose por mesero de RF-R5-122/123).
CREATE MATERIALIZED VIEW analytics.mv_tiempos_pedido AS
SELECT
	p.id            AS pedido_id,
	p.sucursal_id,
	p.canal,
	p.modalidad,
	p.mesero_id,
	(p.creado_en AT TIME ZONE s.zona_horaria)::date AS fecha,
	EXTRACT(EPOCH FROM (p.enviado_en - p.creado_en))::int        AS atencion_seg,
	EXTRACT(EPOCH FROM (p.listo_en - p.enviado_en))::int         AS preparacion_seg,
	EXTRACT(EPOCH FROM (p.entregado_en - p.listo_en))::int       AS despacho_seg,
	EXTRACT(EPOCH FROM (p.pagado_en - p.por_cobrar_en))::int     AS cobro_seg,
	EXTRACT(EPOCH FROM (COALESCE(p.pagado_en, p.entregado_en) - p.creado_en))::int AS total_seg,
	d.ruta_seg
FROM pedido p
JOIN sucursal s ON s.id = p.sucursal_id
LEFT JOIN LATERAL (
	SELECT EXTRACT(EPOCH FROM (da.entregado_en - da.recogido_en))::int AS ruta_seg
	FROM domicilio_asignacion da
	WHERE da.pedido_id = p.id AND da.recogido_en IS NOT NULL AND da.entregado_en IS NOT NULL
	ORDER BY da.entregado_en DESC
	LIMIT 1
) d ON true;--> statement-breakpoint
CREATE UNIQUE INDEX uq_mv_tiempos_pedido
	ON analytics.mv_tiempos_pedido (pedido_id);--> statement-breakpoint
CREATE INDEX ix_mv_tiempos_pedido_fecha
	ON analytics.mv_tiempos_pedido (fecha, sucursal_id);--> statement-breakpoint

-- Tiempos por comanda y estación, con el objetivo de SLA (§5.3).
CREATE MATERIALIZED VIEW analytics.mv_tiempos_comanda AS
SELECT
	c.id            AS comanda_id,
	c.sucursal_id,
	c.estacion_id,
	c.pedido_id,
	c.numero,
	(c.enviada_en AT TIME ZONE s.zona_horaria)::date AS fecha,
	EXTRACT(EPOCH FROM (c.lista_en - c.enviada_en))::int      AS preparacion_seg,
	EXTRACT(EPOCH FROM (c.entregada_en - c.lista_en))::int    AS despacho_seg,
	rs.objetivo_seg,
	CASE
		WHEN rs.objetivo_seg IS NOT NULL AND c.lista_en IS NOT NULL
		THEN EXTRACT(EPOCH FROM (c.lista_en - c.enviada_en)) <= rs.objetivo_seg
	END AS cumple_sla
FROM comanda c
JOIN sucursal s ON s.id = c.sucursal_id
LEFT JOIN regla_sla rs
	ON rs.sucursal_id = c.sucursal_id AND rs.estacion_id = c.estacion_id;--> statement-breakpoint
CREATE UNIQUE INDEX uq_mv_tiempos_comanda
	ON analytics.mv_tiempos_comanda (comanda_id);--> statement-breakpoint

-- Cumplimiento de SLA por día, sede y estación (§5.3).
CREATE MATERIALIZED VIEW analytics.mv_sla_estacion AS
SELECT
	fecha,
	sucursal_id,
	estacion_id,
	count(*) FILTER (WHERE preparacion_seg IS NOT NULL)   AS comandas_medidas,
	count(*) FILTER (WHERE cumple_sla)                    AS dentro_sla,
	round(100.0 * count(*) FILTER (WHERE cumple_sla)
		/ NULLIF(count(*) FILTER (WHERE cumple_sla IS NOT NULL), 0), 1) AS pct_cumplimiento,
	round(avg(preparacion_seg) FILTER (WHERE preparacion_seg IS NOT NULL), 1) AS preparacion_media_seg
FROM analytics.mv_tiempos_comanda
GROUP BY 1, 2, 3;--> statement-breakpoint
CREATE UNIQUE INDEX uq_mv_sla_estacion
	ON analytics.mv_sla_estacion (fecha, sucursal_id, estacion_id);--> statement-breakpoint

-- Ocupación por sesión de mesa (§5.1/§5.3: rotación, duración y consumo).
CREATE MATERIALIZED VIEW analytics.mv_ocupacion_mesa AS
SELECT
	sm.id           AS sesion_mesa_id,
	m.sucursal_id,
	m.zona_id,
	m.id            AS mesa_id,
	m.numero        AS mesa_numero,
	(sm.abierta_en AT TIME ZONE s.zona_horaria)::date AS fecha,
	sm.abierta_en,
	sm.cerrada_en,
	round(EXTRACT(EPOCH FROM (sm.cerrada_en - sm.abierta_en)) / 60, 1) AS duracion_min,
	(SELECT count(*) FROM pedido p WHERE p.sesion_mesa_id = sm.id) AS pedidos,
	(SELECT COALESCE(sum(p.total_centavos), 0) FROM pedido p
		WHERE p.sesion_mesa_id = sm.id AND p.estado = 'pagado')     AS consumo_centavos
FROM sesion_mesa sm
JOIN mesa m ON m.id = sm.mesa_id
JOIN sucursal s ON s.id = m.sucursal_id;--> statement-breakpoint
CREATE UNIQUE INDEX uq_mv_ocupacion_mesa
	ON analytics.mv_ocupacion_mesa (sesion_mesa_id);--> statement-breakpoint
CREATE INDEX ix_mv_ocupacion_mesa_fecha
	ON analytics.mv_ocupacion_mesa (fecha, sucursal_id);--> statement-breakpoint

-- Desempeño por mesero y turno (RF-R5-123: pagos, propinas, descuentos y anulaciones).
CREATE MATERIALIZED VIEW analytics.mv_desempeno_mesero AS
WITH pagados AS (
	SELECT
		(p.pagado_en AT TIME ZONE s.zona_horaria)::date AS fecha,
		p.sucursal_id,
		p.mesero_id,
		count(*)                     AS pedidos_pagados,
		sum(p.total_centavos)        AS ventas_centavos,
		sum(p.propina_centavos)      AS propina_centavos,
		sum(p.descuentos_centavos)   AS descuentos_centavos
	FROM pedido p
	JOIN sucursal s ON s.id = p.sucursal_id
	WHERE p.estado = 'pagado' AND p.pagado_en IS NOT NULL AND p.mesero_id IS NOT NULL
	GROUP BY 1, 2, 3
), cancelados AS (
	SELECT
		(p.cancelado_en AT TIME ZONE s.zona_horaria)::date AS fecha,
		p.sucursal_id,
		p.mesero_id,
		count(*) AS cancelados
	FROM pedido p
	JOIN sucursal s ON s.id = p.sucursal_id
	WHERE p.estado = 'cancelado' AND p.cancelado_en IS NOT NULL AND p.mesero_id IS NOT NULL
	GROUP BY 1, 2, 3
)
SELECT
	COALESCE(pa.fecha, ca.fecha)             AS fecha,
	COALESCE(pa.sucursal_id, ca.sucursal_id) AS sucursal_id,
	COALESCE(pa.mesero_id, ca.mesero_id)     AS mesero_id,
	COALESCE(pa.pedidos_pagados, 0)          AS pedidos_pagados,
	COALESCE(pa.ventas_centavos, 0)          AS ventas_centavos,
	COALESCE(pa.propina_centavos, 0)         AS propina_centavos,
	COALESCE(pa.descuentos_centavos, 0)      AS descuentos_centavos,
	COALESCE(ca.cancelados, 0)               AS cancelados
FROM pagados pa
FULL JOIN cancelados ca
	ON ca.fecha = pa.fecha AND ca.sucursal_id = pa.sucursal_id AND ca.mesero_id = pa.mesero_id;--> statement-breakpoint
CREATE UNIQUE INDEX uq_mv_desempeno_mesero
	ON analytics.mv_desempeno_mesero (fecha, sucursal_id, mesero_id);--> statement-breakpoint

-- Refresco de todos los agregados; el orden respeta las dependencias
-- (`mv_sla_estacion` se apoya en `mv_tiempos_comanda`).
CREATE OR REPLACE FUNCTION analytics.fn_refrescar_analytics() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
	REFRESH MATERIALIZED VIEW analytics.mv_ventas_diarias;
	REFRESH MATERIALIZED VIEW analytics.mv_ventas_producto;
	REFRESH MATERIALIZED VIEW analytics.mv_reservas_diarias;
	REFRESH MATERIALIZED VIEW analytics.mv_tiempos_pedido;
	REFRESH MATERIALIZED VIEW analytics.mv_tiempos_comanda;
	REFRESH MATERIALIZED VIEW analytics.mv_sla_estacion;
	REFRESH MATERIALIZED VIEW analytics.mv_ocupacion_mesa;
	REFRESH MATERIALIZED VIEW analytics.mv_desempeno_mesero;
END;
$$;--> statement-breakpoint

-- Poblado inicial (vacío).
SELECT analytics.fn_refrescar_analytics();
