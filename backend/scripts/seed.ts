/**
 * Seed idempotente de datos base y demo (E10).
 *
 * Uso: yarn db:seed
 *
 * - Se puede ejecutar varias veces: usa UUID fijos y ON CONFLICT.
 * - Configuración (política de reserva, SLA, plantillas, umbrales, precios)
 *   converge a los valores del seed con DO UPDATE; el resto solo inserta.
 * - Usuarios demo con PIN 1234 (bcrypt); el PIN no se re-hashea en re-ejecuciones.
 *
 * Todo ocurre en una transacción: si algo falla, la base queda intacta.
 */
import 'dotenv/config';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL no está definida (backend/.env).');
  process.exit(1);
}

/** UUID determinista del seed: los grupos separan familias de datos. */
const uid = (grupo: number, n: number) =>
  `00000000-0000-4000-8000-${String(grupo).padStart(4, '0')}${String(n).padStart(8, '0')}`;

// Grupos
const G = {
  tenant: 1,
  sucursal: 2,
  zona: 3,
  estacion: 4,
  impresora: 5,
  impuesto: 6,
  medioPago: 7,
  categoria: 8,
  producto: 9,
  precio: 10,
  mesa: 11,
  horario: 12,
  consecutivo: 13,
  politica: 14,
  plantilla: 15,
  configNotif: 16,
  umbral: 17,
  reglaSla: 18,
  rol: 19,
  usuario: 20,
  usuarioRol: 21,
  alergeno: 22,
  cliente: 23,
  repartidor: 24,
  dispositivo: 25,
  zonaCobertura: 26,
  configSucursal: 27,
};

const T = uid(G.tenant, 1);
const S = uid(G.sucursal, 1);

const sql = (v: string) => `'${v.replace(/'/g, "''")}'`;

// ---------------------------------------------------------------- catálogos

const ZONAS = ['Salón principal', 'Terraza'];
const ESTACIONES: Array<[string, string]> = [
  ['Cocina', 'preparacion'],
  ['Barra', 'preparacion'],
  ['Despacho', 'despacho'],
];
const MEDIOS_PAGO: Array<[string, string, boolean]> = [
  ['Efectivo', 'efectivo', false],
  ['Tarjeta', 'tarjeta', true],
  ['Transferencia', 'transferencia', true],
  ['Pago en línea', 'pasarela', true],
];
const CATEGORIAS = ['Entradas', 'Platos fuertes', 'Postres', 'Bebidas'];

/** [nombre, categoría 1..4, estación 1..3, precio, tiempo objetivo (s), destacado, descripción] */
const PRODUCTOS: Array<[string, number, number, number, number, boolean, string]> = [
  ['Guacamole', 1, 1, 8900, 480, true, 'Aguacate, jitomate, cebolla, cilantro y chile serrano.'],
  ['Sopa de tortilla', 1, 1, 7500, 420, false, 'Caldo de jitomate, tiras de tortilla, aguacate y crema.'],
  ['Tacos al pastor', 2, 1, 12500, 780, true, 'Tres tacos con piña, cebolla y cilantro.'],
  ['Enchiladas verdes', 2, 1, 11500, 720, false, 'Rellenas de pollo, bañadas en salsa verde.'],
  ['Salmón a la plancha', 2, 1, 21500, 900, true, 'Filete con verduras al vapor y arroz.'],
  ['Hamburguesa de res', 2, 1, 14500, 780, false, 'Carne angus, queso, tocino y papas a la francesa.'],
  ['Flan napolitano', 3, 1, 6500, 180, false, 'Con caramelo tradicional.'],
  ['Pastel de chocolate', 3, 1, 7000, 180, false, 'Rebanada con ganache.'],
  ['Agua de horchata', 4, 2, 3500, 120, false, 'Preparada al día.'],
  ['Limonada', 4, 2, 3500, 120, false, 'Con menta o natural.'],
  ['Café americano', 4, 2, 3000, 180, false, 'Grano de altura, taza de 12 oz.'],
  ['Cerveza artesanal', 4, 2, 6500, 120, true, 'Producción local, 355 ml.'],
];
const ALERGENOS = ['Gluten', 'Lácteos', 'Mariscos', 'Nueces', 'Huevo'];

