import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { CheckCircle2, Info, ShieldCheck, X } from "lucide-react"

type ToastTone = "info" | "exito" | "error"

type ToastItem = {
  id: number
  mensaje: string
  tone: ToastTone
}

type ToastContextValue = {
  mostrar: (mensaje: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const mostrar = useCallback((mensaje: string, tone: ToastTone = "info") => {
    const id = ++counter.current
    setToasts((current) => [...current, { id, mensaje, tone }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4_200)
  }, [])

  const value = useMemo(() => ({ mostrar }), [mostrar])

  const icono = (tone: ToastTone) => {
    if (tone === "exito") return <CheckCircle2 size={17} />
    if (tone === "error") return <ShieldCheck size={17} />
    return <Info size={17} />
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            {icono(toast.tone)}
            <span>{toast.mensaje}</span>
            <button
              type="button"
              className="icon-button toast__close"
              aria-label="Cerrar aviso"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast debe usarse dentro de <ToastProvider>")
  return context
}
