# 03 — Esquema: pedidos, domicilio y dinero

Núcleo operativo (pedidos y comandas), reparto, pagos, caja y facturación
(migración `0040`–`0062` del plan).

## 3.1 Pedidos y comandas

```sql
CREATE TABLE pedido (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id         uuid NOT NULL REFERENCES sucursal(id),
  codigo              text NOT NULL UNIQUE,
  canal               text NOT NULL CHECK (canal IN ('web','mesero','caja','kiosco')),
  modalidad           text NOT NULL CHECK (modalidad IN ('mesa','domicilio','recoger')),
  cliente_id          uuid REFERENCES cliente(id),
  nombre_contacto     text,
  telefono_contacto   text,
  mesa_id             uuid REFERENCES mesa(id),
  sesion_mesa_id      uuid REFERENCES sesion_mesa(id),
  mesero_id           uuid REFERENCES usuario(id),
  turno_id            uuid REFERENCES turno(id),
  hora_programada     timestamptz,
  estado              text NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador','enviado','en_preparacion','listo','en_camino',
                                          'entregado','por_cobrar','pagado','cancelado')),
  subtotal_centavos   bigint NOT NULL DEFAULT 0 CHECK (subtotal_centavos >= 0),
  descuentos_centavos bigint NOT NULL DEFAULT 0 CHECK (descuentos_centavos >= 0),
  impuestos_centavos  bigint NOT NULL DEFAULT 0 CHECK (impuestos_centavos >= 0),
  propina_centavos    bigint NOT NULL DEFAULT 0 CHECK (propina_centavos >= 0),
  recargos_centavos   bigint NOT NULL DEFAULT 0 CHECK (recargos_centavos >= 0),
  total_centavos      bigint NOT NULL DEFAULT 0 CHECK (total_centavos >= 0),
  notas               text,
  origen_utm          text,
  client_order_id     text,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  enviado_en          timestamptz,
  listo_en            timestamptz,
  entregado_en        timestamptz,
  por_cobrar_en       timestamptz,
  pagado_en           timestamptz,
  cancelado_en        timestamptz,
  CONSTRAINT ck_pedido_mesa   CHECK (modalidad <> 'mesa'      OR mesa_id IS NOT NULL),
  CONSTRAINT ck_pedido_hora   CHECK (modalidad =  'mesa'      OR hora_programada IS NOT NULL
                                     OR estado = 'borrador')
);

CREATE TABLE pedido_linea (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id                uuid NOT NULL REFERENCES pedido(id),
  producto_id              uuid NOT NULL REFERENCES producto(id),
  nombre_snapshot          text NOT NULL,
  precio_snapshot_centavos bigint NOT NULL CHECK (precio_snapshot_centavos >= 0),
  impuesto_snapshot        jsonb,
  cantidad                 numeric(10,3) NOT NULL CHECK (cantidad > 0),
  es_fraccion              boolean NOT NULL DEFAULT false,
  cantidad_fraccion        numeric(10,3) CHECK (cantidad_fraccion IS NULL OR cantidad_fraccion > 0),
  notas                    text CHECK (notas IS NULL OR char_length(notas) <= 105),
  comensal                 smallint,
  estado                   text NOT NULL DEFAULT 'pendiente'
                             CHECK (estado IN ('pendiente','enviada','en_preparacion','lista',
                                               'entregada','anulada'))
);

CREATE TABLE pedido_linea_modificador (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_linea_id          uuid NOT NULL REFERENCES pedido_linea(id),
  modificador_id           uuid NOT NULL REFERENCES modificador(id),
  nombre_snapshot          text NOT NULL,
  precio_snapshot_centavos bigint NOT NULL DEFAULT 0 CHECK (precio_snapshot_centavos >= 0)
);

CREATE TABLE ajuste_pedido (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id        uuid NOT NULL REFERENCES pedido(id),
  pedido_linea_id  uuid REFERENCES pedido_linea(id),
  tipo             text NOT NULL CHECK (tipo IN ('descuento','cortesia','recargo')),
  valor_centavos   bigint CHECK (valor_centavos IS NULL OR valor_centavos >= 0),
  porcentaje       numeric(5,2) CHECK (porcentaje IS NULL OR porcentaje BETWEEN 0 AND 100),
  motivo           text NOT NULL,
  usuario_id       uuid NOT NULL REFERENCES usuario(id),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_ajuste_valor CHECK ((valor_centavos IS NOT NULL) <> (porcentaje IS NOT NULL))
);

CREATE TABLE comanda (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id     uuid NOT NULL REFERENCES pedido(id),
  sucursal_id   uuid NOT NULL REFERENCES sucursal(id),
  estacion_id   uuid NOT NULL REFERENCES estacion(id),
  numero        integer NOT NULL,
  turno_id      uuid REFERENCES turno(id),
  estado        text NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','impresa','en_preparacion','lista','entregada','anulada')),
  enviada_en    timestamptz NOT NULL DEFAULT now(),
  lista_en      timestamptz,
  entregada_en  timestamptz,
  CONSTRAINT uq_comanda UNIQUE (sucursal_id, numero),
  CONSTRAINT ck_comanda_sellos CHECK (lista_en IS NULL OR lista_en >= enviada_en)
);

CREATE TABLE comanda_linea (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id       uuid NOT NULL REFERENCES comanda(id),
  pedido_linea_id  uuid NOT NULL REFERENCES pedido_linea(id),
  estado           text NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente','en_preparacion','lista','entregada','anulada')),
  CONSTRAINT uq_comanda_linea UNIQUE (comanda_id, pedido_linea_id)
);
```