const PERMISOS: Array<[string, string]> = [
  ['nucleo.usuarios.ver', 'Ver usuarios y roles'],
  ['nucleo.usuarios.gestionar', 'Crear y editar usuarios y asignar roles'],
  ['nucleo.config.ver', 'Ver la configuración del negocio y sus sucursales'],
  ['nucleo.config.editar', 'Editar la configuración del negocio y sus sucursales'],
  ['catalogo.ver', 'Ver la carta y los catálogos'],
  ['catalogo.editar', 'Editar la carta, precios y modificadores'],
  ['reservas.ver', 'Ver reservas y lista de espera'],
  ['reservas.gestionar', 'Crear, confirmar, sentar y cancelar reservas'],
  ['pedidos.ver', 'Ver pedidos'],
  ['pedidos.crear', 'Crear pedidos (mesa, recoger o domicilio)'],
  ['pedidos.cancelar', 'Cancelar pedidos y anular líneas'],
  ['comandas.ver', 'Ver comandas y el tablero KDS'],
  ['comandas.preparar', 'Marcar comandas y líneas en preparación'],
  ['comandas.entregar', 'Marcar comandas y líneas como listas o entregadas'],
  ['caja.abrir', 'Abrir el turno de caja'],
  ['caja.operar', 'Registrar movimientos y ajustes de caja'],
  ['caja.cerrar', 'Cerrar el turno de caja y ver el arqueo'],
  ['pagos.registrar', 'Registrar pagos y cobros'],
  ['pagos.reembolsar', 'Registrar reembolsos'],
  ['facturacion.emitir', 'Emitir facturas y notas'],
  ['reportes.ver', 'Ver reportes y tableros'],
  ['reportes.exportar', 'Exportar reportes'],
  ['marketing.ver', 'Ver campañas, cupones y reseñas'],
  ['marketing.gestionar', 'Gestionar campañas, cupones y reseñas'],
  ['operacion.alertas.ver', 'Ver alertas operativas'],
  ['operacion.impresion.gestionar', 'Gestionar impresoras y trabajos de impresión'],
];

const TODOS = PERMISOS.map(([codigo]) => codigo);
const ROLES: Array<[string, string[]]> = [
  ['Administrador', TODOS],
  ['Gerente', TODOS.filter((p) => p !== 'nucleo.config.editar')],
  [
    'Mesero',
    [
      'catalogo.ver',
      'reservas.ver',
      'pedidos.ver',
      'pedidos.crear',
      'comandas.ver',
      'comandas.entregar',
      'pagos.registrar',
    ],
  ],
  [
    'Cajero',
    [
      'catalogo.ver',
      'pedidos.ver',
      'comandas.ver',
      'comandas.entregar',
      'caja.abrir',
      'caja.operar',
      'caja.cerrar',
      'pagos.registrar',
      'pagos.reembolsar',
      'facturacion.emitir',
      'reportes.ver',
    ],
  ],
  ['Cocina', ['catalogo.ver', 'pedidos.ver', 'comandas.ver', 'comandas.preparar', 'comandas.entregar']],
  ['Hostess', ['catalogo.ver', 'reservas.ver', 'reservas.gestionar', 'pedidos.ver', 'pedidos.crear']],
  ['Repartidor', ['pedidos.ver']],
];

/** [nombre, email, rol] — el rol Administrador se asigna sin sucursal. */
const USUARIOS: Array<[string, string, string]> = [
  ['Administrador Demo', 'admin@demo.rest', 'Administrador'],
  ['Gerente Demo', 'gerente@demo.rest', 'Gerente'],
  ['Mesero Uno', 'mesero1@demo.rest', 'Mesero'],
  ['Mesero Dos', 'mesero2@demo.rest', 'Mesero'],
  ['Cajero Demo', 'cajero@demo.rest', 'Cajero'],
  ['Cocinero Demo', 'cocina@demo.rest', 'Cocina'],
  ['Hostess Demo', 'hostess@demo.rest', 'Hostess'],
  ['Repartidor Demo', 'repartidor@demo.rest', 'Repartidor'],
];

