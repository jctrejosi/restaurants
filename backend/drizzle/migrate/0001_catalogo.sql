CREATE TYPE "public"."agotado_origen_enum" AS ENUM('cocina', 'salon', 'backoffice');--> statement-breakpoint
CREATE TYPE "public"."tipo_cupon_enum" AS ENUM('porcentaje', 'monto');--> statement-breakpoint
CREATE TYPE "public"."tipo_promocion_enum" AS ENUM('banner', 'cupon', 'destacado');--> statement-breakpoint
CREATE TABLE "alergeno" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "uq_alergeno_nombre" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cupon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"tipo" "tipo_cupon_enum" NOT NULL,
	"valor" bigint NOT NULL,
	"desde" timestamp with time zone NOT NULL,
	"hasta" timestamp with time zone NOT NULL,
	"usos_maximo" integer,
	"usos" integer DEFAULT 0 NOT NULL,
	"sucursal_id" uuid,
	CONSTRAINT "uq_cupon_codigo" UNIQUE("codigo"),
	CONSTRAINT "ck_cupon_valor" CHECK (valor > 0),
	CONSTRAINT "ck_cupon_rango" CHECK (desde < hasta),
	CONSTRAINT "ck_cupon_usos" CHECK (usos_maximo IS NULL OR usos <= usos_maximo)
);
--> statement-breakpoint
CREATE TABLE "disponibilidad_producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"franja" "franja_servicio_enum",
	"disponible" boolean DEFAULT true NOT NULL,
	"agotado" boolean DEFAULT false NOT NULL,
	"agotado_origen" "agotado_origen_enum",
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_disponibilidad" UNIQUE NULLS NOT DISTINCT("producto_id","sucursal_id","franja")
);
--> statement-breakpoint
CREATE TABLE "grupo_modificador" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid,
	"categoria_id" uuid,
	"nombre" text NOT NULL,
	"minimo" smallint DEFAULT 0 NOT NULL,
	"maximo" smallint DEFAULT 1 NOT NULL,
	"obligatorio" boolean DEFAULT false NOT NULL,
	CONSTRAINT "ck_grupo_padre" CHECK ((producto_id IS NOT NULL) <> (categoria_id IS NOT NULL)),
	CONSTRAINT "ck_grupo_modificador_minimo" CHECK (minimo >= 0),
	CONSTRAINT "ck_grupo_modificador_maximo" CHECK (maximo >= minimo)
);
--> statement-breakpoint
CREATE TABLE "modificador" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grupo_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"precio_centavos" bigint DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ck_modificador_precio" CHECK (precio_centavos >= 0)
);
--> statement-breakpoint
CREATE TABLE "producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"impuesto_id" uuid NOT NULL,
	"estacion_id" uuid,
	"sku" text,
	"codigo_barras" text,
	"tiempo_objetivo_seg" integer,
	"etiquetas" text[],
	"activo" boolean DEFAULT true NOT NULL,
	"destacado" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_producto_tiempo_objetivo" CHECK (tiempo_objetivo_seg IS NULL OR tiempo_objetivo_seg > 0)
);
--> statement-breakpoint
CREATE TABLE "producto_alergeno" (
	"producto_id" uuid NOT NULL,
	"alergeno_id" uuid NOT NULL,
	CONSTRAINT "pk_producto_alergeno" PRIMARY KEY("producto_id","alergeno_id")
);
--> statement-breakpoint
CREATE TABLE "producto_foto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"url" text NOT NULL,
	"orden" smallint DEFAULT 0 NOT NULL,
	"texto_alt" text
);
--> statement-breakpoint
CREATE TABLE "producto_precio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"precio_centavos" bigint NOT NULL,
	"vigente_desde" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_producto_precio" UNIQUE("producto_id","sucursal_id","vigente_desde"),
	CONSTRAINT "ck_producto_precio_valor" CHECK (precio_centavos >= 0)
);
--> statement-breakpoint
CREATE TABLE "promocion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"texto" text,
	"imagen_url" text,
	"tipo" "tipo_promocion_enum" NOT NULL,
	"desde" timestamp with time zone NOT NULL,
	"hasta" timestamp with time zone NOT NULL,
	"sucursal_id" uuid,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ck_promocion_rango" CHECK (desde < hasta)
);
--> statement-breakpoint
ALTER TABLE "categoria" ADD CONSTRAINT "fk_categoria_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupon" ADD CONSTRAINT "fk_cupon_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disponibilidad_producto" ADD CONSTRAINT "fk_disponibilidad_producto_producto" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disponibilidad_producto" ADD CONSTRAINT "fk_disponibilidad_producto_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupo_modificador" ADD CONSTRAINT "fk_grupo_modificador_producto" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupo_modificador" ADD CONSTRAINT "fk_grupo_modificador_categoria" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modificador" ADD CONSTRAINT "fk_modificador_grupo" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupo_modificador"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto" ADD CONSTRAINT "fk_producto_categoria" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto" ADD CONSTRAINT "fk_producto_impuesto" FOREIGN KEY ("impuesto_id") REFERENCES "public"."impuesto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto" ADD CONSTRAINT "fk_producto_estacion" FOREIGN KEY ("estacion_id") REFERENCES "public"."estacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_alergeno" ADD CONSTRAINT "fk_producto_alergeno_producto" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_alergeno" ADD CONSTRAINT "fk_producto_alergeno_alergeno" FOREIGN KEY ("alergeno_id") REFERENCES "public"."alergeno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_foto" ADD CONSTRAINT "fk_producto_foto_producto" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_precio" ADD CONSTRAINT "fk_producto_precio_producto" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_precio" ADD CONSTRAINT "fk_producto_precio_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocion" ADD CONSTRAINT "fk_promocion_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocion" ADD CONSTRAINT "fk_promocion_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_disponibilidad_agotado" ON "disponibilidad_producto" USING btree ("sucursal_id") WHERE agotado;--> statement-breakpoint
CREATE INDEX "ix_producto_categoria" ON "producto" USING btree ("categoria_id") WHERE activo;--> statement-breakpoint
CREATE INDEX "ix_producto_precio_vig" ON "producto_precio" USING btree ("producto_id","sucursal_id","vigente_desde" desc);--> statement-breakpoint
-- SQL manual (D-BD-13): sellos `actualizado_en` de las tablas mutables de E2.
CREATE TRIGGER tg_producto_actualizado_en BEFORE UPDATE ON "producto"
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();--> statement-breakpoint
CREATE TRIGGER tg_disponibilidad_producto_actualizado_en BEFORE UPDATE ON "disponibilidad_producto"
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();