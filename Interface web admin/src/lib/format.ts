/**
 * Formatos del panel (RNF-R5-08): moneda, fecha y zona horaria **por sucursal**.
 * Todos los importes del proyecto viajan en centavos (`*_centavos`).
 */

const DEFAULT_CURRENCY = "MXN"
const DEFAULT_LOCALE = "es-MX"

export function formatMoney(centavos: number, moneda: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(centavos / 100)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value)
}

export function formatPercent(fraction: number, digits = 0): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(fraction)
}

/** Tramos de tiempo (R5 §5.3): `04:12` o `1 h 12 m`. Un tramo sin cierre es `—`. */
export function formatDuration(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined) return "—"
  const total = Math.max(0, Math.round(segundos))
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segs = total % 60
  if (horas > 0) return `${horas} h ${String(minutos).padStart(2, "0")} m`
  return `${String(minutos).padStart(2, "0")}:${String(segs).padStart(2, "0")}`
}

/** Reloj corto para tableros en vivo: `mm:ss`. */
export function formatClock(segundos: number): string {
  const total = Math.max(0, Math.round(segundos))
  const minutos = Math.floor(total / 60)
  const segs = total % 60
  return `${String(minutos).padStart(2, "0")}:${String(segs).padStart(2, "0")}`
}

export function formatTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso))
}

export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso))
}

/** «hace 8 min», «hace 2 h», «ahora». */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffSeg = Math.round((now.getTime() - new Date(iso).getTime()) / 1000)
  if (diffSeg < 45) return "ahora"
  const min = Math.round(diffSeg / 60)
  if (min < 60) return `hace ${min} min`
  const horas = Math.round(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  return `hace ${dias} d`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

/** Máscara de datos personales para roles sin permiso (RN-R5-07). */
export function maskName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "—"
  return [parts[0], ...parts.slice(1).map((part) => `${part[0]}.`)].join(" ")
}

export function maskContact(value: string): string {
  if (value.includes("@")) {
    const [user, domain] = value.split("@")
    return `${user.slice(0, 2)}***@${domain}`
  }
  return value.length > 4 ? `${value.slice(0, 2)}•••${value.slice(-2)}` : "••••"
}
