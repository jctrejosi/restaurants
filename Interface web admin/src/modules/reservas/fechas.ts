/**
 * Utilidades de fecha del módulo Reservas.
 *
 * Todo lo que se pinta usa la zona horaria de la sede (RNF-R5-08). Mientras el
 * panel corre en la zona de la sede, el navegador construye las horas locales;
 * el backend real resolverá las franjas en la zona de la sucursal.
 */

const DIA_MS = 24 * 60 * 60 * 1000

/** `YYYY-MM-DD` de hoy en la zona indicada. */
export function hoyISO(zonaHoraria?: string): string {
  return fechaEnZona(new Date().toISOString(), zonaHoraria)
}

/** `YYYY-MM-DD` de un instante en la zona indicada. */
export function fechaEnZona(iso: string, zonaHoraria = "America/Mexico_City"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))
}

/** Suma días a una fecha `YYYY-MM-DD` (a mediodía para evitar saltos por DST). */
export function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T12:00:00`)
  base.setDate(base.getDate() + dias)
  return base.toISOString().slice(0, 10)
}

/** Lunes de la semana de `fecha`. */
export function inicioSemana(fecha: string): string {
  const base = new Date(`${fecha}T12:00:00`)
  const offset = (base.getDay() + 6) % 7
  return sumarDias(fecha, -offset)
}

export function diasDeSemana(fecha: string): string[] {
  const lunes = inicioSemana(fecha)
  return Array.from({ length: 7 }, (_, indice) => sumarDias(lunes, indice))
}

/** Hora y minuto de un instante en la zona indicada, en minutos desde medianoche. */
export function minutosDelDia(iso: string, zonaHoraria: string): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: zonaHoraria,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))
  const [horas, minutos] = partes.split(":").map(Number)
  return (horas % 24) * 60 + (minutos || 0)
}

/** Instante ISO para una fecha y minutos desde medianoche (hora local del panel). */
export function isoEnMinutos(fecha: string, minutos: number): string {
  const dia = new Date(`${fecha}T00:00:00`)
  const fechaHora = new Date(dia.getTime() + minutos * 60_000)
  return fechaHora.toISOString()
}

export function etiquetaDia(fecha: string): string {
  return new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${fecha}T12:00:00`),
  )
}

export function etiquetaDiaLarga(fecha: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${fecha}T12:00:00`))
}

export function esHoy(fecha: string): boolean {
  return fecha === new Date().toISOString().slice(0, 10) || fecha === hoyISO()
}

export { DIA_MS }
