/**
 * Relaciones Drizzle del esquema (se amplían por etapa).
 *
 * Se exportan desde `schema.ts` para que `drizzle(pool, { schema })` registre
 * tablas y relaciones (consultas `db.query.*`). Ver E1 en
 * `docs/arquitectura/esquema/01-nucleo.md`.
 */
import { relations } from 'drizzle-orm';
import {
  cliente,
  configuracionSucursal,
  consentimiento,
  consecutivo,
  cierreTemporal,
  dispositivo,
  estacion,
  horarioAtencion,
  impresora,
  impuesto,
  medioPago,
  permiso,
  reglaCapacidad,
  repartidor,
  rol,
  rolPermiso,
  solicitudEvento,
  sucursal,
  tenant,
  turno,
  usuario,
  usuarioRol,
} from './schema/01-nucleo';
import {
  alergeno,
  categoria,
  cupon,
  disponibilidadProducto,
  grupoModificador,
  modificador,
  producto,
  productoAlergeno,
  productoFoto,
  productoPrecio,
  promocion,
} from './schema/02-catalogo';
import {
  listaEspera,
  mesa,
  mesaAsignacion,
  politicaReserva,
  reserva,
  sesionMesa,
  zona,
} from './schema/03-salon-reservas';
import {
  ajustePedido,
  comanda,
  comandaLinea,
  pedido,
  pedidoLinea,
  pedidoLineaModificador,
  reglaSla,
} from './schema/04-pedidos';
import {
  domicilioAsignacion,
  liquidacionRepartidor,
  zonaCobertura,
} from './schema/05-domicilio';
import {
  cierreCaja,
  factura,
  facturaLinea,
  pago,
  pagoLinea,
} from './schema/06-pagos';
import {
  configuracionNotificacion,
  encuesta,
  eventoAnalitica,
  notificacion,
  plantillaNotificacion,
  resena,
  segmentoCliente,
  suscriptor,
} from './schema/07-marketing';
import {
  alertaOperativa,
  bitacoraEvento,
  eventoAuditoria,
  exportacion,
  reporteGuardado,
  reporteProgramado,
  syncOperacion,
  trabajoImpresion,
  umbralAlerta,
} from './schema/08-operacion';

export const tenantRelations = relations(tenant, ({ many }) => ({
  sucursales: many(sucursal),
  usuarios: many(usuario),
  roles: many(rol),
  impuestos: many(impuesto),
  clientes: many(cliente),
  categorias: many(categoria),
  promociones: many(promocion),
  plantillasNotificacion: many(plantillaNotificacion),
  configuracionesNotificacion: many(configuracionNotificacion),
  suscriptores: many(suscriptor),
  segmentos: many(segmentoCliente),
  eventosAnalitica: many(eventoAnalitica),
  eventosAuditoria: many(eventoAuditoria),
  umbralesAlerta: many(umbralAlerta),
  reportesProgramados: many(reporteProgramado),
}));

export const sucursalRelations = relations(sucursal, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [sucursal.tenantId],
    references: [tenant.id],
  }),
  configuracion: one(configuracionSucursal),
  horarios: many(horarioAtencion),
  cierresTemporales: many(cierreTemporal),
  consecutivos: many(consecutivo),
  mediosPago: many(medioPago),
  reglasCapacidad: many(reglaCapacidad),
  estaciones: many(estacion),
  impresoras: many(impresora),
  dispositivos: many(dispositivo),
  turnos: many(turno),
  repartidores: many(repartidor),
  solicitudesEvento: many(solicitudEvento),
  asignacionesUsuario: many(usuarioRol),
  productosPrecio: many(productoPrecio),
  disponibilidades: many(disponibilidadProducto),
  promociones: many(promocion),
  cupones: many(cupon),
  zonas: many(zona),
  mesas: many(mesa),
  politicaReserva: one(politicaReserva),
  reservas: many(reserva),
  listaEspera: many(listaEspera),
  pedidos: many(pedido),
  comandas: many(comanda),
  reglasSla: many(reglaSla),
  zonasCobertura: many(zonaCobertura),
  facturas: many(factura),
  resenas: many(resena),
  eventosAuditoria: many(eventoAuditoria),
  alertas: many(alertaOperativa),
}));

