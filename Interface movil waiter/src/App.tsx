import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

type IconName = "alert" | "arrow-left" | "badge" | "ban" | "bell" | "calendar" | "camera" | "check" | "chevron" | "clock" | "flame" | "grid" | "history" | "lock" | "mail" | "phone" | "printer" | "receipt" | "refresh" | "save" | "search" | "sliders" | "spark" | "user" | "users" | "vibrate" | "wifi" | "x"

type TableStatus = "free" | "occupied" | "payment" | "reserved" | "blocked"

/**
 * Mapa del salón: el MISMO plano que se edita y guarda en el panel admin
 * (módulo «Salón», sede Centro). Zonas como rectángulos y mesas posicionadas
 * por celda sobre un grid; lo que se guarda en el admin es lo que se ve aquí.
 * Se replica la configuración por defecto del admin (api.ts → ZONAS_CFG /
 * MESAS_CFG) para que el tab Salón coincida con el plano real.
 */
type SalonZona = {
  id: string
  nombre: string
  aforo: number
  x: number
  y: number
  ancho: number
  alto: number
}

/** Tamaño de celda del grid del mapa (px), igual que en el admin. */
const CELDA = 40

const salonZonas: SalonZona[] = [
  {
    id: "salon",
    nombre: "Salón principal",
    aforo: 40,
    x: 0,
    y: 0,
    ancho: 12,
    alto: 7,
  },
  {
    id: "terraza",
    nombre: "Terraza",
    aforo: 32,
    x: 12,
    y: 0,
    ancho: 10,
    alto: 7,
  },
  { id: "barra", nombre: "Barra", aforo: 12, x: 0, y: 7, ancho: 8, alto: 5 },
  {
    id: "privado",
    nombre: "Privado",
    aforo: 18,
    x: 8,
    y: 7,
    ancho: 14,
    alto: 5,
  },
]

const salonColumnas = Math.max(
  16,
  ...salonZonas.map((zona) => zona.x + zona.ancho),
)
const salonFilas = Math.max(10, ...salonZonas.map((zona) => zona.y + zona.alto))

type RestaurantTable = {
  id: number
  /** Número visible en el mapa (dos dígitos, como en el admin). */
  numero: string
  seats: number
  zone: string
  zoneId: string
  shape: "redonda" | "cuadrada"
  posX: number
  posY: number
  status: TableStatus
  detail: string
  badge?: string
}

const initialTables: RestaurantTable[] = [
  {
    id: 1,
    numero: "01",
    seats: 2,
    zone: "Salón principal",
    zoneId: "salon",
    shape: "redonda",
    posX: 1.5,
    posY: 1.5,
    status: "occupied",
    detail: "40 min",
    badge: "Lista",
  },
  {
    id: 2,
    numero: "02",
    seats: 2,
    zone: "Salón principal",
    zoneId: "salon",
    shape: "redonda",
    posX: 4.5,
    posY: 1.5,
    status: "reserved",
    detail: "20:30",
  },
  {
    id: 3,
    numero: "03",
    seats: 4,
    zone: "Salón principal",
    zoneId: "salon",
    shape: "cuadrada",
    posX: 7.5,
    posY: 1.5,
    status: "reserved",
    detail: "21:00",
  },
  {
    id: 4,
    numero: "04",
    seats: 4,
    zone: "Salón principal",
    zoneId: "salon",
    shape: "cuadrada",
    posX: 10,
    posY: 1.5,
    status: "free",
    detail: "Disponible",
  },
  {
    id: 5,
    numero: "05",
    seats: 6,
    zone: "Salón principal",
    zoneId: "salon",
    shape: "cuadrada",
    posX: 2,
    posY: 4.5,
    status: "reserved",
    detail: "20:15",
    badge: "6 pers.",
  },
  {
    id: 6,
    numero: "06",
    seats: 2,
    zone: "Salón principal",
    zoneId: "salon",
    shape: "redonda",
    posX: 5.5,
    posY: 4.5,
    status: "occupied",
    detail: "51 min",
    badge: "Cocina",
  },
  {
    id: 7,
    numero: "07",
    seats: 4,
    zone: "Terraza",
    zoneId: "terraza",
    shape: "cuadrada",
    posX: 14,
    posY: 2,
    status: "reserved",
    detail: "21:30",
  },
  {
    id: 8,
    numero: "08",
    seats: 4,
    zone: "Terraza",
    zoneId: "terraza",
    shape: "cuadrada",
    posX: 17,
    posY: 2,
    status: "free",
    detail: "Disponible",
  },
  {
    id: 9,
    numero: "09",
    seats: 2,
    zone: "Terraza",
    zoneId: "terraza",
    shape: "redonda",
    posX: 20,
    posY: 2,
    status: "blocked",
    detail: "Mantenimiento",
  },
  {
    id: 10,
    numero: "10",
    seats: 6,
    zone: "Terraza",
    zoneId: "terraza",
    shape: "cuadrada",
    posX: 15,
    posY: 5,
    status: "reserved",
    detail: "20:45",
    badge: "6 pers.",
  },
  {
    id: 11,
    numero: "11",
    seats: 2,
    zone: "Barra",
    zoneId: "barra",
    shape: "redonda",
    posX: 1.5,
    posY: 8.5,
    status: "occupied",
    detail: "25 min",
    badge: "Lista",
  },
  {
    id: 12,
    numero: "12",
    seats: 3,
    zone: "Barra",
    zoneId: "barra",
    shape: "redonda",
    posX: 4.5,
    posY: 8.5,
    status: "payment",
    detail: "$ 1,240",
  },
  {
    id: 13,
    numero: "13",
    seats: 8,
    zone: "Privado",
    zoneId: "privado",
    shape: "cuadrada",
    posX: 11,
    posY: 8.5,
    status: "reserved",
    detail: "22:00",
    badge: "8 pers.",
  },
  {
    id: 14,
    numero: "14",
    seats: 10,
    zone: "Privado",
    zoneId: "privado",
    shape: "cuadrada",
    posX: 17,
    posY: 8.5,
    status: "free",
    detail: "Disponible",
  },
]

const statusLabels: Record<TableStatus, string> = {
  free: "Libre",
  occupied: "Ocupada",
  payment: "Por cobrar",
  reserved: "Reservada",
  blocked: "Fuera de servicio",
}

/* ------------------------------------------------------------------ */
/* Carta rápida y toma de pedido                                       */
/* ------------------------------------------------------------------ */

type Categoria = "Entradas" | "Fuertes" | "Postres" | "Bebidas"

type Producto = {
  id: string
  nombre: string
  precio: number
  categoria: Categoria
  estacion: "Cocina" | "Barra"
  agotado?: boolean
  destacado?: boolean
}

const categorias: Categoria[] = ["Entradas", "Fuertes", "Postres", "Bebidas"]

const carta: Producto[] = [
  {
    id: "p01",
    nombre: "Guacamole",
    precio: 89,
    categoria: "Entradas",
    estacion: "Cocina",
  },
  {
    id: "p02",
    nombre: "Sopa del día",
    precio: 60,
    categoria: "Entradas",
    estacion: "Cocina",
  },
  {
    id: "p03",
    nombre: "Ensalada César",
    precio: 110,
    categoria: "Entradas",
    estacion: "Cocina",
  },
  {
    id: "p04",
    nombre: "Totopos con salsa",
    precio: 45,
    categoria: "Entradas",
    estacion: "Cocina",
  },
  {
    id: "p05",
    nombre: "Tacos al pastor",
    precio: 125,
    categoria: "Fuertes",
    estacion: "Cocina",
    destacado: true,
  },
  {
    id: "p06",
    nombre: "Pechuga a la plancha",
    precio: 165,
    categoria: "Fuertes",
    estacion: "Cocina",
  },
  {
    id: "p07",
    nombre: "Hamburguesa clásica",
    precio: 105,
    categoria: "Fuertes",
    estacion: "Cocina",
  },
  {
    id: "p08",
    nombre: "Parrillada para compartir",
    precio: 480,
    categoria: "Fuertes",
    estacion: "Cocina",
    destacado: true,
  },
  {
    id: "p09",
    nombre: "Quesadilla de queso",
    precio: 95,
    categoria: "Fuertes",
    estacion: "Cocina",
  },
  {
    id: "p10",
    nombre: "Pasta Alfredo",
    precio: 130,
    categoria: "Fuertes",
    estacion: "Cocina",
  },
  {
    id: "p11",
    nombre: "Corte del día",
    precio: 220,
    categoria: "Fuertes",
    estacion: "Cocina",
    agotado: true,
  },
  {
    id: "p12",
    nombre: "Postre de la casa",
    precio: 75,
    categoria: "Postres",
    estacion: "Cocina",
  },
  {
    id: "p13",
    nombre: "Flan napolitano",
    precio: 65,
    categoria: "Postres",
    estacion: "Cocina",
  },
  {
    id: "p14",
    nombre: "Limonada",
    precio: 35,
    categoria: "Bebidas",
    estacion: "Barra",
  },
  {
    id: "p15",
    nombre: "Agua de horchata",
    precio: 35,
    categoria: "Bebidas",
    estacion: "Barra",
  },
  {
    id: "p16",
    nombre: "Cerveza artesanal",
    precio: 55,
    categoria: "Bebidas",
    estacion: "Barra",
    destacado: true,
  },
  {
    id: "p17",
    nombre: "Refresco",
    precio: 30,
    categoria: "Bebidas",
    estacion: "Barra",
  },
  {
    id: "p18",
    nombre: "Café americano",
    precio: 40,
    categoria: "Bebidas",
    estacion: "Barra",
  },
]

const notaTemplates = [
  "Sin cebolla",
  "Salsa aparte",
  "Para compartir",
  "Término medio",
  "Sin picante",
]

type OrdenLinea = {
  id: string
  producto: Producto
  cantidad: number
  nota?: string
  ronda?: number
  hora?: string
}

/* ------------------------------------------------------------------ */
/* Comandas (módulo 01)                                                */
/* ------------------------------------------------------------------ */

type ComandaEstado = "enviada" | "en_preparacion" | "lista" | "entregada" | "anulada"

type SlaEstado = "en_tiempo" | "por_vencer" | "excedido"

type ComandaLinea = {
  nombre: string
  cantidad: number
  nota?: string
}

type Comanda = {
  id: string
  numero: number
  mesa: number
  zona: string
  estacion: "Cocina" | "Barra"
  ronda: number
  estado: ComandaEstado
  enviada: string
  lista?: string
  entregada?: string
  preparada: boolean
  sla: SlaEstado
  lineas: ComandaLinea[]
}

const comandaEstadoLabels: Record<ComandaEstado, string> = {
  enviada: "Enviada",
  en_preparacion: "En cocina",
  lista: "Lista · Recoger",
  entregada: "Entregada",
  anulada: "Anulada",
}

const comandaSteps = ["Enviada", "En cocina", "Lista", "Entregada"]

const slaLabels: Record<SlaEstado, string> = {
  en_tiempo: "En tiempo",
  por_vencer: "Por vencer",
  excedido: "SLA excedido",
}

const motivoOptions = [
  "Producto agotado",
  "Cancelado por el cliente",
  "Error de captura",
  "Tiempo de espera excedido",
]

