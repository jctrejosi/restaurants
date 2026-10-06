/**
 * Catálogo de módulos del sidebar (plan 05 §4.1) y navegación.
 *
 * `status` refleja el avance de la implementación: los módulos `pendiente` se
 * enrutan a un marcador hasta que se implementen (se van cubriendo uno por uno).
 */

import {
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  CookingPot,
  FileBarChart,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  MonitorSmartphone,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  UserCog,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"

export type ModuleStatus = "listo" | "en-curso" | "pendiente"

export type ModuleDef = {
  id: string
  nombre: string
  bloque: string
  path: string
  icon: LucideIcon
  permiso: string
  status: ModuleStatus
  descripcion: string
  /** Sub-rutas previstas por el plan del módulo. */
  rutas: string[]
}

export const MODULES: ModuleDef[] = [
  {
    id: "en-vivo",
    nombre: "En vivo",
    bloque: "Operación",
    path: "/en-vivo",
    icon: LayoutDashboard,
    permiso: "en-vivo.ver",
    status: "listo",
    descripcion: "Tablero de entrada: pedidos activos, salón, comandas y alertas en tiempo real.",
    rutas: ["/en-vivo"],
  },
  {
    id: "pedidos",
    nombre: "Pedidos",
    bloque: "Operación",
    path: "/pedidos",
    icon: ShoppingBag,
    permiso: "pedidos.ver",
    status: "listo",
    descripcion: "Lista en vivo e historial, con detalle, líneas, comandas, pagos y bitácora.",
    rutas: ["/pedidos", "/pedidos/:id"],
  },
  {
    id: "reservas",
    nombre: "Reservas",
    bloque: "Operación",
    path: "/reservas",
    icon: CalendarDays,
    permiso: "reservas.ver",
    status: "listo",
    descripcion: "Calendario, lista y detalle de reservas, lista de espera, políticas y bloqueos.",
    rutas: ["/reservas", "/reservas/calendario", "/reservas/:id"],
  },
  {
    id: "comandas",
    nombre: "Comandas",
    bloque: "Operación",
    path: "/comandas",
    icon: CookingPot,
    permiso: "comandas.ver",
    status: "listo",
    descripcion: "Monitor por estación con SLA, historial del turno y excepciones.",
    rutas: ["/comandas", "/comandas/:id"],
  },
  {
    id: "salon",
    nombre: "Salón",
    bloque: "Operación",
    path: "/salon",
    icon: LayoutGrid,
    permiso: "salon.ver",
    status: "listo",
    descripcion: "Mapa de zonas y mesas, estados, uniones y aforo por zona.",
    rutas: ["/salon"],
  },
  {
    id: "catalogo",
    nombre: "Catálogo",
    bloque: "Negocio",
    path: "/catalogo",
    icon: BookOpen,
    permiso: "catalogo.ver",
    status: "listo",
    descripcion: "Productos, categorías y modificadores, disponibilidad, agotados e importación CSV.",
    rutas: ["/catalogo", "/catalogo/:id", "/catalogo/disponibilidad", "/catalogo/importar"],
  },
  {
    id: "estaciones",
    nombre: "Estaciones e impresoras",
    bloque: "Negocio",
    path: "/estaciones",
    icon: UtensilsCrossed,
    permiso: "estaciones.ver",
    status: "listo",
    descripcion: "Estaciones, rutas de impresión, SLA por estación y producto, prueba de impresión.",
    rutas: ["/estaciones"],
  },
  {
    id: "promociones",
    nombre: "Promociones",
    bloque: "Negocio",
    path: "/promociones",
    icon: Tag,
    permiso: "promociones.ver",
    status: "listo",
    descripcion: "Promociones y banners, cupones, newsletter, reseñas y métricas UTM.",
    rutas: ["/promociones"],
  },
  {
    id: "domicilio",
    nombre: "Domicilio",
    bloque: "Servicio",
    path: "/domicilio",
    icon: Truck,
    permiso: "domicilio.ver",
    status: "listo",
    descripcion: "Zonas de cobertura, repartidores, seguimiento de entregas y liquidación.",
    rutas: ["/domicilio"],
  },
  {
    id: "clientes",
    nombre: "Clientes",
    bloque: "Servicio",
    path: "/clientes",
    icon: Users,
    permiso: "clientes.ver",
    status: "listo",
    descripcion: "Ficha con historial, consentimientos, segmentos y derechos ARCO.",
    rutas: ["/clientes", "/clientes/:id"],
  },
  {
    id: "caja",
    nombre: "Caja y turnos",
    bloque: "Dinero",
    path: "/caja",
    icon: CircleDollarSign,
    permiso: "caja.ver",
    status: "listo",
    descripcion: "Turnos, arqueo, cierre, reapertura auditada y reporte de cierre.",
    rutas: ["/caja", "/caja/:turnoId"],
  },
  {
    id: "pagos",
    nombre: "Pagos y propinas",
    bloque: "Dinero",
    path: "/pagos",
    icon: ReceiptText,
    permiso: "pagos.ver",
    status: "listo",
    descripcion: "Pagos por medio, propinas, descuentos, reembolsos y liquidación.",
    rutas: ["/pagos"],
  },
  {
    id: "facturacion",
    nombre: "Facturación",
    bloque: "Dinero",
    path: "/facturacion",
    icon: FileBarChart,
    permiso: "facturacion.ver",
    status: "listo",
    descripcion: "Facturas y notas crédito, configuración fiscal y diagnóstico del proveedor.",
    rutas: ["/facturacion"],
  },
  {
    id: "reportes",
    nombre: "Reportes",
    bloque: "Analítica",
    path: "/reportes",
    icon: Gauge,
    permiso: "reportes.ver",
    status: "listo",
    descripcion: "Ventas, reservas, desempeño, impuestos, comparativos y reportes programados.",
    rutas: ["/reportes"],
  },
  {
    id: "tiempos",
    nombre: "Tiempos y SLA",
    bloque: "Analítica",
    path: "/tiempos",
    icon: Clock3,
    permiso: "tiempos.ver",
    status: "listo",
    descripcion: "Explorador de tramos (atención, preparación, despacho, cobro) y cumplimiento de SLA.",
    rutas: ["/tiempos"],
  },
  {
    id: "auditoria",
    nombre: "Auditoría",
    bloque: "Analítica",
    path: "/auditoria",
    icon: ShieldCheck,
    permiso: "auditoria.ver",
    status: "listo",
    descripcion: "Bitácora global inmutable con filtros, diffs antes/después y exportación.",
    rutas: ["/auditoria", "/auditoria/:entidad/:id"],
  },
  {
    id: "usuarios",
    nombre: "Usuarios y roles",
    bloque: "Configuración",
    path: "/usuarios",
    icon: UserCog,
    permiso: "usuarios.ver",
    status: "listo",
    descripcion: "Usuarios, plantillas de rol, matriz de permisos y 2FA.",
    rutas: ["/usuarios", "/roles"],
  },
  {
    id: "dispositivos",
    nombre: "Dispositivos",
    bloque: "Configuración",
    path: "/dispositivos",
    icon: MonitorSmartphone,
    permiso: "dispositivos.ver",
    status: "listo",
    descripcion: "Inventario, vinculación/revocación, versión mínima y diagnóstico.",
    rutas: ["/dispositivos"],
  },
  {
    id: "ajustes",
    nombre: "Sucursal y ajustes",
    bloque: "Configuración",
    path: "/ajustes",
    icon: Settings,
    permiso: "ajustes.ver",
    status: "listo",
    descripcion: "Datos de la sucursal, horarios, parámetros, notificaciones y alta de sede.",
    rutas: ["/ajustes"],
  },
]

export const AYUDA: ModuleDef = {
  id: "ayuda",
  nombre: "Ayuda y soporte",
  bloque: "Ayuda",
  path: "/ayuda",
  icon: HelpCircle,
  permiso: "ayuda.ver",
  status: "listo",
  descripcion: "Atajos de teclado, guías y contacto con soporte.",
  rutas: ["/ayuda"],
}

export const NAV_BLOCKS: { label: string; items: ModuleDef[] }[] = [
  "Operación",
  "Negocio",
  "Servicio",
  "Dinero",
  "Analítica",
  "Configuración",
].map((label) => ({ label, items: MODULES.filter((modulo) => modulo.bloque === label) }))

const ALL_MODULES = [...MODULES, AYUDA]

export function moduleById(id: string): ModuleDef | undefined {
  return ALL_MODULES.find((modulo) => modulo.id === id)
}

/** Módulo al que pertenece una ruta (el prefijo más largo que coincide). */
export function moduleForPath(pathname: string): ModuleDef | undefined {
  return [...ALL_MODULES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((modulo) => pathname === modulo.path || pathname.startsWith(`${modulo.path}/`))
}
