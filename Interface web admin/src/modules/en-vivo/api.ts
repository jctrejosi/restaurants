import { useQuery } from "@tanstack/react-query"
import { api, registerMock } from "@/lib/api"
import { formatClock, formatMoney } from "@/lib/format"
import type { EnVivoResumen, MesaEstado, PedidoActivo, SalonResumen } from "@/modules/en-vivo/types"

/* -------------------------------------------------------------------------- */
/* Mock de desarrollo (se retira cuando exista `GET /admin/en-vivo/resumen`).  */
/* -------------------------------------------------------------------------- */

const PEDIDOS: PedidoActivo[] = [
  {
    id: "p-8831",
    folio: "P-8831",
    modalidad: "mesa",
    etiqueta: "Mesa 12",
    canal: "Salón",
    estado: "Por cobrar",
    estadoTone: "amber",
    totalCentavos: 84_500,
    transcurridoSeg: 38 * 60 + 12,
    slaSeg: 30 * 60,
  },
  {
    id: "p-8834",
    folio: "P-8834",
    modalidad: "recoger",
    etiqueta: "Para recoger",
    canal: "Web",
    estado: "Listo",
    estadoTone: "green",
    totalCentavos: 22_000,
    transcurridoSeg: 19 * 60 + 40,
  },
  {
    id: "p-8836",
    folio: "P-8836",
    modalidad: "mesa",
    etiqueta: "Mesa 05",
    canal: "Salón",
    estado: "En preparación",
    estadoTone: "amber",
    totalCentavos: 49_000,
    transcurridoSeg: 16 * 60 + 8,
  },
  {
    id: "p-8837",
    folio: "P-8837",
    modalidad: "domicilio",
    etiqueta: "Domicilio",
    canal: "App",
    estado: "Recibido",
    estadoTone: "blue",
    totalCentavos: 36_000,
    transcurridoSeg: 11 * 60 + 42,
  },
  {
    id: "p-8840",
    folio: "P-8840",
    modalidad: "mesa",
    etiqueta: "Mesa 03",
    canal: "QR",
    estado: "Recibido",
    estadoTone: "blue",
    totalCentavos: 18_500,
    transcurridoSeg: 4 * 60 + 5,
  },
  {
    id: "p-8841",
    folio: "P-8841",
    modalidad: "domicilio",
    etiqueta: "Domicilio",
    canal: "Web",
    estado: "En camino",
    estadoTone: "blue",
    totalCentavos: 27_000,
    transcurridoSeg: 9 * 60 + 30,
  },
]

const MESAS: { numero: string; estado: MesaEstado; etiqueta?: string }[] = [
  { numero: "01", estado: "libre" },
  { numero: "02", estado: "ocupada" },
  { numero: "03", estado: "ocupada" },
  { numero: "04", estado: "por_cobrar", etiqueta: "Cobrar" },
  { numero: "05", estado: "ocupada" },
  { numero: "06", estado: "libre" },
  { numero: "07", estado: "reservada", etiqueta: "14:00" },
  { numero: "08", estado: "reservada", etiqueta: "14:15" },
  { numero: "09", estado: "libre" },
  { numero: "10", estado: "ocupada" },
  { numero: "11", estado: "libre" },
  { numero: "12", estado: "por_cobrar", etiqueta: "Cobrar" },
]

function construirSalon(): SalonResumen {
  return {
    zona: "Terraza principal",
    mesas: MESAS,
    ocupadas: MESAS.filter((mesa) => mesa.estado === "ocupada").length,
    libres: MESAS.filter((mesa) => mesa.estado === "libre").length,
    porCobrar: MESAS.filter((mesa) => mesa.estado === "por_cobrar").length,
  }
}

registerMock("GET", /^\/admin\/en-vivo\/resumen$/, () => {
  const activos = PEDIDOS.length
  const ventasCentavos = 2_845_000
  const kpis: EnVivoResumen["kpis"] = [
    {
      label: "Ventas de hoy",
      value: formatMoney(ventasCentavos),
      delta: "+12.4%",
      foot: "vs. ayer",
      color: "terracotta",
      points: "2,29 18,24 34,25 50,15 66,19 82,8 98,11",
    },
    {
      label: "Pedidos activos",
      value: String(activos + 8),
      delta: "+3",
      foot: "última hora",
      color: "blue",
      points: "2,24 18,21 34,23 50,17 66,14 82,16 98,8",
    },
    {
      label: "Reservas de hoy",
      value: "23",
      delta: "78%",
      foot: "ocupación",
      color: "gold",
      points: "2,27 18,25 34,20 50,21 66,14 82,10 98,7",
    },
    {
      label: "Ticket promedio",
      value: formatMoney(41_200),
      delta: "+5.8%",
      foot: "vs. ayer",
      color: "purple",
      points: "2,26 18,25 34,17 50,19 66,14 82,15 98,8",
    },
    {
      label: "Cumplimiento SLA",
      value: "92%",
      delta: "−2.1%",
      deltaNegativo: true,
      foot: "objetivo 95%",
      color: "green",
      points: "2,9 18,12 34,10 50,17 66,16 82,20 98,19",
    },
  ]

  const resumen: EnVivoResumen = {
    actualizadoEn: new Date().toISOString(),
    kpis,
    pedidosActivos: PEDIDOS,
    salon: construirSalon(),
    comandas: [
      { numero: "1038", estacion: "Parrilla", estado: "En preparación", transcurridoSeg: 9 * 60 + 35, slaSeg: 7 * 60 },
      { numero: "1039", estacion: "Parrilla", estado: "En preparación", transcurridoSeg: 4 * 60 + 10, slaSeg: 7 * 60 },
      { numero: "1041", estacion: "Barra fría", estado: "En preparación", transcurridoSeg: 2 * 60 + 40, slaSeg: 5 * 60 },
    ],
    proximasLlegadas: [
      { hora: "14:00", cliente: "Laura Pérez", personas: 4, mesa: "Mesa 8" },
      { hora: "14:15", cliente: "Carlos Méndez", personas: 2, mesa: "Mesa 3" },
      { hora: "14:30", cliente: "Ana Morales", personas: 6 },
    ],
  }
  return resumen
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useEnVivoResumen(pausado = false) {
  return useQuery({
    queryKey: ["en-vivo", "resumen"],
    queryFn: () => api.get<EnVivoResumen>("/admin/en-vivo/resumen"),
    refetchInterval: pausado ? false : 15_000,
  })
}

export { formatClock }