export const configuracionSucursalRelations = relations(
  configuracionSucursal,
  ({ one }) => ({
    sucursal: one(sucursal, {
      fields: [configuracionSucursal.sucursalId],
      references: [sucursal.id],
    }),
  }),
);

export const horarioAtencionRelations = relations(horarioAtencion, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [horarioAtencion.sucursalId],
    references: [sucursal.id],
  }),
}));

export const cierreTemporalRelations = relations(cierreTemporal, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [cierreTemporal.sucursalId],
    references: [sucursal.id],
  }),
}));

export const impuestoRelations = relations(impuesto, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [impuesto.tenantId],
    references: [tenant.id],
  }),
  productos: many(producto),
  facturaLineas: many(facturaLinea),
}));

export const consecutivoRelations = relations(consecutivo, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [consecutivo.sucursalId],
    references: [sucursal.id],
  }),
}));

export const medioPagoRelations = relations(medioPago, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [medioPago.sucursalId],
    references: [sucursal.id],
  }),
  pagos: many(pago),
}));

export const reglaCapacidadRelations = relations(reglaCapacidad, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [reglaCapacidad.sucursalId],
    references: [sucursal.id],
  }),
}));

export const estacionRelations = relations(estacion, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [estacion.sucursalId],
    references: [sucursal.id],
  }),
  dispositivos: many(dispositivo),
  productos: many(producto),
  comandas: many(comanda),
  reglasSla: many(reglaSla),
}));

export const impresoraRelations = relations(impresora, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [impresora.sucursalId],
    references: [sucursal.id],
  }),
  trabajosImpresion: many(trabajoImpresion),
}));

export const usuarioRelations = relations(usuario, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [usuario.tenantId],
    references: [tenant.id],
  }),
  asignaciones: many(usuarioRol),
  dispositivos: many(dispositivo),
  turnosAperturados: many(turno, { relationName: 'turno_usuario_apertura' }),
  turnosCerrados: many(turno, { relationName: 'turno_usuario_cierre' }),
  asignacionesMesa: many(mesaAsignacion),
  pedidos: many(pedido),
  ajustesPedido: many(ajustePedido),
  pagos: many(pago),
  cierresReabiertos: many(cierreCaja),
  eventosAuditoria: many(eventoAuditoria),
  alertasAtendidas: many(alertaOperativa),
  reportesGuardados: many(reporteGuardado),
  exportaciones: many(exportacion),
}));

export const rolRelations = relations(rol, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [rol.tenantId],
    references: [tenant.id],
  }),
  permisos: many(rolPermiso),
  asignaciones: many(usuarioRol),
  umbralesAlerta: many(umbralAlerta),
}));

export const permisoRelations = relations(permiso, ({ many }) => ({
  roles: many(rolPermiso),
}));

export const rolPermisoRelations = relations(rolPermiso, ({ one }) => ({
  rol: one(rol, {
    fields: [rolPermiso.rolId],
    references: [rol.id],
  }),
  permiso: one(permiso, {
    fields: [rolPermiso.permisoCodigo],
    references: [permiso.codigo],
  }),
}));

export const usuarioRolRelations = relations(usuarioRol, ({ one }) => ({
  usuario: one(usuario, {
    fields: [usuarioRol.usuarioId],
    references: [usuario.id],
  }),
  rol: one(rol, {
    fields: [usuarioRol.rolId],
    references: [rol.id],
  }),
  sucursal: one(sucursal, {
    fields: [usuarioRol.sucursalId],
    references: [sucursal.id],
  }),
}));