## 3.2 Domicilio

```sql
CREATE TABLE zona_cobertura (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id        uuid NOT NULL REFERENCES sucursal(id),
  nombre             text NOT NULL,
  tarifa_centavos    bigint NOT NULL DEFAULT 0 CHECK (tarifa_centavos >= 0),
  pedido_minimo_centavos bigint NOT NULL DEFAULT 0 CHECK (pedido_minimo_centavos >= 0),
  tiempo_estimado_min integer CHECK (tiempo_estimado_min IS NULL OR tiempo_estimado_min > 0),
  geometria          jsonb,          -- GeoJSON (o tipo geometry con PostGIS, D-BD-10)
  activa             boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_zona_cobertura UNIQUE (sucursal_id, nombre)
);

CREATE TABLE domicilio_asignacion (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id      uuid NOT NULL REFERENCES pedido(id),
  repartidor_id  uuid NOT NULL REFERENCES repartidor(id),
  asignado_en    timestamptz NOT NULL DEFAULT now(),
  recogido_en    timestamptz,
  entregado_en   timestamptz,
  estado         text NOT NULL DEFAULT 'asignado'
                   CHECK (estado IN ('asignado','recogido','en_camino','entregado',
                                     'entrega_fallida','devuelto')),
  evidencia_url  text,
  CONSTRAINT ck_domicilio_sellos CHECK (
    (recogido_en  IS NULL OR recogido_en  >= asignado_en) AND
    (entregado_en IS NULL OR (recogido_en IS NOT NULL AND entregado_en >= recogido_en))
  )
);

-- Un pedido solo puede tener una asignación activa.
CREATE UNIQUE INDEX uq_domicilio_activo ON domicilio_asignacion (pedido_id)
  WHERE estado IN ('asignado','recogido','en_camino');

CREATE TABLE liquidacion_repartidor (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repartidor_id     uuid NOT NULL REFERENCES repartidor(id),
  periodo_desde     date NOT NULL,
  periodo_hasta     date NOT NULL,
  entregas          integer NOT NULL DEFAULT 0 CHECK (entregas >= 0),
  tarifas_centavos  bigint  NOT NULL DEFAULT 0 CHECK (tarifas_centavos >= 0),
  propinas_centavos bigint  NOT NULL DEFAULT 0 CHECK (propinas_centavos >= 0),
  total_centavos    bigint  NOT NULL DEFAULT 0 CHECK (total_centavos >= 0),
  creado_en        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_liquidacion_rango CHECK (periodo_desde <= periodo_hasta)
);
```

## 3.3 Pagos y caja