const initialComandas: Comanda[] = [
  {
    id: "c101",
    numero: 101,
    mesa: 1,
    zona: "Salón principal",
    estacion: "Cocina",
    ronda: 1,
    estado: "lista",
    enviada: "19:12",
    lista: "19:26",
    preparada: true,
    sla: "por_vencer",
    lineas: [
      { nombre: "Guacamole", cantidad: 1 },
      { nombre: "Tacos al pastor", cantidad: 2, nota: "Sin cebolla" },
      { nombre: "Quesadilla de queso", cantidad: 1 },
    ],
  },
  {
    id: "c102",
    numero: 102,
    mesa: 1,
    zona: "Salón principal",
    estacion: "Barra",
    ronda: 1,
    estado: "en_preparacion",
    enviada: "19:12",
    preparada: true,
    sla: "en_tiempo",
    lineas: [
      { nombre: "Limonada", cantidad: 2 },
      { nombre: "Agua de horchata", cantidad: 1 },
    ],
  },
  {
    id: "c103",
    numero: 103,
    mesa: 6,
    zona: "Salón principal",
    estacion: "Cocina",
    ronda: 2,
    estado: "en_preparacion",
    enviada: "19:20",
    preparada: true,
    sla: "excedido",
    lineas: [
      { nombre: "Pechuga a la plancha", cantidad: 1 },
      { nombre: "Ensalada César", cantidad: 2, nota: "Para compartir" },
    ],
  },
  {
    id: "c104",
    numero: 104,
    mesa: 6,
    zona: "Salón principal",
    estacion: "Cocina",
    ronda: 1,
    estado: "enviada",
    enviada: "19:24",
    preparada: false,
    sla: "en_tiempo",
    lineas: [{ nombre: "Sopa del día", cantidad: 3 }],
  },
  {
    id: "c105",
    numero: 105,
    mesa: 5,
    zona: "Salón principal",
    estacion: "Barra",
    ronda: 1,
    estado: "entregada",
    enviada: "19:02",
    lista: "19:08",
    entregada: "19:10",
    preparada: true,
    sla: "en_tiempo",
    lineas: [{ nombre: "Cerveza artesanal", cantidad: 2 }],
  },
]

type IconProps = {
  name: IconName
  size?: number
}

function Icon({ name, size = 22 }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    alert: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="m10.3 3.7-8.1 14a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3l-8.1-14a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    "arrow-left": (
      <>
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </>
    ),
    badge: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <circle cx="12" cy="10" r="2.5" />
        <path d="M7.5 17.5a5 5 0 0 1 9 0" />
      </>
    ),
    camera: (
      <>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: (
      <path d="M5 3h3l2 5-2.4 1.5a12.5 12.5 0 0 0 5.9 5.9L15 13l5 2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3 5.2 2 2 0 0 1 5 3Z" />
    ),
    save: (
      <>
        <path d="M5 3h11l3 3v15H5z" />
        <path d="M9 3v5h6V3M8 13h8M8 17h5" />
      </>
    ),
    x: <path d="M6 6l12 12M18 6 6 18" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 2.6-6.4" />
        <path d="M3 4v5h5" />
        <path d="M12 8v5l3 2" />
      </>
    ),
    ban: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m5.6 5.6 12.8 12.8" />
      </>
    ),
    flame: (
      <path d="M12 3c.5 2.4 3 3.4 4.2 5.6A6 6 0 1 1 6 12c0-1.6.6-3 1.6-4.2C9 6.6 10.2 6 11 7c.3-1.3.6-2.7 1-4Z" />
    ),
    printer: (
      <>
        <path d="M6 9V3h12v6" />
        <rect x="4" y="9" width="16" height="8" rx="2" />
        <path d="M7 17v4h10v-4" />
      </>
    ),
    refresh: (
      <>
        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
        <path d="M21 4v5h-5" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v19l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3Z" />
        <path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    vibrate: (
      <>
        <rect x="8" y="3" width="8" height="18" rx="2" />
        <path d="M4 8v8M20 8v8" />
      </>
    ),
    wifi: (
      <>
        <path d="M5 12.6a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0" />
        <path d="M12 20h.01M2 9a16 16 0 0 1 20 0" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  )
}

function AppButton({
  children,
  className = "",
  onClick,
  ariaLabel,
  style,
  title,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  ariaLabel?: string
  style?: CSSProperties
  title?: string
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={className}
      onClick={onClick}
      style={style}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}

type WaiterProfile = {
  name: string
  email: string
  phone: string
  employeeId: string
  zone: string
  shift: string
  photo: string | null
}

const shifts = ["Turno desayuno", "Turno comida", "Turno cena"]

const initialProfile: WaiterProfile = {
  name: "Ana Morales",
  email: "ana.morales@puntoc.co",
  phone: "+57 300 123 4567",
  employeeId: "PUN-1042",
  zone: "Salón · Terraza",
  shift: "Turno cena",
  photo: null,
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

type FormMessage = {
  tone: "success" | "error"
  text: string
} | null

function ProfileScreen({
  onClose,
  onSave,
  profile,
}: {
  onClose: () => void
  onSave: (next: WaiterProfile) => void
  profile: WaiterProfile
}) {
  const [draft, setDraft] = useState<WaiterProfile>(profile)
  const [detailsMessage, setDetailsMessage] = useState<FormMessage>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<FormMessage>(null)

  function updateField<K extends keyof WaiterProfile>(
    field: K,
    value: WaiterProfile[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
    setDetailsMessage(null)
  }

  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setDetailsMessage({
        tone: "error",
        text: "Selecciona un archivo de imagen válido.",
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((current) => ({ ...current, photo: reader.result as string }))
        setDetailsMessage(null)
      }
    }
    reader.readAsDataURL(file)
  }

  function saveDetails() {
    if (!draft.name.trim() || !draft.email.trim()) {
      setDetailsMessage({
        tone: "error",
        text: "El nombre y el correo son obligatorios.",
      })
      return
    }
    const cleaned: WaiterProfile = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
    }
    setDraft(cleaned)
    onSave(cleaned)
    setDetailsMessage({ tone: "success", text: "Datos del perfil guardados." })
  }

  function updatePassword() {
    if (!currentPassword) {
      setPasswordMessage({
        tone: "error",
        text: "Ingresa tu contraseña actual.",
      })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMessage({
        tone: "error",
        text: "La nueva contraseña debe tener al menos 8 caracteres.",
      })
      return
    }
    if (newPassword === currentPassword) {
      setPasswordMessage({
        tone: "error",
        text: "La nueva contraseña debe ser distinta a la actual.",
      })
      return
    }
    if (confirmPassword !== newPassword) {
      setPasswordMessage({
        tone: "error",
        text: "La confirmación no coincide con la nueva contraseña.",
      })
      return
    }
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordMessage({ tone: "success", text: "Contraseña actualizada." })
  }

  return (
    <section className="profile-screen" aria-label="Editar perfil del mesero">
      <header className="profile-topbar">
        <AppButton
          className="profile-back"
          ariaLabel="Volver"
          onClick={onClose}
        >
          <Icon name="arrow-left" size={20} />
        </AppButton>
        <h2 className="profile-title">Mi perfil</h2>
        <span className="profile-topbar-spacer" />
      </header>

      <div className="profile-scroll">
        <div className="profile-card">
          <div className="profile-photo-wrapper">
            {draft.photo ? (
              <img
                alt="Foto de perfil"
                className="profile-photo"
                src={draft.photo}
              />
            ) : (
              <span className="profile-photo profile-photo-fallback">
                {getInitials(draft.name)}
              </span>
            )}
            <AppButton
              ariaLabel="Cambiar foto de perfil"
              className="photo-edit-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="camera" size={16} />
            </AppButton>
          </div>
          <strong className="profile-name">{draft.name || "Sin nombre"}</strong>
          <span className="profile-role">
            {draft.shift} · Mesero/a · {draft.employeeId}
          </span>
          <input
            accept="image/*"
            className="hidden-input"
            onChange={handlePhoto}
            ref={fileInputRef}
            type="file"
          />
          <div className="photo-actions">
            <AppButton
              className="ghost-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="camera" size={15} /> Subir foto
            </AppButton>
            {draft.photo && (
              <AppButton
                className="ghost-button danger"
                onClick={() => updateField("photo", null)}
              >
                <Icon name="x" size={15} /> Quitar
              </AppButton>
            )}
          </div>
        </div>

        <section className="form-section">
          <p className="form-section-title">
            <Icon name="user" size={14} /> Datos del mesero
          </p>
          <label className="field">
            <span>Nombre completo</span>
            <input
              onChange={(event) => updateField("name", event.target.value)}
              value={draft.name}
            />
          </label>
          <label className="field">
            <span>
              <Icon name="mail" size={13} /> Correo electrónico
            </span>
            <input
              onChange={(event) => updateField("email", event.target.value)}
              type="email"
              value={draft.email}
            />
          </label>
          <label className="field">
            <span>
              <Icon name="phone" size={13} /> Teléfono
            </span>
            <input
              onChange={(event) => updateField("phone", event.target.value)}
              type="tel"
              value={draft.phone}
            />
          </label>
          <label className="field">
            <span>
              <Icon name="badge" size={13} /> Número de empleado
            </span>
            <input
              onChange={(event) =>
                updateField("employeeId", event.target.value)
              }
              value={draft.employeeId}
            />
          </label>
          <label className="field">
            <span>Zona asignada</span>
            <input
              onChange={(event) => updateField("zone", event.target.value)}
              value={draft.zone}
            />
          </label>
          <label className="field">
            <span>Turno</span>
            <select
              onChange={(event) => updateField("shift", event.target.value)}
              value={draft.shift}
            >
              {shifts.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
          </label>
        </section>

        {detailsMessage && (
          <p className={`form-message ${detailsMessage.tone}`}>
            <Icon
              name={detailsMessage.tone === "error" ? "alert" : "check"}
              size={16}
            />
            {detailsMessage.text}
          </p>
        )}

        <AppButton
          className="primary-button profile-submit"
          onClick={saveDetails}
        >
          <Icon name="save" size={18} /> Guardar cambios
        </AppButton>

        <section className="form-section">
          <p className="form-section-title">
            <Icon name="lock" size={14} /> Seguridad
          </p>
          <label className="field">
            <span>Contraseña actual</span>
            <input
              autoComplete="current-password"
              onChange={(event) => {
                setCurrentPassword(event.target.value)
                setPasswordMessage(null)
              }}
              type="password"
              value={currentPassword}
            />
          </label>
          <label className="field">
            <span>Nueva contraseña</span>
            <input
              autoComplete="new-password"
              onChange={(event) => {
                setNewPassword(event.target.value)
                setPasswordMessage(null)
              }}
              type="password"
              value={newPassword}
            />
          </label>
          <label className="field">
            <span>Confirmar nueva contraseña</span>
            <input
              autoComplete="new-password"
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setPasswordMessage(null)
              }}
              type="password"
              value={confirmPassword}
            />
          </label>
        </section>

        {passwordMessage && (
          <p className={`form-message ${passwordMessage.tone}`}>
            <Icon
              name={passwordMessage.tone === "error" ? "alert" : "check"}
              size={16}
            />
            {passwordMessage.text}
          </p>
        )}

        <AppButton
          className="primary-button profile-submit"
          onClick={updatePassword}
        >
          <Icon name="lock" size={17} /> Actualizar contraseña
        </AppButton>
      </div>
    </section>
  )
}

