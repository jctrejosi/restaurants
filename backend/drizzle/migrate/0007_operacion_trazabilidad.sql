CREATE TYPE "public"."actor_bitacora_enum" AS ENUM('cliente', 'usuario', 'sistema', 'dispositivo');--> statement-breakpoint
CREATE TYPE "public"."entidad_bitacora_enum" AS ENUM('reserva', 'pedido', 'comanda', 'pago', 'turno');--> statement-breakpoint
CREATE TYPE "public"."estado_alerta_enum" AS ENUM('abierta', 'atendida', 'descartada');--> statement-breakpoint
CREATE TYPE "public"."estado_exportacion_enum" AS ENUM('pendiente', 'procesando', 'lista', 'fallida');--> statement-breakpoint
CREATE TYPE "public"."estado_impresion_enum" AS ENUM('pendiente', 'enviado', 'impreso', 'reintentando', 'fallido');--> statement-breakpoint
CREATE TYPE "public"."estado_sync_enum" AS ENUM('pendiente', 'aplicada', 'rechazada');--> statement-breakpoint
CREATE TYPE "public"."formato_exportacion_enum" AS ENUM('csv', 'xlsx', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."periodicidad_reporte_enum" AS ENUM('diario', 'semanal', 'mensual');--> statement-breakpoint
CREATE TYPE "public"."severidad_alerta_enum" AS ENUM('baja', 'media', 'alta');--> statement-breakpoint
CREATE TYPE "public"."tipo_alerta_enum" AS ENUM('impresora', 'dispositivo', 'sync', 'sla', 'stock');--> statement-breakpoint
CREATE TYPE "public"."tipo_impresion_enum" AS ENUM('comanda', 'precuenta', 'recibo', 'factura');--> statement-breakpoint
CREATE TYPE "public"."visibilidad_reporte_enum" AS ENUM('privado', 'equipo');--> statement-breakpoint
CREATE TABLE "alerta_operativa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"tipo" "tipo_alerta_enum" NOT NULL,
	"severidad" "severidad_alerta_enum" NOT NULL,
	"entidad" text,
	"entidad_id" uuid,
	"estado" "estado_alerta_enum" DEFAULT 'abierta' NOT NULL,
	"atendida_por" uuid,
	"atendida_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bitacora_evento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entidad_tipo" "entidad_bitacora_enum" NOT NULL,
	"entidad_id" uuid NOT NULL,
	"evento" text NOT NULL,
	"actor_tipo" "actor_bitacora_enum" NOT NULL,
	"actor_id" uuid,
	"canal" text,
	"dispositivo_id" uuid,
	"datos" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evento_auditoria" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sucursal_id" uuid,
	"usuario_id" uuid,
	"dispositivo_id" uuid,
	"entidad" text NOT NULL,
	"entidad_id" uuid,
	"accion" text NOT NULL,
	"motivo" text,
	"datos_antes" jsonb,
	"datos_despues" jsonb,
	"ip" "inet",
	"request_id" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_evento_auditoria" PRIMARY KEY("id","creado_en")
) PARTITION BY RANGE ("creado_en");
--> statement-breakpoint
CREATE TABLE "exportacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"filtros" jsonb,
	"formato" "formato_exportacion_enum" NOT NULL,
	"estado" "estado_exportacion_enum" DEFAULT 'pendiente' NOT NULL,
	"url" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporte_guardado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"filtros" jsonb NOT NULL,
	"visibilidad" "visibilidad_reporte_enum" DEFAULT 'privado' NOT NULL,
	CONSTRAINT "uq_reporte_guardado" UNIQUE("usuario_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "reporte_programado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"filtros" jsonb NOT NULL,
	"periodicidad" "periodicidad_reporte_enum" NOT NULL,
	"destinatarios" text[] NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_operacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispositivo_id" uuid NOT NULL,
	"client_op_id" text NOT NULL,
	"tipo" text NOT NULL,
	"payload" jsonb NOT NULL,
	"estado" "estado_sync_enum" DEFAULT 'pendiente' NOT NULL,
	"aplicado_en" timestamp with time zone,
	"error" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_sync_op" UNIQUE("client_op_id")
);
--> statement-breakpoint
CREATE TABLE "trabajo_impresion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comanda_id" uuid,
	"factura_id" uuid,
	"impresora_id" uuid NOT NULL,
	"tipo" "tipo_impresion_enum" NOT NULL,
	"estado" "estado_impresion_enum" DEFAULT 'pendiente' NOT NULL,
	"intentos" smallint DEFAULT 0 NOT NULL,
	"ultimo_error" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"impreso_en" timestamp with time zone,
	CONSTRAINT "ck_impresion_origen" CHECK ((comanda_id IS NOT NULL) <> (factura_id IS NOT NULL)),
	CONSTRAINT "ck_impresion_intentos" CHECK (intentos >= 0)
);
--> statement-breakpoint
CREATE TABLE "umbral_alerta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"valor" numeric NOT NULL,
	"rol_destinatario" uuid,
	CONSTRAINT "uq_umbral" UNIQUE("tenant_id","tipo")
);
--> statement-breakpoint
ALTER TABLE "alerta_operativa" ADD CONSTRAINT "fk_alerta_operativa_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerta_operativa" ADD CONSTRAINT "fk_alerta_operativa_atendida_por" FOREIGN KEY ("atendida_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacora_evento" ADD CONSTRAINT "fk_bitacora_evento_dispositivo" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_auditoria" ADD CONSTRAINT "fk_evento_auditoria_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_auditoria" ADD CONSTRAINT "fk_evento_auditoria_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_auditoria" ADD CONSTRAINT "fk_evento_auditoria_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_auditoria" ADD CONSTRAINT "fk_evento_auditoria_dispositivo" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exportacion" ADD CONSTRAINT "fk_exportacion_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporte_guardado" ADD CONSTRAINT "fk_reporte_guardado_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporte_programado" ADD CONSTRAINT "fk_reporte_programado_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operacion" ADD CONSTRAINT "fk_sync_operacion_dispositivo" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajo_impresion" ADD CONSTRAINT "fk_trabajo_impresion_comanda" FOREIGN KEY ("comanda_id") REFERENCES "public"."comanda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajo_impresion" ADD CONSTRAINT "fk_trabajo_impresion_factura" FOREIGN KEY ("factura_id") REFERENCES "public"."factura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajo_impresion" ADD CONSTRAINT "fk_trabajo_impresion_impresora" FOREIGN KEY ("impresora_id") REFERENCES "public"."impresora"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "umbral_alerta" ADD CONSTRAINT "fk_umbral_alerta_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "umbral_alerta" ADD CONSTRAINT "fk_umbral_alerta_rol" FOREIGN KEY ("rol_destinatario") REFERENCES "public"."rol"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_alerta_abierta" ON "alerta_operativa" USING btree ("sucursal_id") WHERE estado = 'abierta';--> statement-breakpoint
CREATE INDEX "ix_bitacora_entidad" ON "bitacora_evento" USING btree ("entidad_tipo","entidad_id","creado_en");--> statement-breakpoint
CREATE INDEX "ix_auditoria_entidad" ON "evento_auditoria" USING btree ("entidad","entidad_id","creado_en");--> statement-breakpoint
CREATE INDEX "ix_auditoria_usuario" ON "evento_auditoria" USING btree ("usuario_id","creado_en");--> statement-breakpoint
CREATE INDEX "ix_sync_estado" ON "sync_operacion" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "ix_impresion_cola" ON "trabajo_impresion" USING btree ("estado","creado_en");--> statement-breakpoint
CREATE INDEX "ix_encuesta_tipo" ON "encuesta" USING btree ("tipo","creado_en" desc);--> statement-breakpoint
-- SQL manual (D-BD-13): auditoría particionada por mes.
CREATE OR REPLACE FUNCTION fn_crear_particion_auditoria(p_mes date) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
	v_desde date := date_trunc('month', p_mes)::date;
	v_hasta date := (date_trunc('month', p_mes) + interval '1 month')::date;
	v_nombre text := 'evento_auditoria_' || to_char(v_desde, 'YYYY_MM');
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = v_nombre) THEN
		EXECUTE format(
			'CREATE TABLE %I PARTITION OF evento_auditoria FOR VALUES FROM (%L) TO (%L)',
			v_nombre,
			(v_desde::timestamp AT TIME ZONE 'UTC'),
			(v_hasta::timestamp AT TIME ZONE 'UTC')
		);
	END IF;
END;
$$;--> statement-breakpoint
SELECT fn_crear_particion_auditoria('2026-10-01'::date);--> statement-breakpoint
SELECT fn_crear_particion_auditoria('2026-11-01'::date);--> statement-breakpoint
SELECT fn_crear_particion_auditoria('2026-12-01'::date);--> statement-breakpoint
SELECT fn_crear_particion_auditoria('2027-01-01'::date);--> statement-breakpoint
-- Colchón para que un INSERT nunca falle; el job crea particiones con antelación.
CREATE TABLE evento_auditoria_default PARTITION OF evento_auditoria DEFAULT;--> statement-breakpoint
-- SQL manual (D-BD-13): auditoría inmutable (se suma a los permisos por rol).
CREATE OR REPLACE FUNCTION fn_evento_auditoria_inmutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'evento_auditoria es inmutable: % no permitido', TG_OP
		USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint
CREATE TRIGGER tg_evento_auditoria_inmutable BEFORE UPDATE OR DELETE ON "evento_auditoria"
FOR EACH ROW EXECUTE FUNCTION fn_evento_auditoria_inmutable();