export const dispositivoRelations = relations(dispositivo, ({ one, many }) => ({
  usuario: one(usuario, {
    fields: [dispositivo.usuarioId],
    references: [usuario.id],
  }),
  sucursal: one(sucursal, {
    fields: [dispositivo.sucursalId],
    references: [sucursal.id],
  }),
  estacion: one(estacion, {
    fields: [dispositivo.estacionId],
    references: [estacion.id],
  }),
  syncOperaciones: many(syncOperacion),
  eventosAuditoria: many(eventoAuditoria),
  bitacoraEventos: many(bitacoraEvento),
}));

export const turnoRelations = relations(turno, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [turno.sucursalId],
    references: [sucursal.id],
  }),
  usuarioApertura: one(usuario, {
    fields: [turno.usuarioAperturaId],
    references: [usuario.id],
    relationName: 'turno_usuario_apertura',
  }),
  usuarioCierre: one(usuario, {
    fields: [turno.usuarioCierreId],
    references: [usuario.id],
    relationName: 'turno_usuario_cierre',
  }),
  asignacionesMesa: many(mesaAsignacion),
  pedidos: many(pedido),
  comandas: many(comanda),
  cierreCaja: one(cierreCaja),
}));

export const clienteRelations = relations(cliente, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [cliente.tenantId],
    references: [tenant.id],
  }),
  consentimientos: many(consentimiento),
  reservas: many(reserva),
  pedidos: many(pedido),
  resenas: many(resena),
  encuestas: many(encuesta),
}));

export const consentimientoRelations = relations(consentimiento, ({ one }) => ({
  cliente: one(cliente, {
    fields: [consentimiento.clienteId],
    references: [cliente.id],
  }),
}));

export const repartidorRelations = relations(repartidor, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [repartidor.sucursalId],
    references: [sucursal.id],
  }),
  asignaciones: many(domicilioAsignacion),
  liquidaciones: many(liquidacionRepartidor),
}));

export const solicitudEventoRelations = relations(solicitudEvento, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [solicitudEvento.sucursalId],
    references: [sucursal.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Catálogo (E2)                                                       */
/* ------------------------------------------------------------------ */

export const categoriaRelations = relations(categoria, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [categoria.tenantId],
    references: [tenant.id],
  }),
  productos: many(producto),
  gruposModificador: many(grupoModificador),
}));

export const productoRelations = relations(producto, ({ one, many }) => ({
  categoria: one(categoria, {
    fields: [producto.categoriaId],
    references: [categoria.id],
  }),
  impuesto: one(impuesto, {
    fields: [producto.impuestoId],
    references: [impuesto.id],
  }),
  estacion: one(estacion, {
    fields: [producto.estacionId],
    references: [estacion.id],
  }),
  precios: many(productoPrecio),
  fotos: many(productoFoto),
  alergenos: many(productoAlergeno),
  gruposModificador: many(grupoModificador),
  disponibilidades: many(disponibilidadProducto),
  pedidoLineas: many(pedidoLinea),
  reglasSla: many(reglaSla),
}));

export const productoPrecioRelations = relations(productoPrecio, ({ one }) => ({
  producto: one(producto, {
    fields: [productoPrecio.productoId],
    references: [producto.id],
  }),
  sucursal: one(sucursal, {
    fields: [productoPrecio.sucursalId],
    references: [sucursal.id],
  }),
}));

export const productoFotoRelations = relations(productoFoto, ({ one }) => ({
  producto: one(producto, {
    fields: [productoFoto.productoId],
    references: [producto.id],
  }),
}));

export const alergenoRelations = relations(alergeno, ({ many }) => ({
  productos: many(productoAlergeno),
}));

export const productoAlergenoRelations = relations(
  productoAlergeno,
  ({ one }) => ({
    producto: one(producto, {
      fields: [productoAlergeno.productoId],
      references: [producto.id],
    }),
    alergeno: one(alergeno, {
      fields: [productoAlergeno.alergenoId],
      references: [alergeno.id],
    }),
  }),
);

