CREATE TYPE "public"."canal_notificacion_enum" AS ENUM('correo', 'whatsapp', 'sms', 'push');--> statement-breakpoint
CREATE TYPE "public"."destinatario_notificacion_enum" AS ENUM('cliente', 'usuario', 'contacto');--> statement-breakpoint
CREATE TYPE "public"."estado_notificacion_enum" AS ENUM('pendiente', 'enviada', 'fallida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."fuente_resena_enum" AS ENUM('web', 'google', 'tripadvisor', 'otra');--> statement-breakpoint
CREATE TYPE "public"."tipo_encuesta_enum" AS ENUM('pedido', 'reserva', 'visita');--> statement-breakpoint
CREATE TABLE "configuracion_notificacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"evento" text NOT NULL,
	"canal" "canal_notificacion_enum" NOT NULL,
	"plantilla_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_config_notificacion" UNIQUE("tenant_id","evento","canal")
);
--> statement-breakpoint
CREATE TABLE "encuesta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_encuesta_enum" NOT NULL,
	"referencia_id" uuid,
	"cliente_id" uuid,
	"puntaje" smallint NOT NULL,
	"comentario" text,
	"canal" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_encuesta" UNIQUE("tipo","referencia_id"),
	CONSTRAINT "ck_encuesta_puntaje" CHECK (puntaje BETWEEN 0 AND 10)
);
--> statement-breakpoint
CREATE TABLE "evento_analitica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"origen_utm" jsonb,
	"consentimiento" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destinatario_tipo" "destinatario_notificacion_enum" NOT NULL,
	"destinatario_id" uuid,
	"canal" "canal_notificacion_enum" NOT NULL,
	"plantilla_id" uuid,
	"payload" jsonb,
	"estado" "estado_notificacion_enum" DEFAULT 'pendiente' NOT NULL,
	"enviado_en" timestamp with time zone,
	"error" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantilla_notificacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"evento" text NOT NULL,
	"canal" "canal_notificacion_enum" NOT NULL,
	"idioma" text DEFAULT 'es' NOT NULL,
	"asunto" text,
	"cuerpo" text NOT NULL,
	CONSTRAINT "uq_plantilla" UNIQUE("tenant_id","evento","canal","idioma")
);
--> statement-breakpoint
CREATE TABLE "resena" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"cliente_id" uuid,
	"puntaje" smallint NOT NULL,
	"comentario" text,
	"fuente" "fuente_resena_enum" NOT NULL,
	"fecha" date DEFAULT current_date NOT NULL,
	"publicada" boolean DEFAULT false NOT NULL,
	CONSTRAINT "ck_resena_puntaje" CHECK (puntaje BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "segmento_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"criterio" jsonb NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_segmento" UNIQUE("tenant_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "suscriptor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"correo" text NOT NULL,
	"consentimiento_en" timestamp with time zone NOT NULL,
	"origen" text,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_suscriptor" UNIQUE("tenant_id","correo")
);
--> statement-breakpoint
ALTER TABLE "configuracion_notificacion" ADD CONSTRAINT "fk_configuracion_notificacion_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracion_notificacion" ADD CONSTRAINT "fk_configuracion_notificacion_plantilla" FOREIGN KEY ("plantilla_id") REFERENCES "public"."plantilla_notificacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encuesta" ADD CONSTRAINT "fk_encuesta_cliente" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_analitica" ADD CONSTRAINT "fk_evento_analitica_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacion" ADD CONSTRAINT "fk_notificacion_plantilla" FOREIGN KEY ("plantilla_id") REFERENCES "public"."plantilla_notificacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantilla_notificacion" ADD CONSTRAINT "fk_plantilla_notificacion_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resena" ADD CONSTRAINT "fk_resena_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resena" ADD CONSTRAINT "fk_resena_cliente" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segmento_cliente" ADD CONSTRAINT "fk_segmento_cliente_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suscriptor" ADD CONSTRAINT "fk_suscriptor_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_notificacion_envio" ON "notificacion" USING btree ("estado","creado_en");--> statement-breakpoint
-- SQL manual (D-BD-13): sello `actualizado_en` de `segmento_cliente`.
CREATE TRIGGER tg_segmento_cliente_actualizado_en BEFORE UPDATE ON "segmento_cliente"
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();