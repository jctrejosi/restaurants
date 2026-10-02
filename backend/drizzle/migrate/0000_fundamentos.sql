CREATE TYPE "public"."comportamiento_offline_enum" AS ENUM('completo', 'solo_lectura');--> statement-breakpoint
CREATE TYPE "public"."estado_dispositivo_enum" AS ENUM('vinculado', 'revocado');--> statement-breakpoint
CREATE TYPE "public"."estado_repartidor_enum" AS ENUM('activo', 'inactivo', 'ocupado');--> statement-breakpoint
CREATE TYPE "public"."estado_solicitud_evento_enum" AS ENUM('nueva', 'en_revision', 'contactada', 'cerrada');--> statement-breakpoint
CREATE TYPE "public"."estado_turno_enum" AS ENUM('abierto', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."franja_servicio_enum" AS ENUM('desayuno', 'comida', 'cena');--> statement-breakpoint
CREATE TYPE "public"."tipo_conexion_impresora_enum" AS ENUM('red', 'usb', 'bluetooth');--> statement-breakpoint
CREATE TYPE "public"."tipo_consecutivo_enum" AS ENUM('pedido', 'comanda', 'factura');--> statement-breakpoint
CREATE TYPE "public"."tipo_consentimiento_enum" AS ENUM('datos', 'marketing', 'cookies');--> statement-breakpoint
CREATE TYPE "public"."tipo_dispositivo_enum" AS ENUM('apk', 'kds', 'caja');--> statement-breakpoint
CREATE TYPE "public"."tipo_estacion_enum" AS ENUM('preparacion', 'despacho');--> statement-breakpoint
CREATE TYPE "public"."tipo_impuesto_enum" AS ENUM('incluido', 'adicionado', 'inc');--> statement-breakpoint
CREATE TYPE "public"."tipo_medio_pago_enum" AS ENUM('efectivo', 'tarjeta', 'transferencia', 'pasarela', 'otro');--> statement-breakpoint
CREATE TABLE "cierre_temporal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"desde" timestamp with time zone NOT NULL,
	"hasta" timestamp with time zone NOT NULL,
	"motivo" text,
	CONSTRAINT "ck_cierre_rango" CHECK (desde < hasta)
);
--> statement-breakpoint
CREATE TABLE "cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text,
	"correo" text,
	"fecha_nacimiento" date,
	"preferencias" jsonb,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracion_sucursal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"propina_sugerida_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"copias_comanda" smallint DEFAULT 1 NOT NULL,
	"copias_factura" smallint DEFAULT 1 NOT NULL,
	"borrado_comanda_impresa" boolean DEFAULT false NOT NULL,
	"comportamiento_offline" "comportamiento_offline_enum" DEFAULT 'completo' NOT NULL,
	"ventana_programacion_min" integer DEFAULT 1440 NOT NULL,
	"limite_pedidos_franja" integer,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_configuracion_sucursal" UNIQUE("sucursal_id"),
	CONSTRAINT "ck_configuracion_propina" CHECK (propina_sugerida_pct BETWEEN 0 AND 100),
	CONSTRAINT "ck_configuracion_copias_comanda" CHECK (copias_comanda BETWEEN 1 AND 5),
	CONSTRAINT "ck_configuracion_copias_factura" CHECK (copias_factura BETWEEN 1 AND 5),
	CONSTRAINT "ck_configuracion_ventana" CHECK (ventana_programacion_min > 0),
	CONSTRAINT "ck_configuracion_limite" CHECK (limite_pedidos_franja IS NULL OR limite_pedidos_franja > 0)
);
--> statement-breakpoint
CREATE TABLE "consecutivo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"tipo" "tipo_consecutivo_enum" NOT NULL,
	"prefijo" text DEFAULT '' NOT NULL,
	"siguiente" bigint DEFAULT 1 NOT NULL,
	"resolucion" text,
	"vigencia_hasta" date,
	CONSTRAINT "uq_consecutivo" UNIQUE("sucursal_id","tipo","prefijo"),
	CONSTRAINT "ck_consecutivo_siguiente" CHECK (siguiente > 0)
);
--> statement-breakpoint
CREATE TABLE "consentimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"tipo" "tipo_consentimiento_enum" NOT NULL,
	"canal" text NOT NULL,
	"base_legal" text,
	"otorgado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"revocado_en" timestamp with time zone,
	CONSTRAINT "ck_consentimiento_fechas" CHECK (revocado_en IS NULL OR revocado_en >= otorgado_en)
);
--> statement-breakpoint
CREATE TABLE "dispositivo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"sucursal_id" uuid NOT NULL,
	"tipo" "tipo_dispositivo_enum" NOT NULL,
	"token" text NOT NULL,
	"estacion_id" uuid,
	"version_app" text,
	"ultima_conexion_en" timestamp with time zone,
	"estado" "estado_dispositivo_enum" DEFAULT 'vinculado' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_dispositivo_token" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "estacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "tipo_estacion_enum" DEFAULT 'preparacion' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_estacion" UNIQUE("sucursal_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "horario_atencion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"dia_semana" smallint NOT NULL,
	"franja" "franja_servicio_enum" NOT NULL,
	"hora_apertura" time NOT NULL,
	"hora_cierre" time NOT NULL,
	CONSTRAINT "ck_horario_dia_semana" CHECK (dia_semana BETWEEN 0 AND 6),
	CONSTRAINT "ck_horario_rango" CHECK (hora_apertura < hora_cierre)
);
--> statement-breakpoint
CREATE TABLE "impresora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo_conexion" "tipo_conexion_impresora_enum" NOT NULL,
	"direccion" text,
	"perfil" text,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_impresora" UNIQUE("sucursal_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "impuesto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tasa_bps" integer NOT NULL,
	"tipo" "tipo_impuesto_enum" NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ck_impuesto_tasa" CHECK (tasa_bps BETWEEN 0 AND 100000)
);
--> statement-breakpoint
CREATE TABLE "medio_pago" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "tipo_medio_pago_enum" NOT NULL,
	"requiere_referencia" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_medio_pago" UNIQUE("sucursal_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "permiso" (
	"codigo" text PRIMARY KEY NOT NULL,
	"descripcion" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regla_capacidad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"franja" text NOT NULL,
	"maximo_pedidos" integer NOT NULL,
	CONSTRAINT "uq_regla_capacidad" UNIQUE("sucursal_id","franja"),
	CONSTRAINT "ck_regla_capacidad_maximo" CHECK (maximo_pedidos > 0)
);
--> statement-breakpoint
CREATE TABLE "repartidor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text,
	"vehiculo" text,
	"estado" "estado_repartidor_enum" DEFAULT 'activo' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rol" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"es_sistema" boolean DEFAULT false NOT NULL,
	CONSTRAINT "uq_rol" UNIQUE("tenant_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "rol_permiso" (
	"rol_id" uuid NOT NULL,
	"permiso_codigo" text NOT NULL,
	CONSTRAINT "pk_rol_permiso" PRIMARY KEY("rol_id","permiso_codigo")
);
--> statement-breakpoint
CREATE TABLE "solicitud_evento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"nombre_contacto" text NOT NULL,
	"telefono" text,
	"correo" text,
	"tipo" text NOT NULL,
	"fecha_tentativa" date,
	"personas" integer,
	"mensaje" text,
	"estado" "estado_solicitud_evento_enum" DEFAULT 'nueva' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_solicitud_personas" CHECK (personas IS NULL OR personas > 0)
);
--> statement-breakpoint
CREATE TABLE "sucursal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"codigo" text NOT NULL,
	"direccion" text,
	"ciudad" text,
	"telefono" text,
	"coordenadas" jsonb,
	"zona_horaria" text DEFAULT 'America/Bogota' NOT NULL,
	"moneda" char(3) DEFAULT 'COP' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_sucursal_codigo" UNIQUE("tenant_id","codigo")
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turno" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"estado" "estado_turno_enum" DEFAULT 'abierto' NOT NULL,
	"abierto_en" timestamp with time zone DEFAULT now() NOT NULL,
	"cerrado_en" timestamp with time zone,
	"usuario_apertura_id" uuid,
	"usuario_cierre_id" uuid,
	CONSTRAINT "uq_turno" UNIQUE("sucursal_id","numero")
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"email" text,
	"pin_hash" text,
	"pin_salt" text,
	"activo" boolean DEFAULT true NOT NULL,
	"ultimo_acceso_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_usuario_email" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