type ComandaFilter = "todas" | "cocina" | "listas" | "entregadas"

type ComandaFilterOption = {
  id: ComandaFilter
  label: string
}

const comandaFilters: ComandaFilterOption[] = [
  { id: "todas", label: "Todas" },
  { id: "cocina", label: "En cocina" },
  { id: "listas", label: "Listas" },
  { id: "entregadas", label: "Entregadas" },
]

const comandaPriority: Record<ComandaEstado, number> = {
  lista: 0,
  en_preparacion: 1,
  enviada: 2,
  entregada: 3,
  anulada: 4,
}

function comandaStepIndex(estado: ComandaEstado) {
  if (estado === "enviada") return 0
  if (estado === "en_preparacion") return 1
  if (estado === "lista") return 2
  if (estado === "entregada") return 3
  return -1
}

function ComandaCard({
  comanda,
  onAnular,
  onEntregar,
  onOpen,
  onReenviar,
}: {
  comanda: Comanda
  onAnular: (comanda: Comanda) => void
  onEntregar: (comanda: Comanda) => void
  onOpen: (comanda: Comanda) => void
  onReenviar: (comanda: Comanda) => void
}) {
  const step = comandaStepIndex(comanda.estado)
  const canDeliver =
    comanda.estado === "en_preparacion" || comanda.estado === "lista"
  const canAnular =
    comanda.estado !== "entregada" && comanda.estado !== "anulada"

  return (
    <article className={`comanda-card state-${comanda.estado}`}>
      <AppButton
        className="comanda-main"
        onClick={() => onOpen(comanda)}
        ariaLabel={`Mesa ${comanda.mesa}, pedido ${comanda.numero}, ${comandaEstadoLabels[comanda.estado]}`}
      >
        <div className="comanda-head">
          <div className="comanda-table">
            <strong>Mesa {String(comanda.mesa).padStart(2, "0")}</strong>
            <span>{comanda.zona}</span>
          </div>
          <span className="comanda-num">#{comanda.numero}</span>
          <span className="comanda-station">
            <Icon name="flame" size={13} /> {comanda.estacion}
          </span>
          <span className={`sla-chip sla-${comanda.sla}`}>
            {slaLabels[comanda.sla]}
          </span>
        </div>
        <div className="comanda-meta">
          <span>
            Ronda {comanda.ronda} · {comanda.enviada}
          </span>
        </div>
        <div className="comanda-stepper" aria-hidden="true">
          {comandaSteps.map((item, index) => (
            <span
              className={`bar ${index <= step ? "on" : ""} ${
                index === step ? "current" : ""
              }`}
              key={item}
            />
          ))}
        </div>
        <div className="comanda-lines-preview">
          {comanda.lineas.slice(0, 3).map((linea) => (
            <span className="line-preview" key={linea.nombre}>
              <strong>{linea.cantidad}×</strong> {linea.nombre}
              {linea.nota && <em> · {linea.nota}</em>}
            </span>
          ))}
          {comanda.lineas.length > 3 && (
            <span className="line-preview muted">
              +{comanda.lineas.length - 3} más
            </span>
          )}
        </div>
        <span className={`state-chip state-${comanda.estado}`}>
          {comanda.estado === "lista" && <span className="pulse-dot" />}
          {comandaEstadoLabels[comanda.estado]}
        </span>
      </AppButton>

      {comanda.estado !== "anulada" && (
        <div className="comanda-actions">
          {canDeliver && (
            <AppButton
              className="comanda-action primary"
              onClick={() => onEntregar(comanda)}
            >
              <Icon name="check" size={15} /> Marcar entregada
            </AppButton>
          )}
          <AppButton
            className="comanda-action"
            onClick={() => onReenviar(comanda)}
          >
            <Icon name="refresh" size={15} /> Reenviar
          </AppButton>
          {canAnular && (
            <AppButton
              className="comanda-action danger"
              onClick={() => onAnular(comanda)}
            >
              <Icon name="ban" size={15} /> Anular
            </AppButton>
          )}
        </div>
      )}
    </article>
  )
}

