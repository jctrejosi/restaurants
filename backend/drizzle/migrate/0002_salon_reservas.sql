CREATE TYPE "public"."deposito_regla_enum" AS ENUM('no', 'siempre', 'grupos', 'fechas_especiales');--> statement-breakpoint
CREATE TYPE "public"."estado_lista_espera_enum" AS ENUM('esperando', 'ofrecida', 'aceptada', 'expirada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."estado_mesa_enum" AS ENUM('libre', 'ocupada', 'por_cobrar', 'reservada', 'fuera_servicio');--> statement-breakpoint
CREATE TYPE "public"."estado_reserva_enum" AS ENUM('solicitada', 'confirmada', 'sentada', 'no_show', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."origen_reserva_enum" AS ENUM('web', 'telefono', 'mostrador');--> statement-breakpoint
CREATE TABLE "lista_espera" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"nombre_contacto" text NOT NULL,
	"telefono" text,
	"personas" smallint NOT NULL,
	"franja_deseada" timestamp with time zone NOT NULL,
	"estado" "estado_lista_espera_enum" DEFAULT 'esperando' NOT NULL,
	"vigencia_hasta" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_lista_espera_personas" CHECK (personas > 0)
);
--> statement-breakpoint
CREATE TABLE "mesa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"zona_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"capacidad" smallint NOT NULL,
	"estado" "estado_mesa_enum" DEFAULT 'libre' NOT NULL,
	"pos_x" numeric(6, 2),
	"pos_y" numeric(6, 2),
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_mesa" UNIQUE("sucursal_id","numero"),
	CONSTRAINT "ck_mesa_capacidad" CHECK (capacidad > 0)
);
--> statement-breakpoint
CREATE TABLE "mesa_asignacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turno_id" uuid NOT NULL,
	"zona_id" uuid,
	"mesa_id" uuid,
	"usuario_id" uuid NOT NULL,
	"desde" timestamp with time zone DEFAULT now() NOT NULL,
	"hasta" timestamp with time zone,
	CONSTRAINT "ck_asignacion_alcance" CHECK ((zona_id IS NOT NULL) <> (mesa_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "politica_reserva" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"antelacion_min_horas" integer DEFAULT 2 NOT NULL,
	"antelacion_max_dias" integer DEFAULT 30 NOT NULL,
	"duracion_min" integer DEFAULT 90 NOT NULL,
	"tolerancia_min" integer DEFAULT 15 NOT NULL,
	"cancelacion_horas" integer DEFAULT 2 NOT NULL,
	"maximo_personas" integer DEFAULT 8 NOT NULL,
	"deposito_regla" "deposito_regla_enum" DEFAULT 'no' NOT NULL,
	"deposito_monto_centavos" bigint,
	"no_show_regla" text,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_politica_reserva" UNIQUE("sucursal_id"),
	CONSTRAINT "ck_politica_antelacion_min" CHECK (antelacion_min_horas >= 0),
	CONSTRAINT "ck_politica_antelacion_max" CHECK (antelacion_max_dias > 0),
	CONSTRAINT "ck_politica_duracion" CHECK (duracion_min > 0),
	CONSTRAINT "ck_politica_tolerancia" CHECK (tolerancia_min >= 0),
	CONSTRAINT "ck_politica_cancelacion" CHECK (cancelacion_horas >= 0),
	CONSTRAINT "ck_politica_maximo_personas" CHECK (maximo_personas > 0),
	CONSTRAINT "ck_politica_deposito" CHECK (deposito_monto_centavos IS NULL OR deposito_monto_centavos > 0),
	CONSTRAINT "ck_politica_rango" CHECK (antelacion_min_horas <= antelacion_max_dias * 24)
);
--> statement-breakpoint
CREATE TABLE "reserva" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"cliente_id" uuid,
	"nombre_contacto" text NOT NULL,
	"telefono_contacto" text,
	"correo_contacto" text,
	"fecha_hora" timestamp with time zone NOT NULL,
	"duracion_min" integer NOT NULL,
	"periodo" "tstzrange" DEFAULT tstzrange(now(), now()) NOT NULL,
	"personas" smallint NOT NULL,
	"zona_id" uuid,
	"mesa_id" uuid,
	"preferencia" text,
	"estado" "estado_reserva_enum" DEFAULT 'solicitada' NOT NULL,
	"codigo" text NOT NULL,
	"origen" "origen_reserva_enum" NOT NULL,
	"ocasion" text,
	"notas" text,
	"politica_snapshot" jsonb,
	"deposito_requerido" boolean DEFAULT false NOT NULL,
	"deposito_pagado" boolean DEFAULT false NOT NULL,
	"recordatorio_enviado_en" timestamp with time zone,
	"sentada_en" timestamp with time zone,
	"finalizada_en" timestamp with time zone,
	"no_show_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_reserva_codigo" UNIQUE("codigo"),
	CONSTRAINT "ck_reserva_duracion" CHECK (duracion_min > 0),
	CONSTRAINT "ck_reserva_personas" CHECK (personas > 0)
);
--> statement-breakpoint
CREATE TABLE "sesion_mesa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mesa_id" uuid NOT NULL,
	"token" text NOT NULL,
	"abierta_en" timestamp with time zone DEFAULT now() NOT NULL,
	"cerrada_en" timestamp with time zone,
	CONSTRAINT "uq_sesion_mesa_token" UNIQUE("token"),
	CONSTRAINT "ck_sesion_fechas" CHECK (cerrada_en IS NULL OR cerrada_en >= abierta_en)
);
--> statement-breakpoint
CREATE TABLE "zona" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"aforo" integer,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "uq_zona" UNIQUE("sucursal_id","nombre"),
	CONSTRAINT "ck_zona_aforo" CHECK (aforo IS NULL OR aforo > 0)
);
--> statement-breakpoint
ALTER TABLE "lista_espera" ADD CONSTRAINT "fk_lista_espera_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa" ADD CONSTRAINT "fk_mesa_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa" ADD CONSTRAINT "fk_mesa_zona" FOREIGN KEY ("zona_id") REFERENCES "public"."zona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa_asignacion" ADD CONSTRAINT "fk_mesa_asignacion_turno" FOREIGN KEY ("turno_id") REFERENCES "public"."turno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa_asignacion" ADD CONSTRAINT "fk_mesa_asignacion_zona" FOREIGN KEY ("zona_id") REFERENCES "public"."zona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa_asignacion" ADD CONSTRAINT "fk_mesa_asignacion_mesa" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa_asignacion" ADD CONSTRAINT "fk_mesa_asignacion_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "politica_reserva" ADD CONSTRAINT "fk_politica_reserva_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserva" ADD CONSTRAINT "fk_reserva_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserva" ADD CONSTRAINT "fk_reserva_cliente" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserva" ADD CONSTRAINT "fk_reserva_zona" FOREIGN KEY ("zona_id") REFERENCES "public"."zona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserva" ADD CONSTRAINT "fk_reserva_mesa" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion_mesa" ADD CONSTRAINT "fk_sesion_mesa_mesa" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zona" ADD CONSTRAINT "fk_zona_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_lista_espera_estado" ON "lista_espera" USING btree ("sucursal_id","estado");--> statement-breakpoint
CREATE INDEX "ix_mesa_zona" ON "mesa" USING btree ("zona_id","estado");--> statement-breakpoint
CREATE INDEX "ix_reserva_fecha" ON "reserva" USING btree ("sucursal_id","fecha_hora","estado");--> statement-breakpoint
-- SQL manual (D-BD-13/D-BD-15): `periodo` materializa [fecha_hora, fecha_hora + duracion_min).
-- No puede ser columna generada ni expresión de índice: `timestamptz + interval` es STABLE
-- (depende de la zona horaria); se mantiene con trigger y la exclusión usa `periodo`.
CREATE OR REPLACE FUNCTION fn_reserva_periodo() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	NEW.periodo = tstzrange(
		NEW.fecha_hora,
		NEW.fecha_hora + make_interval(mins => NEW.duracion_min)
	);
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER tg_reserva_periodo BEFORE INSERT OR UPDATE ON "reserva"
FOR EACH ROW EXECUTE FUNCTION fn_reserva_periodo();--> statement-breakpoint
-- SQL manual (D-BD-13): exclusión de solapes por mesa para reservas activas (requiere btree_gist).
ALTER TABLE "reserva" ADD CONSTRAINT "ex_reserva_mesa_solape"
	EXCLUDE USING gist (
		"mesa_id" WITH =,
		"periodo" WITH &&
	)
	WHERE ("estado" IN ('solicitada', 'confirmada', 'sentada') AND "mesa_id" IS NOT NULL);--> statement-breakpoint
-- SQL manual (D-BD-13): sellos `actualizado_en` de las tablas mutables de E3.
CREATE TRIGGER tg_politica_reserva_actualizado_en BEFORE UPDATE ON "politica_reserva"
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();--> statement-breakpoint
CREATE TRIGGER tg_reserva_actualizado_en BEFORE UPDATE ON "reserva"
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();