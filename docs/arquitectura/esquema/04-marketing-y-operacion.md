# 04 — Esquema: marketing, notificaciones y operación

CRM y mensajería, sincronización offline, auditoría inmutable, alertas y reportes
(migración `0070`–`0083` del plan).

## 4.1 Notificaciones

```sql
CREATE TABLE plantilla_notificacion (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id),
  evento     text NOT NULL,                       -- p. ej. pedido.enviado, reserva.solicitada
  canal      text NOT NULL CHECK (canal IN ('correo','whatsapp','sms','push')),
  idioma     text NOT NULL DEFAULT 'es',
  asunto     text,
  cuerpo     text NOT NULL,
  CONSTRAINT uq_plantilla UNIQUE (tenant_id, evento, canal, idioma)
);

CREATE TABLE notificacion (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_tipo text NOT NULL CHECK (destinatario_tipo IN ('cliente','usuario','contacto')),
  destinatario_id   uuid,
  canal             text NOT NULL CHECK (canal IN ('correo','whatsapp','sms','push')),
  plantilla_id      uuid REFERENCES plantilla_notificacion(id),
  payload           jsonb,
  estado            text NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','enviada','fallida','cancelada')),
  enviado_en        timestamptz,
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE configuracion_notificacion (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenant(id),
  evento       text NOT NULL,
  canal        text NOT NULL CHECK (canal IN ('correo','whatsapp','sms','push')),
  plantilla_id uuid REFERENCES plantilla_notificacion(id),
  activo       boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_config_notificacion UNIQUE (tenant_id, evento, canal)
);
```

## 4.2 CRM y marketing

```sql
CREATE TABLE suscriptor (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  correo           text NOT NULL,
  consentimiento_en timestamptz NOT NULL,
  origen           text,
  activo           boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_suscriptor UNIQUE (tenant_id, correo)
);

CREATE TABLE resena (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES sucursal(id),
  cliente_id  uuid REFERENCES cliente(id),
  puntaje     smallint NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  comentario  text,
  fuente      text NOT NULL CHECK (fuente IN ('web','google','tripadvisor','otra')),
  fecha       date NOT NULL DEFAULT current_date,
  publicada   boolean NOT NULL DEFAULT false
);

CREATE TABLE encuesta (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           text NOT NULL CHECK (tipo IN ('pedido','reserva','visita')),
  referencia_id  uuid,
  cliente_id     uuid REFERENCES cliente(id),
  puntaje        smallint NOT NULL CHECK (puntaje BETWEEN 0 AND 10),
  comentario     text,
  canal          text,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_encuesta UNIQUE (tipo, referencia_id)
);

CREATE TABLE segmento_cliente (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id),
  nombre         text NOT NULL,
  criterio       jsonb NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_segmento UNIQUE (tenant_id, nombre)
);

CREATE TABLE evento_analitica (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id),
  tipo           text NOT NULL,
  origen_utm     jsonb,
  consentimiento boolean NOT NULL DEFAULT false,
  creado_en      timestamptz NOT NULL DEFAULT now()
);
```

## 4.3 Sincronización offline

```sql
CREATE TABLE sync_operacion (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id  uuid NOT NULL REFERENCES dispositivo(id),
  client_op_id    text NOT NULL,
  tipo            text NOT NULL,
  payload         jsonb NOT NULL,
  estado          text NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','aplicada','rechazada')),
  aplicado_en     timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sync_op UNIQUE (client_op_id)
);
```

## 4.4 Auditoría y bitácora

