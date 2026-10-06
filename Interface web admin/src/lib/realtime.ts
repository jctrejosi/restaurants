/**
 * Realtime (Socket.IO, namespace `/admin`; 00-indice §4.2).
 *
 * Está apagado por defecto (`VITE_ENABLE_REALTIME=true` lo activa) para no
 * generar reconexiones ruidosas mientras la API NestJS no existe. Los tableros
 * operativos igual se refrescan por `refetchInterval`; cuando el backend esté,
 * los eventos invalidan las queries correspondientes.
 */

import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { API_BASE_URL } from "@/lib/api"

const REALTIME_ENABLED = (import.meta.env.VITE_ENABLE_REALTIME as string | undefined) === "true"

let socket: Socket | null = null

export function isRealtimeEnabled(): boolean {
  return REALTIME_ENABLED
}

export function getSocket(): Socket | null {
  if (!REALTIME_ENABLED) return null
  if (!socket) {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("pc_token") : null
    socket = io(`${API_BASE_URL}/admin`, {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 10_000,
    })
  }
  return socket
}

export function useSocketEvent(
  events: string | string[],
  handler: (payload: unknown, event: string) => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  const key = Array.isArray(events) ? events.join("|") : events

  useEffect(() => {
    if (!enabled) return
    const connection = getSocket()
    if (!connection) return
    const list = key.split("|")
    const listener = (payload: unknown) => handlerRef.current(payload, "event")
    list.forEach((event) => connection.on(event, listener))
    return () => {
      list.forEach((event) => connection.off(event, listener))
    }
  }, [key, enabled])
}
