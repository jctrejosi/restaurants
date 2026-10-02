# 01 — Esquema: núcleo (organización, acceso y personas)

Tablas de configuración, cocina, usuarios, dispositivos y clientes. Es la base de la que dependen
las demás (migración `0010`–`0012` del plan).

## 1.1 Organización y configuración

```sql
CREATE TABLE tenant (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  activo      boolean NOT NULL DEFAULT true,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sucursal (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  nombre        text NOT NULL,
  codigo        text NOT NULL,
  direccion     text,
  ciudad        text,
  telefono      text,
  coordenadas   jsonb,                       -- {"lat":…,"lng":…}
  zona_horaria  text NOT NULL DEFAULT 'America/Bogota',
  moneda        char(3) NOT NULL DEFAULT 'COP',
  activa        boolean NOT NULL DEFAULT true,
  creado_en    timestamptz NOT NULL DEFAULT now(),
  actualizado_en    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sucursal_codigo UNIQUE (tenant_id, codigo)
);

CREATE TABLE configuracion_sucursal (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id             uuid NOT NULL UNIQUE REFERENCES sucursal(id),
  propina_sugerida_pct    numeric(5,2) NOT NULL DEFAULT 0
                            CHECK (propina_sugerida_pct BETWEEN 0 AND 100),
  copias_comanda          smallint NOT NULL DEFAULT 1 CHECK (copias_comanda BETWEEN 1 AND 5),
  copias_factura          smallint NOT NULL DEFAULT 1 CHECK (copias_factura BETWEEN 1 AND 5),
  borrado_comanda_impresa boolean NOT NULL DEFAULT false,
  comportamiento_offline  text NOT NULL DEFAULT 'completo'
                            CHECK (comportamiento_offline IN ('completo','solo_lectura')),
  ventana_programacion_min integer NOT NULL DEFAULT 1440 CHECK (ventana_programacion_min > 0),
  limite_pedidos_franja   integer CHECK (limite_pedidos_franja IS NULL OR limite_pedidos_franja > 0),
  actualizado_en              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE horario_atencion (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id   uuid NOT NULL REFERENCES sucursal(id),
  dia_semana    smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),   -- 0 = domingo
  franja        text NOT NULL CHECK (franja IN ('desayuno','comida','cena')),
  hora_apertura time NOT NULL,
  hora_cierre   time NOT NULL,
  CONSTRAINT ck_horario_rango CHECK (hora_apertura < hora_cierre)
);

CREATE TABLE cierre_temporal (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id  uuid NOT NULL REFERENCES sucursal(id),
  desde        timestamptz NOT NULL,
  hasta        timestamptz NOT NULL,
  motivo       text,
  CONSTRAINT ck_cierre_rango CHECK (desde < hasta)
);

CREATE TABLE impuesto (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id),
  nombre     text NOT NULL,
  tasa_bps   integer NOT NULL CHECK (tasa_bps BETWEEN 0 AND 100000),  -- 1900 = 19 %
  tipo       text NOT NULL CHECK (tipo IN ('incluido','adicionado','inc')),
  activo     boolean NOT NULL DEFAULT true
);

CREATE TABLE consecutivo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id   uuid NOT NULL REFERENCES sucursal(id),
  tipo          text NOT NULL CHECK (tipo IN ('pedido','comanda','factura')),
  prefijo       text NOT NULL DEFAULT '',
  siguiente     bigint NOT NULL DEFAULT 1 CHECK (siguiente > 0),
  resolucion    text,
  vigencia_hasta date,
  CONSTRAINT uq_consecutivo UNIQUE (sucursal_id, tipo, prefijo)
);

CREATE TABLE medio_pago (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id         uuid NOT NULL REFERENCES sucursal(id),
  nombre              text NOT NULL,
  tipo                text NOT NULL CHECK (tipo IN ('efectivo','tarjeta','transferencia','pasarela','otro')),
  requiere_referencia boolean NOT NULL DEFAULT false,
  activo              boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_medio_pago UNIQUE (sucursal_id, nombre)
);

CREATE TABLE regla_capacidad (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id     uuid NOT NULL REFERENCES sucursal(id),
  franja          text NOT NULL,
  maximo_pedidos  integer NOT NULL CHECK (maximo_pedidos > 0),
  CONSTRAINT uq_regla_capacidad UNIQUE (sucursal_id, franja)
);
```

## 1.2 Cocina: estaciones e impresoras

```sql
CREATE TABLE estacion (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id  uuid NOT NULL REFERENCES sucursal(id),
  nombre       text NOT NULL,
  tipo         text NOT NULL DEFAULT 'preparacion'
                 CHECK (tipo IN ('preparacion','despacho')),
  activa       boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_estacion UNIQUE (sucursal_id, nombre)
);

CREATE TABLE impresora (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id    uuid NOT NULL REFERENCES sucursal(id),
  nombre         text NOT NULL,
  tipo_conexion  text NOT NULL CHECK (tipo_conexion IN ('red','usb','bluetooth')),
  direccion      text,                 -- IP/host o identificador del dispositivo
  perfil         text,                 -- perfil ESC/POS
  activa         boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_impresora UNIQUE (sucursal_id, nombre)
);
```

