CREATE TYPE "public"."estado_domicilio_enum" AS ENUM('asignado', 'recogido', 'en_camino', 'entregado', 'entrega_fallida', 'devuelto');--> statement-breakpoint
CREATE TABLE "domicilio_asignacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"repartidor_id" uuid NOT NULL,
	"asignado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"recogido_en" timestamp with time zone,
	"entregado_en" timestamp with time zone,
	"estado" "estado_domicilio_enum" DEFAULT 'asignado' NOT NULL,
	"evidencia_url" text,
	CONSTRAINT "ck_domicilio_sellos" CHECK ((recogido_en IS NULL OR recogido_en >= asignado_en) AND
          (entregado_en IS NULL OR (recogido_en IS NOT NULL AND entregado_en >= recogido_en)))
);
--> statement-breakpoint
CREATE TABLE "liquidacion_repartidor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repartidor_id" uuid NOT NULL,
	"periodo_desde" date NOT NULL,
	"periodo_hasta" date NOT NULL,
	"entregas" integer DEFAULT 0 NOT NULL,
	"tarifas_centavos" bigint DEFAULT 0 NOT NULL,
	"propinas_centavos" bigint DEFAULT 0 NOT NULL,
	"total_centavos" bigint DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_liquidacion_rango" CHECK (periodo_desde <= periodo_hasta),
	CONSTRAINT "ck_liquidacion_entregas" CHECK (entregas >= 0),
	CONSTRAINT "ck_liquidacion_tarifas" CHECK (tarifas_centavos >= 0),
	CONSTRAINT "ck_liquidacion_propinas" CHECK (propinas_centavos >= 0),
	CONSTRAINT "ck_liquidacion_total" CHECK (total_centavos >= 0)
);
--> statement-breakpoint
CREATE TABLE "zona_cobertura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tarifa_centavos" bigint DEFAULT 0 NOT NULL,
	"pedido_minimo_centavos" bigint DEFAULT 0 NOT NULL,
	"tiempo_estimado_min" integer,
	"geometria" jsonb,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_zona_cobertura" UNIQUE("sucursal_id","nombre"),
	CONSTRAINT "ck_zona_cobertura_tarifa" CHECK (tarifa_centavos >= 0),
	CONSTRAINT "ck_zona_cobertura_minimo" CHECK (pedido_minimo_centavos >= 0),
	CONSTRAINT "ck_zona_cobertura_tiempo" CHECK (tiempo_estimado_min IS NULL OR tiempo_estimado_min > 0)
);
--> statement-breakpoint
ALTER TABLE "domicilio_asignacion" ADD CONSTRAINT "fk_domicilio_asignacion_pedido" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domicilio_asignacion" ADD CONSTRAINT "fk_domicilio_asignacion_repartidor" FOREIGN KEY ("repartidor_id") REFERENCES "public"."repartidor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidacion_repartidor" ADD CONSTRAINT "fk_liquidacion_repartidor_repartidor" FOREIGN KEY ("repartidor_id") REFERENCES "public"."repartidor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zona_cobertura" ADD CONSTRAINT "fk_zona_cobertura_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_domicilio_activo" ON "domicilio_asignacion" USING btree ("pedido_id") WHERE estado IN ('asignado', 'recogido', 'en_camino');--> statement-breakpoint
CREATE INDEX "ix_domicilio_repart" ON "domicilio_asignacion" USING btree ("repartidor_id","estado");