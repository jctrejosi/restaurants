import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/app/query"
import { AuthProvider } from "@/app/auth"
import { SedeProvider } from "@/app/sede"
import { ToastProvider } from "@/components/ui/toast"

/** Composición de providers de la app (orden: datos → sesión → sede → avisos). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SedeProvider>
          <ToastProvider>{children}</ToastProvider>
        </SedeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
