/**
 * Sede activa del panel (plan 05 §6.2): visible en todo momento; cambiarla
 * refresca el ámbito de todas las consultas (RNF-R5-01). `null` = «Todas las
 * sedes» (consolidado, solo administrador global).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { setActiveSucursalId } from "@/lib/api"

export type Sede = {
  id: string
  nombre: string
  zonaHoraria: string
  moneda: string
}

/** Catálogo de sedes (mock hasta que exista `GET /admin/sucursales`). */
export const SEDES: Sede[] = [
  { id: "centro", nombre: "Punto C · Centro", zonaHoraria: "America/Mexico_City", moneda: "MXN" },
  { id: "norte", nombre: "Punto C · Norte", zonaHoraria: "America/Mexico_City", moneda: "MXN" },
]

const STORAGE_KEY = "pc_sede"

type SedeContextValue = {
  sedes: Sede[]
  sedeId: string | null
  sede: Sede | null
  esGlobal: boolean
  setSedeId: (id: string | null) => void
  zonaHoraria: string
  moneda: string
}

const SedeContext = createContext<SedeContextValue | null>(null)

export function SedeProvider({ children }: { children: ReactNode }) {
  const [sedeId, setSedeIdState] = useState<string | null>(() => {
    if (typeof localStorage === "undefined") return SEDES[0]?.id ?? null
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "todas") return null
    return stored ?? SEDES[0]?.id ?? null
  })

  useEffect(() => {
    setActiveSucursalId(sedeId)
  }, [sedeId])

  const setSedeId = useCallback((id: string | null) => {
    setSedeIdState(id)
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id ?? "todas")
    }
  }, [])

  const value = useMemo<SedeContextValue>(() => {
    const sede = sedeId ? (SEDES.find((item) => item.id === sedeId) ?? null) : null
    return {
      sedes: SEDES,
      sedeId,
      sede,
      esGlobal: sedeId === null,
      setSedeId,
      zonaHoraria: sede?.zonaHoraria ?? "America/Mexico_City",
      moneda: sede?.moneda ?? "MXN",
    }
  }, [sedeId, setSedeId])

  return <SedeContext.Provider value={value}>{children}</SedeContext.Provider>
}

export function useSede(): SedeContextValue {
  const context = useContext(SedeContext)
  if (!context) throw new Error("useSede debe usarse dentro de <SedeProvider>")
  return context
}
