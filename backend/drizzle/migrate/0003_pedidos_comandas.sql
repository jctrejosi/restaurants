CREATE TYPE "public"."canal_pedido_enum" AS ENUM('web', 'mesero', 'caja', 'kiosco');--> statement-breakpoint
CREATE TYPE "public"."estado_comanda_enum" AS ENUM('pendiente', 'impresa', 'en_preparacion', 'lista', 'entregada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."estado_comanda_linea_enum" AS ENUM('pendiente', 'en_preparacion', 'lista', 'entregada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."estado_pedido_enum" AS ENUM('borrador', 'enviado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'por_cobrar', 'pagado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."estado_pedido_linea_enum" AS ENUM('pendiente', 'enviada', 'en_preparacion', 'lista', 'entregada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."modalidad_pedido_enum" AS ENUM('mesa', 'domicilio', 'recoger');--> statement-breakpoint
CREATE TYPE "public"."tipo_ajuste_enum" AS ENUM('descuento', 'cortesia', 'recargo');--> statement-breakpoint
CREATE TABLE "ajuste_pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"pedido_linea_id" uuid,
	"tipo" "tipo_ajuste_enum" NOT NULL,
	"valor_centavos" bigint,
	"porcentaje" numeric(5, 2),
	"motivo" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_ajuste_valor" CHECK ((valor_centavos IS NOT NULL) <> (porcentaje IS NOT NULL)),
	CONSTRAINT "ck_ajuste_valor_centavos" CHECK (valor_centavos IS NULL OR valor_centavos >= 0),
	CONSTRAINT "ck_ajuste_porcentaje" CHECK (porcentaje IS NULL OR porcentaje BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "comanda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"estacion_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"turno_id" uuid,
	"estado" "estado_comanda_enum" DEFAULT 'pendiente' NOT NULL,
	"enviada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"lista_en" timestamp with time zone,
	"entregada_en" timestamp with time zone,
	CONSTRAINT "uq_comanda" UNIQUE("sucursal_id","numero"),
	CONSTRAINT "ck_comanda_sellos" CHECK (lista_en IS NULL OR lista_en >= enviada_en)
);
--> statement-breakpoint
CREATE TABLE "comanda_linea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comanda_id" uuid NOT NULL,
	"pedido_linea_id" uuid NOT NULL,
	"estado" "estado_comanda_linea_enum" DEFAULT 'pendiente' NOT NULL,
	CONSTRAINT "uq_comanda_linea" UNIQUE("comanda_id","pedido_linea_id")
);
--> statement-breakpoint
CREATE TABLE "pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"canal" "canal_pedido_enum" NOT NULL,
	"modalidad" "modalidad_pedido_enum" NOT NULL,
	"cliente_id" uuid,
	"nombre_contacto" text,
	"telefono_contacto" text,
	"mesa_id" uuid,
	"sesion_mesa_id" uuid,
	"mesero_id" uuid,
	"turno_id" uuid,
	"hora_programada" timestamp with time zone,
	"estado" "estado_pedido_enum" DEFAULT 'borrador' NOT NULL,
	"subtotal_centavos" bigint DEFAULT 0 NOT NULL,
	"descuentos_centavos" bigint DEFAULT 0 NOT NULL,
	"impuestos_centavos" bigint DEFAULT 0 NOT NULL,
	"propina_centavos" bigint DEFAULT 0 NOT NULL,
	"recargos_centavos" bigint DEFAULT 0 NOT NULL,
	"total_centavos" bigint DEFAULT 0 NOT NULL,
	"notas" text,
	"origen_utm" text,
	"client_order_id" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado_en" timestamp with time zone,
	"listo_en" timestamp with time zone,
	"entregado_en" timestamp with time zone,
	"por_cobrar_en" timestamp with time zone,
	"pagado_en" timestamp with time zone,
	"cancelado_en" timestamp with time zone,
	CONSTRAINT "uq_pedido_codigo" UNIQUE("codigo"),
	CONSTRAINT "ck_pedido_mesa" CHECK (modalidad <> 'mesa' OR mesa_id IS NOT NULL),
	CONSTRAINT "ck_pedido_hora" CHECK (modalidad = 'mesa' OR hora_programada IS NOT NULL OR estado = 'borrador'),
	CONSTRAINT "ck_pedido_subtotal" CHECK (subtotal_centavos >= 0),
	CONSTRAINT "ck_pedido_descuentos" CHECK (descuentos_centavos >= 0),
	CONSTRAINT "ck_pedido_impuestos" CHECK (impuestos_centavos >= 0),
	CONSTRAINT "ck_pedido_propina" CHECK (propina_centavos >= 0),
	CONSTRAINT "ck_pedido_recargos" CHECK (recargos_centavos >= 0),
	CONSTRAINT "ck_pedido_total" CHECK (total_centavos >= 0)
);
--> statement-breakpoint
CREATE TABLE "pedido_linea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"nombre_snapshot" text NOT NULL,
	"precio_snapshot_centavos" bigint NOT NULL,
	"impuesto_snapshot" jsonb,
	"cantidad" numeric(10, 3) NOT NULL,
	"es_fraccion" boolean DEFAULT false NOT NULL,
	"cantidad_fraccion" numeric(10, 3),
	"notas" text,
	"comensal" smallint,
	"estado" "estado_pedido_linea_enum" DEFAULT 'pendiente' NOT NULL,
	CONSTRAINT "ck_pedido_linea_precio" CHECK (precio_snapshot_centavos >= 0),
	CONSTRAINT "ck_pedido_linea_cantidad" CHECK (cantidad > 0),
	CONSTRAINT "ck_pedido_linea_cantidad_fraccion" CHECK (cantidad_fraccion IS NULL OR cantidad_fraccion > 0),
	CONSTRAINT "ck_pedido_linea_notas" CHECK (notas IS NULL OR char_length(notas) <= 105)
);
--> statement-breakpoint
CREATE TABLE "pedido_linea_modificador" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_linea_id" uuid NOT NULL,
	"modificador_id" uuid NOT NULL,
	"nombre_snapshot" text NOT NULL,
	"precio_snapshot_centavos" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "ck_pedido_linea_modificador_precio" CHECK (precio_snapshot_centavos >= 0)
);
--> statement-breakpoint
CREATE TABLE "regla_sla" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"estacion_id" uuid,
	"producto_id" uuid,
	"objetivo_seg" integer NOT NULL,
	CONSTRAINT "ck_regla_sla_objetivo" CHECK (objetivo_seg > 0),
	CONSTRAINT "ck_regla_sla_alcance" CHECK ((estacion_id IS NOT NULL) <> (producto_id IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "ajuste_pedido" ADD CONSTRAINT "fk_ajuste_pedido_pedido" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajuste_pedido" ADD CONSTRAINT "fk_ajuste_pedido_linea" FOREIGN KEY ("pedido_linea_id") REFERENCES "public"."pedido_linea"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajuste_pedido" ADD CONSTRAINT "fk_ajuste_pedido_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comanda" ADD CONSTRAINT "fk_comanda_pedido" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comanda" ADD CONSTRAINT "fk_comanda_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comanda" ADD CONSTRAINT "fk_comanda_estacion" FOREIGN KEY ("estacion_id") REFERENCES "public"."estacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comanda" ADD CONSTRAINT "fk_comanda_turno" FOREIGN KEY ("turno_id") REFERENCES "public"."turno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comanda_linea" ADD CONSTRAINT "fk_comanda_linea_comanda" FOREIGN KEY ("comanda_id") REFERENCES "public"."comanda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comanda_linea" ADD CONSTRAINT "fk_comanda_linea_linea" FOREIGN KEY ("pedido_linea_id") REFERENCES "public"."pedido_linea"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "fk_pedido_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "fk_pedido_cliente" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "fk_pedido_mesa" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "fk_pedido_sesion_mesa" FOREIGN KEY ("sesion_mesa_id") REFERENCES "public"."sesion_mesa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "fk_pedido_mesero" FOREIGN KEY ("mesero_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "fk_pedido_turno" FOREIGN KEY ("turno_id") REFERENCES "public"."turno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_linea" ADD CONSTRAINT "fk_pedido_linea_pedido" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_linea" ADD CONSTRAINT "fk_pedido_linea_producto" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_linea_modificador" ADD CONSTRAINT "fk_pedido_linea_modificador_linea" FOREIGN KEY ("pedido_linea_id") REFERENCES "public"."pedido_linea"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_linea_modificador" ADD CONSTRAINT "fk_pedido_linea_modificador_modificador" FOREIGN KEY ("modificador_id") REFERENCES "public"."modificador"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regla_sla" ADD CONSTRAINT "fk_regla_sla_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regla_sla" ADD CONSTRAINT "fk_regla_sla_estacion" FOREIGN KEY ("estacion_id") REFERENCES "public"."estacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regla_sla" ADD CONSTRAINT "fk_regla_sla_producto" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_comanda_kds" ON "comanda" USING btree ("estacion_id","estado");--> statement-breakpoint
CREATE INDEX "ix_pedido_activo" ON "pedido" USING btree ("sucursal_id","estado","creado_en") WHERE estado NOT IN ('pagado', 'cancelado');--> statement-breakpoint
CREATE INDEX "ix_pedido_mesa" ON "pedido" USING btree ("mesa_id") WHERE estado NOT IN ('pagado', 'cancelado');--> statement-breakpoint
CREATE INDEX "ix_pedido_contacto" ON "pedido" USING btree ("sucursal_id","telefono_contacto","creado_en" desc);