```sql
-- Particionada por mes (particiones creadas por job/migración).
CREATE TABLE evento_auditoria (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id),
  sucursal_id    uuid REFERENCES sucursal(id),
  usuario_id     uuid REFERENCES usuario(id),
  dispositivo_id uuid REFERENCES dispositivo(id),
  entidad        text NOT NULL,
  entidad_id     uuid,
  accion         text NOT NULL,
  motivo         text,
  datos_antes    jsonb,
  datos_despues  jsonb,
  ip             inet,
  request_id     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE evento_auditoria_2026_10 PARTITION OF evento_auditoria
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE bitacora_evento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo   text NOT NULL CHECK (entidad_tipo IN ('reserva','pedido','comanda','pago','turno')),
  entidad_id     uuid NOT NULL,
  evento         text NOT NULL,               -- p. ej. creado, enviado, listo, pagado
  actor_tipo     text NOT NULL CHECK (actor_tipo IN ('cliente','usuario','sistema','dispositivo')),
  actor_id       uuid,
  canal          text,
  dispositivo_id uuid REFERENCES dispositivo(id),
  datos          jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

## 4.5 Alertas y reportes

```sql
CREATE TABLE alerta_operativa (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id   uuid NOT NULL REFERENCES sucursal(id),
  tipo          text NOT NULL CHECK (tipo IN ('impresora','dispositivo','sync','sla','stock')),
  severidad     text NOT NULL CHECK (severidad IN ('baja','media','alta')),
  entidad       text,
  entidad_id    uuid,
  estado        text NOT NULL DEFAULT 'abierta'
                  CHECK (estado IN ('abierta','atendida','descartada')),
  atendida_por  uuid REFERENCES usuario(id),
  atendida_en   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE umbral_alerta (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenant(id),
  tipo              text NOT NULL,
  valor             numeric NOT NULL,
  rol_destinatario  uuid REFERENCES rol(id),
  CONSTRAINT uq_umbral UNIQUE (tenant_id, tipo)
);

CREATE TABLE reporte_guardado (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES usuario(id),
  nombre      text NOT NULL,
  tipo        text NOT NULL,
  filtros     jsonb NOT NULL,
  visibilidad text NOT NULL DEFAULT 'privado' CHECK (visibilidad IN ('privado','equipo')),
  CONSTRAINT uq_reporte_guardado UNIQUE (usuario_id, nombre)
);

CREATE TABLE reporte_programado (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id),
  tipo           text NOT NULL,
  filtros        jsonb NOT NULL,
  periodicidad   text NOT NULL CHECK (periodicidad IN ('diario','semanal','mensual')),
  destinatarios  text[] NOT NULL,
  activo         boolean NOT NULL DEFAULT true
);

CREATE TABLE exportacion (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES usuario(id),
  tipo        text NOT NULL,
  filtros     jsonb,
  formato     text NOT NULL CHECK (formato IN ('csv','xlsx','pdf')),
  estado      text NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','procesando','lista','fallida')),
  url         text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trabajo_impresion (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id     uuid REFERENCES comanda(id),
  factura_id     uuid REFERENCES factura(id),
  impresora_id   uuid NOT NULL REFERENCES impresora(id),
  tipo           text NOT NULL CHECK (tipo IN ('comanda','precuenta','recibo','factura')),
  estado         text NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','enviado','impreso','reintentando','fallido')),
  intentos       smallint NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  ultimo_error   text,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  impreso_en     timestamptz,
  CONSTRAINT ck_impresion_origen CHECK ((comanda_id IS NOT NULL) <> (factura_id IS NOT NULL))
);
```

## 4.6 Índices y notas

```sql
CREATE INDEX ix_notificacion_envio   ON notificacion (estado, created_at);
CREATE INDEX ix_auditoria_entidad    ON evento_auditoria (entidad, entidad_id, created_at);
CREATE INDEX ix_auditoria_usuario    ON evento_auditoria (usuario_id, created_at);
CREATE INDEX ix_bitacora_entidad     ON bitacora_evento (entidad_tipo, entidad_id, created_at);
CREATE INDEX ix_sync_estado          ON sync_operacion (estado);
CREATE INDEX ix_alerta_abierta       ON alerta_operativa (sucursal_id) WHERE estado = 'abierta';
CREATE INDEX ix_impresion_cola       ON trabajo_impresion (estado, creado_en);
CREATE INDEX ix_encuesta_tipo        ON encuesta (tipo, creado_en DESC);
```

- **Auditoría inmutable:** `evento_auditoria` solo admite `INSERT`; se revocan `UPDATE`/`DELETE`
  al rol de aplicación y se refuerza con trigger. Las particiones mensuales se crean con
  antelación por un job.
- `bitacora_evento` es la vista que consumen las pantallas de seguimiento; se alimenta de los
  cambios de estado y de la auditoría (puede materializarse como tabla o vista materializada).
- `sync_operacion.client_op_id` garantiza la idempotencia del trabajo offline.
- `trabajo_impresion` alimenta la **tasa de fallo de impresión** y los reintentos del print agent.
- `encuesta` con `tipo = 'pedido'` es la calificación post-venta; con `reserva`/`visita` cubre
  el NPS.