function ComandasView({
  comandas,
  setComandas,
}: {
  comandas: Comanda[]
  setComandas: Dispatch<SetStateAction<Comanda[]>>
}) {
  const [filter, setFilter] = useState<ComandaFilter>("todas")
  const [selected, setSelected] = useState<Comanda | null>(null)
  const [annulling, setAnnulling] = useState<Comanda | null>(null)
  const [annulMotivo, setAnnulMotivo] = useState<string | null>(null)
  const [annulPin, setAnnulPin] = useState("")
  const [resending, setResending] = useState<Comanda | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const NOW = "19:42"

  function updateComanda(id: string, patch: Partial<Comanda>) {
    setComandas((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  function entregar(comanda: Comanda) {
    updateComanda(comanda.id, { estado: "entregada", entregada: NOW })
    setSelected(null)
    setNotice(
      `Pedido #${comanda.numero} de la mesa ${comanda.mesa}: entregado.`,
    )
  }

  function confirmarReenvio() {
    if (!resending) return
    setNotice(
      `Pedido #${resending.numero} reenviado a la pantalla de ${resending.estacion}. Queda registrado en la auditoría.`,
    )
    setResending(null)
    setSelected(null)
  }

  function confirmarAnulacion() {
    if (!annulling || !annulMotivo) return
    updateComanda(annulling.id, { estado: "anulada" })
    setNotice(
      `Pedido #${annulling.numero} anulado · ${annulMotivo}. Total del pedido recalculado.`,
    )
    setAnnulling(null)
    setAnnulMotivo(null)
    setAnnulPin("")
    setSelected(null)
  }

  const grouped = useMemo(() => {
    const filtered = comandas.filter((comanda) => {
      if (filter === "todas") return comanda.estado !== "anulada"
      if (filter === "cocina") return comanda.estado === "en_preparacion"
      if (filter === "listas") return comanda.estado === "lista"
      return comanda.estado === "entregada"
    })
    const byMesa = new Map<number, Comanda[]>()
    for (const comanda of filtered) {
      const list = byMesa.get(comanda.mesa) ?? []
      list.push(comanda)
      byMesa.set(comanda.mesa, list)
    }
    return [...byMesa.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([mesa, list]) => ({
        mesa,
        zona: list[0].zona,
        comandas: list.sort(
          (a, b) => comandaPriority[a.estado] - comandaPriority[b.estado],
        ),
      }))
  }, [comandas, filter])

  const listas = comandas.filter((comanda) => comanda.estado === "lista").length
  const enCocina = comandas.filter(
    (comanda) => comanda.estado === "en_preparacion",
  ).length
  const excedidas = comandas.filter(
    (comanda) => comanda.sla === "excedido",
  ).length

  return (
    <div className="comandas-view">
      <div className="section-heading">
        <div>
          <p className="section-kicker">PUENTE SALÓN · COCINA</p>
          <h2>Pedidos</h2>
        </div>
        <span className="live-pill">
          <span className="connection-dot" /> En vivo
        </span>
      </div>

      <div className="summary-strip" aria-label="Resumen de pedidos">
        <div>
          <strong className="warning-number">{enCocina}</strong>
          <span>En cocina</span>
        </div>
        <div>
          <strong className="ready-number">{listas}</strong>
          <span>Listas</span>
        </div>
        <div>
          <strong className={excedidas ? "danger-number" : ""}>
            {excedidas}
          </strong>
          <span>Con SLA excedido</span>
        </div>
      </div>

      <nav className="zone-tabs" aria-label="Filtro de pedidos">
        {comandaFilters.map((item) => (
          <AppButton
            className={filter === item.id ? "zone-chip selected" : "zone-chip"}
            key={item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </AppButton>
        ))}
      </nav>

      {notice && (
        <div className="filter-notice">
          <Icon name="check" size={18} />
          {notice}
          <AppButton onClick={() => setNotice(null)}>Ok</AppButton>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="empty-state">
          <Icon name="receipt" size={30} />
          <strong>Sin pedidos en este filtro</strong>
          <span>Cuando envíes una ronda a cocina aparecerá aquí.</span>
        </div>
      ) : (
        grouped
          .flatMap((group) => group.comandas)
          .map((comanda) => (
            <ComandaCard
              comanda={comanda}
              key={comanda.id}
              onAnular={setAnnulling}
              onEntregar={entregar}
              onOpen={setSelected}
              onReenviar={setResending}
            />
          ))
      )}

      <p className="comandas-foot">
        <Icon name="refresh" size={14} /> Los estados los marca la cocina; tú
        marcas «Entregada».
      </p>

      {selected && (
        <div className="sheet-overlay" onClick={() => setSelected(null)}>
          <section
            className="action-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div className={`sheet-table-icon state-${selected.estado}`}>
                #{selected.numero}
              </div>
              <div>
                <p className="eyebrow">
                  {selected.estacion.toUpperCase()} · RONDA {selected.ronda}
                </p>
                <h2>Mesa {selected.mesa}</h2>
                <p>
                  {comandaEstadoLabels[selected.estado]} · enviada{" "}
                  {selected.enviada}
                </p>
              </div>
            </div>
            <div className="sheet-body">
              <ul className="comanda-detail-lines">
                {selected.lineas.map((linea) => (
                  <li key={linea.nombre}>
                    <strong>{linea.cantidad}×</strong>
                    <span>
                      {linea.nombre}
                      {linea.nota && <em>{linea.nota}</em>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="comanda-detail-seals">
                <span>Enviada {selected.enviada}</span>
                {selected.lista && <span>Lista {selected.lista}</span>}
                {selected.entregada && (
                  <span>Entregada {selected.entregada}</span>
                )}
                <span className={`sla-chip sla-${selected.sla}`}>
                  {slaLabels[selected.sla]}
                </span>
              </div>
              {selected.estado !== "anulada" && (
                <div className="comanda-actions stacked">
                  {(selected.estado === "en_preparacion" ||
                    selected.estado === "lista") && (
                    <AppButton
                      className="comanda-action primary"
                      onClick={() => entregar(selected)}
                    >
                      <Icon name="check" size={15} /> Marcar entregada
                    </AppButton>
                  )}
                  <AppButton
                    className="comanda-action"
                    onClick={() => setResending(selected)}
                  >
                    <Icon name="refresh" size={15} /> Reenviar a cocina
                  </AppButton>
                  {selected.estado !== "entregada" && (
                    <AppButton
                      className="comanda-action danger"
                      onClick={() => setAnnulling(selected)}
                    >
                      <Icon name="ban" size={15} /> Anular pedido
                    </AppButton>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {resending && (
        <div className="sheet-overlay" onClick={() => setResending(null)}>
          <section
            className="action-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div className="sheet-table-icon">
                <Icon name="refresh" size={24} />
              </div>
              <div>
                <p className="eyebrow">
                  REENVIAR A COCINA · PEDIDO #{resending.numero}
                </p>
                <h2>{resending.estacion}</h2>
                <p>
                  Mesa {resending.mesa} · ronda {resending.ronda}
                </p>
              </div>
            </div>
            <div className="sheet-body">
              <div className="sheet-message">
                <Icon name="alert" size={20} />
                <span>
                  <strong>El reenvío queda auditado</strong>
                  {resending.entregada
                    ? "Pedido ya entregado: requiere autorización del capitán."
                    : "Se reenviará a la pantalla de cocina (KDS). No se imprime."}
                </span>
              </div>
              <AppButton className="primary-button" onClick={confirmarReenvio}>
                <Icon name="refresh" size={18} /> Reenviar a cocina
              </AppButton>
            </div>
          </section>
        </div>
      )}

      {annulling && (
        <div
          className="sheet-overlay"
          onClick={() => {
            setAnnulling(null)
            setAnnulMotivo(null)
            setAnnulPin("")
          }}
        >
          <section
            className="action-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div className="sheet-table-icon state-anulada">
                <Icon name="ban" size={24} />
              </div>
              <div>
                <p className="eyebrow">ANULAR · PEDIDO #{annulling.numero}</p>
                <h2>Mesa {annulling.mesa}</h2>
                <p>El motivo es obligatorio</p>
              </div>
            </div>
            <div className="sheet-body">
              {annulling.preparada && (
                <div className="permission-gate">
                  <Icon name="lock" size={18} />
                  <div>
                    <strong>Requiere autorización del capitán</strong>
                    <span>
                      Este pedido ya se preparó: el intento queda registrado.
                    </span>
                  </div>
                </div>
              )}
              <div className="reason-grid">
                {motivoOptions.map((option) => (
                  <AppButton
                    className={
                      annulMotivo === option
                        ? "reason-chip selected"
                        : "reason-chip"
                    }
                    key={option}
                    onClick={() => setAnnulMotivo(option)}
                  >
                    {option}
                  </AppButton>
                ))}
              </div>
              {annulling.preparada && (
                <label className="field">
                  <span>
                    <Icon name="lock" size={13} /> PIN del capitán
                  </span>
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(event) =>
                      setAnnulPin(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="••••"
                    value={annulPin}
                  />
                </label>
              )}
              <AppButton
                className="primary-button danger-button"
                onClick={confirmarAnulacion}
              >
                <Icon name="ban" size={17} /> Confirmar anulación
              </AppButton>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Avisos (módulo 02)                                                  */
/* ------------------------------------------------------------------ */

type AvisoTipo = "comanda_lista" | "sla" | "pedido_web" | "reserva" | "sync" | "cuenta_qr"

type AvisoSeveridad = "info" | "media" | "alta"
type AvisoEstado = "pendiente" | "atendido"
type AvisoTone = "leaf" | "danger" | "info" | "brand" | "amber"

type Aviso = {
  id: string
  tipo: AvisoTipo
  titulo: string
  detalle: string
  mesa?: number
  hora: string
  severidad: AvisoSeveridad
  estado: AvisoEstado
}

type AvisoMeta = {
  label: string
  icon: IconName
  tone: AvisoTone
}

const avisoMeta: Record<AvisoTipo, AvisoMeta> = {
  comanda_lista: { label: "Comanda lista", icon: "check", tone: "leaf" },
  sla: { label: "SLA excedido", icon: "alert", tone: "danger" },
  pedido_web: { label: "Pedido web", icon: "spark", tone: "info" },
  reserva: { label: "Reserva próxima", icon: "calendar", tone: "brand" },
  sync: { label: "Sincronización", icon: "refresh", tone: "amber" },
  cuenta_qr: { label: "Pide la cuenta", icon: "receipt", tone: "brand" },
}

const initialAvisos: Aviso[] = [
  {
    id: "a1",
    tipo: "comanda_lista",
    titulo: "Comanda lista · Mesa 1",
    detalle: "Cocina #101 lista para recoger",
    mesa: 1,
    hora: "19:26",
    severidad: "media",
    estado: "pendiente",
  },
  {
    id: "a2",
    tipo: "sla",
    titulo: "SLA excedido · Mesa 6",
    detalle: "Cocina #103 supera el objetivo de la estación",
    mesa: 6,
    hora: "19:21",
    severidad: "alta",
    estado: "pendiente",
  },
  {
    id: "a3",
    tipo: "pedido_web",
    titulo: "Pedido web · Mesa 9",
    detalle: "Nuevo pedido de la mesa 9 (QR) por atender",
    mesa: 9,
    hora: "19:18",
    severidad: "media",
    estado: "pendiente",
  },
  {
    id: "a4",
    tipo: "reserva",
    titulo: "Reserva próxima · Mesa 4",
    detalle: "6 personas a las 20:30",
    mesa: 4,
    hora: "19:10",
    severidad: "info",
    estado: "atendido",
  },
]

type AvisoCanal = {
  sonido: boolean
  vibracion: boolean
}

const initialAvisoSettings: Record<AvisoTipo, AvisoCanal> = {
  comanda_lista: { sonido: true, vibracion: true },
  sla: { sonido: true, vibracion: true },
  pedido_web: { sonido: true, vibracion: false },
  reserva: { sonido: false, vibracion: true },
  sync: { sonido: false, vibracion: false },
  cuenta_qr: { sonido: true, vibracion: true },
}

type AvisoFiltro = "pendientes" | "todas" | "comandas" | "mesas" | "sistema"

type AvisoFilterOption = {
  id: AvisoFiltro
  label: string
}

const avisoFilters: AvisoFilterOption[] = [
  { id: "pendientes", label: "Sin atender" },
  { id: "todas", label: "Todas" },
  { id: "comandas", label: "Pedidos" },
  { id: "mesas", label: "Mesas" },
  { id: "sistema", label: "Sistema" },
]

function avisoMatches(aviso: Aviso, filtro: AvisoFiltro) {
  if (filtro === "pendientes") return aviso.estado === "pendiente"
  if (filtro === "comandas")
    return aviso.tipo === "comanda_lista" || aviso.tipo === "sla"
  if (filtro === "mesas")
    return (
      aviso.tipo === "pedido_web" ||
      aviso.tipo === "reserva" ||
      aviso.tipo === "cuenta_qr"
    )
  if (filtro === "sistema") return aviso.tipo === "sync"
  return true
}

/* ------------------------------------------------------------------ */
/* Historial de pedidos (módulo 03)                                    */
/* ------------------------------------------------------------------ */

type PedidoEstado = "pagado" | "por_cobrar" | "cancelado"
type PedidoCanal = "mesero" | "web"
type ComentarioAutor = "cliente" | "cocina" | "mesero"

type PedidoComentario = {
  autor: ComentarioAutor
  texto: string
  hora: string
}

type PedidoLinea = {
  nombre: string
  cantidad: number
  precio: number
  ronda: number
  nota?: string
  comensal?: string
}

type PedidoComanda = {
  numero: number
  estacion: string
  estado: ComandaEstado
  enviada: string
  lista?: string
}

type PedidoTotales = {
  subtotal: number
  descuento: number
  impuestos: number
  propina: number
  total: number
}

type FichaPedido = {
  id: string
  folio: string
  mesa: number
  zona: string
  comensales: number
  apertura: string
  cierre: string
  estado: PedidoEstado
  canal: PedidoCanal
  modalidad: string
  medioPago: string
  totales: PedidoTotales
  lineas: PedidoLinea[]
  comandas: PedidoComanda[]
  comentarios: PedidoComentario[]
}

const pedidoEstadoLabels: Record<PedidoEstado, string> = {
  pagado: "Cobrado",
  por_cobrar: "Por cobrar",
  cancelado: "Cancelado",
}

type ComentarioMeta = {
  label: string
  icon: IconName
  tone: AvisoTone
}

const comentarioMeta: Record<ComentarioAutor, ComentarioMeta> = {
  cliente: { label: "Cliente", icon: "user", tone: "info" },
  cocina: { label: "Cocina", icon: "flame", tone: "amber" },
  mesero: { label: "Mesero", icon: "receipt", tone: "brand" },
}

function money(value: number) {
  return `$ ${value.toLocaleString("en-US")}`
}

const historialPedidos: FichaPedido[] = [
  {
    id: "h1",
    folio: "P-1042",
    mesa: 1,
    zona: "Terraza",
    comensales: 3,
    apertura: "19:02",
    cierre: "19:48",
    estado: "pagado",
    canal: "mesero",
    modalidad: "Mesa",
    medioPago: "Efectivo",
    totales: {
      subtotal: 409,
      descuento: 0,
      impuestos: 65,
      propina: 40,
      total: 514,
    },
    lineas: [
      { nombre: "Guacamole", cantidad: 1, precio: 89, ronda: 1 },
      {
        nombre: "Tacos al pastor",
        cantidad: 2,
        precio: 125,
        ronda: 1,
        nota: "Sin cebolla",
        comensal: "Comensal 1",
      },
      { nombre: "Limonada", cantidad: 2, precio: 35, ronda: 1 },
      { nombre: "Quesadilla de queso", cantidad: 1, precio: 95, ronda: 2 },
    ],
    comandas: [
      {
        numero: 101,
        estacion: "Cocina",
        estado: "entregada",
        enviada: "19:12",
        lista: "19:26",
      },
      {
        numero: 102,
        estacion: "Barra",
        estado: "entregada",
        enviada: "19:12",
        lista: "19:18",
      },
    ],
    comentarios: [
      {
        autor: "cliente",
        texto: "Sin cebolla y la carne término medio, por favor.",
        hora: "19:05",
      },
      {
        autor: "cocina",
        texto: "Se acabó el corte del día; ofrecí cambio de guarnición.",
        hora: "19:14",
      },
    ],
  },
  {
    id: "h2",
    folio: "P-1038",
    mesa: 9,
    zona: "Terraza",
    comensales: 2,
    apertura: "18:41",
    cierre: "19:19",
    estado: "pagado",
    canal: "web",
    modalidad: "Mesa (QR)",
    medioPago: "Tarjeta",
    totales: {
      subtotal: 322,
      descuento: 32,
      impuestos: 46,
      propina: 30,
      total: 366,
    },
    lineas: [
      { nombre: "Ensalada César", cantidad: 1, precio: 110, ronda: 1 },
      {
        nombre: "Pechuga a la plancha",
        cantidad: 1,
        precio: 165,
        ronda: 1,
        nota: "Término bien cocido",
      },
      { nombre: "Agua de horchata", cantidad: 2, precio: 35, ronda: 1 },
    ],
    comandas: [
      {
        numero: 96,
        estacion: "Cocina",
        estado: "entregada",
        enviada: "18:45",
        lista: "18:58",
      },
    ],
    comentarios: [
      {
        autor: "cliente",
        texto: "Pedido por QR: agregar cubiertos para 2.",
        hora: "18:41",
      },
    ],
  },
  {
    id: "h3",
    folio: "P-1035",
    mesa: 6,
    zona: "Salón",
    comensales: 4,
    apertura: "18:30",
    cierre: "18:52",
    estado: "cancelado",
    canal: "mesero",
    modalidad: "Mesa",
    medioPago: "—",
    totales: { subtotal: 0, descuento: 0, impuestos: 0, propina: 0, total: 0 },
    lineas: [
      {
        nombre: "Sopa del día",
        cantidad: 3,
        precio: 60,
        ronda: 1,
        nota: "Anulada por el mesero",
      },
    ],
    comandas: [
      { numero: 92, estacion: "Cocina", estado: "anulada", enviada: "18:34" },
    ],
    comentarios: [
      {
        autor: "mesero",
        texto:
          "Los comensales se retiraron antes de servir; se anuló la comanda.",
        hora: "18:52",
      },
    ],
  },
  {
    id: "h4",
    folio: "P-1030",
    mesa: 3,
    zona: "Terraza",
    comensales: 4,
    apertura: "17:55",
    cierre: "18:50",
    estado: "pagado",
    canal: "mesero",
    modalidad: "Mesa",
    medioPago: "Transferencia",
    totales: {
      subtotal: 890,
      descuento: 89,
      impuestos: 128,
      propina: 120,
      total: 1049,
    },
    lineas: [
      {
        nombre: "Parrillada para compartir",
        cantidad: 1,
        precio: 480,
        ronda: 1,
        comensal: "Mesa",
      },
      { nombre: "Cerveza artesanal", cantidad: 4, precio: 55, ronda: 1 },
      { nombre: "Postre de la casa", cantidad: 2, precio: 75, ronda: 2 },
    ],
    comandas: [
      {
        numero: 81,
        estacion: "Cocina",
        estado: "entregada",
        enviada: "18:01",
        lista: "18:27",
      },
      {
        numero: 82,
        estacion: "Barra",
        estado: "entregada",
        enviada: "18:01",
        lista: "18:06",
      },
    ],
    comentarios: [
      {
        autor: "cliente",
        texto: "¡Excelente atención de Ana! Volveremos.",
        hora: "18:48",
      },
      {
        autor: "cocina",
        texto: "La parrillada salió en dos tiempos por capacidad de parrilla.",
        hora: "18:20",
      },
    ],
  },
  {
    id: "h5",
    folio: "P-1024",
    mesa: 5,
    zona: "Salón",
    comensales: 2,
    apertura: "17:20",
    cierre: "18:05",
    estado: "pagado",
    canal: "mesero",
    modalidad: "Mesa",
    medioPago: "Efectivo",
    totales: {
      subtotal: 260,
      descuento: 0,
      impuestos: 42,
      propina: 25,
      total: 327,
    },
    lineas: [
      {
        nombre: "Hamburguesa clásica",
        cantidad: 2,
        precio: 105,
        ronda: 1,
        nota: "Una sin tomate",
      },
      { nombre: "Papas a la francesa", cantidad: 1, precio: 50, ronda: 1 },
    ],
    comandas: [
      {
        numero: 74,
        estacion: "Cocina",
        estado: "entregada",
        enviada: "17:24",
        lista: "17:40",
      },
    ],
    comentarios: [],
  },
]

function AlertRow({
  aviso,
  onAtender,
  onDescartar,
  onOpen,
}: {
  aviso: Aviso
  onAtender: (aviso: Aviso) => void
  onDescartar: (aviso: Aviso) => void
  onOpen: (aviso: Aviso) => void
}) {
  const meta = avisoMeta[aviso.tipo]
  const done = aviso.estado === "atendido"
  return (
    <article className={`aviso-row ${done ? "done" : ""}`}>
      <span className={`aviso-icon tone-${meta.tone}`}>
        <Icon name={meta.icon} size={18} />
      </span>
      <AppButton className="aviso-body" onClick={() => onOpen(aviso)}>
        <span className="aviso-title">{aviso.titulo}</span>
        <span className="aviso-detail">{aviso.detalle}</span>
        <span className="aviso-foot">
          <span className={`aviso-tag tone-${meta.tone}`}>{meta.label}</span>
          {aviso.mesa != null && <span>Mesa {aviso.mesa}</span>}
          <span className="aviso-hora">{aviso.hora}</span>
        </span>
      </AppButton>
      <div className="aviso-actions">
        {done ? (
          <span className="aviso-check">
            <Icon name="check" size={16} />
          </span>
        ) : (
          <>
            <AppButton
              className="aviso-mini primary"
              onClick={() => onAtender(aviso)}
            >
              Atender
            </AppButton>
            <AppButton
              ariaLabel="Descartar aviso"
              className="aviso-mini ghost"
              onClick={() => onDescartar(aviso)}
            >
              <Icon name="x" size={14} />
            </AppButton>
          </>
        )}
      </div>
    </article>
  )
}

function AlertToast({
  aviso,
  onAtender,
  onClose,
}: {
  aviso: Aviso
  onAtender: (aviso: Aviso) => void
  onClose: () => void
}) {
  const meta = avisoMeta[aviso.tipo]
  return (
    <div className={`alert-toast tone-${meta.tone}`} role="status">
      <span className={`aviso-icon tone-${meta.tone}`}>
        <Icon name={meta.icon} size={18} />
      </span>
      <div className="alert-toast-body">
        <strong>{aviso.titulo}</strong>
        <span>{aviso.detalle}</span>
      </div>
      <AppButton
        className="aviso-mini primary"
        onClick={() => onAtender(aviso)}
      >
        Atender
      </AppButton>
      <AppButton
        ariaLabel="Cerrar aviso"
        className="aviso-mini ghost"
        onClick={onClose}
      >
        <Icon name="x" size={14} />
      </AppButton>
    </div>
  )
}

function AvisosView({
  avisos,
  onGoComandas,
  onToast,
  setAvisos,
}: {
  avisos: Aviso[]
  onGoComandas: () => void
  onToast: (aviso: Aviso) => void
  setAvisos: Dispatch<SetStateAction<Aviso[]>>
}) {
  const [filter, setFilter] = useState<AvisoFiltro>("pendientes")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(initialAvisoSettings)
  const [discarding, setDiscarding] = useState<Aviso | null>(null)
  const [discardMotivo, setDiscardMotivo] = useState<string | null>(null)
  const [detail, setDetail] = useState<Aviso | null>(null)

  const pendientes = avisos.filter((aviso) => aviso.estado === "pendiente")
  const altas = pendientes.filter((aviso) => aviso.severidad === "alta").length
  const atendidas = avisos.filter((aviso) => aviso.estado === "atendido").length

  function atender(aviso: Aviso) {
    setAvisos((current) =>
      current.map((item) =>
        item.id === aviso.id ? { ...item, estado: "atendido" } : item,
      ),
    )
    setDetail(null)
  }

  function descartar() {
    if (!discarding || !discardMotivo) return
    setAvisos((current) => current.filter((item) => item.id !== discarding.id))
    setDiscarding(null)
    setDiscardMotivo(null)
    setDetail(null)
  }

  function abrir(aviso: Aviso) {
    if (aviso.tipo === "comanda_lista" || aviso.tipo === "sla") {
      onGoComandas()
    } else {
      setDetail(aviso)
    }
  }

  function probarAviso() {
    const nuevo: Aviso = {
      id: `demo-${Date.now()}`,
      tipo: "comanda_lista",
      titulo: "Comanda lista · Mesa 5",
      detalle: "Cocina avisó: listo para recoger",
      mesa: 5,
      hora: "19:42",
      severidad: "media",
      estado: "pendiente",
    }
    setAvisos((current) => [nuevo, ...current])
    onToast(nuevo)
  }

  function toggleCanal(tipo: AvisoTipo, campo: keyof AvisoCanal) {
    setSettings((current) => ({
      ...current,
      [tipo]: { ...current[tipo], [campo]: !current[tipo][campo] },
    }))
  }

  const visible = avisos.filter((aviso) => avisoMatches(aviso, filter))
  const sinAtender = visible.filter((aviso) => aviso.estado === "pendiente")
  const atendidasList = visible.filter((aviso) => aviso.estado === "atendido")

  return (
    <div className="avisos-view">
      <div className="section-heading">
        <div>
          <p className="section-kicker">CENTRO DE AVISOS</p>
          <h2>Avisos</h2>
        </div>
        <div className="heading-actions">
          <AppButton
            ariaLabel="Probar un aviso entrante"
            className="icon-button"
            onClick={probarAviso}
          >
            <Icon name="bell" />
          </AppButton>
          <AppButton
            ariaLabel="Ajustes de avisos"
            className="icon-button"
            onClick={() => setSettingsOpen(true)}
          >
            <Icon name="sliders" />
          </AppButton>
        </div>
      </div>

      <div className="summary-strip" aria-label="Resumen de avisos">
        <div>
          <strong>{pendientes.length}</strong>
          <span>Sin atender</span>
        </div>
        <div>
          <strong className={altas ? "danger-number" : ""}>{altas}</strong>
          <span>Prioridad alta</span>
        </div>
        <div>
          <strong>{atendidas}</strong>
          <span>Atendidas</span>
        </div>
      </div>

      <label className="filter-dropdown">
        <Icon name="sliders" size={16} />
        <select
          aria-label="Filtro de avisos"
          onChange={(event) => setFilter(event.target.value as AvisoFiltro)}
          value={filter}
        >
          {avisoFilters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <span className="chevron-down">
          <Icon name="chevron" size={16} />
        </span>
      </label>

      {visible.length === 0 ? (
        <div className="empty-state">
          <Icon name="check" size={30} />
          <strong>Todo atendido</strong>
          <span>No hay avisos en este filtro.</span>
        </div>
      ) : (
        <>
          {sinAtender.length > 0 && (
            <section className="aviso-group">
              <header className="aviso-group-head">
                <span>Sin atender</span>
                <span className="group-count">{sinAtender.length}</span>
              </header>
              {sinAtender.map((aviso) => (
                <AlertRow
                  aviso={aviso}
                  key={aviso.id}
                  onAtender={atender}
                  onDescartar={setDiscarding}
                  onOpen={abrir}
                />
              ))}
            </section>
          )}
          {atendidasList.length > 0 && (
            <section className="aviso-group">
              <header className="aviso-group-head">
                <span>Atendidas hoy</span>
                <span className="group-count">{atendidasList.length}</span>
              </header>
              {atendidasList.map((aviso) => (
                <AlertRow
                  aviso={aviso}
                  key={aviso.id}
                  onAtender={atender}
                  onDescartar={setDiscarding}
                  onOpen={abrir}
                />
              ))}
            </section>
          )}
        </>
      )}

      <p className="comandas-foot">
        <Icon name="bell" size={14} /> «Listo» y «SLA excedido» suenan distinto
        · ajustes por tipo.
      </p>

      {detail && (
        <div className="sheet-overlay" onClick={() => setDetail(null)}>
          <section
            className="action-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div
                className={`sheet-table-icon tone-${avisoMeta[detail.tipo].tone}`}
              >
                <Icon name={avisoMeta[detail.tipo].icon} size={24} />
              </div>
              <div>
                <p className="eyebrow">
                  {avisoMeta[detail.tipo].label.toUpperCase()}
                </p>
                <h2>{detail.titulo}</h2>
                <p>
                  {detail.hora}
                  {detail.mesa != null && ` · Mesa ${detail.mesa}`}
                </p>
              </div>
            </div>
            <div className="sheet-body">
              <div className="sheet-message">
                <Icon name="spark" size={18} />
                <span>
                  <strong>Detalle del aviso</strong>
                  {detail.detalle}
                </span>
              </div>
              {detail.estado === "pendiente" ? (
                <AppButton
                  className="primary-button"
                  onClick={() => atender(detail)}
                >
                  <Icon name="check" size={17} /> Marcar como atendido
                </AppButton>
              ) : (
                <AppButton
                  className="primary-button"
                  onClick={() => setDetail(null)}
                >
                  Cerrar
                </AppButton>
              )}
            </div>
          </section>
        </div>
      )}

      {discarding && (
        <div
          className="sheet-overlay"
          onClick={() => {
            setDiscarding(null)
            setDiscardMotivo(null)
          }}
        >
          <section
            className="action-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div className="sheet-table-icon state-anulada">
                <Icon name="x" size={24} />
              </div>
              <div>
                <p className="eyebrow">DESCARTAR AVISO</p>
                <h2>{discarding.titulo}</h2>
                <p>El motivo es obligatorio</p>
              </div>
            </div>
            <div className="sheet-body">
              <div className="permission-gate">
                <Icon name="lock" size={18} />
                <div>
                  <strong>Requiere permiso de supervisor</strong>
                  <span>Descartar un aviso queda registrado.</span>
                </div>
              </div>
              <div className="reason-grid">
                {motivoOptions.map((option) => (
                  <AppButton
                    className={
                      discardMotivo === option
                        ? "reason-chip selected"
                        : "reason-chip"
                    }
                    key={option}
                    onClick={() => setDiscardMotivo(option)}
                  >
                    {option}
                  </AppButton>
                ))}
              </div>
              <AppButton
                className="primary-button danger-button"
                onClick={descartar}
              >
                <Icon name="x" size={17} /> Descartar aviso
              </AppButton>
            </div>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="sheet-overlay" onClick={() => setSettingsOpen(false)}>
          <section
            className="action-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div className="sheet-table-icon">
                <Icon name="sliders" size={24} />
              </div>
              <div>
                <p className="eyebrow">PREFERENCIAS</p>
                <h2>Avisos</h2>
                <p>Sonido y vibración por tipo</p>
              </div>
            </div>
            <div className="sheet-body">
              {(Object.keys(avisoMeta) as AvisoTipo[]).map((tipo) => (
                <div className="settings-row" key={tipo}>
                  <span className={`aviso-icon tone-${avisoMeta[tipo].tone}`}>
                    <Icon name={avisoMeta[tipo].icon} size={16} />
                  </span>
                  <div className="settings-label">
                    <strong>{avisoMeta[tipo].label}</strong>
                    <span>
                      {tipo === "sla"
                        ? "Suena distinto a «comanda lista»"
                        : "Sonido y vibración"}
                    </span>
                  </div>
                  <button
                    aria-checked={settings[tipo].sonido}
                    aria-label={`Sonido de ${avisoMeta[tipo].label}`}
                    className={`toggle ${settings[tipo].sonido ? "on" : ""}`}
                    onClick={() => toggleCanal(tipo, "sonido")}
                    role="switch"
                    type="button"
                  >
                    <Icon name="bell" size={12} />
                  </button>
                  <button
                    aria-checked={settings[tipo].vibracion}
                    aria-label={`Vibración de ${avisoMeta[tipo].label}`}
                    className={`toggle ${settings[tipo].vibracion ? "on" : ""}`}
                    onClick={() => toggleCanal(tipo, "vibracion")}
                    role="switch"
                    type="button"
                  >
                    <Icon name="vibrate" size={12} />
                  </button>
                </div>
              ))}
              <AppButton
                className="primary-button"
                onClick={() => setSettingsOpen(false)}
              >
                Listo
              </AppButton>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

type HistorialFiltro = "todos" | "cobrados" | "cancelados"

type HistorialFilterOption = {
  id: HistorialFiltro
  label: string
}

const historialFilters: HistorialFilterOption[] = [
  { id: "todos", label: "Todos" },
  { id: "cobrados", label: "Cobrados" },
  { id: "cancelados", label: "Cancelados" },
]

function HistorialView() {
  const [filter, setFilter] = useState<HistorialFiltro>("todos")
  const [selected, setSelected] = useState<FichaPedido | null>(null)

  const pagados = historialPedidos.filter((p) => p.estado === "pagado")
  const cobrado = pagados.reduce((sum, p) => sum + p.totales.total, 0)
  const propinas = pagados.reduce((sum, p) => sum + p.totales.propina, 0)

  const visible = historialPedidos.filter((p) => {
    if (filter === "cobrados") return p.estado === "pagado"
    if (filter === "cancelados") return p.estado === "cancelado"
    return true
  })

  return (
    <div className="historial-view">
      <div className="section-heading">
        <div>
          <p className="section-kicker">TRAZABILIDAD DEL TURNO</p>
          <h2>Historial</h2>
        </div>
        <span className="live-pill">
          <Icon name="history" size={14} /> {historialPedidos.length} pedidos
        </span>
      </div>

      <div className="summary-strip" aria-label="Resumen del historial">
        <div>
          <strong>{pagados.length}</strong>
          <span>Cobrados</span>
        </div>
        <div>
          <strong>{money(cobrado)}</strong>
          <span>Total vendido</span>
        </div>
        <div>
          <strong className="ready-number">{money(propinas)}</strong>
          <span>Propinas</span>
        </div>
      </div>

      <nav className="zone-tabs" aria-label="Filtro del historial">
        {historialFilters.map((item) => (
          <AppButton
            className={filter === item.id ? "zone-chip selected" : "zone-chip"}
            key={item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </AppButton>
        ))}
      </nav>

      {visible.length === 0 ? (
        <div className="empty-state">
          <Icon name="history" size={30} />
          <strong>Sin pedidos en este filtro</strong>
          <span>Aquí verás los pedidos que hayas atendido.</span>
        </div>
      ) : (
        visible.map((pedido) => (
          <AppButton
            className="hist-card"
            key={pedido.id}
            onClick={() => setSelected(pedido)}
            ariaLabel={`Pedido ${pedido.folio}, mesa ${pedido.mesa}, ${pedidoEstadoLabels[pedido.estado]}`}
          >
            <div className="hist-card-top">
              <span className="hist-folio">{pedido.folio}</span>
              <span className={`state-chip state-pedido-${pedido.estado}`}>
                {pedidoEstadoLabels[pedido.estado]}
              </span>
            </div>
            <div className="hist-mesa">
              Mesa {pedido.mesa} · {pedido.zona} · {pedido.comensales}{" "}
              comensales
            </div>
            <div className="hist-meta">
              <span>
                <Icon name="clock" size={13} /> {pedido.apertura}–
                {pedido.cierre}
              </span>
              <span>{pedido.canal === "web" ? "Pedido web" : "Mesero"}</span>
              <span className="hist-total">{money(pedido.totales.total)}</span>
            </div>
            {pedido.comentarios.length > 0 && (
              <div className="hist-comments-preview">
                <Icon
                  name={comentarioMeta[pedido.comentarios[0].autor].icon}
                  size={12}
                />
                <span>
                  {pedido.comentarios.length} comentario(s) ·{" "}
                  {pedido.comentarios[0].texto}
                </span>
              </div>
            )}
          </AppButton>
        ))
      )}

      {selected && (
        <div className="sheet-overlay" onClick={() => setSelected(null)}>
          <section
            className="action-sheet ficha-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div className="sheet-table-icon">
                <Icon name="history" size={24} />
              </div>
              <div>
                <p className="eyebrow">FICHA · {selected.folio}</p>
                <h2>Mesa {selected.mesa}</h2>
                <p>
                  {pedidoEstadoLabels[selected.estado]} · {selected.zona}
                </p>
              </div>
            </div>
            <div className="sheet-body">
              <div className="ficha-meta">
                <div>
                  <span>Apertura</span>
                  <strong>{selected.apertura}</strong>
                </div>
                <div>
                  <span>Cierre</span>
                  <strong>{selected.cierre}</strong>
                </div>
                <div>
                  <span>Comensales</span>
                  <strong>{selected.comensales}</strong>
                </div>
                <div>
                  <span>Canal</span>
                  <strong>
                    {selected.canal === "web" ? "Web (QR)" : "Mesero"}
                  </strong>
                </div>
                <div>
                  <span>Modalidad</span>
                  <strong>{selected.modalidad}</strong>
                </div>
                <div>
                  <span>Pago</span>
                  <strong>{selected.medioPago}</strong>
                </div>
              </div>

              <h3 className="ficha-title">Consumo</h3>
              <ul className="ficha-lines">
                {selected.lineas.map((linea, index) => (
                  <li key={index}>
                    <span className="ficha-qty">{linea.cantidad}×</span>
                    <span className="ficha-line-main">
                      {linea.nombre}
                      {linea.nota && <em>{linea.nota}</em>}
                      {linea.comensal && (
                        <small>
                          {linea.comensal} · ronda {linea.ronda}
                        </small>
                      )}
                    </span>
                    <span className="ficha-price">
                      {money(linea.precio * linea.cantidad)}
                    </span>
                  </li>
                ))}
              </ul>

              <h3 className="ficha-title">Pedidos</h3>
              <ul className="ficha-comandas">
                {selected.comandas.map((comanda) => (
                  <li key={comanda.numero}>
                    <span className="ficha-comanda-num">#{comanda.numero}</span>
                    <span className="ficha-comanda-station">
                      <Icon name="flame" size={12} /> {comanda.estacion}
                    </span>
                    <span className={`state-chip state-${comanda.estado}`}>
                      {comandaEstadoLabels[comanda.estado]}
                    </span>
                    <span className="ficha-comanda-time">
                      {comanda.enviada}
                      {comanda.lista ? ` → ${comanda.lista}` : ""}
                    </span>
                  </li>
                ))}
              </ul>

              <h3 className="ficha-title">Comentarios</h3>
              {selected.comentarios.length === 0 ? (
                <p className="ficha-empty">Sin comentarios en este pedido.</p>
              ) : (
                <ul className="ficha-comments">
                  {selected.comentarios.map((comentario, index) => (
                    <li className="comment" key={index}>
                      <span
                        className={`comment-avatar tone-${comentarioMeta[comentario.autor].tone}`}
                      >
                        <Icon
                          name={comentarioMeta[comentario.autor].icon}
                          size={14}
                        />
                      </span>
                      <div>
                        <span className="comment-head">
                          <strong>
                            {comentarioMeta[comentario.autor].label}
                          </strong>
                          <span>{comentario.hora}</span>
                        </span>
                        <p>{comentario.texto}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="ficha-title">Totales</h3>
              <div className="ficha-totales">
                <div>
                  <span>Subtotal</span>
                  <span>{money(selected.totales.subtotal)}</span>
                </div>
                {selected.totales.descuento > 0 && (
                  <div className="discount">
                    <span>Descuento</span>
                    <span>−{money(selected.totales.descuento)}</span>
                  </div>
                )}
                <div>
                  <span>Impuestos</span>
                  <span>{money(selected.totales.impuestos)}</span>
                </div>
                <div>
                  <span>Propina</span>
                  <span>{money(selected.totales.propina)}</span>
                </div>
                <div className="total">
                  <span>Total</span>
                  <span>{money(selected.totales.total)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

type OrderDraft = {
  producto: Producto
  cantidad: number
  nota: string
}

function TableOrderScreen({
  nextNumero,
  onClose,
  onCreateComandas,
  table,
}: {
  nextNumero: number
  onClose: () => void
  onCreateComandas: (comandas: Comanda[]) => void
  table: RestaurantTable
}) {
  const [lineas, setLineas] = useState<OrdenLinea[]>([])
  const [query, setQuery] = useState("")
  const [categoria, setCategoria] = useState<Categoria | "Todas">("Todas")
  const [draft, setDraft] = useState<OrderDraft | null>(null)
  const [showCuenta, setShowCuenta] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const NOW = "19:42"

  const productos = carta.filter((producto) => {
    const matchCategoria =
      categoria === "Todas" || producto.categoria === categoria
    const texto = query.trim().toLowerCase()
    const matchTexto = !texto || producto.nombre.toLowerCase().includes(texto)
    return matchCategoria && matchTexto
  })

  const pendientes = lineas.filter((linea) => linea.ronda === undefined)
  const enviadas = lineas.filter((linea) => linea.ronda !== undefined)
  const total = lineas.reduce(
    (sum, linea) => sum + linea.producto.precio * linea.cantidad,
    0,
  )
  const pendientesTotal = pendientes.reduce(
    (sum, linea) => sum + linea.producto.precio * linea.cantidad,
    0,
  )

  function abrirLinea(producto: Producto) {
    if (producto.agotado) return
    setDraft({ producto, cantidad: 1, nota: "" })
  }

  function cambiarCantidad(delta: number) {
    setDraft((current) =>
      current
        ? { ...current, cantidad: Math.max(1, current.cantidad + delta) }
        : current,
    )
  }

  function confirmarLinea() {
    if (!draft) return
    setLineas((current) => [
      ...current,
      {
        id: `${draft.producto.id}-${Date.now()}`,
        producto: draft.producto,
        cantidad: draft.cantidad,
        nota: draft.nota.trim() || undefined,
      },
    ])
    setNotice(`${draft.cantidad}× ${draft.producto.nombre} agregado al pedido.`)
    setDraft(null)
  }

  function quitarLinea(id: string) {
    setLineas((current) => current.filter((linea) => linea.id !== id))
  }

  function enviarACocina() {
    if (pendientes.length === 0) {
      setNotice("No hay líneas pendientes de enviar.")
      return
    }
    const nuevaRonda = enviadas.length
      ? Math.max(...enviadas.map((linea) => linea.ronda ?? 0)) + 1
      : 1
    setLineas((current) =>
      current.map((linea) =>
        linea.ronda === undefined
          ? { ...linea, ronda: nuevaRonda, hora: NOW }
          : linea,
      ),
    )
    const porEstacion = new Map<string, OrdenLinea[]>()
    for (const linea of pendientes) {
      const grupo = porEstacion.get(linea.producto.estacion) ?? []
      grupo.push(linea)
      porEstacion.set(linea.producto.estacion, grupo)
    }
    let numero = nextNumero
    const nuevas: Comanda[] = []
    porEstacion.forEach((grupo, estacion) => {
      nuevas.push({
        id: `order-${table.id}-${nuevaRonda}-${estacion}-${Date.now()}`,
        numero: numero++,
        mesa: table.id,
        zona: table.zone,
        estacion: estacion as "Cocina" | "Barra",
        ronda: nuevaRonda,
        estado: "enviada",
        enviada: NOW,
        preparada: false,
        sla: "en_tiempo",
        lineas: grupo.map((linea) => ({
          nombre: linea.producto.nombre,
          cantidad: linea.cantidad,
          nota: linea.nota,
        })),
      })
    })
    onCreateComandas(nuevas)
    setShowCuenta(false)
    setNotice(
      `Ronda ${nuevaRonda} enviada a cocina · ${nuevas.length} comanda(s).`,
    )
  }

  return (
    <section
      className="order-screen"
      aria-label={`Tomar pedido de la mesa ${table.numero}`}
    >
      <header className="order-topbar">
        <AppButton
          ariaLabel="Volver al salón"
          className="profile-back"
          onClick={onClose}
        >
          <Icon name="arrow-left" size={20} />
        </AppButton>
        <div className="order-title">
          <p className="eyebrow">
            MESA {table.numero} · {table.zone.toUpperCase()}
          </p>
          <h2>Carta</h2>
        </div>
        <span className="profile-topbar-spacer" />
      </header>

      <div className="order-scroll">
        <label className="order-search">
          <Icon name="search" size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar producto o código"
            value={query}
          />
        </label>

        <nav className="zone-tabs" aria-label="Categorías de la carta">
          {["Todas", ...categorias].map((item) => (
            <AppButton
              className={
                categoria === item ? "zone-chip selected" : "zone-chip"
              }
              key={item}
              onClick={() => setCategoria(item as Categoria | "Todas")}
            >
              {item}
            </AppButton>
          ))}
        </nav>

        {notice && (
          <div className="filter-notice">
            <Icon name="check" size={18} />
            {notice}
            <AppButton onClick={() => setNotice(null)}>Ok</AppButton>
          </div>
        )}

        {productos.length === 0 ? (
          <div className="empty-state">
            <Icon name="search" size={28} />
            <strong>Sin resultados</strong>
            <span>Prueba otra categoría o búsqueda.</span>
          </div>
        ) : (
          <div className="product-grid">
            {productos.map((producto) => (
              <AppButton
                ariaLabel={`${producto.nombre}, ${money(producto.precio)}`}
                className={`product-tile ${producto.agotado ? "agotado" : ""}`}
                key={producto.id}
                onClick={() => abrirLinea(producto)}
              >
                {producto.destacado && (
                  <span className="product-star">
                    <Icon name="spark" size={13} />
                  </span>
                )}
                <span className="product-name">{producto.nombre}</span>
                <span className="product-foot">
                  <span className="product-price">
                    {money(producto.precio)}
                  </span>
                  <span className="product-station">{producto.estacion}</span>
                </span>
                {producto.agotado && (
                  <span className="product-flag">Agotado</span>
                )}
              </AppButton>
            ))}
          </div>
        )}
      </div>

      <div className="order-bottombar">
        <AppButton className="order-cta" onClick={() => setShowCuenta(true)}>
          <Icon name="receipt" size={18} />
          <span>Ver pedido{lineas.length ? ` · ${lineas.length}` : ""}</span>
          <strong>{money(total)}</strong>
        </AppButton>
        {pendientes.length > 0 && (
          <span className="order-pending-note">
            {pendientes.length} pendiente(s) por enviar
          </span>
        )}
      </div>

      {draft && (
        <div className="sheet-overlay" onClick={() => setDraft(null)}>
          <section
            className="action-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div
                className={`sheet-table-icon tone-${
                  draft.producto.estacion === "Barra" ? "info" : "amber"
                }`}
              >
                <Icon name="flame" size={22} />
              </div>
              <div>
                <p className="eyebrow">
                  {draft.producto.categoria.toUpperCase()} ·{" "}
                  {draft.producto.estacion.toUpperCase()}
                </p>
                <h2>{draft.producto.nombre}</h2>
                <p>{money(draft.producto.precio)} c/u</p>
              </div>
            </div>
            <div className="sheet-body">
              <div className="qty-row">
                <span>Cantidad</span>
                <div className="qty-stepper">
                  <AppButton
                    ariaLabel="Quitar una"
                    onClick={() => cambiarCantidad(-1)}
                  >
                    −
                  </AppButton>
                  <strong>{draft.cantidad}</strong>
                  <AppButton
                    ariaLabel="Agregar una"
                    onClick={() => cambiarCantidad(1)}
                  >
                    +
                  </AppButton>
                </div>
              </div>
              <p className="ficha-title">Notas rápidas</p>
              <div className="reason-grid">
                {notaTemplates.map((plantilla) => (
                  <AppButton
                    className={
                      draft.nota === plantilla
                        ? "reason-chip selected"
                        : "reason-chip"
                    }
                    key={plantilla}
                    onClick={() =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              nota: current.nota === plantilla ? "" : plantilla,
                            }
                          : current,
                      )
                    }
                  >
                    {plantilla}
                  </AppButton>
                ))}
              </div>
              <label className="field">
                <span>Nota para cocina</span>
                <input
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, nota: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Ej. sin cebolla"
                  value={draft.nota}
                />
              </label>
              <AppButton className="primary-button" onClick={confirmarLinea}>
                <Icon name="check" size={18} /> Agregar ·{" "}
                {money(draft.producto.precio * draft.cantidad)}
              </AppButton>
            </div>
          </section>
        </div>
      )}

      {showCuenta && (
        <div className="sheet-overlay" onClick={() => setShowCuenta(false)}>
          <section
            className="action-sheet ficha-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div className="sheet-table-icon">
                <Icon name="receipt" size={24} />
              </div>
              <div>
                <p className="eyebrow">PEDIDO · MESA {table.numero}</p>
                <h2>Cuenta de la mesa</h2>
                <p>
                  {lineas.length} línea(s) · {money(total)}
                </p>
              </div>
            </div>
            <div className="sheet-body">
              {lineas.length === 0 ? (
                <div className="empty-state">
                  <Icon name="receipt" size={28} />
                  <strong>Sin líneas todavía</strong>
                  <span>Agrega productos desde la carta.</span>
                </div>
              ) : (
                <>
                  {pendientes.length > 0 && (
                    <>
                      <h3 className="ficha-title">Pendientes</h3>
                      <ul className="orden-lines">
                        {pendientes.map((linea) => (
                          <li key={linea.id}>
                            <span className="ficha-qty">{linea.cantidad}×</span>
                            <span className="ficha-line-main">
                              {linea.producto.nombre}
                              {linea.nota && <em>{linea.nota}</em>}
                            </span>
                            <span className="ficha-price">
                              {money(linea.producto.precio * linea.cantidad)}
                            </span>
                            <AppButton
                              ariaLabel="Quitar línea"
                              className="orden-remove"
                              onClick={() => quitarLinea(linea.id)}
                            >
                              <Icon name="x" size={14} />
                            </AppButton>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {enviadas.length > 0 && (
                    <>
                      <h3 className="ficha-title">Enviadas a cocina</h3>
                      <ul className="orden-lines enviadas">
                        {enviadas.map((linea) => (
                          <li key={linea.id}>
                            <span className="ficha-qty">{linea.cantidad}×</span>
                            <span className="ficha-line-main">
                              {linea.producto.nombre}
                              {linea.nota && <em>{linea.nota}</em>}
                              <small>
                                Ronda {linea.ronda} · enviada {linea.hora}
                              </small>
                            </span>
                            <span className="ficha-price">
                              {money(linea.producto.precio * linea.cantidad)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="ficha-totales">
                    <div className="total">
                      <span>Total</span>
                      <span>{money(total)}</span>
                    </div>
                  </div>
                  {pendientes.length > 0 ? (
                    <AppButton
                      className="primary-button"
                      onClick={enviarACocina}
                    >
                      <Icon name="flame" size={17} /> Enviar a cocina ·{" "}
                      {money(pendientesTotal)}
                    </AppButton>
                  ) : (
                    <p className="ficha-empty">
                      Todo enviado. Puedes seguir agregando líneas.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default function App() {
  const [zone, setZone] = useState("Todas")
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    null,
  )
  const [searching, setSearching] = useState(false)
  const [profile, setProfile] = useState<WaiterProfile>(initialProfile)
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeTab, setActiveTab] =
    useState<"salon" | "comandas" | "avisos" | "historial">("salon")
  const [comandas, setComandas] = useState<Comanda[]>(initialComandas)
  const [avisos, setAvisos] = useState<Aviso[]>(initialAvisos)
  const [toast, setToast] = useState<Aviso | null>(null)
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables)
  const [orderTable, setOrderTable] = useState<RestaurantTable | null>(null)

  const nextNumero =
    comandas.reduce((max, comanda) => Math.max(max, comanda.numero), 100) + 1

  function abrirPedido(table: RestaurantTable) {
    if (table.status === "free") {
      setTables((current) =>
        current.map((item) =>
          item.id === table.id
            ? { ...item, status: "occupied", detail: "Ahora" }
            : item,
        ),
      )
    }
    setOrderTable(table)
    setSelectedTable(null)
  }

  function recibirComandas(nuevas: Comanda[]) {
    if (nuevas.length === 0) return
    setComandas((current) => [...nuevas, ...current])
  }

  const pendingAvisos = avisos.filter(
    (aviso) => aviso.estado === "pendiente",
  ).length

  function atenderToast(aviso: Aviso) {
    setAvisos((current) =>
      current.map((item) =>
        item.id === aviso.id ? { ...item, estado: "atendido" } : item,
      ),
    )
    setToast(null)
  }

  const firstName = profile.name.trim().split(/\s+/)[0] || "Perfil"

  const mapRef = useRef<HTMLDivElement | null>(null)
  const [mapWidth, setMapWidth] = useState(0)

  useEffect(() => {
    const node = mapRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      setMapWidth(entries[0]?.contentRect.width ?? 0)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Escala el plano completo al ancho disponible (miniatura sin scroll).
  const mapaAncho = salonColumnas * CELDA
  const mapaAlto = salonFilas * CELDA
  const mapaEscala = mapWidth > 0 ? mapWidth / mapaAncho : 0

  const mesasActivas = tables.filter(
    (table) => table.status === "occupied" || table.status === "payment",
  ).length
  const mesasPorCobrar = tables.filter(
    (table) => table.status === "payment",
  ).length
  const mesasListas = tables.filter((table) => table.badge === "Lista").length

  return (
    <main className="app-shell">
      <section
        className="phone-frame"
        aria-label="Aplicación Punto C para meseros"
      >
        <div className="status-bar">
          <span>19:42</span>
          <div className="status-icons">
            <span>5G</span>
            <Icon name="wifi" size={15} />
            <span className="battery" />
          </div>
        </div>

        <header className="app-header">
          <div className="brand-row">
            <h1>Punto C · Centro</h1>
            <AppButton
              className="user-button"
              ariaLabel={`Abrir y editar el perfil de ${profile.name}`}
              onClick={() => setProfileOpen(true)}
            >
              <span className="user-button__avatar">
                {profile.photo ? (
                  <img
                    alt=""
                    className="user-button__photo"
                    src={profile.photo}
                  />
                ) : (
                  getInitials(profile.name)
                )}
              </span>
              <span className="user-button__name">{firstName}</span>
              <Icon name="chevron" size={14} />
            </AppButton>
          </div>
        </header>

        <div className="content">
          {activeTab === "salon" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="section-kicker">SALÓN EN VIVO</p>
                  <h2>Mis mesas</h2>
                </div>
                <AppButton
                  className={`icon-button ${searching ? "active" : ""}`}
                  ariaLabel="Buscar mesas activas"
                  onClick={() => setSearching((value) => !value)}
                >
                  <Icon name="search" />
                </AppButton>
              </div>

              <div className="summary-strip" aria-label="Resumen del salón">
                <div>
                  <strong>{mesasActivas}</strong>
                  <span>Activas</span>
                </div>
                <div>
                  <strong className="warning-number">{mesasPorCobrar}</strong>
                  <span>Por cobrar</span>
                </div>
                <div>
                  <strong className="ready-number">{mesasListas}</strong>
                  <span>Lista</span>
                </div>
              </div>

              <nav className="zone-tabs" aria-label="Zonas del restaurante">
                {["Todas", ...salonZonas.map((zona) => zona.nombre)].map(
                  (item) => (
                    <AppButton
                      className={
                        zone === item ? "zone-chip selected" : "zone-chip"
                      }
                      key={item}
                      onClick={() => setZone(item)}
                    >
                      {item}
                    </AppButton>
                  ),
                )}
              </nav>

              {searching && (
                <div className="filter-notice">
                  <Icon name="spark" size={18} />
                  Mostrando solo mesas con actividad
                  <AppButton onClick={() => setSearching(false)}>
                    Quitar
                  </AppButton>
                </div>
              )}

              <div
                className="floor-map"
                ref={mapRef}
                aria-label="Mapa del salón"
              >
                <div
                  className="floor-map__viewport"
                  style={{ height: mapaAlto * mapaEscala }}
                >
                  <div
                    className="floor-map__canvas"
                    style={{
                      width: mapaAncho,
                      height: mapaAlto,
                      transform: `scale(${mapaEscala})`,
                    }}
                  >
                    {salonZonas.map((zona) => {
                      const mesasZona = tables.filter(
                        (table) => table.zoneId === zona.id,
                      )
                      const ocupadas = mesasZona.filter(
                        (table) =>
                          table.status === "occupied" ||
                          table.status === "payment",
                      ).length
                      return (
                        <div
                          className={`floor-zona ${
                            zone !== "Todas" && zone !== zona.nombre
                              ? "floor-zona--dim"
                              : ""
                          }`}
                          key={zona.id}
                          style={{
                            left: zona.x * CELDA,
                            top: zona.y * CELDA,
                            width: zona.ancho * CELDA,
                            height: zona.alto * CELDA,
                          }}
                        >
                          <div className="floor-zona__head">
                            <strong>{zona.nombre}</strong>
                            <span>
                              Aforo {zona.aforo} · {mesasZona.length} mesas ·{" "}
                              {ocupadas} ocupadas
                            </span>
                          </div>
                        </div>
                      )
                    })}

                    {tables.map((table) => (
                      <AppButton
                        className={[
                          "floor-table",
                          `floor-table--${table.status}`,
                          `floor-table--${table.shape}`,
                          searching && table.status === "free"
                            ? "floor-table--dim"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={table.id}
                        style={{
                          left: table.posX * CELDA,
                          top: table.posY * CELDA,
                        }}
                        onClick={() => setSelectedTable(table)}
                        ariaLabel={`Mesa ${table.numero}, ${statusLabels[table.status]}${
                          table.badge ? `, ${table.badge}` : ""
                        }`}
                        title={`Mesa ${table.numero} · ${statusLabels[table.status]} · ${table.seats} pax`}
                      >
                        <strong>{table.numero}</strong>
                        {table.badge === "Lista" && (
                          <span
                            className="floor-table__flag"
                            aria-hidden="true"
                          />
                        )}
                      </AppButton>
                    ))}
                  </div>
                </div>
              </div>

              <ul className="floor-legend" aria-label="Leyenda del mapa">
                {([
                  "free",
                  "occupied",
                  "payment",
                  "reserved",
                  "blocked",
                ] as TableStatus[]).map((estado) => (
                  <li key={estado}>
                    <span
                      className={`floor-legend__dot floor-table--${estado}`}
                      aria-hidden="true"
                    />
                    {statusLabels[estado]}
                  </li>
                ))}
              </ul>
            </>
          )}

          {activeTab === "comandas" && (
            <ComandasView comandas={comandas} setComandas={setComandas} />
          )}

          {activeTab === "avisos" && (
            <AvisosView
              avisos={avisos}
              onGoComandas={() => setActiveTab("comandas")}
              onToast={setToast}
              setAvisos={setAvisos}
            />
          )}

          {activeTab === "historial" && <HistorialView />}
        </div>

        <nav className="bottom-nav" aria-label="Navegación principal">
          <AppButton
            className={`nav-item ${activeTab === "salon" ? "active" : ""}`}
            onClick={() => setActiveTab("salon")}
          >
            <Icon name="grid" />
            <span>Salón</span>
          </AppButton>
          <AppButton
            className={`nav-item ${activeTab === "comandas" ? "active" : ""}`}
            onClick={() => setActiveTab("comandas")}
          >
            <Icon name="receipt" />
            <span>Pedidos</span>
          </AppButton>
          <AppButton
            className={`nav-item nav-alert ${
              activeTab === "avisos" ? "active" : ""
            }`}
            onClick={() => setActiveTab("avisos")}
          >
            {pendingAvisos > 0 && (
              <span className="notification-count">{pendingAvisos}</span>
            )}
            <Icon name="bell" />
            <span>Avisos</span>
          </AppButton>
          <AppButton
            className={`nav-item ${activeTab === "historial" ? "active" : ""}`}
            onClick={() => setActiveTab("historial")}
          >
            <Icon name="history" />
            <span>Historial</span>
          </AppButton>
        </nav>

        {toast && (
          <AlertToast
            aviso={toast}
            onAtender={atenderToast}
            onClose={() => setToast(null)}
          />
        )}

        {profileOpen && (
          <ProfileScreen
            onClose={() => setProfileOpen(false)}
            onSave={setProfile}
            profile={profile}
          />
        )}

        {selectedTable && (
          <div className="sheet-overlay" onClick={() => setSelectedTable(null)}>
            <section
              className="action-sheet"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="sheet-heading">
                <div
                  className={`sheet-table-icon table-${selectedTable.status}`}
                >
                  {selectedTable.numero}
                </div>
                <div>
                  <p className="eyebrow">{selectedTable.zone.toUpperCase()}</p>
                  <h2>Mesa {selectedTable.numero}</h2>
                  <p>
                    {statusLabels[selectedTable.status]} · {selectedTable.seats}{" "}
                    lugares
                  </p>
                </div>
              </div>

              {selectedTable.status === "blocked" ? (
                <div className="sheet-body">
                  <div className="sheet-message">
                    <Icon name="ban" />
                    <span>
                      <strong>Mesa fuera de servicio</strong>
                      Bloqueada por mantenimiento; no se ofrece a comensales.
                    </span>
                  </div>
                </div>
              ) : selectedTable.status === "free" ? (
                <div className="sheet-body">
                  <div className="sheet-message">
                    <Icon name="check" />
                    <span>
                      <strong>Lista para recibir comensales</strong>
                      Abre la mesa y toma el pedido desde la carta.
                    </span>
                  </div>
                  <AppButton
                    className="primary-button"
                    onClick={() => abrirPedido(selectedTable)}
                  >
                    <Icon name="receipt" />
                    Abrir mesa y tomar pedido
                  </AppButton>
                </div>
              ) : selectedTable.status === "payment" ? (
                <div className="sheet-body">
                  <AppButton className="primary-button">
                    <Icon name="receipt" />
                    Ver cuenta
                  </AppButton>
                  <div className="secondary-actions">
                    <AppButton onClick={() => abrirPedido(selectedTable)}>
                      <Icon name="spark" />
                      Agregar al pedido
                    </AppButton>
                    <AppButton>
                      <Icon name="users" />
                      Trasladar
                    </AppButton>
                  </div>
                </div>
              ) : (
                <div className="sheet-body">
                  <AppButton
                    className="primary-button"
                    onClick={() => abrirPedido(selectedTable)}
                  >
                    <Icon name="receipt" />
                    Tomar pedido
                  </AppButton>
                  <div className="secondary-actions">
                    <AppButton>
                      <Icon name="receipt" />
                      Pre-cuenta
                    </AppButton>
                    <AppButton>
                      <Icon name="users" />
                      Trasladar
                    </AppButton>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {orderTable && (
          <TableOrderScreen
            nextNumero={nextNumero}
            onClose={() => setOrderTable(null)}
            onCreateComandas={recibirComandas}
            table={orderTable}
          />
        )}
      </section>
    </main>
  )
}