export const grupoModificadorRelations = relations(
  grupoModificador,
  ({ one, many }) => ({
    producto: one(producto, {
      fields: [grupoModificador.productoId],
      references: [producto.id],
    }),
    categoria: one(categoria, {
      fields: [grupoModificador.categoriaId],
      references: [categoria.id],
    }),
    modificadores: many(modificador),
  }),
);

export const modificadorRelations = relations(modificador, ({ one, many }) => ({
  grupo: one(grupoModificador, {
    fields: [modificador.grupoId],
    references: [grupoModificador.id],
  }),
  pedidoLineas: many(pedidoLineaModificador),
}));

export const disponibilidadProductoRelations = relations(
  disponibilidadProducto,
  ({ one }) => ({
    producto: one(producto, {
      fields: [disponibilidadProducto.productoId],
      references: [producto.id],
    }),
    sucursal: one(sucursal, {
      fields: [disponibilidadProducto.sucursalId],
      references: [sucursal.id],
    }),
  }),
);

export const promocionRelations = relations(promocion, ({ one }) => ({
  tenant: one(tenant, {
    fields: [promocion.tenantId],
    references: [tenant.id],
  }),
  sucursal: one(sucursal, {
    fields: [promocion.sucursalId],
    references: [sucursal.id],
  }),
}));

export const cuponRelations = relations(cupon, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [cupon.sucursalId],
    references: [sucursal.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Salón y reservas (E3)                                               */
/* ------------------------------------------------------------------ */

export const zonaRelations = relations(zona, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [zona.sucursalId],
    references: [sucursal.id],
  }),
  mesas: many(mesa),
  asignaciones: many(mesaAsignacion),
  reservas: many(reserva),
}));

export const mesaRelations = relations(mesa, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [mesa.sucursalId],
    references: [sucursal.id],
  }),
  zona: one(zona, {
    fields: [mesa.zonaId],
    references: [zona.id],
  }),
  asignaciones: many(mesaAsignacion),
  sesiones: many(sesionMesa),
  reservas: many(reserva),
  pedidos: many(pedido),
}));

export const mesaAsignacionRelations = relations(mesaAsignacion, ({ one }) => ({
  turno: one(turno, {
    fields: [mesaAsignacion.turnoId],
    references: [turno.id],
  }),
  zona: one(zona, {
    fields: [mesaAsignacion.zonaId],
    references: [zona.id],
  }),
  mesa: one(mesa, {
    fields: [mesaAsignacion.mesaId],
    references: [mesa.id],
  }),
  usuario: one(usuario, {
    fields: [mesaAsignacion.usuarioId],
    references: [usuario.id],
  }),
}));

export const sesionMesaRelations = relations(sesionMesa, ({ one, many }) => ({
  mesa: one(mesa, {
    fields: [sesionMesa.mesaId],
    references: [mesa.id],
  }),
  pedidos: many(pedido),
}));

export const politicaReservaRelations = relations(
  politicaReserva,
  ({ one }) => ({
    sucursal: one(sucursal, {
      fields: [politicaReserva.sucursalId],
      references: [sucursal.id],
    }),
  }),
);

export const reservaRelations = relations(reserva, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [reserva.sucursalId],
    references: [sucursal.id],
  }),
  cliente: one(cliente, {
    fields: [reserva.clienteId],
    references: [cliente.id],
  }),
  zona: one(zona, {
    fields: [reserva.zonaId],
    references: [zona.id],
  }),
  mesa: one(mesa, {
    fields: [reserva.mesaId],
    references: [mesa.id],
  }),
  pagos: many(pago),
}));