const PLANTILLAS: Array<[string, string, string, string | null, string]> = [
  [
    'reserva.confirmada',
    'correo',
    'es',
    'Reserva confirmada {{codigo}}',
    'Hola {{nombre}}, tu reserva para {{personas}} personas el {{fecha}} a las {{hora}} está confirmada. Código: {{codigo}}.',
  ],
  [
    'reserva.confirmada',
    'whatsapp',
    'es',
    null,
    'Reserva confirmada para {{personas}} personas el {{fecha}} {{hora}}. Código {{codigo}}. ¡Te esperamos!',
  ],
  [
    'reserva.recordatorio',
    'whatsapp',
    'es',
    null,
    'Recordatorio: tu reserva es mañana {{fecha}} a las {{hora}}. Responde CANCELAR si no podrás asistir.',
  ],
  [
    'pedido.listo',
    'whatsapp',
    'es',
    null,
    'Tu pedido {{codigo}} está listo. Te esperamos en {{sucursal}}.',
  ],
  [
    'encuesta.pedido',
    'correo',
    'es',
    '¿Cómo estuvo tu pedido?',
    'Hola {{nombre}}, cuéntanos cómo estuvo tu experiencia con el pedido {{codigo}}: {{url_encuesta}}',
  ],
];

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  let paso = '';
  try {
    await client.query('BEGIN');

    // ------------------------------------------------------------ núcleo
    paso = 'tenant';
    await client.query(
      `INSERT INTO tenant (id, nombre, activo) VALUES (${sql(T)}, 'Restaurante Demo', true)
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, activo = EXCLUDED.activo;`,
    );

    paso = 'sucursal';
    await client.query(
      `INSERT INTO sucursal (id, tenant_id, nombre, codigo, direccion, ciudad, telefono, zona_horaria, moneda, activa)
       VALUES (${sql(S)}, ${sql(T)}, 'Sucursal Centro', 'SUC-01', 'Av. Principal 123', 'Ciudad de México', '5555555555', 'America/Mexico_City', 'MXN', true)
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, direccion = EXCLUDED.direccion,
         telefono = EXCLUDED.telefono, zona_horaria = EXCLUDED.zona_horaria, activa = EXCLUDED.activa;`,
    );

    paso = 'configuracion_sucursal';
    await client.query(
      `INSERT INTO configuracion_sucursal (id, sucursal_id, propina_sugerida_pct, copias_comanda, copias_factura, borrado_comanda_impresa, comportamiento_offline, ventana_programacion_min)
       VALUES (${sql(uid(G.configSucursal, 1))}, ${sql(S)}, 10.00, 2, 1, false, 'completo', 120)
       ON CONFLICT (id) DO UPDATE SET propina_sugerida_pct = EXCLUDED.propina_sugerida_pct,
         copias_comanda = EXCLUDED.copias_comanda, copias_factura = EXCLUDED.copias_factura,
         comportamiento_offline = EXCLUDED.comportamiento_offline,
         ventana_programacion_min = EXCLUDED.ventana_programacion_min;`,
    );

    paso = 'zonas';
    for (let i = 0; i < ZONAS.length; i++) {
      await client.query(
        `INSERT INTO zona (id, sucursal_id, nombre, aforo, orden) VALUES (${sql(uid(G.zona, i + 1))}, ${sql(S)}, ${sql(ZONAS[i])}, ${i === 0 ? 60 : 40}, ${i + 1})
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, aforo = EXCLUDED.aforo, orden = EXCLUDED.orden;`,
      );
    }

    paso = 'estaciones';
    for (let i = 0; i < ESTACIONES.length; i++) {
      const [nombre, tipo] = ESTACIONES[i];
      await client.query(
        `INSERT INTO estacion (id, sucursal_id, nombre, tipo, activa) VALUES (${sql(uid(G.estacion, i + 1))}, ${sql(S)}, ${sql(nombre)}, ${sql(tipo)}, true)
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo, activa = EXCLUDED.activa;`,
      );
    }

    paso = 'impresoras';
    const impresoras: Array<[string, string]> = [
      ['Cocina', '192.168.1.50'],
      ['Despacho', '192.168.1.51'],
    ];
    for (let i = 0; i < impresoras.length; i++) {
      await client.query(
        `INSERT INTO impresora (id, sucursal_id, nombre, tipo_conexion, direccion, perfil, activa)
         VALUES (${sql(uid(G.impresora, i + 1))}, ${sql(S)}, ${sql(impresoras[i][0])}, 'red', ${sql(impresoras[i][1])}, 'ESC/POS 80mm', true)
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, direccion = EXCLUDED.direccion, activa = EXCLUDED.activa;`,
      );
    }

    paso = 'impuesto';
    await client.query(
      `INSERT INTO impuesto (id, tenant_id, nombre, tasa_bps, tipo, activo)
       VALUES (${sql(uid(G.impuesto, 1))}, ${sql(T)}, 'IVA 16%', 1600, 'adicionado', true)
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, tasa_bps = EXCLUDED.tasa_bps, tipo = EXCLUDED.tipo, activo = EXCLUDED.activo;`,
    );

    paso = 'medios de pago';
    for (let i = 0; i < MEDIOS_PAGO.length; i++) {
      const [nombre, tipo, requiere] = MEDIOS_PAGO[i];
      await client.query(
        `INSERT INTO medio_pago (id, sucursal_id, nombre, tipo, requiere_referencia, activo)
         VALUES (${sql(uid(G.medioPago, i + 1))}, ${sql(S)}, ${sql(nombre)}, ${sql(tipo)}, ${requiere}, true)
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo,
           requiere_referencia = EXCLUDED.requiere_referencia, activo = EXCLUDED.activo;`,
      );
    }

    paso = 'consecutivos';
    const consecutivos: Array<[string, string]> = [
      ['pedido', 'P'],
      ['comanda', 'C'],
      ['factura', 'F'],
    ];
    for (let i = 0; i < consecutivos.length; i++) {
      await client.query(
        `INSERT INTO consecutivo (id, sucursal_id, tipo, prefijo, siguiente)
         VALUES (${sql(uid(G.consecutivo, i + 1))}, ${sql(S)}, ${sql(consecutivos[i][0])}, ${sql(consecutivos[i][1])}, 1)
         ON CONFLICT (id) DO NOTHING;`,
      );
    }

    paso = 'alergenos';
    for (let i = 0; i < ALERGENOS.length; i++) {
      await client.query(
        `INSERT INTO alergeno (id, nombre) VALUES (${sql(uid(G.alergeno, i + 1))}, ${sql(ALERGENOS[i])})
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;`,
      );
    }

    // ----------------------------------------------------------- catálogo
    paso = 'categorias';
    for (let i = 0; i < CATEGORIAS.length; i++) {
      await client.query(
        `INSERT INTO categoria (id, tenant_id, nombre, orden, activa) VALUES (${sql(uid(G.categoria, i + 1))}, ${sql(T)}, ${sql(CATEGORIAS[i])}, ${i + 1}, true)
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, orden = EXCLUDED.orden, activa = EXCLUDED.activa;`,
      );
    }

    paso = 'productos';
    for (let i = 0; i < PRODUCTOS.length; i++) {
      const [nombre, cat, est, , tiempo, destacado, descripcion] = PRODUCTOS[i];
      const sku = `DEMO-${String(i + 1).padStart(3, '0')}`;
      await client.query(
        `INSERT INTO producto (id, categoria_id, nombre, descripcion, impuesto_id, estacion_id, sku, tiempo_objetivo_seg, etiquetas, activo, destacado)
         VALUES (${sql(uid(G.producto, i + 1))}, ${sql(uid(G.categoria, cat))}, ${sql(nombre)}, ${sql(descripcion)},
                 ${sql(uid(G.impuesto, 1))}, ${sql(uid(G.estacion, est))}, ${sql(sku)}, ${tiempo},
                 ARRAY[${destacado ? `'popular'` : `'carta'`}]::text[], true, ${destacado})
         ON CONFLICT (id) DO UPDATE SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre,
           descripcion = EXCLUDED.descripcion, impuesto_id = EXCLUDED.impuesto_id,
           estacion_id = EXCLUDED.estacion_id, sku = EXCLUDED.sku,
           tiempo_objetivo_seg = EXCLUDED.tiempo_objetivo_seg, etiquetas = EXCLUDED.etiquetas,
           activo = EXCLUDED.activo, destacado = EXCLUDED.destacado;`,
      );
    }

    paso = 'precios';
    for (let i = 0; i < PRODUCTOS.length; i++) {
      const precio = PRODUCTOS[i][3];
      await client.query(
        `INSERT INTO producto_precio (id, producto_id, sucursal_id, precio_centavos, vigente_desde)
         VALUES (${sql(uid(G.precio, i + 1))}, ${sql(uid(G.producto, i + 1))}, ${sql(S)}, ${precio}, '2026-01-01T00:00:00Z')
         ON CONFLICT (id) DO UPDATE SET precio_centavos = EXCLUDED.precio_centavos;`,
      );
    }

    // -------------------------------------------------------------- salón
    paso = 'mesas';
    for (let i = 1; i <= 20; i++) {
      const zona = i <= 12 ? 1 : 2;
      const capacidad = i <= 4 ? 2 : i <= 16 ? 4 : 6;
      const posX = (i <= 12 ? (i - 1) % 4 : (i - 13) % 4) * 1.5 + 1;
      const posY = (i <= 12 ? Math.floor((i - 1) / 4) : Math.floor((i - 13) / 4)) * 1.5 + 1;
      await client.query(
        `INSERT INTO mesa (id, sucursal_id, zona_id, numero, capacidad, estado, pos_x, pos_y, activa)
         VALUES (${sql(uid(G.mesa, i))}, ${sql(S)}, ${sql(uid(G.zona, zona))}, ${sql(String(i))}, ${capacidad}, 'libre', ${posX}, ${posY}, true)
         ON CONFLICT (id) DO UPDATE SET zona_id = EXCLUDED.zona_id, numero = EXCLUDED.numero,
           capacidad = EXCLUDED.capacidad, pos_x = EXCLUDED.pos_x, pos_y = EXCLUDED.pos_y, activa = EXCLUDED.activa;`,
      );
    }

    paso = 'horarios';
    const franjas: Array<[string, string, string]> = [
      ['desayuno', '08:00', '12:00'],
      ['comida', '12:00', '18:00'],
      ['cena', '18:00', '23:00'],
    ];
    for (let d = 0; d <= 6; d++) {
      for (let f = 0; f < franjas.length; f++) {
        const [franja, abre, cierra] = franjas[f];
        await client.query(
          `INSERT INTO horario_atencion (id, sucursal_id, dia_semana, franja, hora_apertura, hora_cierre)
           VALUES (${sql(uid(G.horario, d * 10 + f + 1))}, ${sql(S)}, ${d}, ${sql(franja)}, ${sql(abre)}::time, ${sql(cierra)}::time)
           ON CONFLICT (id) DO UPDATE SET franja = EXCLUDED.franja, hora_apertura = EXCLUDED.hora_apertura, hora_cierre = EXCLUDED.hora_cierre;`,
        );
      }
    }

    paso = 'politica_reserva';
    await client.query(
      `INSERT INTO politica_reserva (id, sucursal_id, antelacion_min_horas, antelacion_max_dias, duracion_min, tolerancia_min, cancelacion_horas, maximo_personas, deposito_regla, deposito_monto_centavos, no_show_regla)
       VALUES (${sql(uid(G.politica, 1))}, ${sql(S)}, 2, 60, 90, 15, 4, 12, 'grupos', 10000, 'Grupos de 8 o más: depósito reembolsable; no-show conserva el depósito.')
       ON CONFLICT (sucursal_id) DO UPDATE SET antelacion_min_horas = EXCLUDED.antelacion_min_horas,
         antelacion_max_dias = EXCLUDED.antelacion_max_dias, duracion_min = EXCLUDED.duracion_min,
         tolerancia_min = EXCLUDED.tolerancia_min, cancelacion_horas = EXCLUDED.cancelacion_horas,
         maximo_personas = EXCLUDED.maximo_personas, deposito_regla = EXCLUDED.deposito_regla,
         deposito_monto_centavos = EXCLUDED.deposito_monto_centavos, no_show_regla = EXCLUDED.no_show_regla;`,
    );

    paso = 'zonas de cobertura';
    const coberturas: Array<[string, number, number, number, string]> = [
      [
        'Centro',
        3500,
        15000,
        35,
        '{"type":"Polygon","coordinates":[[[-99.15,19.42],[-99.12,19.42],[-99.12,19.44],[-99.15,19.44],[-99.15,19.42]]]}',
      ],
      [
        'Norte',
        4500,
        20000,
        45,
        '{"type":"Polygon","coordinates":[[[-99.15,19.46],[-99.11,19.46],[-99.11,19.49],[-99.15,19.49],[-99.15,19.46]]]}',
      ],
    ];
    for (let i = 0; i < coberturas.length; i++) {
      const [nombre, tarifa, minimo, tiempo, geojson] = coberturas[i];
      await client.query(
        `INSERT INTO zona_cobertura (id, sucursal_id, nombre, tarifa_centavos, pedido_minimo_centavos, tiempo_estimado_min, geometria, activa)
         VALUES (${sql(uid(G.zonaCobertura, i + 1))}, ${sql(S)}, ${sql(nombre)}, ${tarifa}, ${minimo}, ${tiempo}, ${sql(geojson)}::jsonb, true)
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, tarifa_centavos = EXCLUDED.tarifa_centavos,
           pedido_minimo_centavos = EXCLUDED.pedido_minimo_centavos, tiempo_estimado_min = EXCLUDED.tiempo_estimado_min,
           geometria = EXCLUDED.geometria, activa = EXCLUDED.activa;`,
      );
    }

    // -------------------------------------------------------- acceso y roles
    paso = 'permisos';
    for (const [codigo, descripcion] of PERMISOS) {
      await client.query(
        `INSERT INTO permiso (codigo, descripcion) VALUES (${sql(codigo)}, ${sql(descripcion)})
         ON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion;`,
      );
    }

    paso = 'roles';
    for (let i = 0; i < ROLES.length; i++) {
      await client.query(
        `INSERT INTO rol (id, tenant_id, nombre, es_sistema) VALUES (${sql(uid(G.rol, i + 1))}, ${sql(T)}, ${sql(ROLES[i][0])}, true)
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, es_sistema = EXCLUDED.es_sistema;`,
      );
    }

    paso = 'rol_permiso';
    for (let i = 0; i < ROLES.length; i++) {
      for (const permiso of ROLES[i][1]) {
        await client.query(
          `INSERT INTO rol_permiso (rol_id, permiso_codigo) VALUES (${sql(uid(G.rol, i + 1))}, ${sql(permiso)})
           ON CONFLICT DO NOTHING;`,
        );
      }
    }

    paso = 'usuarios';
    const salt = bcrypt.genSaltSync(10);
    const pinHash = bcrypt.hashSync('1234', salt);
    for (let i = 0; i < USUARIOS.length; i++) {
      const [nombre, email] = USUARIOS[i];
      await client.query(
        `INSERT INTO usuario (id, tenant_id, nombre, email, pin_hash, pin_salt, activo)
         VALUES (${sql(uid(G.usuario, i + 1))}, ${sql(T)}, ${sql(nombre)}, ${sql(email)}, ${sql(pinHash)}, ${sql(salt)}, true)
         ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, email = EXCLUDED.email, activo = EXCLUDED.activo;`,
      );
    }

    paso = 'usuario_rol';
    for (let i = 0; i < USUARIOS.length; i++) {
      const rolNombre = USUARIOS[i][2];
      const rolIdx = ROLES.findIndex(([nombre]) => nombre === rolNombre);
      const sucursal = rolNombre === 'Administrador' ? 'NULL' : sql(S);
      await client.query(
        `INSERT INTO usuario_rol (id, usuario_id, rol_id, sucursal_id)
         VALUES (${sql(uid(G.usuarioRol, i + 1))}, ${sql(uid(G.usuario, i + 1))}, ${sql(uid(G.rol, rolIdx + 1))}, ${sucursal})
         ON CONFLICT DO NOTHING;`,
      );
    }

    // -------------------------------------------------- operación y clientes
    paso = 'clientes';
    await client.query(
      `INSERT INTO cliente (id, tenant_id, nombre, telefono, correo) VALUES (${sql(uid(G.cliente, 1))}, ${sql(T)}, 'Cliente Demo', '5551234567', 'cliente@demo.rest')
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, telefono = EXCLUDED.telefono, correo = EXCLUDED.correo;`,
    );

    paso = 'repartidor';
    await client.query(
      `INSERT INTO repartidor (id, sucursal_id, nombre, telefono, vehiculo, estado) VALUES (${sql(uid(G.repartidor, 1))}, ${sql(S)}, 'Repartidor Demo', '5559876543', 'Moto', 'activo')
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, telefono = EXCLUDED.telefono, estado = EXCLUDED.estado;`,
    );

    paso = 'dispositivos';
    const dispositivos: Array<[string, string, string | null, number | null, string]> = [
      ['KDS Cocina', 'kds', null, 1, 'kds-demo-cocina-0001'],
      ['APK Mesero Demo', 'apk', uid(G.usuario, 3), null, 'apk-mesero-demo-0001'],
    ];
    for (let i = 0; i < dispositivos.length; i++) {
      const [nombre, tipo, usuarioId, estacion, token] = dispositivos[i];
      await client.query(
        `INSERT INTO dispositivo (id, usuario_id, sucursal_id, tipo, token, estacion_id, version_app, estado)
         VALUES (${sql(uid(G.dispositivo, i + 1))}, ${usuarioId ? sql(usuarioId) : 'NULL'}, ${sql(S)}, ${sql(tipo)}, ${sql(token)},
                 ${estacion ? sql(uid(G.estacion, estacion)) : 'NULL'}, '1.0.0', 'vinculado')
         ON CONFLICT (id) DO UPDATE SET usuario_id = EXCLUDED.usuario_id, token = EXCLUDED.token,
           estacion_id = EXCLUDED.estacion_id, version_app = EXCLUDED.version_app, estado = EXCLUDED.estado;`,
      );
    }

    // ------------------------------------------------- notificaciones y SLA
    paso = 'plantillas';
    for (let i = 0; i < PLANTILLAS.length; i++) {
      const [evento, canal, idioma, asunto, cuerpo] = PLANTILLAS[i];
      await client.query(
        `INSERT INTO plantilla_notificacion (id, tenant_id, evento, canal, idioma, asunto, cuerpo)
         VALUES (${sql(uid(G.plantilla, i + 1))}, ${sql(T)}, ${sql(evento)}, ${sql(canal)}, ${sql(idioma)}, ${asunto ? sql(asunto) : 'NULL'}, ${sql(cuerpo)})
         ON CONFLICT (tenant_id, evento, canal, idioma) DO UPDATE SET asunto = EXCLUDED.asunto, cuerpo = EXCLUDED.cuerpo;`,
      );
    }

    paso = 'configuracion_notificacion';
    const configNotif: Array<[string, string, number]> = [
      ['reserva.confirmada', 'correo', 1],
      ['reserva.confirmada', 'whatsapp', 2],
      ['reserva.recordatorio', 'whatsapp', 3],
      ['pedido.listo', 'whatsapp', 4],
      ['encuesta.pedido', 'correo', 5],
    ];
    for (let i = 0; i < configNotif.length; i++) {
      const [evento, canal, plantilla] = configNotif[i];
      await client.query(
        `INSERT INTO configuracion_notificacion (id, tenant_id, evento, canal, plantilla_id, activo)
         VALUES (${sql(uid(G.configNotif, i + 1))}, ${sql(T)}, ${sql(evento)}, ${sql(canal)}, ${sql(uid(G.plantilla, plantilla))}, true)
         ON CONFLICT (tenant_id, evento, canal) DO UPDATE SET plantilla_id = EXCLUDED.plantilla_id, activo = EXCLUDED.activo;`,
      );
    }

    paso = 'reglas SLA';
    const reglasSla: Array<[number | null, number]> = [
      [1, 900],
      [2, 420],
      [3, 300],
    ];
    for (let i = 0; i < reglasSla.length; i++) {
      const [estacion, objetivo] = reglasSla[i];
      await client.query(
        `INSERT INTO regla_sla (id, sucursal_id, estacion_id, producto_id, objetivo_seg)
         VALUES (${sql(uid(G.reglaSla, i + 1))}, ${sql(S)}, ${estacion ? sql(uid(G.estacion, estacion)) : 'NULL'}, NULL, ${objetivo})
         ON CONFLICT (id) DO UPDATE SET estacion_id = EXCLUDED.estacion_id, objetivo_seg = EXCLUDED.objetivo_seg;`,
      );
    }

    paso = 'umbrales';
    const umbrales: Array<[string, string, string | null]> = [
      ['sla', '0.90', uid(G.rol, 2)],
      ['sync', '5', uid(G.rol, 2)],
      ['impresora', '3', uid(G.rol, 2)],
    ];
    for (let i = 0; i < umbrales.length; i++) {
      const [tipo, valor, rol] = umbrales[i];
      await client.query(
        `INSERT INTO umbral_alerta (id, tenant_id, tipo, valor, rol_destinatario)
         VALUES (${sql(uid(G.umbral, i + 1))}, ${sql(T)}, ${sql(tipo)}, ${valor}, ${rol ? sql(rol) : 'NULL'})
         ON CONFLICT (tenant_id, tipo) DO UPDATE SET valor = EXCLUDED.valor, rol_destinatario = EXCLUDED.rol_destinatario;`,
      );
    }

    await client.query('COMMIT');

    // ------------------------------------------------------------ resumen
    const resumen = await client.query<{ tabla: string; filas: number }>(`
      SELECT 'tenant' AS tabla, count(*)::int AS filas FROM tenant WHERE id = '${T}'
      UNION ALL SELECT 'sucursal', count(*)::int FROM sucursal WHERE id = '${S}'
      UNION ALL SELECT 'mesa', count(*)::int FROM mesa WHERE sucursal_id = '${S}'
      UNION ALL SELECT 'producto', count(*)::int FROM producto WHERE categoria_id IN (SELECT id FROM categoria WHERE tenant_id = '${T}')
      UNION ALL SELECT 'producto_precio', count(*)::int FROM producto_precio WHERE sucursal_id = '${S}'
      UNION ALL SELECT 'rol', count(*)::int FROM rol WHERE tenant_id = '${T}'
      UNION ALL SELECT 'permiso', count(*)::int FROM permiso
      UNION ALL SELECT 'usuario', count(*)::int FROM usuario WHERE tenant_id = '${T}'
      UNION ALL SELECT 'usuario_rol', count(*)::int FROM usuario_rol WHERE usuario_id IN (SELECT id FROM usuario WHERE tenant_id = '${T}')
      UNION ALL SELECT 'plantilla_notificacion', count(*)::int FROM plantilla_notificacion WHERE tenant_id = '${T}'
      UNION ALL SELECT 'regla_sla', count(*)::int FROM regla_sla WHERE sucursal_id = '${S}'
      UNION ALL SELECT 'horario_atencion', count(*)::int FROM horario_atencion WHERE sucursal_id = '${S}'`);
    console.log('Seed aplicado (transacción confirmada):');
    for (const fila of resumen.rows) {
      console.log(`  ${fila.tabla.padEnd(24)} ${fila.filas}`);
    }
    console.log('Usuarios demo: *@demo.rest — PIN 1234.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(`Seed abortado en el paso "${paso}":`, (error as Error).message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
