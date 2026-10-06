/**
 * Alertas operativas compartidas por la campana del shell y el tablero «En vivo»
 * (RF-R5-04). Severidades y copy según plan 05 §1.2 y §10.
 */

import { useQuery } from "@tanstack/react-query"
import { api, registerMock } from "@/lib/api"

export type AlertaSeveridad = "critica" | "alta" | "media" | "baja"

export type AlertaOperativa = {
  id: string
  tipo: string
  severidad: AlertaSeveridad
  titulo: string
  detalle: string
  entidad?: string
  entidadId?: string
  creadaEn: string
  atendida: boolean
}

export const SEVERIDAD_LABEL: Record<AlertaSeveridad, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
}

const haceMinutos = (minutos: number) => new Date(Date.now() - minutos * 60_000).toISOString()

registerMock("GET", /^\/admin\/alertas$/, () => [
  {
    id: "a-1038",
    tipo: "sla",
    severidad: "critica",
    titulo: "SLA excedido",
    detalle: "Comanda 1038 · Parrilla",
    entidad: "comanda",
    entidadId: "1038",
    creadaEn: haceMinutos(3),
    atendida: false,
  },
  {
    id: "a-turno",
    tipo: "caja",
    severidad: "alta",
    titulo: "Turno sin cerrar",
    detalle: "Caja principal · turno de ayer",
    entidad: "turno",
    entidadId: "t-1",
    creadaEn: haceMinutos(840),
    atendida: false,
  },
  {
    id: "a-sync",
    tipo: "sync",
    severidad: "media",
    titulo: "Sincronización pendiente",
    detalle: "KDS Parrilla · 2 operaciones",
    entidad: "dispositivo",
    entidadId: "d-kds-01",
    creadaEn: haceMinutos(8),
    atendida: false,
  },
] satisfies AlertaOperativa[])

export function useAlertas() {
  return useQuery({
    queryKey: ["alertas"],
    queryFn: () => api.get<AlertaOperativa[]>("/admin/alertas"),
    refetchInterval: 20_000,
  })
}

export function alertasPendientes(alertas: AlertaOperativa[] | undefined): AlertaOperativa[] {
  return (alertas ?? []).filter((alerta) => !alerta.atendida)
}