export const listaEsperaRelations = relations(listaEspera, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [listaEspera.sucursalId],
    references: [sucursal.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Pedidos y comandas (E4)                                             */
/* ------------------------------------------------------------------ */

export const pedidoRelations = relations(pedido, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [pedido.sucursalId],
    references: [sucursal.id],
  }),
  cliente: one(cliente, {
    fields: [pedido.clienteId],
    references: [cliente.id],
  }),
  mesa: one(mesa, {
    fields: [pedido.mesaId],
    references: [mesa.id],
  }),
  sesionMesa: one(sesionMesa, {
    fields: [pedido.sesionMesaId],
    references: [sesionMesa.id],
  }),
  mesero: one(usuario, {
    fields: [pedido.meseroId],
    references: [usuario.id],
  }),
  turno: one(turno, {
    fields: [pedido.turnoId],
    references: [turno.id],
  }),
  lineas: many(pedidoLinea),
  comandas: many(comanda),
  ajustes: many(ajustePedido),
  asignacionesDomicilio: many(domicilioAsignacion),
  pagos: many(pago),
  facturas: many(factura),
}));

export const pedidoLineaRelations = relations(
  pedidoLinea,
  ({ one, many }) => ({
    pedido: one(pedido, {
      fields: [pedidoLinea.pedidoId],
      references: [pedido.id],
    }),
    producto: one(producto, {
      fields: [pedidoLinea.productoId],
      references: [producto.id],
    }),
    modificadores: many(pedidoLineaModificador),
    comandaLineas: many(comandaLinea),
    ajustes: many(ajustePedido),
    pagoLineas: many(pagoLinea),
  }),
);

export const pedidoLineaModificadorRelations = relations(
  pedidoLineaModificador,
  ({ one }) => ({
    linea: one(pedidoLinea, {
      fields: [pedidoLineaModificador.pedidoLineaId],
      references: [pedidoLinea.id],
    }),
    modificador: one(modificador, {
      fields: [pedidoLineaModificador.modificadorId],
      references: [modificador.id],
    }),
  }),
);

export const ajustePedidoRelations = relations(ajustePedido, ({ one }) => ({
  pedido: one(pedido, {
    fields: [ajustePedido.pedidoId],
    references: [pedido.id],
  }),
  linea: one(pedidoLinea, {
    fields: [ajustePedido.pedidoLineaId],
    references: [pedidoLinea.id],
  }),
  usuario: one(usuario, {
    fields: [ajustePedido.usuarioId],
    references: [usuario.id],
  }),
}));

export const comandaRelations = relations(comanda, ({ one, many }) => ({
  pedido: one(pedido, {
    fields: [comanda.pedidoId],
    references: [pedido.id],
  }),
  sucursal: one(sucursal, {
    fields: [comanda.sucursalId],
    references: [sucursal.id],
  }),
  estacion: one(estacion, {
    fields: [comanda.estacionId],
    references: [estacion.id],
  }),
  turno: one(turno, {
    fields: [comanda.turnoId],
    references: [turno.id],
  }),
  lineas: many(comandaLinea),
  trabajosImpresion: many(trabajoImpresion),
}));

export const comandaLineaRelations = relations(comandaLinea, ({ one }) => ({
  comanda: one(comanda, {
    fields: [comandaLinea.comandaId],
    references: [comanda.id],
  }),
  linea: one(pedidoLinea, {
    fields: [comandaLinea.pedidoLineaId],
    references: [pedidoLinea.id],
  }),
}));

export const reglaSlaRelations = relations(reglaSla, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [reglaSla.sucursalId],
    references: [sucursal.id],
  }),
  estacion: one(estacion, {
    fields: [reglaSla.estacionId],
    references: [estacion.id],
  }),
  producto: one(producto, {
    fields: [reglaSla.productoId],
    references: [producto.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Domicilio (E5)                                                      */
/* ------------------------------------------------------------------ */

export const zonaCoberturaRelations = relations(zonaCobertura, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [zonaCobertura.sucursalId],
    references: [sucursal.id],
  }),
}));