```sql
CREATE TABLE pago (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id         uuid REFERENCES pedido(id),
  reserva_id        uuid REFERENCES reserva(id),
  medio_pago_id     uuid NOT NULL REFERENCES medio_pago(id),
  monto_centavos    bigint NOT NULL CHECK (monto_centavos > 0),
  propina_centavos  bigint NOT NULL DEFAULT 0 CHECK (propina_centavos >= 0),
  referencia        text,
  estado            text NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','aprobado','rechazado','reembolsado')),
  pasarela_payload  jsonb,
  usuario_id        uuid REFERENCES usuario(id),
  creado_en        timestamptz NOT NULL DEFAULT now(),
  aprobado_en       timestamptz,
  reembolsado_en    timestamptz,
  CONSTRAINT ck_pago_origen CHECK ((pedido_id IS NOT NULL) <> (reserva_id IS NOT NULL))
);

CREATE TABLE pago_linea (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id          uuid NOT NULL REFERENCES pago(id),
  pedido_linea_id  uuid NOT NULL REFERENCES pedido_linea(id),
  monto_centavos   bigint NOT NULL CHECK (monto_centavos > 0)
);

CREATE TABLE cierre_caja (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id                 uuid NOT NULL UNIQUE REFERENCES turno(id),
  base_inicial_centavos    bigint NOT NULL DEFAULT 0 CHECK (base_inicial_centavos >= 0),
  ventas_efectivo_centavos bigint NOT NULL DEFAULT 0 CHECK (ventas_efectivo_centavos >= 0),
  ventas_otros_centavos    bigint NOT NULL DEFAULT 0 CHECK (ventas_otros_centavos >= 0),
  propinas_centavos        bigint NOT NULL DEFAULT 0 CHECK (propinas_centavos >= 0),
  retiros_centavos         bigint NOT NULL DEFAULT 0 CHECK (retiros_centavos >= 0),
  gastos_centavos          bigint NOT NULL DEFAULT 0 CHECK (gastos_centavos >= 0),
  contado_centavos         bigint NOT NULL DEFAULT 0 CHECK (contado_centavos >= 0),
  diferencia_centavos      bigint NOT NULL DEFAULT 0,
  observaciones            text,
  reabierto_por            uuid REFERENCES usuario(id),
  reabierto_en             timestamptz,
  creado_en               timestamptz NOT NULL DEFAULT now()
);
```

## 3.4 Facturación

```sql
CREATE TABLE factura (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id        uuid NOT NULL REFERENCES sucursal(id),
  pedido_id          uuid NOT NULL REFERENCES pedido(id),
  numero             bigint NOT NULL,
  prefijo            text NOT NULL DEFAULT '',
  resolucion         text,
  cufe               text,
  estado_dian        text NOT NULL DEFAULT 'pendiente'
                       CHECK (estado_dian IN ('pendiente','enviada','aceptada','rechazada','anulada')),
  xml_url            text,
  pdf_url            text,
  total_centavos     bigint NOT NULL CHECK (total_centavos >= 0),
  impuestos_json     jsonb,
  emitida_en         timestamptz,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_factura_numero UNIQUE (sucursal_id, prefijo, numero)
);

CREATE TABLE factura_linea (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id       uuid NOT NULL REFERENCES factura(id),
  descripcion      text NOT NULL,
  cantidad         numeric(10,3) NOT NULL CHECK (cantidad > 0),
  precio_centavos  bigint NOT NULL CHECK (precio_centavos >= 0),
  impuesto_id      uuid REFERENCES impuesto(id),
  total_centavos   bigint NOT NULL CHECK (total_centavos >= 0)
);
```

## 3.5 Índices y notas

```sql
CREATE INDEX ix_pedido_activo     ON pedido (sucursal_id, estado, creado_en)
                                    WHERE estado NOT IN ('pagado','cancelado');
CREATE INDEX ix_pedido_mesa       ON pedido (mesa_id) WHERE estado NOT IN ('pagado','cancelado');
CREATE INDEX ix_pedido_contacto   ON pedido (sucursal_id, telefono_contacto, creado_en DESC);
CREATE INDEX ix_comanda_kds       ON comanda (estacion_id, estado);
CREATE INDEX ix_pago_pedido       ON pago (pedido_id, estado);
CREATE INDEX ix_pago_reserva      ON pago (reserva_id, estado);
CREATE INDEX ix_factura_pedido    ON factura (pedido_id);
CREATE INDEX ix_domicilio_repart  ON domicilio_asignacion (repartidor_id, estado);
```

- **Pago único por pedido (invariante):** la suma de pagos `aprobado` no puede superar
  `pedido.total_centavos`; el paso a `pagado` exige cubrirlo. Se valida en el dominio y se
  refuerza en base con `fn_pago_limite_pedido` y `fn_pedido_pagado_cubierto` (D-BD-16).
- **División de cuenta:** la suma de `pago_linea` de un pago no supera `pago.monto_centavos`, y la
  suma de los pagos cubre el total del pedido.
- `comanda.numero` es consecutivo por sucursal; `comanda_linea` impide repetir la misma línea.
- Un pedido `mesa` exige `mesa_id`; `domicilio` y `recoger` usan `hora_programada` (aunque sea
  "lo antes posible", se sella la hora objetivo).
- La factura se numera por `sucursal_id + prefijo` (resolución fiscal).