## 1.3 Usuarios, roles y dispositivos

```sql
CREATE TABLE usuario (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenant(id),
  nombre            text NOT NULL,
  email             text,
  pin_hash          text,
  pin_salt          text,
  activo            boolean NOT NULL DEFAULT true,
  ultimo_acceso_en  timestamptz,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuario_email UNIQUE (tenant_id, email)
);

CREATE TABLE rol (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id),
  nombre      text NOT NULL,
  es_sistema  boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_rol UNIQUE (tenant_id, nombre)
);

CREATE TABLE permiso (
  codigo       text PRIMARY KEY,      -- p. ej. 'pedido.anular', 'caja.reabrir'
  descripcion  text NOT NULL
);

CREATE TABLE rol_permiso (
  rol_id          uuid NOT NULL REFERENCES rol(id),
  permiso_codigo  text NOT NULL REFERENCES permiso(codigo),
  PRIMARY KEY (rol_id, permiso_codigo)
);

CREATE TABLE usuario_rol (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid NOT NULL REFERENCES usuario(id),
  rol_id       uuid NOT NULL REFERENCES rol(id),
  sucursal_id  uuid REFERENCES sucursal(id),   -- NULL = todas las sucursales
  CONSTRAINT uq_usuario_rol UNIQUE NULLS NOT DISTINCT (usuario_id, rol_id, sucursal_id)
);

CREATE TABLE dispositivo (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id         uuid REFERENCES usuario(id),
  sucursal_id        uuid NOT NULL REFERENCES sucursal(id),
  tipo               text NOT NULL CHECK (tipo IN ('apk','kds','caja')),
  token              text NOT NULL UNIQUE,
  estacion_id        uuid REFERENCES estacion(id),   -- solo KDS
  version_app        text,
  ultima_conexion_en timestamptz,
  estado             text NOT NULL DEFAULT 'vinculado'
                       CHECK (estado IN ('vinculado','revocado')),
  creado_en         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE turno (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id          uuid NOT NULL REFERENCES sucursal(id),
  numero               integer NOT NULL,
  estado               text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','cerrado')),
  abierto_en           timestamptz NOT NULL DEFAULT now(),
  cerrado_en           timestamptz,
  usuario_apertura_id  uuid REFERENCES usuario(id),
  usuario_cierre_id    uuid REFERENCES usuario(id),
  CONSTRAINT uq_turno UNIQUE (sucursal_id, numero)
);
```

## 1.4 Clientes, consentimiento y reparto

```sql
CREATE TABLE cliente (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenant(id),
  nombre            text NOT NULL,
  telefono          text,
  correo            text,
  fecha_nacimiento  date,
  preferencias      jsonb,
  notas             text,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE consentimiento (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL REFERENCES cliente(id),
  tipo         text NOT NULL CHECK (tipo IN ('datos','marketing','cookies')),
  canal        text NOT NULL,
  base_legal   text,
  otorgado_en  timestamptz NOT NULL DEFAULT now(),
  revocado_en  timestamptz,
  CONSTRAINT ck_consentimiento_fechas CHECK (revocado_en IS NULL OR revocado_en >= otorgado_en)
);

CREATE TABLE repartidor (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id  uuid NOT NULL REFERENCES sucursal(id),
  nombre       text NOT NULL,
  telefono     text,
  vehiculo     text,
  estado       text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','ocupado'))
);

CREATE TABLE solicitud_evento (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id      uuid NOT NULL REFERENCES sucursal(id),
  nombre_contacto  text NOT NULL,
  telefono         text,
  correo           text,
  tipo             text NOT NULL,
  fecha_tentativa  date,
  personas         integer CHECK (personas > 0),
  mensaje          text,
  estado           text NOT NULL DEFAULT 'nueva'
                     CHECK (estado IN ('nueva','en_revision','contactada','cerrada')),
  creado_en       timestamptz NOT NULL DEFAULT now()
);
```

## 1.5 Índices y notas

```sql
CREATE INDEX ix_usuario_activo            ON usuario (tenant_id) WHERE activo;
CREATE INDEX ix_dispositivo_sucursal      ON dispositivo (sucursal_id, tipo);
CREATE INDEX ix_turno_abierto             ON turno (sucursal_id) WHERE estado = 'abierto';
CREATE INDEX ix_cliente_telefono          ON cliente (tenant_id, telefono);
CREATE INDEX ix_horario_sucursal          ON horario_atencion (sucursal_id, dia_semana);
```

- `usuario.email` y `pin_hash` son opcionales (hay usuarios solo con PIN de dispositivo).
- `usuario_rol.sucursal_id` nulo significa **todas las sucursales** (`NULLS NOT DISTINCT`).
- Un `dispositivo` de tipo `kds` debe traer `estacion_id`; se valida en la aplicación.
- `cliente` puede existir sin cuenta ni correo (solo teléfono); no se borra: se anonimiza.
- `estacion` es la clave del enrutamiento de comandas (equivale a `IFCOCINA` del legado).