export const domicilioAsignacionRelations = relations(
  domicilioAsignacion,
  ({ one }) => ({
    pedido: one(pedido, {
      fields: [domicilioAsignacion.pedidoId],
      references: [pedido.id],
    }),
    repartidor: one(repartidor, {
      fields: [domicilioAsignacion.repartidorId],
      references: [repartidor.id],
    }),
  }),
);

export const liquidacionRepartidorRelations = relations(
  liquidacionRepartidor,
  ({ one }) => ({
    repartidor: one(repartidor, {
      fields: [liquidacionRepartidor.repartidorId],
      references: [repartidor.id],
    }),
  }),
);

/* ------------------------------------------------------------------ */
/* Pagos, caja y facturación (E6)                                      */
/* ------------------------------------------------------------------ */

export const pagoRelations = relations(pago, ({ one, many }) => ({
  pedido: one(pedido, {
    fields: [pago.pedidoId],
    references: [pedido.id],
  }),
  reserva: one(reserva, {
    fields: [pago.reservaId],
    references: [reserva.id],
  }),
  medioPago: one(medioPago, {
    fields: [pago.medioPagoId],
    references: [medioPago.id],
  }),
  usuario: one(usuario, {
    fields: [pago.usuarioId],
    references: [usuario.id],
  }),
  lineas: many(pagoLinea),
}));

export const pagoLineaRelations = relations(pagoLinea, ({ one }) => ({
  pago: one(pago, {
    fields: [pagoLinea.pagoId],
    references: [pago.id],
  }),
  linea: one(pedidoLinea, {
    fields: [pagoLinea.pedidoLineaId],
    references: [pedidoLinea.id],
  }),
}));

export const cierreCajaRelations = relations(cierreCaja, ({ one }) => ({
  turno: one(turno, {
    fields: [cierreCaja.turnoId],
    references: [turno.id],
  }),
  usuarioReapertura: one(usuario, {
    fields: [cierreCaja.reabiertoPor],
    references: [usuario.id],
  }),
}));

export const facturaRelations = relations(factura, ({ one, many }) => ({
  sucursal: one(sucursal, {
    fields: [factura.sucursalId],
    references: [sucursal.id],
  }),
  pedido: one(pedido, {
    fields: [factura.pedidoId],
    references: [pedido.id],
  }),
  lineas: many(facturaLinea),
  trabajosImpresion: many(trabajoImpresion),
}));

