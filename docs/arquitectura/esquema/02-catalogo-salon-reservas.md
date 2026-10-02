# 02 — Esquema: catálogo, salón y reservas

Carta y precios, modificadores, disponibilidad, salón y reservas (migración `0020`–`0031` del plan).

## 2.1 Catálogo

```sql
CREATE TABLE categoria (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id),
  nombre     text NOT NULL,
  orden      integer NOT NULL DEFAULT 0,
  activa     boolean NOT NULL DEFAULT true
);

CREATE TABLE producto (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id         uuid NOT NULL REFERENCES categoria(id),
  nombre               text NOT NULL,
  descripcion          text,
  impuesto_id          uuid NOT NULL REFERENCES impuesto(id),
  estacion_id          uuid REFERENCES estacion(id),   -- NULL o estación '99' = sin comanda
  sku                  text,
  codigo_barras        text,
  tiempo_objetivo_seg  integer CHECK (tiempo_objetivo_seg IS NULL OR tiempo_objetivo_seg > 0),
  etiquetas            text[],                          -- vegetariano, sin_gluten, picante…
  activo               boolean NOT NULL DEFAULT true,
  destacado            boolean NOT NULL DEFAULT false,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE producto_precio (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id      uuid NOT NULL REFERENCES producto(id),
  sucursal_id      uuid NOT NULL REFERENCES sucursal(id),
  precio_centavos  bigint NOT NULL CHECK (precio_centavos >= 0),
  vigente_desde    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_producto_precio UNIQUE (producto_id, sucursal_id, vigente_desde)
);

CREATE TABLE producto_foto (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES producto(id),
  url         text NOT NULL,
  orden       smallint NOT NULL DEFAULT 0,
  texto_alt   text
);

CREATE TABLE alergeno (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  text NOT NULL UNIQUE
);

CREATE TABLE producto_alergeno (
  producto_id  uuid NOT NULL REFERENCES producto(id),
  alergeno_id  uuid NOT NULL REFERENCES alergeno(id),
  PRIMARY KEY (producto_id, alergeno_id)
);

CREATE TABLE grupo_modificador (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id   uuid REFERENCES producto(id),
  categoria_id  uuid REFERENCES categoria(id),
  nombre        text NOT NULL,
  minimo        smallint NOT NULL DEFAULT 0 CHECK (minimo >= 0),
  maximo        smallint NOT NULL DEFAULT 1 CHECK (maximo >= minimo),
  obligatorio   boolean NOT NULL DEFAULT false,
  CONSTRAINT ck_grupo_padre CHECK ((producto_id IS NOT NULL) <> (categoria_id IS NOT NULL))
);

CREATE TABLE modificador (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id          uuid NOT NULL REFERENCES grupo_modificador(id),
  nombre            text NOT NULL,
  precio_centavos   bigint NOT NULL DEFAULT 0 CHECK (precio_centavos >= 0),
  activo            boolean NOT NULL DEFAULT true
);
```

## 2.2 Disponibilidad, promociones y cupones

```sql
CREATE TABLE disponibilidad_producto (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id     uuid NOT NULL REFERENCES producto(id),
  sucursal_id     uuid NOT NULL REFERENCES sucursal(id),
  franja          text CHECK (franja IN ('desayuno','comida','cena')),  -- NULL = todo el día
  disponible      boolean NOT NULL DEFAULT true,
  agotado         boolean NOT NULL DEFAULT false,
  agotado_origen  text CHECK (agotado_origen IN ('cocina','salon','backoffice')),
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_disponibilidad UNIQUE NULLS NOT DISTINCT (producto_id, sucursal_id, franja)
);

CREATE TABLE promocion (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  titulo        text NOT NULL,
  texto         text,
  imagen_url    text,
  tipo          text NOT NULL CHECK (tipo IN ('banner','cupon','destacado')),
  desde         timestamptz NOT NULL,
  hasta         timestamptz NOT NULL,
  sucursal_id   uuid REFERENCES sucursal(id),   -- NULL = todas
  activa        boolean NOT NULL DEFAULT true,
  CONSTRAINT ck_promocion_rango CHECK (desde < hasta)
);

CREATE TABLE cupon (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text NOT NULL UNIQUE,
  tipo          text NOT NULL CHECK (tipo IN ('porcentaje','monto')),
  valor         bigint NOT NULL CHECK (valor > 0),
  desde         timestamptz NOT NULL,
  hasta         timestamptz NOT NULL,
  usos_maximo   integer CHECK (usos_maximo IS NULL OR usos_maximo > 0),
  usos          integer NOT NULL DEFAULT 0 CHECK (usos >= 0),
  sucursal_id   uuid REFERENCES sucursal(id),
  CONSTRAINT ck_cupon_rango CHECK (desde < hasta),
  CONSTRAINT ck_cupon_usos  CHECK (usos_maximo IS NULL OR usos <= usos_maximo)
);
```