CREATE TABLE "usuario_rol" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"rol_id" uuid NOT NULL,
	"sucursal_id" uuid,
	CONSTRAINT "uq_usuario_rol" UNIQUE NULLS NOT DISTINCT("usuario_id","rol_id","sucursal_id")
);
--> statement-breakpoint
ALTER TABLE "cierre_temporal" ADD CONSTRAINT "fk_cierre_temporal_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "fk_cliente_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracion_sucursal" ADD CONSTRAINT "fk_configuracion_sucursal_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consecutivo" ADD CONSTRAINT "fk_consecutivo_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consentimiento" ADD CONSTRAINT "fk_consentimiento_cliente" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispositivo" ADD CONSTRAINT "fk_dispositivo_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispositivo" ADD CONSTRAINT "fk_dispositivo_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispositivo" ADD CONSTRAINT "fk_dispositivo_estacion" FOREIGN KEY ("estacion_id") REFERENCES "public"."estacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estacion" ADD CONSTRAINT "fk_estacion_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horario_atencion" ADD CONSTRAINT "fk_horario_atencion_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impresora" ADD CONSTRAINT "fk_impresora_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impuesto" ADD CONSTRAINT "fk_impuesto_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medio_pago" ADD CONSTRAINT "fk_medio_pago_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regla_capacidad" ADD CONSTRAINT "fk_regla_capacidad_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repartidor" ADD CONSTRAINT "fk_repartidor_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rol" ADD CONSTRAINT "fk_rol_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rol_permiso" ADD CONSTRAINT "fk_rol_permiso_rol" FOREIGN KEY ("rol_id") REFERENCES "public"."rol"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rol_permiso" ADD CONSTRAINT "fk_rol_permiso_permiso" FOREIGN KEY ("permiso_codigo") REFERENCES "public"."permiso"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_evento" ADD CONSTRAINT "fk_solicitud_evento_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sucursal" ADD CONSTRAINT "fk_sucursal_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turno" ADD CONSTRAINT "fk_turno_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turno" ADD CONSTRAINT "fk_turno_usuario_apertura" FOREIGN KEY ("usuario_apertura_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turno" ADD CONSTRAINT "fk_turno_usuario_cierre" FOREIGN KEY ("usuario_cierre_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "fk_usuario_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_rol" ADD CONSTRAINT "fk_usuario_rol_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_rol" ADD CONSTRAINT "fk_usuario_rol_rol" FOREIGN KEY ("rol_id") REFERENCES "public"."rol"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_rol" ADD CONSTRAINT "fk_usuario_rol_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_cliente_telefono" ON "cliente" USING btree ("tenant_id","telefono");--> statement-breakpoint
CREATE INDEX "ix_dispositivo_sucursal" ON "dispositivo" USING btree ("sucursal_id","tipo");--> statement-breakpoint
CREATE INDEX "ix_horario_sucursal" ON "horario_atencion" USING btree ("sucursal_id","dia_semana");--> statement-breakpoint
CREATE INDEX "ix_turno_abierto" ON "turno" USING btree ("sucursal_id") WHERE estado = 'abierto';--> statement-breakpoint
CREATE INDEX "ix_usuario_activo" ON "usuario" USING btree ("tenant_id") WHERE activo;--> statement-breakpoint
-- SQL manual (D-BD-13): mantiene el sello `actualizado_en` en las tablas mutables de E1.
CREATE OR REPLACE FUNCTION fn_set_actualizado_en() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	NEW.actualizado_en = now();
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER tg_sucursal_actualizado_en BEFORE UPDATE ON "sucursal"
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();--> statement-breakpoint
CREATE TRIGGER tg_configuracion_sucursal_actualizado_en BEFORE UPDATE ON "configuracion_sucursal"
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();--> statement-breakpoint
CREATE TRIGGER tg_usuario_actualizado_en BEFORE UPDATE ON "usuario"
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();--> statement-breakpoint
CREATE TRIGGER tg_cliente_actualizado_en BEFORE UPDATE ON "cliente"
FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();