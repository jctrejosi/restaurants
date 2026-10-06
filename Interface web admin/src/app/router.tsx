import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from "react"
import { createBrowserRouter, Navigate } from "react-router-dom"
import { AYUDA, MODULES, type ModuleDef } from "@/app/nav"
import { RequirePermiso } from "@/app/RequirePermiso"
import { AppShell } from "@/app/shell/AppShell"
import { ModulePlaceholder } from "@/components/data/ModulePlaceholder"
import { PageHeader } from "@/components/data/PageHeader"
import { SkeletonRows } from "@/components/ui/Skeleton"

/**
 * Registro de páginas implementadas. Un módulo se enruta a su página cuando está
 * en este registro y `nav.ts` lo marca como `listo`; el resto usa su marcador.
 */
const PAGINAS: Record<string, LazyExoticComponent<ComponentType>> = {
  "en-vivo": lazy(() => import("@/modules/en-vivo/EnVivoPage")),
  pedidos: lazy(() => import("@/modules/pedidos/PedidosPage")),
  "tomar-pedido": lazy(() => import("@/modules/tomar-pedido/TomarPedidoPage")),
  reservas: lazy(() => import("@/modules/reservas/ReservasPage")),
  comandas: lazy(() => import("@/modules/comandas/ComandasPage")),
  salon: lazy(() => import("@/modules/salon/SalonPage")),
  catalogo: lazy(() => import("@/modules/catalogo/CatalogoPage")),
  estaciones: lazy(() => import("@/modules/estaciones/EstacionesPage")),
  promociones: lazy(() => import("@/modules/promociones/PromocionesPage")),
  domicilio: lazy(() => import("@/modules/domicilio/DomicilioPage")),
  clientes: lazy(() => import("@/modules/clientes/ClientesPage")),
  caja: lazy(() => import("@/modules/caja/CajaPage")),
  pagos: lazy(() => import("@/modules/pagos/PagosPage")),
  facturacion: lazy(() => import("@/modules/facturacion/FacturacionPage")),
  reportes: lazy(() => import("@/modules/reportes/ReportesPage")),
  tiempos: lazy(() => import("@/modules/tiempos/TiemposPage")),
  auditoria: lazy(() => import("@/modules/auditoria/AuditoriaPage")),
  usuarios: lazy(() => import("@/modules/usuarios/UsuariosPage")),
  dispositivos: lazy(() => import("@/modules/dispositivos/DispositivosPage")),
  ajustes: lazy(() => import("@/modules/ajustes/AjustesPage")),
  ayuda: lazy(() => import("@/modules/ayuda/AyudaPage")),
}

function PageLoading() {
  return (
    <div className="module-page">
      <SkeletonRows rows={6} columns={5} />
    </div>
  )
}

function PlaceholderModulo({ module }: { module: ModuleDef }) {
  return (
    <RequirePermiso permiso={module.permiso}>
      <ModulePlaceholder module={module} />
    </RequirePermiso>
  )
}

function NoEncontrado() {
  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Error"
        title="Página no encontrada"
        subtitle="La ruta que abriste no existe o cambió de lugar."
      />
      <div className="state-block">
        <strong>404</strong>
        <p>Usa la búsqueda global (⌘K) o el menú lateral para volver a la operación.</p>
      </div>
    </div>
  )
}

function rutasDeModulo(module: ModuleDef) {
  const Pagina = PAGINAS[module.id]
  const implementado = module.status === "listo" && Pagina !== undefined

  return module.rutas.map((ruta) => ({
    path: ruta.replace(/^\//, ""),
    element: implementado ? (
      <RequirePermiso permiso={module.permiso}>
        <Suspense fallback={<PageLoading />}>
          <Pagina />
        </Suspense>
      </RequirePermiso>
    ) : (
      <PlaceholderModulo module={module} />
    ),
  }))
}

const RUTAS_MODULOS = [...MODULES, AYUDA].flatMap(rutasDeModulo)

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/en-vivo" replace /> },
      ...RUTAS_MODULOS,
      { path: "*", element: <NoEncontrado /> },
    ],
  },
])