## 2.3 Cocina: SLA por estación o producto

```sql
CREATE TABLE regla_sla (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id   uuid NOT NULL REFERENCES sucursal(id),
  estacion_id   uuid REFERENCES estacion(id),
  producto_id   uuid REFERENCES producto(id),
  objetivo_seg  integer NOT NULL CHECK (objetivo_seg > 0),
  CONSTRAINT ck_regla_sla_alcance CHECK ((estacion_id IS NOT NULL) <> (producto_id IS NOT NULL))
);
```

## 2.4 Salón

```sql
CREATE TABLE zona (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id  uuid NOT NULL REFERENCES sucursal(id),
  nombre       text NOT NULL,
  aforo        integer CHECK (aforo IS NULL OR aforo > 0),
  orden        integer NOT NULL DEFAULT 0,
  CONSTRAINT uq_zona UNIQUE (sucursal_id, nombre)
);

CREATE TABLE mesa (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id  uuid NOT NULL REFERENCES sucursal(id),
  zona_id      uuid NOT NULL REFERENCES zona(id),
  numero       text NOT NULL,
  capacidad    smallint NOT NULL CHECK (capacidad > 0),
  estado       text NOT NULL DEFAULT 'libre'
                 CHECK (estado IN ('libre','ocupada','por_cobrar','reservada','fuera_servicio')),
  pos_x        numeric(6,2),
  pos_y        numeric(6,2),
  activa       boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_mesa UNIQUE (sucursal_id, numero)
);

CREATE TABLE mesa_asignacion (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id    uuid NOT NULL REFERENCES turno(id),
  zona_id     uuid REFERENCES zona(id),
  mesa_id     uuid REFERENCES mesa(id),
  usuario_id  uuid NOT NULL REFERENCES usuario(id),
  desde       timestamptz NOT NULL DEFAULT now(),
  hasta       timestamptz,
  CONSTRAINT ck_asignacion_alcance CHECK ((zona_id IS NOT NULL) <> (mesa_id IS NOT NULL))
);

CREATE TABLE sesion_mesa (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id      uuid NOT NULL REFERENCES mesa(id),
  token        text NOT NULL UNIQUE,
  abierta_en   timestamptz NOT NULL DEFAULT now(),
  cerrada_en   timestamptz,
  CONSTRAINT ck_sesion_fechas CHECK (cerrada_en IS NULL OR cerrada_en >= abierta_en)
);
```

## 2.5 Reservas