export const facturaLineaRelations = relations(facturaLinea, ({ one }) => ({
  factura: one(factura, {
    fields: [facturaLinea.facturaId],
    references: [factura.id],
  }),
  impuesto: one(impuesto, {
    fields: [facturaLinea.impuestoId],
    references: [impuesto.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Notificaciones y marketing (E7)                                     */
/* ------------------------------------------------------------------ */

export const plantillaNotificacionRelations = relations(
  plantillaNotificacion,
  ({ one, many }) => ({
    tenant: one(tenant, {
      fields: [plantillaNotificacion.tenantId],
      references: [tenant.id],
    }),
    notificaciones: many(notificacion),
    configuraciones: many(configuracionNotificacion),
  }),
);

export const notificacionRelations = relations(notificacion, ({ one }) => ({
  plantilla: one(plantillaNotificacion, {
    fields: [notificacion.plantillaId],
    references: [plantillaNotificacion.id],
  }),
}));

export const configuracionNotificacionRelations = relations(
  configuracionNotificacion,
  ({ one }) => ({
    tenant: one(tenant, {
      fields: [configuracionNotificacion.tenantId],
      references: [tenant.id],
    }),
    plantilla: one(plantillaNotificacion, {
      fields: [configuracionNotificacion.plantillaId],
      references: [plantillaNotificacion.id],
    }),
  }),
);

export const suscriptorRelations = relations(suscriptor, ({ one }) => ({
  tenant: one(tenant, {
    fields: [suscriptor.tenantId],
    references: [tenant.id],
  }),
}));

export const resenaRelations = relations(resena, ({ one }) => ({
  sucursal: one(sucursal, {
    fields: [resena.sucursalId],
    references: [sucursal.id],
  }),
  cliente: one(cliente, {
    fields: [resena.clienteId],
    references: [cliente.id],
  }),
}));

export const encuestaRelations = relations(encuesta, ({ one }) => ({
  cliente: one(cliente, {
    fields: [encuesta.clienteId],
    references: [cliente.id],
  }),
}));

export const segmentoClienteRelations = relations(
  segmentoCliente,
  ({ one }) => ({
    tenant: one(tenant, {
      fields: [segmentoCliente.tenantId],
      references: [tenant.id],
    }),
  }),
);

export const eventoAnaliticaRelations = relations(
  eventoAnalitica,
  ({ one }) => ({
    tenant: one(tenant, {
      fields: [eventoAnalitica.tenantId],
      references: [tenant.id],
    }),
  }),
);

/* ------------------------------------------------------------------ */
/* Operación y trazabilidad (E8)                                       */
/* ------------------------------------------------------------------ */

export const syncOperacionRelations = relations(syncOperacion, ({ one }) => ({
  dispositivo: one(dispositivo, {
    fields: [syncOperacion.dispositivoId],
    references: [dispositivo.id],
  }),
}));

export const eventoAuditoriaRelations = relations(
  eventoAuditoria,
  ({ one }) => ({
    tenant: one(tenant, {
      fields: [eventoAuditoria.tenantId],
      references: [tenant.id],
    }),
    sucursal: one(sucursal, {
      fields: [eventoAuditoria.sucursalId],
      references: [sucursal.id],
    }),
    usuario: one(usuario, {
      fields: [eventoAuditoria.usuarioId],
      references: [usuario.id],
    }),
    dispositivo: one(dispositivo, {
      fields: [eventoAuditoria.dispositivoId],
      references: [dispositivo.id],
    }),
  }),
);

export const bitacoraEventoRelations = relations(
  bitacoraEvento,
  ({ one }) => ({
    dispositivo: one(dispositivo, {
      fields: [bitacoraEvento.dispositivoId],
      references: [dispositivo.id],
    }),
  }),
);

export const alertaOperativaRelations = relations(
  alertaOperativa,
  ({ one }) => ({
    sucursal: one(sucursal, {
      fields: [alertaOperativa.sucursalId],
      references: [sucursal.id],
    }),
    atendidaPor: one(usuario, {
      fields: [alertaOperativa.atendidaPor],
      references: [usuario.id],
    }),
  }),
);

export const umbralAlertaRelations = relations(umbralAlerta, ({ one }) => ({
  tenant: one(tenant, {
    fields: [umbralAlerta.tenantId],
    references: [tenant.id],
  }),
  rol: one(rol, {
    fields: [umbralAlerta.rolDestinatario],
    references: [rol.id],
  }),
}));

export const reporteGuardadoRelations = relations(
  reporteGuardado,
  ({ one }) => ({
    usuario: one(usuario, {
      fields: [reporteGuardado.usuarioId],
      references: [usuario.id],
    }),
  }),
);

export const reporteProgramadoRelations = relations(
  reporteProgramado,
  ({ one }) => ({
    tenant: one(tenant, {
      fields: [reporteProgramado.tenantId],
      references: [tenant.id],
    }),
  }),
);

export const exportacionRelations = relations(exportacion, ({ one }) => ({
  usuario: one(usuario, {
    fields: [exportacion.usuarioId],
    references: [usuario.id],
  }),
}));

export const trabajoImpresionRelations = relations(
  trabajoImpresion,
  ({ one }) => ({
    comanda: one(comanda, {
      fields: [trabajoImpresion.comandaId],
      references: [comanda.id],
    }),
    factura: one(factura, {
      fields: [trabajoImpresion.facturaId],
      references: [factura.id],
    }),
    impresora: one(impresora, {
      fields: [trabajoImpresion.impresoraId],
      references: [impresora.id],
    }),
  }),
);
