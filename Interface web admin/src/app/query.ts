import { QueryClient } from "@tanstack/react-query"

/**
 * Configuración de datos del panel. Una sola instancia por app.
 * `staleTime` bajo: lo operativo se refresca seguido; lo analítico fija su
 * frescura explícitamente en cada hook (RNF-R5-02).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
})