```sql
CREATE TABLE politica_reserva (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id            uuid NOT NULL UNIQUE REFERENCES sucursal(id),
  antelacion_min_horas   integer NOT NULL DEFAULT 2  CHECK (antelacion_min_horas >= 0),
  antelacion_max_dias    integer NOT NULL DEFAULT 30 CHECK (antelacion_max_dias > 0),
  duracion_min           integer NOT NULL DEFAULT 90 CHECK (duracion_min > 0),
  tolerancia_min         integer NOT NULL DEFAULT 15 CHECK (tolerancia_min >= 0),
  cancelacion_horas      integer NOT NULL DEFAULT 2  CHECK (cancelacion_horas >= 0),
  maximo_personas        integer NOT NULL DEFAULT 8  CHECK (maximo_personas > 0),
  deposito_regla         text NOT NULL DEFAULT 'no'
                           CHECK (deposito_regla IN ('no','siempre','grupos','fechas_especiales')),
  deposito_monto_centavos bigint CHECK (deposito_monto_centavos IS NULL OR deposito_monto_centavos > 0),
  no_show_regla          text,
  actualizado_en             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_politica_rango CHECK (antelacion_min_horas <= antelacion_max_dias * 24)
);

CREATE TABLE reserva (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id           uuid NOT NULL REFERENCES sucursal(id),
  cliente_id            uuid REFERENCES cliente(id),
  nombre_contacto       text NOT NULL,
  telefono_contacto     text,
  correo_contacto       text,
  fecha_hora            timestamptz NOT NULL,
  duracion_min          integer NOT NULL CHECK (duracion_min > 0),
  periodo               tstzrange NOT NULL,   -- [fecha_hora, +duracion_min); trigger tg_reserva_periodo
  personas              smallint NOT NULL CHECK (personas > 0),
  zona_id               uuid REFERENCES zona(id),
  mesa_id               uuid REFERENCES mesa(id),
  preferencia           text,
  estado                text NOT NULL DEFAULT 'solicitada'
                          CHECK (estado IN ('solicitada','confirmada','sentada','no_show','cancelada')),
  codigo                text NOT NULL UNIQUE,
  origen                text NOT NULL CHECK (origen IN ('web','telefono','mostrador')),
  ocasion               text,
  notas                 text,
  politica_snapshot     jsonb,
  deposito_requerido    boolean NOT NULL DEFAULT false,
  deposito_pagado       boolean NOT NULL DEFAULT false,
  recordatorio_enviado_en timestamptz,
  sentada_en            timestamptz,
  finalizada_en         timestamptz,
  no_show_en            timestamptz,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  actualizado_en            timestamptz NOT NULL DEFAULT now()
);

-- Bloqueo de solapes por mesa (requiere btree_gist). Opera sobre `periodo` porque
-- `timestamptz + interval` es STABLE y no admite índices/EXCLUDE (D-BD-15).
ALTER TABLE reserva ADD CONSTRAINT ex_reserva_mesa_solape
  EXCLUDE USING gist (
    mesa_id WITH =,
    periodo WITH &&
  )
  WHERE (estado IN ('solicitada','confirmada','sentada') AND mesa_id IS NOT NULL);

CREATE TABLE lista_espera (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id     uuid NOT NULL REFERENCES sucursal(id),
  nombre_contacto text NOT NULL,
  telefono        text,
  personas        smallint NOT NULL CHECK (personas > 0),
  franja_deseada  timestamptz NOT NULL,
  estado          text NOT NULL DEFAULT 'esperando'
                    CHECK (estado IN ('esperando','ofrecida','aceptada','expirada','cancelada')),
  vigencia_hasta  timestamptz,
  creado_en      timestamptz NOT NULL DEFAULT now()
);
```

## 2.6 Índices y notas

```sql
CREATE INDEX ix_producto_categoria     ON producto (categoria_id) WHERE activo;
CREATE INDEX ix_producto_precio_vig    ON producto_precio (producto_id, sucursal_id, vigente_desde DESC);
CREATE INDEX ix_disponibilidad_agotado ON disponibilidad_producto (sucursal_id) WHERE agotado;
CREATE INDEX ix_mesa_zona              ON mesa (zona_id, estado);
CREATE INDEX ix_reserva_fecha          ON reserva (sucursal_id, fecha_hora, estado);
CREATE INDEX ix_lista_espera_estado    ON lista_espera (sucursal_id, estado);
```

- `producto.estacion_id` nulo equivale a la estación `99` del legado: **no genera comanda**.
- El precio vigente de un producto en una sede es el `producto_precio` con mayor `vigente_desde`
  no futuro; los pedidos copian el precio (snapshot) y no dependen de esta tabla.
- `reserva.periodo` es el rango `[fecha_hora, fecha_hora + duracion_min)` y lo materializa el
  trigger `tg_reserva_periodo`; la exclusión de solapes opera sobre él (D-BD-15).
- La exclusión de reservas solo aplica a reservas activas y con `mesa_id` asignado; las reservas
  sin mesa (solicitadas) no bloquean.
- `servicio` de la mesa y su historial de ocupación se derivan de `sesion_mesa` y del pedido.
