CREATE TYPE "public"."estado_dian_enum" AS ENUM('pendiente', 'enviada', 'aceptada', 'rechazada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."estado_pago_enum" AS ENUM('pendiente', 'aprobado', 'rechazado', 'reembolsado');--> statement-breakpoint
CREATE TABLE "cierre_caja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turno_id" uuid NOT NULL,
	"base_inicial_centavos" bigint DEFAULT 0 NOT NULL,
	"ventas_efectivo_centavos" bigint DEFAULT 0 NOT NULL,
	"ventas_otros_centavos" bigint DEFAULT 0 NOT NULL,
	"propinas_centavos" bigint DEFAULT 0 NOT NULL,
	"retiros_centavos" bigint DEFAULT 0 NOT NULL,
	"gastos_centavos" bigint DEFAULT 0 NOT NULL,
	"contado_centavos" bigint DEFAULT 0 NOT NULL,
	"diferencia_centavos" bigint DEFAULT 0 NOT NULL,
	"observaciones" text,
	"reabierto_por" uuid,
	"reabierto_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_cierre_caja_turno" UNIQUE("turno_id"),
	CONSTRAINT "ck_cierre_caja_base" CHECK (base_inicial_centavos >= 0),
	CONSTRAINT "ck_cierre_caja_ventas_efectivo" CHECK (ventas_efectivo_centavos >= 0),
	CONSTRAINT "ck_cierre_caja_ventas_otros" CHECK (ventas_otros_centavos >= 0),
	CONSTRAINT "ck_cierre_caja_propinas" CHECK (propinas_centavos >= 0),
	CONSTRAINT "ck_cierre_caja_retiros" CHECK (retiros_centavos >= 0),
	CONSTRAINT "ck_cierre_caja_gastos" CHECK (gastos_centavos >= 0),
	CONSTRAINT "ck_cierre_caja_contado" CHECK (contado_centavos >= 0)
);
--> statement-breakpoint
CREATE TABLE "factura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"pedido_id" uuid NOT NULL,
	"numero" bigint NOT NULL,
	"prefijo" text DEFAULT '' NOT NULL,
	"resolucion" text,
	"cufe" text,
	"estado_dian" "estado_dian_enum" DEFAULT 'pendiente' NOT NULL,
	"xml_url" text,
	"pdf_url" text,
	"total_centavos" bigint NOT NULL,
	"impuestos_json" jsonb,
	"emitida_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_factura_numero" UNIQUE("sucursal_id","prefijo","numero"),
	CONSTRAINT "ck_factura_total" CHECK (total_centavos >= 0)
);
--> statement-breakpoint
CREATE TABLE "factura_linea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factura_id" uuid NOT NULL,
	"descripcion" text NOT NULL,
	"cantidad" numeric(10, 3) NOT NULL,
	"precio_centavos" bigint NOT NULL,
	"impuesto_id" uuid,
	"total_centavos" bigint NOT NULL,
	CONSTRAINT "ck_factura_linea_cantidad" CHECK (cantidad > 0),
	CONSTRAINT "ck_factura_linea_precio" CHECK (precio_centavos >= 0),
	CONSTRAINT "ck_factura_linea_total" CHECK (total_centavos >= 0)
);
--> statement-breakpoint
CREATE TABLE "pago" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid,
	"reserva_id" uuid,
	"medio_pago_id" uuid NOT NULL,
	"monto_centavos" bigint NOT NULL,
	"propina_centavos" bigint DEFAULT 0 NOT NULL,
	"referencia" text,
	"estado" "estado_pago_enum" DEFAULT 'pendiente' NOT NULL,
	"pasarela_payload" jsonb,
	"usuario_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"aprobado_en" timestamp with time zone,
	"reembolsado_en" timestamp with time zone,
	CONSTRAINT "ck_pago_monto" CHECK (monto_centavos > 0),
	CONSTRAINT "ck_pago_propina" CHECK (propina_centavos >= 0),
	CONSTRAINT "ck_pago_origen" CHECK ((pedido_id IS NOT NULL) <> (reserva_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "pago_linea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pago_id" uuid NOT NULL,
	"pedido_linea_id" uuid NOT NULL,
	"monto_centavos" bigint NOT NULL,
	CONSTRAINT "ck_pago_linea_monto" CHECK (monto_centavos > 0)
);
--> statement-breakpoint
ALTER TABLE "cierre_caja" ADD CONSTRAINT "fk_cierre_caja_turno" FOREIGN KEY ("turno_id") REFERENCES "public"."turno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cierre_caja" ADD CONSTRAINT "fk_cierre_caja_reabierto_por" FOREIGN KEY ("reabierto_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factura" ADD CONSTRAINT "fk_factura_sucursal" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factura" ADD CONSTRAINT "fk_factura_pedido" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factura_linea" ADD CONSTRAINT "fk_factura_linea_factura" FOREIGN KEY ("factura_id") REFERENCES "public"."factura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factura_linea" ADD CONSTRAINT "fk_factura_linea_impuesto" FOREIGN KEY ("impuesto_id") REFERENCES "public"."impuesto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "fk_pago_pedido" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "fk_pago_reserva" FOREIGN KEY ("reserva_id") REFERENCES "public"."reserva"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "fk_pago_medio_pago" FOREIGN KEY ("medio_pago_id") REFERENCES "public"."medio_pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "fk_pago_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago_linea" ADD CONSTRAINT "fk_pago_linea_pago" FOREIGN KEY ("pago_id") REFERENCES "public"."pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago_linea" ADD CONSTRAINT "fk_pago_linea_linea" FOREIGN KEY ("pedido_linea_id") REFERENCES "public"."pedido_linea"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_factura_pedido" ON "factura" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "ix_pago_pedido" ON "pago" USING btree ("pedido_id","estado");--> statement-breakpoint
CREATE INDEX "ix_pago_reserva" ON "pago" USING btree ("reserva_id","estado");--> statement-breakpoint
-- SQL manual (D-BD-16): invariantes de dinero del pago único.
-- 1) La suma de pagos `aprobado` de un pedido no supera su total.
CREATE OR REPLACE FUNCTION fn_pago_limite_pedido() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	v_total bigint;
	v_suma bigint;
BEGIN
	IF NEW.estado = 'aprobado' AND NEW.pedido_id IS NOT NULL THEN
		-- Bloquea el pedido para serializar pagos concurrentes del mismo pedido.
		SELECT total_centavos INTO v_total FROM pedido WHERE id = NEW.pedido_id FOR UPDATE;
		SELECT COALESCE(SUM(monto_centavos), 0) INTO v_suma
		FROM pago
		WHERE pedido_id = NEW.pedido_id
			AND estado = 'aprobado'
			AND id <> NEW.id;
		IF v_suma + NEW.monto_centavos > v_total THEN
			RAISE EXCEPTION 'pagos aprobados superan el total del pedido (suma %, total %)', v_suma + NEW.monto_centavos, v_total
				USING ERRCODE = 'check_violation';
		END IF;
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER tg_pago_limite_pedido BEFORE INSERT OR UPDATE OF estado, monto_centavos, pedido_id ON "pago"
FOR EACH ROW EXECUTE FUNCTION fn_pago_limite_pedido();--> statement-breakpoint
-- 2) Un pedido no pasa a `pagado` si los pagos aprobados no cubren el total.
CREATE OR REPLACE FUNCTION fn_pedido_pagado_cubierto() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	v_suma bigint;
BEGIN
	IF NEW.estado = 'pagado' AND OLD.estado IS DISTINCT FROM 'pagado' THEN
		SELECT COALESCE(SUM(monto_centavos), 0) INTO v_suma
		FROM pago
		WHERE pedido_id = NEW.id AND estado = 'aprobado';
		IF v_suma < NEW.total_centavos THEN
			RAISE EXCEPTION 'no se puede marcar pagado: pagos aprobados % < total %', v_suma, NEW.total_centavos
				USING ERRCODE = 'check_violation';
		END IF;
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER tg_pedido_pagado_cubierto BEFORE UPDATE OF estado, total_centavos ON "pedido"
FOR EACH ROW EXECUTE FUNCTION fn_pedido_pagado_cubierto();